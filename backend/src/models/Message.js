'use strict';

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    accountId: {
      type: String,
      required: true,
      index: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    // Unique WhatsApp message ID — used for idempotency
    waMessageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ['in', 'out'],
      required: true,
    },
    sender: {
      type: String,
      enum: ['lead', 'ai', 'fallback', 'human'],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    // Only set for ai/fallback messages: time from incoming message to reply
    latencyMs: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

// Support fetching chat history for a lead in chronological order
messageSchema.index({ accountId: 1, leadId: 1, createdAt: 1 });

// Support fetching last N messages for AI context quickly
messageSchema.index({ leadId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
