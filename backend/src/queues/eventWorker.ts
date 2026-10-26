import type { Worker } from 'bullmq';
import { processIngestedEvent, type ProcessEventJob } from '../services/eventProcessor';
import type { ExplicitIdentifiers } from '../services/identity/extract';

let eventWorker: Worker | null = null;

function parseProcessEventJob(data: unknown): ProcessEventJob {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Event queue job data must be an object');
  }
  const value = data as Record<string, unknown>;
  const identifierData = value.identifiers && typeof value.identifiers === 'object' && !Array.isArray(value.identifiers)
    ? value.identifiers as Record<string, unknown>
    : null;
  if (typeof value.eventId === 'string' && identifierData) {
    return {
      eventId: value.eventId,
      identifiers: {
        ...(typeof identifierData.anonymous_id === 'string' ? { anonymous_id: identifierData.anonymous_id } : {}),
        ...(typeof identifierData.user_id === 'string' ? { user_id: identifierData.user_id } : {}),
        ...(typeof identifierData.email === 'string' ? { email: identifierData.email } : {}),
        ...(typeof identifierData.phone === 'string' ? { phone: identifierData.phone } : {}),
      },
    };
  }
  const identifiers: ExplicitIdentifiers = {
    anonymous_id: typeof value.visitor_id === 'string' ? value.visitor_id : undefined,
    user_id: typeof value.user_id === 'string' ? value.user_id : undefined,
  };
  if (typeof value.event_id === 'string' && typeof value.visitor_id === 'string') {
    return {
      eventId: value.event_id,
      identifiers,
    };
  }
  throw new Error('Event queue job is missing event identity fields');
}

export async function startEventWorker(): Promise<void> {
  if (eventWorker) return;
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return;

  const IORedis = (await import('ioredis')).default;
  const { Worker: BullWorker } = await import('bullmq');
  const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    connectTimeout: 1000,
    lazyConnect: true,
    retryStrategy: () => null,
  });
  // Probe once so a missing Redis disables the worker instead of looping on ECONNREFUSED.
  // Ingestion falls back to inline processing when the queue is unavailable.
  connection.on('error', () => {});
  try {
    await connection.connect();
  } catch (error) {
    connection.disconnect();
    console.warn(`Redis unreachable at ${redisUrl} (${(error as Error).message || 'connection refused'}); event worker disabled, processing events inline`);
    return;
  }
  connection.removeAllListeners('error');
  connection.on('error', error => console.error('Event worker Redis error:', error.message));
  eventWorker = new BullWorker(
    'events',
    async job => {
      await processIngestedEvent(parseProcessEventJob(job.data));
    },
    { connection: connection as unknown as import('bullmq').ConnectionOptions, concurrency: 10 }
  );
  eventWorker.on('failed', (job, error) => {
    console.error(`Event processing failed for job ${job?.id || 'unknown'}:`, error);
  });
  eventWorker.on('error', error => console.error('Event worker error:', error));
}

export async function stopEventWorker(): Promise<void> {
  if (!eventWorker) return;
  await eventWorker.close();
  eventWorker = null;
}
