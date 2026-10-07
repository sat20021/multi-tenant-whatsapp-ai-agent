'use strict';

const express = require('express');
const leadRepo = require('../repositories/lead.repository');
const messageRepo = require('../repositories/message.repository');
const logger = require('../config/logger');

const router = express.Router();

/**
 * GET /api/leads
 * Returns all leads for the authenticated tenant, newest message first.
 * Always scoped to req.accountId (set by auth middleware from JWT).
 */
router.get('/', async (req, res, next) => {
  try {
    const leads = await leadRepo.findAll(req.accountId);

    // Attach last message preview to each lead
    const leadsWithPreview = await Promise.all(
      leads.map(async (lead) => {
        const messages = await messageRepo.findForLead(req.accountId, lead._id);
        const lastMsg = messages[messages.length - 1];
        return {
          ...lead,
          lastMessageText: lastMsg?.text?.slice(0, 100) || null,
          lastMessageDirection: lastMsg?.direction || null,
          lastMessageSender: lastMsg?.sender || null,
        };
      })
    );

    res.json({ success: true, data: leadsWithPreview });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/leads/:leadId/messages
 * Returns full chat history for a lead, oldest first.
 *
 * ISOLATION: findById scopes to req.accountId. If leadId belongs to
 * another tenant, returns null → 404. The lead's existence is not revealed.
 */
router.get('/:leadId/messages', async (req, res, next) => {
  try {
    const lead = await leadRepo.findById(req.accountId, req.params.leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Lead not found' },
      });
    }

    const messages = await messageRepo.findForLead(req.accountId, req.params.leadId);
    res.json({ success: true, data: { lead, messages } });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Lead not found' },
      });
    }
    next(err);
  }
});

/**
 * PATCH /api/leads/:leadId/takeover
 * { enabled: true|false } — enables or disables human takeover for this lead.
 * When humanTakeover is true, the worker skips AI reply generation.
 */
router.patch('/:leadId/takeover', async (req, res, next) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'enabled must be a boolean' },
      });
    }

    const lead = await leadRepo.setTakeover(req.accountId, req.params.leadId, enabled);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Lead not found' },
      });
    }

    logger.info('[Leads] Takeover updated', {
      accountId: req.accountId,
      leadId: req.params.leadId,
      humanTakeover: enabled,
    });

    res.json({ success: true, data: lead });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Lead not found' },
      });
    }
    next(err);
  }
});

module.exports = router;
