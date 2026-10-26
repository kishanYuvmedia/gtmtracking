import { Router } from 'express';
import { collectController } from '../../controllers/collectController';
import { validateCollect } from '../../middleware/validation';
import { validateApiKey } from '../../middleware/auth';
import { ingestionRateLimit } from '../../middleware/ingestionRateLimit';

export const collectRoutes = Router();

collectRoutes.post('/', validateApiKey, ingestionRateLimit, validateCollect, collectController.handleCollect);
