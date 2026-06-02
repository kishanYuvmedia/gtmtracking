import { Router } from 'express';
import { identifyController } from '../../controllers/identifyController';
import { validateIdentify } from '../../middleware/validation';
import { validateApiKey } from '../../middleware/auth';

export const identifyRoutes = Router();

identifyRoutes.post('/', validateApiKey, validateIdentify, identifyController.handleIdentify);
