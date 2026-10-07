'use strict';

const { getRedisClient } = require('../config/redis');
const leadRepo = require('../repositories/lead.repository');
const messageRepo = require('../repositories/message.repository');
const tenantRepo = require('../repositories/tenant.repository');
const { callAIService } = require('../services/aiService');
const { sendWhatsAppMessage } = require('../services/whatsappSender');
const logger = require('../config/logger');

const LOCK_TTL_MS = 30000; // 30-second lock TTL
const LOCK_RETRY_DELAY_MS = 500;
const LOCK_MAX_RETRIES = 60; // Wait up to 30 seconds for lock

const FALLBACK_MESSAGE = "Thanks for your message! Our team will get back to you shortly.";

/**
 * Acquire a per-lead distributed lock using Redis SET NX PX.
 * Returns a release function, or null if lock could not be acquired.
 *
 * This ensures messages from the SAME lead are processed sequentially,
 * while messages from DIFFERENT leads run in parallel.
 *
 * If the worker crashes, the TTL on the Redis key ensures the lock
 * is automatically released after LOCK_TTL_MS milliseconds.
 */
async function acquireLeadLock(leadId) {
  const redis = getRedisClient();
  const lockKey = `lock:lead:${leadId}`;
  const lockValue = `${process.pid}-${Date.now()}`;

  for (let attempt = 0; attempt < LOCK_MAX_RETRIES; attempt++) {
    const result = await redis.set(lockKey, lockValue, 'NX', 'PX', LOCK_TTL_MS);
    if (result === 'OK') {
      return async () => {
        // Only release if we still own the lock (prevent releasing another worker's lock)
        const current = await redis.get(lockKey);
        if (current === lockValue) {
          await redis.del(lockKey);
        }
      };
    }
    // Lock is held by another worker; wait and retry
    await sleep(LOCK_RETRY_DELAY_MS);
  }

  return null; // Could not acquire lock after max retries
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Core message processor called by the BullMQ worker.
 *
 * Flow:
 *   1. Acquire per-lead lock (guarantees sequential processing per lead)
 *   2. Check if human takeover is active (skip AI if so)
 *   3. Load tenant config (only this tenant's data)
 *   4. Load last 10 messages (conversation memory)
 *   5. Call Python LangGraph AI service
 *   6. Save AI reply to Message collection
 *   7. Send via mock WhatsApp sender
 *   8. Release lock
 */
async function processMessage(job) {
  const { accountId, leadId, waMessageId, leadPhone, text, receivedAt } = job.data;
  const startTime = Date.now();

  logger.info('[Processor] Starting message processing', {
    jobId: job.id,
    accountId,
    leadId,
    waMessageId,
  });

  // 1. Acquire per-lead lock for ordered processing
  const releaseLock = await acquireLeadLock(leadId);
  if (!releaseLock) {
    throw new Error(`Could not acquire lock for lead ${leadId} — will retry`);
  }

  try {
    // 2. Check human takeover
    const lead = await leadRepo.findById(accountId, leadId);
    if (!lead) {
      logger.warn('[Processor] Lead not found — skipping', { accountId, leadId, waMessageId });
      return;
    }

    if (lead.humanTakeover) {
      logger.info('[Processor] Human takeover active — skipping AI reply', {
        accountId,
        leadId,
        waMessageId,
      });
      return;
    }

    // 3. Load tenant config (scoped to accountId)
    const tenant = await tenantRepo.findByAccountId(accountId);
    if (!tenant) {
      logger.error('[Processor] Tenant not found', { accountId, waMessageId });
      throw new Error(`Tenant not found: ${accountId}`);
    }

    // 4. Load last 10 messages for conversation memory
    const recentMessages = await messageRepo.getLastN(leadId, 10);
    const history = recentMessages.map((msg) => ({
      role: msg.direction === 'in' ? 'user' : 'assistant',
      content: msg.text,
    }));

    // 5. Call AI service — passing ONLY this tenant's data
    // This is the primary tenant isolation enforcement point.
    // The Python service receives NO cross-tenant information.
    let aiText;
    let usedFallback = false;

    try {
      const result = await callAIService({
        tenant: {
          businessName: tenant.businessName,
          tone: tenant.tone,
          language: tenant.language,
          faqs: tenant.faqs,
          pricing: tenant.pricing,
        },
        history,
        currentMessage: text,
      });
      aiText = result.response;
      usedFallback = result.usedFallback;
    } catch (aiError) {
      logger.error('[Processor] AI service failed — using fallback', {
        accountId,
        leadId,
        waMessageId,
        error: aiError.message,
      });
      aiText = FALLBACK_MESSAGE;
      usedFallback = true;
    }

    const latencyMs = Date.now() - new Date(receivedAt).getTime();
    const replyWaMessageId = `reply:${waMessageId}`;

    // 6. Save AI reply to Message collection
    await messageRepo.saveOutgoing({
      accountId,
      leadId,
      waMessageId: replyWaMessageId,
      text: aiText,
      sender: usedFallback ? 'fallback' : 'ai',
      latencyMs,
    });

    // 7. Send via mock WhatsApp sender
    await sendWhatsAppMessage({
      accountId,
      phoneNumberId: tenant.phoneNumberId,
      to: leadPhone,
      text: aiText,
      replyToWaMessageId: waMessageId,
    });

    logger.info('[Processor] Reply sent', {
      accountId,
      leadId,
      waMessageId,
      replyWaMessageId,
      sender: usedFallback ? 'fallback' : 'ai',
      latencyMs,
      processingMs: Date.now() - startTime,
    });

  } finally {
    // 8. Always release lock
    await releaseLock();
  }
}

module.exports = { processMessage };
