require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const app = express();
const db = require('./config/db');
const logger = require('./config/logger');
const path = require('path');
const { apiLimiter, authLimiter, uploadLimiter, contactLimiter } = require('./middleware/rateLimiter');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const RAW_CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const ALLOWED_ORIGINS = RAW_CORS_ORIGIN.split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const ALLOW_ALL_CORS =
  process.env.CORS_ALLOW_ALL === 'true' ||
  (NODE_ENV === 'development' && process.env.CORS_ALLOW_ALL_DEV !== 'false');

// Validate critical environment variables in production
if (NODE_ENV === 'production') {
  const requiredEnvVars = ['JWT_SECRET', 'DB_PASSWORD', 'DB_HOST'];
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// Security middleware
app.use(helmet()); // Set various HTTP headers

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.request(req, res, duration);
  });
  next();
});

// CORS middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients (like curl, Postman)
    if (!origin) return callback(null, true);
    if (ALLOW_ALL_CORS) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Apply general API rate limiter
app.use(apiLimiter);

// Import routes
const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const researchRoutes = require('./routes/research');
const galleryRoutes = require('./routes/gallery');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');
const contentRoutes = require('./routes/content');
const postsRoutes = require('./routes/posts');
const engagementRoutes = require('./routes/engagement');

// ==================== ROUTES ====================

// Health checks (no rate limiting)
app.get('/', (req, res) => {
  res.json({ 
    message: 'ETERA Health Initiative API is running', 
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Readiness check for Kubernetes/Docker
app.get('/health/ready', (req, res) => {
  db.getConnection((err, connection) => {
    if (err) {
      logger.error('Database health check failed', err);
      return res.status(503).json({ 
        status: 'unhealthy', 
        reason: 'database_unavailable',
        timestamp: new Date().toISOString()
      });
    }
    connection.release();
    res.json({ 
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  });
});

// API Routes with rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/videos', uploadLimiter, videoRoutes);
app.use('/api/research', uploadLimiter, researchRoutes);
app.use('/api/gallery', uploadLimiter, galleryRoutes);
app.use('/api/contact', contactLimiter, contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/engagement', engagementRoutes);

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`${req.method} ${req.path}`, err);
  
  // Rate limit exceeded
  if (err.status === 429) {
    return res.status(429).json({
      message: err.message,
      retryAfter: err.retryAfter,
      timestamp: new Date().toISOString()
    });
  }

  // File size limit
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      message: 'Upload too large. The maximum file size is 100MB.',
      timestamp: new Date().toISOString()
    });
  }

  // Specific validation errors
  if (err.message && err.message.includes('Only video files')) {
    return res.status(400).json({ 
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }

  if (err.message && err.message.includes('Only PDF or Word documents')) {
    return res.status(400).json({ 
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }

  if (err.message && err.message.includes('CORS blocked')) {
    return res.status(403).json({ 
      message: 'CORS policy violation',
      timestamp: new Date().toISOString()
    });
  }

  // Default error response
  const status = err.status || err.statusCode || 500;
  const response = {
    message: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  };

  if (NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err.details || null;
  }

  res.status(status).json(response);
});

// ==================== SERVER STARTUP ====================

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, {
    environment: NODE_ENV,
    corsEnabled: !ALLOW_ALL_CORS,
    corsOrigins: ALLOWED_ORIGINS,
    rateLimitingEnabled: true
  });

  if (ALLOW_ALL_CORS) {
    logger.warn('⚠️  CORS allow all is enabled (development mode only)');
  }
});

// ==================== GRACEFUL SHUTDOWN ====================

const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    db.end(() => {
      logger.info('Database connection closed');
      process.exit(0);
    });
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after 30 seconds');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at Promise', reason);
  process.exit(1);
});

module.exports = app;


