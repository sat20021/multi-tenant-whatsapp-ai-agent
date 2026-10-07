'use strict';

const express = require('express');
const fetch = require('node-fetch');
const tenantRepo = require('../repositories/tenant.repository');
const config = require('../config');
const logger = require('../config/logger');

const router = express.Router();

/**
 * POST /api/dev/simulate-message
 *
 * Allows the dashboard test panel to send a customer message.
 * This endpoint:
 *   1. Resolves tenant from req.accountId (JWT) — not from the request body
 *   2. Looks up the tenant's phone_number_id
 *   3. Builds a genuine Meta-format payload
 *   4. POSTs to the ACTUAL webhook — does NOT skip the queue
 *
 * This is intentionally disabled in production (NODE_ENV === 'production').
 *
 * Security: accountId comes from JWT, phoneNumberId comes from tenant DB record.
 * The client cannot inject a different tenant's phoneNumberId.
 */
router.post('/simulate-message', async (req, res, next) => {
  if (config.env === 'production') {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Not found' },
    });
  }

  try {
    const { leadPhone, leadName, text } = req.body;

    if (!leadPhone || !text) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'leadPhone and text are required' },
      });
    }

    // Resolve tenant from JWT accountId — never from request body
    const tenant = await tenantRepo.findByAccountId(req.accountId);
    if (!tenant) {
      return res.status(500).json({
        success: false,
        error: { code: 'TENANT_NOT_FOUND', message: 'Tenant configuration not found' },
      });
    }

    // Build genuine Meta-format payload
    const msgId = `wamid.sim-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA_SIM',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '0000000000',
                  phone_number_id: tenant.phoneNumberId, // Comes from DB, not client
                },
                contacts: [
                  {
                    profile: { name: leadName || 'Test Lead' },
                    wa_id: leadPhone,
                  },
                ],
                messages: [
                  {
                    from: leadPhone,
                    id: msgId,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: 'text',
                    text: { body: text },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    logger.info('[Dev] Simulating message', {
      accountId: req.accountId,
      leadPhone,
      msgId,
      textPreview: text.slice(0, 50),
    });

    // POST to the actual webhook — goes through the full pipeline
    const webhookRes = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    res.json({
      success: true,
      data: {
        msgId,
        webhookStatus: webhookRes.status,
        message: 'Message sent through webhook pipeline',
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
