'use strict';

const { Queue } = require('bullmq');
const { getRedisClient } = require('../config/redis');
const config = require('../config');
const logger = require('../config/logger');

const QUEUE_NAME = 'whatsapp-messages';

let _queue = null;

function getQueue() {
  if (!_queue) {
    _queue = new Queue(QUEUE_NAME, {
      connection: getRedisClient(),
      defaultJobOptions: {
        attempts: config.worker.jobAttempts,
        backoff: {
          type: 'exponential',
          delay: config.worker.jobBackoffDelay,
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      },
    });

    _queue.on('error', (err) => {
      logger.error('[Queue] Queue error', { error: err.message });
    });
  }
  return _queue;
}

/**
 * Add a message processing job to the queue.
 *
 * jobId = waMessageId ensures BullMQ deduplicates jobs at the queue level
 * (secondary deduplication after MongoDB's unique index check).
 *
 * @param {Object} jobData
 * @param {string} jobData.accountId
 * @param {string} jobData.leadId
 * @param {string} jobData.waMessageId
 * @param {string} jobData.leadPhone
 * @param {string} jobData.text
 * @param {string} jobData.receivedAt - ISO timestamp when the webhook received this message
 */
async function addMessageJob(jobData) {
  const queue = getQueue();
  const job = await queue.add('process-message', jobData, {
    jobId: jobData.waMessageId, // Dedup at queue level
  });
  logger.debug('[Queue] Job added', {
    jobId: job.id,
    waMessageId: jobData.waMessageId,
    accountId: jobData.accountId,
    leadId: jobData.leadId,
  });
  return job;
}

async function closeQueue() {
  if (_queue) {
    await _queue.close();
    _queue = null;
    logger.info('[Queue] Closed');
  }
}

module.exports = { getQueue, addMessageJob, closeQueue, QUEUE_NAME };
