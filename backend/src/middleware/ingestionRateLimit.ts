import { rateLimit } from 'express-rate-limit';

const configuredLimit = Number(process.env.INGESTION_RATE_LIMIT);
const limit = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : 600;

export const ingestionRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: req => req.website?.sourceId || req.ip || 'unknown',
  handler: (_req, res) => {
    res.status(429).json({ success: false, error: 'Ingestion rate limit exceeded' });
  },
});
