'use strict';

require('dotenv').config();

const { Worker } = require('bullmq');
const { getRedisClient } = require('../config/redis');
const { connectMongoDB, disconnectMongoDB } = require('../config/database');
const { closeRedis } = require('../config/redis');
const config = require('../config');
const logger = require('../config/logger');
const { QUEUE_NAME } = require('./queue');
const { processMessage } = require('./messageProcessor');

let worker = null;

async function startWorker() {
  await connectMongoDB();

  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      return processMessage(job);
    },
    {
      connection: getRedisClient(),
      concurrency: config.worker.concurrency,
    }
  );

  worker.on('completed', (job) => {
    logger.info('[Worker] Job completed', {
      jobId: job.id,
      waMessageId: job.data.waMessageId,
      accountId: job.data.accountId,
      leadId: job.data.leadId,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error('[Worker] Job failed', {
      jobId: job?.id,
      waMessageId: job?.data?.waMessageId,
      accountId: job?.data?.accountId,
      leadId: job?.data?.leadId,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  worker.on('error', (err) => {
    logger.error('[Worker] Worker error', { error: err.message });
  });

  logger.info('[Worker] Started', {
    queue: QUEUE_NAME,
    concurrency: config.worker.concurrency,
  });

  return worker;
}

async function stopWorker() {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('[Worker] Stopped');
  }
}

// Graceful shutdown
async function shutdown(signal) {
  logger.info(`[Worker] Received ${signal}, shutting down gracefully`);
  await stopWorker();
  await disconnectMongoDB();
  await closeRedis();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Run if executed directly (standalone worker process)
if (require.main === module) {
  startWorker().catch((err) => {
    logger.error('[Worker] Failed to start', { error: err.message });
    process.exit(1);
  });
}

module.exports = { startWorker, stopWorker };
