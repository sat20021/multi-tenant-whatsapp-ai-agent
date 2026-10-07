'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const config = require('./config');
const logger = require('./config/logger');
const authMiddleware = require('./middlewares/auth.middleware');
const errorHandler = require('./middlewares/errorHandler');

const webhookRoutes = require('./routes/webhook.routes');
const authRoutes = require('./routes/auth.routes');
const leadRoutes = require('./routes/lead.routes');
const devRoutes = require('./routes/dev.routes');

const app = express();

// Trust proxy (needed if behind nginx/load balancer)
app.set('trust proxy', 1);

// Parse JSON bodies
app.use(express.json({ limit: '1mb' }));

// Parse cookies (for JWT httpOnly cookie)
app.use(cookieParser());

// HTTP request logging
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req) => req.path === '/health',
  })
);

// CORS for dev (React dev server)
if (config.isDev) {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
}

// Health check (no auth)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook (no auth — Meta calls this)
app.use('/webhook', webhookRoutes);

// Auth routes (login is public, /me requires auth)
app.use('/api/auth', authRoutes);

// Protected routes — all require valid JWT
app.use('/api/leads', authMiddleware, leadRoutes);
app.use('/api/dev', authMiddleware, devRoutes);

// 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
});

// Centralized error handler (must be last)
app.use(errorHandler);

module.exports = app;
