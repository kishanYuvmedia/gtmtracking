import mongoose from 'mongoose';
import { Event } from '../../src/database/models/Event';
import { databaseName, requireDevDatabase, testConnection } from '../../src/database';
import { rerunIdentityResolution } from '../../src/services/identity/batch';

// One-time (re-runnable) identity resolution over all existing events in the DEV database.
//   CDP_RERUN_CONFIRM=YES_RERUN_IDENTITY npm run identity:rerun
//   CDP_WORKSPACE_ID=<id> to limit to one workspace.
async function main() {
  const name = requireDevDatabase();
  if (process.env.CDP_RERUN_CONFIRM !== 'YES_RERUN_IDENTITY') {
    throw new Error('Set CDP_RERUN_CONFIRM=YES_RERUN_IDENTITY to rebuild profiles/identities from events');
  }
  if (!await testConnection(1, 0)) throw new Error('Could not connect to MongoDB');
  if (databaseName() !== name) throw new Error(`Connected to "${databaseName()}", expected dev database "${name}"`);

  const workspaceIds = process.env.CDP_WORKSPACE_ID
    ? [process.env.CDP_WORKSPACE_ID]
    : (await Event.distinct('workspace_id', { workspace_id: { $ne: null } })) as string[];
  const unscoped = await Event.countDocuments({ workspace_id: null });
  if (unscoped) console.log(`Skipping ${unscoped.toLocaleString()} legacy events without a workspace (run migrate:cdp-backfill first)`);

  for (const workspaceId of workspaceIds) {
    const started = Date.now();
    console.log(`Workspace ${workspaceId}`);
    const stats = await rerunIdentityResolution(workspaceId, message => console.log(message));
    console.log(`  done in ${((Date.now() - started) / 1000).toFixed(1)}s`, JSON.stringify(stats));
  }
}

main()
  .catch((error: unknown) => {
    console.error('Identity re-run failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
