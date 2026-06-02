import crypto from 'crypto';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { insertEventLog } from '../database/models/EventLog';
import { metaService } from '../services/metaService';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
}) as unknown as import('bullmq').ConnectionOptions;

const worker = new Worker(
  'events',
  async (job) => {
    const { event_name, payload, event_id, website_id } = job.data;

    // Normalize for Meta
    const metaEvent = metaService.normalizeEvent({ event_name, payload, event_id });
    if (metaEvent) {
      // Look up pixel_id and token from env (configurable per website later)
      const pixelId = process.env.META_PIXEL_ID;
      const accessToken = process.env.META_ACCESS_TOKEN;

      if (!pixelId || !accessToken) {
        console.warn('META_PIXEL_ID or META_ACCESS_TOKEN not set — skipping Meta CAPI send');
      }

      if (pixelId && accessToken) {
        const metaResponse = await metaService.sendEvent(pixelId, accessToken, metaEvent);
        const logId = crypto.randomUUID();
        await insertEventLog({
          id: logId,
          event_id,
          status: metaResponse.error ? 'failed' : 'sent',
          response: metaResponse,
        });
      }
    }

    // Process rules
    await processRules(event_name, payload, website_id);
  },
  { connection, concurrency: 5 }
);

async function processRules(eventName: string, payload: Record<string, unknown>, websiteId: string) {
  // Rules engine placeholder
  console.log(`Processing rules for ${eventName} on website ${websiteId}`);
}

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

console.log('Event worker started');
