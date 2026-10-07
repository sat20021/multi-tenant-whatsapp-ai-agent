'use strict';

const mongoose = require('mongoose');

const sentMessageSchema = new mongoose.Schema(
  {
    accountId: {
      type: String,
      required: true,
      index: true,
    },
    phoneNumberId: {
      type: String,
      required: true,
    },
    to: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    replyToWaMessageId: {
      type: String,
      default: null,
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

module.exports = mongoose.model('SentMessage', sentMessageSchema);
