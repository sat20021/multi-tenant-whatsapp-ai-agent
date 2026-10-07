'use strict';

const Lead = require('../models/Lead');

/**
 * Find all leads for a tenant, sorted newest message first.
 * Always scoped to accountId — no accidental cross-tenant access.
 */
async function findAll(accountId) {
  return Lead.find({ accountId }).sort({ lastMessageAt: -1 }).lean();
}

/**
 * Find a single lead by ID, scoped to accountId.
 * Returns null if the lead exists but belongs to a different tenant.
 * Callers should convert null to 404 — never 403 — so tenant existence isn't revealed.
 */
async function findById(accountId, leadId) {
  return Lead.findOne({ _id: leadId, accountId }).lean();
}

/**
 * Find or create a lead by phone number within a tenant.
 * Returns { lead, created } where created is true on first message.
 */
async function findOrCreate(accountId, phone, name) {
  const existing = await Lead.findOne({ accountId, phone }).lean();
  if (existing) return { lead: existing, created: false };

  const lead = await Lead.create({ accountId, phone, name: name || 'Unknown' });
  return { lead: lead.toObject(), created: true };
}

/**
 * Update the lead's lastMessageAt timestamp and optionally the name.
 */
async function touch(accountId, leadId, { name, lastMessageAt } = {}) {
  const update = { lastMessageAt: lastMessageAt || new Date() };
  if (name) update.name = name;
  return Lead.findOneAndUpdate({ _id: leadId, accountId }, update, { new: true }).lean();
}

/**
 * Set humanTakeover flag for a lead, scoped to accountId.
 */
async function setTakeover(accountId, leadId, enabled) {
  return Lead.findOneAndUpdate(
    { _id: leadId, accountId },
    { humanTakeover: enabled },
    { new: true }
  ).lean();
}

module.exports = { findAll, findById, findOrCreate, touch, setTakeover };
