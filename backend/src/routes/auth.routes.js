'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const tenantRepo = require('../repositories/tenant.repository');
const authMiddleware = require('../middlewares/auth.middleware');
const config = require('../config');
const logger = require('../config/logger');

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

/**
 * POST /api/auth/login
 * { email, password } → sets httpOnly JWT cookie + returns user info
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' },
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Return same message whether user doesn't exist or password is wrong
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        accountId: user.accountId,
        email: user.email,
        name: user.name,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.cookie('token', token, COOKIE_OPTIONS);

    logger.info('[Auth] Login successful', { userId: user._id, accountId: user.accountId, email: user.email });

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        accountId: user.accountId,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Returns the logged-in user and their tenant's business name.
 */
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not found' },
      });
    }

    const tenant = await tenantRepo.findByAccountId(req.accountId);

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        tenant: tenant
          ? { businessName: tenant.businessName, accountId: tenant.accountId }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Clears the auth cookie.
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'strict' });
  res.json({ success: true, data: { message: 'Logged out' } });
});

module.exports = router;
