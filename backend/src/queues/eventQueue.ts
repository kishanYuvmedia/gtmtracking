import type { Queue } from 'bullmq';

let eventQueue: Queue | null | undefined;

export async function getQueue(): Promise<Queue | null> {
  if (eventQueue !== undefined) return eventQueue;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    eventQueue = null;
    return null;
  }

  const IORedis = (await import('ioredis')).default;
  const { Queue: BullQueue } = await import('bullmq');

  const redis = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    lazyConnect: true,
    retryStrategy: () => null,
  });
  redis.on('error', () => {});
  try {
    await redis.connect();
  } catch {
    redis.disconnect();
    eventQueue = null;
    return null;
  }
  redis.removeAllListeners('error');
  redis.on('error', error => console.error('Event queue Redis error:', error.message));

  eventQueue = new BullQueue('events', {
    connection: redis as unknown as import('bullmq').ConnectionOptions,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 1000,
      removeOnFail: 100,
    },
  });

  return eventQueue;
}

export async function closeEventQueue(): Promise<void> {
  if (!eventQueue) return;
  await eventQueue.close();
  eventQueue = undefined;
}
