import { Router } from 'express';
import { websiteController } from '../../controllers/websiteController';
import { authenticate } from '../../middleware/auth';

export const websiteRoutes = Router();

websiteRoutes.use(authenticate);
websiteRoutes.post('/', websiteController.create);
websiteRoutes.get('/', websiteController.list);
websiteRoutes.get('/:id/script', websiteController.script);
