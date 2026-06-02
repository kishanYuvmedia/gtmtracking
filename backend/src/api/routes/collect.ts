import { Router } from 'express';
import { collectController } from '../../controllers/collectController';
import { validateCollect } from '../../middleware/validation';
import { validateApiKey } from '../../middleware/auth';

export const collectRoutes = Router();

collectRoutes.post('/', validateApiKey, validateCollect, collectController.handleCollect);
