// Runs the full seed + identity-resolution checks against a throwaway in-memory MongoDB
// (no Atlas, nothing persisted). Exit code 1 if any resolution check fails.
//   npm run seed:verify
import { spawn } from 'child_process';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
(async () => {
  const rs = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  const uri = rs.getUri('cdp_dev');
  const child = spawn('npx', ['tsx', 'scripts/seed/seed-cdp.ts'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL_DEV: uri, CDP_SEED_CONFIRM: 'YES_SEED_FAKE_CDP_DATA', CDP_SEED_DEMO_PASSWORD: 'local-only', CDP_SEED_ALLOW_SHARED_CLUSTER: '1', NODE_ENV: 'development' },
  });
  const code: number = await new Promise(resolve => child.on('exit', c => resolve(c ?? 1)));
  await rs.stop();
  process.exit(code);
})();
