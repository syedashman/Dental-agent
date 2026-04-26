/**
 * Dental WhatsApp Agent - Main Server
 * Production-ready Express server with all middleware configured
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { startScheduler } = require('./services/schedulerService');

// Route imports
const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhook');
const appointmentRoutes = require('./routes/appointments');
const dentistRoutes = require('./routes/dentists');
const clinicRoutes = require('./routes/clinics');
const patientRoutes = require('./routes/patients');
const analyticsRoutes = require('./routes/analytics');

const app = express();

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));

// Rate limiting - generous for webhooks, strict for API
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Body Parsing ──────────────────────────────────────────────────────────────
// Raw body needed for webhook signature verification
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: require('../package.json').version,
    environment: process.env.NODE_ENV,
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/webhook', webhookRoutes);          // No rate limit on webhooks
app.use('/api/auth', apiLimiter, authRoutes);
app.use('/api/appointments', apiLimiter, appointmentRoutes);
app.use('/api/dentists', apiLimiter, dentistRoutes);
app.use('/api/clinics', apiLimiter, clinicRoutes);
app.use('/api/patients', apiLimiter, patientRoutes);
app.use('/api/analytics', apiLimiter, analyticsRoutes);

// ─── 404 Handler ───────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    logger.info('✅ Database connected');

    // Start reminder/followup scheduler
    startScheduler();
    logger.info('✅ Scheduler started');

    app.listen(PORT, () => {
      logger.info(`🚀 Dental Agent Server running on port ${PORT}`);
      logger.info(`📱 WhatsApp webhook: ${process.env.BASE_URL}/api/webhook/whatsapp`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

startServer();

module.exports = app; // Export for testing
