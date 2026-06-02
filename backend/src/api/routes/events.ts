import { Router } from 'express';
import { eventController } from '../../controllers/eventController';
import { authenticate } from '../../middleware/auth';

export const eventRoutes = Router();

eventRoutes.use(authenticate);
eventRoutes.get('/', eventController.list);
eventRoutes.get('/stats', eventController.stats);
