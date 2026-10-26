import { Router } from 'express';
import { batchController } from '../../controllers/batchController';
import { collectController } from '../../controllers/collectController';
import { identifyController } from '../../controllers/identifyController';
import { validateApiKey } from '../../middleware/auth';
import { ingestionRateLimit } from '../../middleware/ingestionRateLimit';
import { forcePageEvent, validateBatch, validateCollect, validateIdentify } from '../../middleware/validation';

export const v1Routes = Router();
const ingest = [validateApiKey, ingestionRateLimit];

v1Routes.post('/track', ...ingest, validateCollect, collectController.handleCollect);
v1Routes.post('/page', ...ingest, forcePageEvent, validateCollect, collectController.handleCollect);
v1Routes.post('/identify', ...ingest, validateIdentify, identifyController.handleIdentify);
v1Routes.post('/batch', ...ingest, validateBatch, batchController.handleBatch);
