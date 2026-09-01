import './database/loadenv';

import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRouter } from './api';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { captureIp } from './middleware/captureIp';
import { testConnection } from './database';

const app = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimiter);
app.use(captureIp);

app.use('/api', apiRouter);

app.get('/tracker.js', (_req, res) => {
  res.sendFile(path.join(__dirname, '../scripts/pixel/tracker.js'));
});

app.get('/tracker.v2.js', (_req, res) => {
  res.sendFile(path.join(__dirname, '../scripts/pixel/tracker.v2.js'));
});

app.get('/tracker.v3.js', (_req, res) => {
  res.sendFile(path.join(__dirname, '../scripts/pixel/tracker.v3.js'));
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

async function start() {
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting.');
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();

export default app;
