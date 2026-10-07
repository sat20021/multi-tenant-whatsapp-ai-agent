'use strict';

require('dotenv').config();

const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const { connectMongoDB, disconnectMongoDB } = require('./config/database');
const { closeRedis } = require('./config/redis');
const { closeQueue } = require('./queue/queue');
const { startWorker, stopWorker } = require('./queue/worker');

let server = null;

async function start() {
  // Connect to MongoDB
  await connectMongoDB();

  // Start BullMQ worker in same process (can be separated for scaling)
  await startWorker();

  // Start HTTP server
  server = app.listen(config.port, () => {
    logger.info('[Server] Started', {
      port: config.port,
      env: config.env,
      pid: process.pid,
    });
  });

  server.on('error', (err) => {
    logger.error('[Server] HTTP server error', { error: err.message });
    process.exit(1);
  });
}

async function shutdown(signal) {
  logger.info(`[Server] Received ${signal} — graceful shutdown`);

  // Stop accepting new connections
  if (server) {
    server.close(() => logger.info('[Server] HTTP server closed'));
  }

  // Stop worker from accepting new jobs and finish current
  await stopWorker();

  // Close queue
  await closeQueue();

  // Disconnect from MongoDB and Redis
  await disconnectMongoDB();
  await closeRedis();

  logger.info('[Server] Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('[Server] Unhandled promise rejection', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('[Server] Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

start().catch((err) => {
  logger.error('[Server] Failed to start', { error: err.message });
  process.exit(1);
});
