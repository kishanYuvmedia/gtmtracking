import { Router } from 'express';
import { journeyController } from '../../controllers/journeyController';
import { authenticate } from '../../middleware/auth';

export const journeyRoutes = Router();

journeyRoutes.use(authenticate);
journeyRoutes.get('/visitors', journeyController.searchVisitors);
journeyRoutes.get('/:visitorId', journeyController.getJourney);
