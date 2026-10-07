'use strict';

const express = require('express');
const tenantRepo = require('../repositories/tenant.repository');
const leadRepo = require('../repositories/lead.repository');
const messageRepo = require('../repositories/message.repository');
const { addMessageJob } = require('../queue/queue');
const config = require('../config');
const logger = require('../config/logger');

const router = express.Router();

/**
 * GET /webhook/whatsapp
 *
 * Meta Webhook verification endpoint.
 * Meta calls this with hub.mode, hub.verify_token, and hub.challenge
 * when configuring the webhook in the Meta Developer Console.
 */
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    logger.info('[Webhook] Meta verification successful');
    return res.status(200).send(challenge);
  }

  logger.warn('[Webhook] Meta verification failed: token mismatch', { token });
  return res.sendStatus(403);
});

/**
 * POST /webhook/whatsapp
 *
 * Meta-format WhatsApp webhook. No authentication (Meta calls this directly).
 *
 * Flow:
 *   1. Validate payload structure
 *   2. Extract phone_number_id → resolve tenant
 *   3. Only handle text messages; ignore others
 *   4. Find or create lead
 *   5. Save incoming message (unique index on waMessageId for idempotency)
 *   6. Add BullMQ job
 *   7. Return 200 immediately — NEVER call LLM here
 *
 * Target: < 200ms response time
 */
router.post('/whatsapp', async (req, res) => {
  // Always return 200 to Meta (even on errors) to prevent retries
  // of genuinely unprocessable payloads
  res.status(200).json({ status: 'ok' });

  // Process asynchronously after response is sent
  try {
    await handleWebhookPayload(req.body);
  } catch (err) {
    logger.error('[Webhook] Unhandled processing error', { error: err.message });
  }
});

async function handleWebhookPayload(body) {
  // 1. Validate basic payload structure
  if (!body || body.object !== 'whatsapp_business_account') {
    logger.debug('[Webhook] Ignoring non-WhatsApp payload');
    return;
  }

  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  if (!value || change?.field !== 'messages') {
    logger.debug('[Webhook] Ignoring non-message event');
    return;
  }

  const phoneNumberId = value.metadata?.phone_number_id;
  const messages = value.messages;
  const contacts = value.contacts;

  if (!phoneNumberId) {
    logger.warn('[Webhook] Missing phone_number_id in payload');
    return;
  }

  if (!messages || messages.length === 0) {
    logger.debug('[Webhook] No messages in payload — status update or other event');
    return;
  }

  const msg = messages[0];

  // 2. Only handle text messages
  if (msg.type !== 'text') {
    logger.debug('[Webhook] Ignoring non-text message', { type: msg.type });
    return;
  }

  const waMessageId = msg.id;
  const leadPhone = msg.from;
  const text = msg.text?.body;
  const leadName = contacts?.[0]?.profile?.name || 'Unknown';

  if (!waMessageId || !leadPhone || !text) {
    logger.warn('[Webhook] Incomplete message payload', { waMessageId, leadPhone });
    return;
  }

  // 3. Resolve tenant from phone_number_id ONLY — never from body/URL
  const tenant = await tenantRepo.findByPhoneNumberId(phoneNumberId);
  if (!tenant) {
    logger.warn('[Webhook] Unknown phone_number_id', { phoneNumberId });
    return;
  }

  const { accountId } = tenant;

  logger.info('[Webhook] Incoming message', {
    accountId,
    phoneNumberId,
    leadPhone,
    waMessageId,
    textPreview: text.slice(0, 50),
  });

  // 4. Find or create lead
  const { lead } = await leadRepo.findOrCreate(accountId, leadPhone, leadName);

  // Update lead name and lastMessageAt
  await leadRepo.touch(accountId, lead._id, { name: leadName });

  const receivedAt = new Date().toISOString();

  // 5. Save incoming message — MongoDB unique index on waMessageId prevents duplicates
  let savedMessage;
  try {
    savedMessage = await messageRepo.saveIncoming({
      accountId,
      leadId: lead._id,
      waMessageId,
      text,
    });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate message ID — already processed, return 200 (already sent above)
      logger.info('[Webhook] Duplicate message — already processed', {
        accountId,
        leadId: lead._id.toString(),
        waMessageId,
      });
      return;
    }
    throw err;
  }

  logger.info('[Webhook] Message saved', {
    accountId,
    leadId: lead._id.toString(),
    waMessageId,
    messageId: savedMessage._id.toString(),
  });

  // 6. Enqueue for async processing — do NOT call LLM here
  await addMessageJob({
    accountId,
    leadId: lead._id.toString(),
    waMessageId,
    leadPhone,
    text,
    receivedAt,
  });

  logger.info('[Webhook] Job enqueued', {
    accountId,
    leadId: lead._id.toString(),
    waMessageId,
  });
}

module.exports = router;
