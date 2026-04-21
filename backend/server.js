require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const app = express();
const db = require('./config/db');
const logger = require('./config/logger');
const path = require('path');

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

// Middleware
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'ETERA Health Initiative API is running', 
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Readiness check for Kubernetes/Docker
app.get('/health/ready', (req, res) => {
  // Check database connection
  db.getConnection((err, connection) => {
    if (err) {
      logger.error('Database health check failed', err);
      return res.status(503).json({ status: 'unhealthy', reason: 'database_unavailable' });
    }
    connection.release();
  logger.error(`${req.method} ${req.path}`, err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      message: 'Upload too large. The maximum file size is 100MB.'
    });
  }
  if (err.message && err.message.includes('Only video files')) {
    return res.status(400).json({ message: err.message });
  }
  if (err.message && err.message.includes('Only PDF or Word documents')) {
    return res.status(400).json({ message: err.message });
  }
  if (err.message && err.message.includes('CORS blocked')) {
    return res.status(403).json({ message: 'CORS policy violation' });
  }

  const status = err.status || err.statusCode || 500;
  const response = {
    message: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  };

  if (NODE_ENV === 'development') {
    response.error = {
      stack: err.stack,
      details: err.details || null
    };
  }

  res.status(status).json(response);
});

// 404 handler
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, {
    environment: NODE_ENV,
    corsEnabled: !ALLOW_ALL_CORS,
    corsOrigins: ALLOWED_ORIGINS
  });

  if (ALLOW_ALL_CORS) {
    logger.warn('CORS allow all is enabled (development mode)');
  }
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    db.end(() => {
      logger.info('Database connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    db.end(() => {
      logger.info('Database connection closed');
      process.exit(0);
    });
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise: promise.toString() });
  process.exit(1); message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  if (ALLOW_ALL_CORS) {
    console.log('CORS: allow all origins (dev override enabled)');
  } else {
    console.log(`CORS Origins: ${ALLOWED_ORIGINS.join(', ')}`);
  }
});


