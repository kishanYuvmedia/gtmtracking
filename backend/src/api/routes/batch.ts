import { Router } from 'express';
import { batchController } from '../../controllers/batchController';
import { validateBatch } from '../../middleware/validation';
import { validateApiKey } from '../../middleware/auth';

export const batchRoutes = Router();

batchRoutes.post('/', validateApiKey, validateBatch, batchController.handleBatch);
