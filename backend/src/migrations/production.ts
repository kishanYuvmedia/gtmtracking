import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { databaseName, testConnection } from '../database';
import { Delivery } from '../database/models/Delivery';
import { Destination } from '../database/models/Destination';
import { DestinationMapping } from '../database/models/DestinationMapping';
import { Event } from '../database/models/Event';
import { Identity } from '../database/models/Identity';
import { IdentityConflict } from '../database/models/IdentityConflict';
import { Profile } from '../database/models/Profile';
import { ProfileMerge } from '../database/models/ProfileMerge';
import { ProfileTraitChange } from '../database/models/ProfileTraitChange';
import { Segment } from '../database/models/Segment';
import { Source } from '../database/models/Source';
import { User } from '../database/models/User';
import { Website } from '../database/models/Website';
import { DEFAULT_IDENTITY_SETTINGS, Workspace } from '../database/models/Workspace';
import { WorkspaceMember } from '../database/models/WorkspaceMember';

// One-off production migration for the CDP release. Additive and re-runnable:
//   1. refuses to build indexes if the cluster would get close to its storage cap
//      (Atlas free tier blocks ALL writes at 512 MB),
//   2. creates missing collections + indexes (never drops any),
//   3. backfills workspace identity settings and owner admin memberships,
//   4. marks accounts that existed before email verification as verified, so they can log in.
//
// Inside the production container:
//   CDP_PROD_MIGRATION_CONFIRM=YES_MIGRATE_PRODUCTION node dist/migrations/production.js
// Options: STORAGE_LIMIT_MB (default 512), CDP_MIGRATION_DRY_RUN=1, CDP_MIGRATION_FORCE=1.

const MODELS = [
  User, Website, Workspace, WorkspaceMember, Source, Event, Profile, Identity, ProfileMerge,
  ProfileTraitChange, IdentityConflict, Segment, Destination, DestinationMapping, Delivery,
] as mongoose.Model<any>[];

const MB = 1e6;
const DRY_RUN = process.env.CDP_MIGRATION_DRY_RUN === '1';

async function clusterUsageMb(): Promise<number> {
  const client = mongoose.connection.getClient();
  const { databases } = await client.db('admin').admin().listDatabases();
  let total = 0;
  for (const database of databases) {
    if (['admin', 'local', 'config'].includes(database.name)) continue;
    const stats = await client.db(database.name).command({ dbStats: 1 }).catch(() => null);
    if (stats) total += (stats.dataSize + stats.indexSize) / MB;
  }
  return total;
}

async function missingIndexes(model: mongoose.Model<any>) {
  const exists = await model.db.db!.listCollections({ name: model.collection.collectionName }).hasNext();
  const current = exists ? (await model.collection.indexes()).map(index => JSON.stringify(index.key)) : [];
  return model.schema.indexes().filter(([fields]) => !current.includes(JSON.stringify(fields)));
}

async function main() {
  if (process.env.CDP_PROD_MIGRATION_CONFIRM !== 'YES_MIGRATE_PRODUCTION') {
    throw new Error('Set CDP_PROD_MIGRATION_CONFIRM=YES_MIGRATE_PRODUCTION to run the production migration');
  }
  // Index builds on a large events collection take far longer than the API's 10 s socket timeout.
  if (!await testConnection(1, 0, { socketTimeoutMS: 30 * 60 * 1000 })) throw new Error('Could not connect to MongoDB');
  console.log(`Database: ${databaseName() || '(default)'}${DRY_RUN ? '  [dry run]' : ''}`);

  // 1. Storage guard.
  const limit = Number(process.env.STORAGE_LIMIT_MB || 512);
  const before = await clusterUsageMb();
  let estimate = 0;
  const plan: { model: mongoose.Model<any>; missing: number }[] = [];
  for (const model of MODELS) {
    const missing = await missingIndexes(model);
    if (!missing.length) continue;
    const docs = await model.estimatedDocumentCount().catch(() => 0);
    // Wildcard indexes cost far more per document than a single-field index.
    estimate += missing.reduce((sum, [fields]) => sum + docs * (Object.keys(fields).some(key => key.includes('$**')) ? 400 : 80), 0) / MB;
    plan.push({ model, missing: missing.length });
    console.log(`  ${model.collection.collectionName}: ${missing.length} index(es) to create (${docs.toLocaleString()} docs)`);
  }
  console.log(`Cluster usage ${before.toFixed(1)} MB of ${limit} MB; new indexes ≈ ${estimate.toFixed(1)} MB`);
  if (before + estimate > limit * 0.9 && process.env.CDP_MIGRATION_FORCE !== '1') {
    throw new Error(
      `Refusing: ${before.toFixed(1)} + ${estimate.toFixed(1)} MB is over 90% of the ${limit} MB storage cap, which would `
      + 'block all writes. Free space (e.g. drop the Atlas "sample_mflix" demo database) or upgrade the cluster, then re-run.'
    );
  }
  if (DRY_RUN) return;

  // 2. Collections + indexes.
  for (const model of MODELS) {
    const exists = await model.db.db!.listCollections({ name: model.collection.collectionName }).hasNext();
    if (!exists) await model.createCollection();
    await model.createIndexes();
  }

  // 3. Backfills.
  const workspaces = await Workspace.collection.updateMany(
    { identity_settings: { $exists: false } },
    { $set: { identity_settings: DEFAULT_IDENTITY_SETTINGS } }
  );
  let memberships = 0;
  for await (const workspace of Workspace.find().select('_id owner_user_id').lean().cursor()) {
    const result = await WorkspaceMember.updateOne(
      { workspace_id: workspace._id, user_id: workspace.owner_user_id },
      { $setOnInsert: { _id: uuidv4(), workspace_id: workspace._id, user_id: workspace.owner_user_id, role: 'admin' } },
      { upsert: true }
    );
    memberships += result.upsertedCount;
  }

  // 4. Accounts created before the OTP step: verified by definition, or they are locked out.
  //    A pending OTP means someone is mid sign-up under the new flow; leave them alone.
  const users = await User.collection.updateMany(
    { email_verified: { $ne: true }, otp_code: { $in: [null, undefined] } },
    { $set: { email_verified: true, email_verified_at: new Date(), verified_by_migration: true } }
  );

  console.log(JSON.stringify({
    workspaces_backfilled: workspaces.modifiedCount,
    owner_memberships_created: memberships,
    legacy_users_marked_verified: users.modifiedCount,
  }));
  console.log(`Cluster usage after: ${(await clusterUsageMb()).toFixed(1)} MB of ${limit} MB`);
}

main()
  .catch((error: unknown) => {
    console.error('Production migration failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
