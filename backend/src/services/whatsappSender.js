'use strict';

const SentMessage = require('../models/SentMessage');
const config = require('../config');
const logger = require('../config/logger');

/**
 * Send (or mock-send) a WhatsApp message.
 *
 * In mock mode: saves to SentMessage collection.
 * In real mode: would POST to Meta Graph API (not required for this assignment).
 *
 * @param {Object} params
 * @param {string} params.accountId
 * @param {string} params.phoneNumberId - Tenant's WhatsApp phone number ID
 * @param {string} params.to - Recipient phone number
 * @param {string} params.text - Message body
 * @param {string} [params.replyToWaMessageId] - Original incoming message ID
 */
async function sendWhatsAppMessage({ accountId, phoneNumberId, to, text, replyToWaMessageId }) {
  if (config.whatsapp.mode === 'mock') {
    await SentMessage.create({
      accountId,
      phoneNumberId,
      to,
      text,
      replyToWaMessageId: replyToWaMessageId || null,
      sentAt: new Date(),
    });
    logger.info('[MOCK SEND] Message sent', { accountId, phoneNumberId, to, textPreview: text.slice(0, 50) });
    return;
  }

  // Real Meta Cloud API mode
  const axios = require('axios');
  try {
    const metaRes = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${config.whatsapp.token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    await SentMessage.create({
      accountId,
      phoneNumberId,
      to,
      text,
      replyToWaMessageId: replyToWaMessageId || null,
      sentAt: new Date(),
    });

    logger.info('[REAL SEND] Message sent via Meta Cloud API', {
      accountId,
      phoneNumberId,
      to,
      metaMessageId: metaRes.data?.messages?.[0]?.id,
    });
  } catch (err) {
    const metaErr = err.response?.data?.error || err.message;
    logger.error('[REAL SEND] Failed to send via Meta Cloud API', {
      error: metaErr,
      phoneNumberId,
      to,
    });
    throw err;
  }
}

module.exports = { sendWhatsAppMessage };
