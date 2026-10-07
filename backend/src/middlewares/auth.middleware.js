'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../config/logger');

/**
 * Authentication middleware.
 *
 * Reads the JWT from:
 *   1. httpOnly cookie "token"
 *   2. Authorization: Bearer <token> header (fallback for API clients)
 *
 * Sets req.user and req.accountId — accountId ALWAYS comes from the token,
 * never from the request body or URL parameters.
 */
function authMiddleware(req, res, next) {
  const token =
    (req.cookies && req.cookies.token) ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
    };
    req.accountId = decoded.accountId; // NEVER from request body/params
    next();
  } catch (err) {
    logger.debug('[Auth] Token verification failed', { error: err.message });
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
    });
  }
}

module.exports = authMiddleware;
