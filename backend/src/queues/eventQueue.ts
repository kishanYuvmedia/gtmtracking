import type { Queue } from 'bullmq';

let eventQueue: Queue | null = null;

export async function getQueue(): Promise<Queue | null> {
  if (eventQueue !== undefined) return eventQueue;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    eventQueue = null;
    return null;
  }

  try {
    const IORedis = (await import('ioredis')).default;
    const { Queue: BullQueue } = await import('bullmq');

    const redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: () => null,
    });

    redis.on('error', () => {});

    eventQueue = new BullQueue('events', {
      connection: redis as unknown as import('bullmq').ConnectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 100,
      },
    });
  } catch {
    eventQueue = null;
  }

  return eventQueue;
}

export { eventQueue };
