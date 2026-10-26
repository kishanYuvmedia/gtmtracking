import { Router } from 'express';
import { websiteController } from '../../controllers/websiteController';
import { authenticate } from '../../middleware/auth';

export const websiteRoutes = Router();

websiteRoutes.use(authenticate);
websiteRoutes.post('/', websiteController.create);
websiteRoutes.get('/', websiteController.list);
// Before '/:id' so "countries" is not taken for a website id.
websiteRoutes.get('/countries', websiteController.countries);
websiteRoutes.get('/:id', websiteController.detail);
websiteRoutes.patch('/:id', websiteController.update);
websiteRoutes.post('/:id/disconnect', websiteController.disconnect);
websiteRoutes.get('/:id/events', websiteController.listEvents);
websiteRoutes.get('/:id/event-report', websiteController.eventReport);
websiteRoutes.get('/:id/script', websiteController.script);
websiteRoutes.get('/:id/ecommerce-status', websiteController.ecommerceStatus);
