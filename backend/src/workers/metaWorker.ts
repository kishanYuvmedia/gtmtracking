import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
}) as unknown as import('bullmq').ConnectionOptions;

// Dedicated worker for Meta CAPI retries
const metaWorker = new Worker(
  'meta-conversions',
  async (job) => {
    const { pixel_id, access_token, event } = job.data;

    const url = `https://graph.facebook.com/v19.0/${pixel_id}/events`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [event], access_token }),
    });

    return response.json();
  },
  {
    connection,
    concurrency: 3,
    limiter: { max: 100, duration: 1000 },
  }
);

metaWorker.on('completed', (job) => {
  console.log(`Meta conversion job ${job.id} completed`);
});

metaWorker.on('failed', (job, err) => {
  console.error(`Meta conversion job ${job?.id} failed:`, err);
});

console.log('Meta worker started');
