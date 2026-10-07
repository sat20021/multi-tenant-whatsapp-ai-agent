'use strict';

const { Redis } = require('ioredis');
const config = require('./index');
const logger = require('./logger');

function createRedisClient() {
  const client = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
  });

  client.on('connect', () => logger.info('[Redis] Connected'));
  client.on('error', (err) => logger.error('[Redis] Error', { error: err.message }));
  client.on('close', () => logger.warn('[Redis] Connection closed'));

  return client;
}

// Single shared clients for worker and queue
let _redisClient = null;
let _redisSubscriber = null;

function getRedisClient() {
  if (!_redisClient) {
    _redisClient = createRedisClient();
  }
  return _redisClient;
}

function getRedisSubscriber() {
  if (!_redisSubscriber) {
    _redisSubscriber = createRedisClient();
  }
  return _redisSubscriber;
}

async function closeRedis() {
  if (_redisClient) {
    await _redisClient.quit();
    _redisClient = null;
  }
  if (_redisSubscriber) {
    await _redisSubscriber.quit();
    _redisSubscriber = null;
  }
  logger.info('[Redis] Closed');
}

module.exports = { getRedisClient, getRedisSubscriber, createRedisClient, closeRedis };
