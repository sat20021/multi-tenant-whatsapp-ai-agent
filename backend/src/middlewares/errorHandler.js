'use strict';

const logger = require('../config/logger');

/**
 * Centralized error handler middleware.
 *
 * In development: includes stack trace in response.
 * In production: only returns a safe error code and message.
 *
 * Always logs the full error server-side for debugging.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;
  const isDev = process.env.NODE_ENV !== 'production';

  logger.error('[ErrorHandler]', {
    status,
    message: err.message,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  const response = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: isDev ? err.message : (status < 500 ? err.message : 'Internal server error'),
    },
  };

  if (isDev && err.stack) {
    response.error.stack = err.stack;
  }

  res.status(status).json(response);
}

module.exports = errorHandler;
