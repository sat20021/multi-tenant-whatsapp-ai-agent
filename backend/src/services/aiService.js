'use strict';

const axios = require('axios');
const config = require('../config');
const logger = require('../config/logger');

/**
 * Call the Python LangGraph AI service to generate a reply.
 *
 * The Node worker is responsible for:
 *   1. Loading tenant data from MongoDB (scoped to accountId)
 *   2. Loading conversation history (last 10 messages)
 *   3. Passing ONLY this tenant's data to the Python service
 *
 * The Python service never has direct DB access — it only gets what we pass it.
 * This is the primary architectural guarantee for tenant isolation in AI replies.
 *
 * @param {Object} params
 * @param {Object} params.tenant - { businessName, tone, language, faqs, pricing }
 * @param {Array}  params.history - [{role: 'user'|'assistant', content: string}]
 * @param {string} params.currentMessage - The lead's current message text
 * @returns {Promise<{ response: string, usedFallback: boolean }>}
 */
async function callAIService({ tenant, history, currentMessage }) {
  const url = `${config.ai.serviceUrl}/agent/reply`;

  const response = await axios.post(
    url,
    { tenant, history, currentMessage },
    {
      timeout: config.ai.timeoutMs,
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.data || !response.data.response) {
    throw new Error('AI service returned empty response');
  }

  return {
    response: response.data.response,
    usedFallback: response.data.used_fallback || false,
  };
}

module.exports = { callAIService };
