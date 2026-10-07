'use strict';

const Tenant = require('../models/Tenant');

/**
 * Find a tenant by their WhatsApp phoneNumberId.
 * This is the ONLY way webhook code resolves tenant identity.
 */
async function findByPhoneNumberId(phoneNumberId) {
  return Tenant.findOne({ phoneNumberId }).lean();
}

/**
 * Find a tenant by accountId.
 */
async function findByAccountId(accountId) {
  return Tenant.findOne({ accountId }).lean();
}

module.exports = { findByPhoneNumberId, findByAccountId };
