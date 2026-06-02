import { Router } from 'express';
import { webhookController } from '../../controllers/webhookController';

export const webhookRoutes = Router();

webhookRoutes.post('/meta', webhookController.handleMetaWebhook);
webhookRoutes.get('/meta', webhookController.verifyMetaWebhook);
