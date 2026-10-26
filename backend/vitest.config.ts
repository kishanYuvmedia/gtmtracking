import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // First run downloads a MongoDB binary for the in-memory replica set.
    hookTimeout: 180_000,
    testTimeout: 60_000,
    pool: 'forks',
  },
});
