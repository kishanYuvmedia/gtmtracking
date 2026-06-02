import fs from 'fs';
import path from 'path';
import './loadenv';
import pool from './index';

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (file.endsWith('.sql')) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      console.log(`Running migration: ${file}`);
      await pool.query(sql);
      console.log(`Migration ${file} completed`);
    }
  }

  await pool.end();
  console.log('All migrations completed');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
