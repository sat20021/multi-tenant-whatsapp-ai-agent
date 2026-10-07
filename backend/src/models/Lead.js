'use strict';

const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    accountId: {
      type: String,
      required: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
      default: 'Unknown',
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'interested', 'converted'],
      default: 'new',
    },
    humanTakeover: {
      type: Boolean,
      default: false,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Unique per tenant: one lead per phone per tenant
leadSchema.index({ accountId: 1, phone: 1 }, { unique: true });

// Support listing leads by tenant sorted by lastMessageAt
leadSchema.index({ accountId: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);
