import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import '../../src/database/models/Event';
import '../../src/database/models/Identity';
import '../../src/database/models/IdentityConflict';
import '../../src/database/models/Profile';
import '../../src/database/models/ProfileMerge';
import '../../src/database/models/ProfileTraitChange';
import { Workspace } from '../../src/database/models/Workspace';

// Single-node replica set: identity resolution needs multi-document transactions.
let replSet: MongoMemoryReplSet | null = null;

export async function startMongo(): Promise<void> {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri('cdp_test'));
  for (const model of Object.values(mongoose.models)) {
    await model.createCollection();
    await model.createIndexes();
  }
}

export async function stopMongo(): Promise<void> {
  await mongoose.disconnect();
  await replSet?.stop();
  replSet = null;
}

export async function resetMongo(workspaceId: string, defaultCountry = 'IN'): Promise<void> {
  for (const model of Object.values(mongoose.models)) await model.deleteMany({});
  await Workspace.create({ _id: workspaceId, owner_user_id: `owner-${workspaceId}`, name: 'Test', timezone: 'Asia/Kolkata', currency: 'INR', identity_settings: { default_country: defaultCountry } });
}
