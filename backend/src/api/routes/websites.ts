import { Router } from 'express';
import { websiteController } from '../../controllers/websiteController';
import { authenticate } from '../../middleware/auth';

export const websiteRoutes = Router();

websiteRoutes.use(authenticate);
websiteRoutes.post('/', websiteController.create);
websiteRoutes.get('/', websiteController.list);
websiteRoutes.get('/:id', websiteController.detail);
websiteRoutes.get('/:id/events', websiteController.listEvents);
websiteRoutes.get('/:id/event-report', websiteController.eventReport);
websiteRoutes.get('/:id/script', websiteController.script);
