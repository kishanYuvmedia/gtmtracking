import { Router } from 'express';
import { authRoutes } from './routes/auth';
import { collectRoutes } from './routes/collect';
import { identifyRoutes } from './routes/identify';
import { batchRoutes } from './routes/batch';
import { websiteRoutes } from './routes/websites';
import { eventRoutes } from './routes/events';
import { journeyRoutes } from './routes/journey';
import { v1Routes } from './routes/v1';
import { sourceRoutes } from './routes/sources';
import { workspaceRoutes } from './routes/workspace';

export const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/collect', collectRoutes);
apiRouter.use('/identify', identifyRoutes);
apiRouter.use('/batch', batchRoutes);
apiRouter.use('/websites', websiteRoutes);
apiRouter.use('/events', eventRoutes);
apiRouter.use('/journeys', journeyRoutes);
apiRouter.use('/v1', v1Routes);
apiRouter.use('/sources', sourceRoutes);
apiRouter.use('/workspace', workspaceRoutes);
