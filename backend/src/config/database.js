'use strict';

const mongoose = require('mongoose');
const config = require('./index');
const logger = require('./logger');

let isConnected = false;

async function connectMongoDB() {
  if (isConnected) return;
  await mongoose.connect(config.mongodb.uri, {
    serverSelectionTimeoutMS: 5000,
  });
  isConnected = true;
  logger.info('[MongoDB] Connected', { uri: config.mongodb.uri });
}

async function disconnectMongoDB() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info('[MongoDB] Disconnected');
}

mongoose.connection.on('error', (err) => {
  logger.error('[MongoDB] Connection error', { error: err.message });
});

module.exports = { connectMongoDB, disconnectMongoDB };
