import { Router } from 'express';
import { authRoutes } from './routes/auth';
import { collectRoutes } from './routes/collect';
import { identifyRoutes } from './routes/identify';
import { batchRoutes } from './routes/batch';
import { webhookRoutes } from './routes/webhooks';
import { websiteRoutes } from './routes/websites';
import { eventRoutes } from './routes/events';

export const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/collect', collectRoutes);
apiRouter.use('/identify', identifyRoutes);
apiRouter.use('/batch', batchRoutes);
apiRouter.use('/webhooks', webhookRoutes);
apiRouter.use('/websites', websiteRoutes);
apiRouter.use('/events', eventRoutes);
