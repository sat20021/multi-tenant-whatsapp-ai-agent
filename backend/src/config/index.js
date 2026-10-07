'use strict';

require('dotenv').config();

const required = [
  'MONGODB_URI',
  'REDIS_HOST',
  'REDIS_PORT',
  'JWT_SECRET',
  'AI_SERVICE_URL',
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`[CONFIG] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  mongodb: {
    uri: process.env.MONGODB_URI,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  ai: {
    serviceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS, 10) || 25000,
  },

  whatsapp: {
    mode: process.env.WHATSAPP_MODE || 'mock',
    token: process.env.WHATSAPP_TOKEN || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'digitalonebox_verify_token',
  },

  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY, 10) || 20,
    jobAttempts: parseInt(process.env.JOB_ATTEMPTS, 10) || 3,
    jobBackoffDelay: parseInt(process.env.JOB_BACKOFF_DELAY, 10) || 2000,
  },

  webhookUrl: process.env.WEBHOOK_URL || 'http://localhost:4000/webhook/whatsapp',
};
