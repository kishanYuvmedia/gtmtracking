import './database/loadenv';

import path from 'path';
import express from 'express';
import type { IncomingMessage } from 'http';
import cors from 'cors';
import helmet from 'helmet';

import { apiRouter } from './api';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { captureIp } from './middleware/captureIp';
import { testConnection } from './database';
import { startEventWorker, stopEventWorker } from './queues/eventWorker';
import { closeEventQueue } from './queues/eventQueue';
import { v1Routes } from './api/routes/v1';

const app = express();

// Hostinger provides PORT through environment variables
const PORT = Number(process.env.PORT) || 4000;

// =====================================================
// EXPRESS CONFIG
// =====================================================

app.set('trust proxy', 1);

// =====================================================
// SECURITY / MIDDLEWARE
// =====================================================

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: '4mb',
    verify: (req, _res, buffer) => {
      if (
        ((req.url || '').startsWith('/api/collect')
          || (req.url || '').startsWith('/api/identify')
          || (req.url || '').startsWith('/api/batch')
          || (req.url || '').startsWith('/api/v1/')
          || (req.url || '').startsWith('/v1/'))
      ) {
        (req as IncomingMessage & { rawBody?: string }).rawBody = buffer.toString('utf8');
      }
    },
  })
);

app.use(rateLimiter);
app.use(captureIp);

// =====================================================
// API
// =====================================================

app.use('/api', apiRouter);
app.use('/v1', v1Routes);

// =====================================================
// TRACKER FILES
// =====================================================

app.get('/tracker.js', (_req, res) => {
  res.sendFile(
    path.join(__dirname, '../scripts/pixel/tracker.js')
  );
});

app.get('/tracker.v2.js', (_req, res) => {
  res.sendFile(
    path.join(__dirname, '../scripts/pixel/tracker.v2.js')
  );
});

app.get('/tracker.v3.js', (_req, res) => {
  res.sendFile(
    path.join(__dirname, '../scripts/pixel/tracker.v3.js')
  );
});

// =====================================================
// HEALTH CHECK
// =====================================================

app.get('/health', (_req, res) => {
  const mongoose = require('mongoose');

  const dbState = mongoose.connection.readyState;

  let databaseStatus = 'disconnected';

  if (dbState === 1) {
    databaseStatus = 'connected';
  } else if (dbState === 2) {
    databaseStatus = 'connecting';
  }

  res.status(200).json({
    status: 'ok',
    server: 'running',
    database: databaseStatus,
    timestamp: new Date().toISOString(),
  });
});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use(errorHandler);

// =====================================================
// START SERVER
// =====================================================
//
// IMPORTANT FOR HOSTINGER:
//
// app.listen() MUST happen immediately.
// Do not wait for MongoDB before starting the server.
//

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);

  // Connect to MongoDB AFTER server starts
  connectDatabase();
});

// =====================================================
// DATABASE CONNECTION
// =====================================================

async function connectDatabase(): Promise<void> {
  try {
    const connected = await testConnection();

    if (connected) {
      console.log('MongoDB connected successfully');
      await startEventWorker();
    } else {
      console.error(
        'MongoDB connection failed. Server will remain running.'
      );
    }
  } catch (error) {
    console.error(
      'Unexpected MongoDB connection error:',
      error
    );
  }
}

// =====================================================
// PROCESS ERROR HANDLING
// =====================================================

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down server...');

  server.close(() => {
    void Promise.all([stopEventWorker(), closeEventQueue()]).finally(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down server...');

  server.close(() => {
    void Promise.all([stopEventWorker(), closeEventQueue()]).finally(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

export default app;