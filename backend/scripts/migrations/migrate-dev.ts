import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Delivery } from '../../src/database/models/Delivery';
import { Destination } from '../../src/database/models/Destination';
import { DestinationMapping } from '../../src/database/models/DestinationMapping';
import { Event } from '../../src/database/models/Event';
import { Identity } from '../../src/database/models/Identity';
import { IdentityConflict } from '../../src/database/models/IdentityConflict';
import { Profile } from '../../src/database/models/Profile';
import { ProfileMerge } from '../../src/database/models/ProfileMerge';
import { ProfileTraitChange } from '../../src/database/models/ProfileTraitChange';
import { Segment } from '../../src/database/models/Segment';
import { Source } from '../../src/database/models/Source';
import { User } from '../../src/database/models/User';
import { Website } from '../../src/database/models/Website';
import { DEFAULT_IDENTITY_SETTINGS, Workspace } from '../../src/database/models/Workspace';
import { WorkspaceMember } from '../../src/database/models/WorkspaceMember';
import { databaseName, requireDevDatabase, testConnection } from '../../src/database';

// Dev-database migration. Idempotent: safe to re-run.
//  1. creates every collection up front (multi-document transactions cannot create them)
//  2. creates missing indexes (never drops any, unlike syncIndexes)
//  3. backfills fields added for identity resolution
const MODELS = [
  User, Website, Workspace, WorkspaceMember, Source, Event, Profile, Identity, ProfileMerge,
  ProfileTraitChange, IdentityConflict, Segment, Destination, DestinationMapping, Delivery,
] as mongoose.Model<any>[];

async function main() {
  const name = requireDevDatabase();
  if (!await testConnection(1, 0)) throw new Error('Could not connect to MongoDB');
  if (databaseName() !== name) throw new Error(`Connected to "${databaseName()}", expected dev database "${name}"`);
  console.log(`Migrating dev database "${name}"`);

  const existing = new Set((await mongoose.connection.db!.listCollections().toArray()).map(c => c.name));
  for (const model of MODELS) {
    if (!existing.has(model.collection.collectionName)) await model.createCollection();
    await model.createIndexes();
    console.log(`  ${model.collection.collectionName}: ${(await model.collection.indexes()).length} indexes`);
  }

  // Indexes from earlier schema versions, now covered by compound indexes above.
  const OBSOLETE_INDEXES: [mongoose.Model<any>, string][] = [
    [Identity, 'profile_id_1'],
    [ProfileMerge, 'workspace_id_1'],
    [ProfileMerge, 'workspace_id_1_merged_profile_id_1'],
  ];
  for (const [model, indexName] of OBSOLETE_INDEXES) {
    if ((await model.collection.indexes()).some(index => index.name === indexName)) {
      await model.collection.dropIndex(indexName);
      console.log(`  dropped obsolete index ${model.collection.collectionName}.${indexName}`);
    }
  }

  // Merge rows written before the survivor_id/merged_id rename.
  const renamed = await ProfileMerge.collection.updateMany(
    { merged_profile_id: { $exists: true } },
    [{
      $set: {
        merged_id: '$merged_profile_id',
        survivor_id: '$retained_profile_id',
        identifier: { $ifNull: ['$identifier', null] },
        event_id: { $ifNull: ['$event_id', null] },
      },
    }, { $unset: ['merged_profile_id', 'retained_profile_id'] }]
  );
  const identities = await Identity.collection.updateMany(
    { first_seen: { $exists: false } },
    [{ $set: { first_seen: { $ifNull: ['$created_at', '$$NOW'] }, last_seen: { $ifNull: ['$created_at', '$$NOW'] } } }]
  );
  const profiles = await Profile.collection.updateMany(
    { is_known: { $exists: false } },
    [{
      $set: {
        is_known: { $or: [{ $gt: ['$email', null] }, { $gt: ['$phone', null] }] },
        user_id: { $ifNull: ['$user_id', null] },
        name: { $ifNull: ['$name', null] },
        session_count: { $ifNull: ['$session_count', 0] },
        device_count: { $ifNull: ['$device_count', 0] },
        order_count: { $ifNull: ['$order_count', 0] },
        last_purchase_at: { $ifNull: ['$last_purchase_at', null] },
        city: { $ifNull: ['$city', null] },
        lock_version: { $ifNull: ['$lock_version', 0] },
      },
    }]
  );
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

  console.log(JSON.stringify({
    merges_renamed: renamed.modifiedCount,
    identities_backfilled: identities.modifiedCount,
    profiles_backfilled: profiles.modifiedCount,
    workspaces_backfilled: workspaces.modifiedCount,
    owner_memberships_created: memberships,
  }));
}

main()
  .catch((error: unknown) => {
    console.error('Dev migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
