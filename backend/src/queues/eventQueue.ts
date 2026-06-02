import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const connection = redis as unknown as import('bullmq').ConnectionOptions;

export const eventQueue = new Queue('events', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 1000,
    removeOnFail: 100,
  },
});

export async function closeQueue() {
  await eventQueue.close();
  await redis.quit();
}
