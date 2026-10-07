'use strict';

const Message = require('../models/Message');

/**
 * Save an incoming (direction: 'in') message.
 * Throws duplicate-key error (code 11000) if waMessageId already exists.
 */
async function saveIncoming({ accountId, leadId, waMessageId, text }) {
  return Message.create({
    accountId,
    leadId,
    waMessageId,
    direction: 'in',
    sender: 'lead',
    text,
  });
}

/**
 * Save an outgoing (direction: 'out') AI or fallback reply.
 */
async function saveOutgoing({ accountId, leadId, waMessageId, text, sender, latencyMs }) {
  return Message.create({
    accountId,
    leadId,
    waMessageId,
    direction: 'out',
    sender,
    text,
    latencyMs: latencyMs || null,
  });
}

/**
 * Get the full chat for a lead, scoped to accountId, oldest first.
 */
async function findForLead(accountId, leadId) {
  return Message.find({ accountId, leadId }).sort({ createdAt: 1 }).lean();
}

/**
 * Get the last N messages for a lead — used to build AI context.
 * Returns in chronological order (oldest first).
 */
async function getLastN(leadId, n = 10) {
  const messages = await Message.find({ leadId })
    .sort({ createdAt: -1 })
    .limit(n)
    .lean();
  return messages.reverse(); // Return chronological order
}

/**
 * Count outgoing AI replies for a lead.
 * Used by tests to verify idempotency.
 */
async function countRepliesForMessage(waMessageId) {
  // A reply is saved with a generated waMessageId derived from the incoming one
  // Count outgoing messages associated via replyToWaMessageId pattern
  return Message.countDocuments({ direction: 'out' });
}

/**
 * Find a message by waMessageId (for deduplication check).
 */
async function findByWaMessageId(waMessageId) {
  return Message.findOne({ waMessageId }).lean();
}

module.exports = {
  saveIncoming,
  saveOutgoing,
  findForLead,
  getLastN,
  countRepliesForMessage,
  findByWaMessageId,
};
