import { Router } from 'express';
import { batchController } from '../../controllers/batchController';
import { validateBatch } from '../../middleware/validation';
import { validateApiKey } from '../../middleware/auth';
import { ingestionRateLimit } from '../../middleware/ingestionRateLimit';

export const batchRoutes = Router();

batchRoutes.post('/', validateApiKey, ingestionRateLimit, validateBatch, batchController.handleBatch);
