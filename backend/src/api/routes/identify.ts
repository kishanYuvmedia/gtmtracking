import { Router } from 'express';
import { identifyController } from '../../controllers/identifyController';
import { validateIdentify } from '../../middleware/validation';
import { validateApiKey } from '../../middleware/auth';
import { ingestionRateLimit } from '../../middleware/ingestionRateLimit';

export const identifyRoutes = Router();

identifyRoutes.post('/', validateApiKey, ingestionRateLimit, validateIdentify, identifyController.handleIdentify);
