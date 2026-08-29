import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/authRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import adminDisputeRoutes from './routes/adminDisputeRoutes.js';
import adminMasterRoutes from './routes/adminMasterRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import qrRoutes from './routes/qrRoutes.js';
import contractRoutes from './routes/contractRoutes.js';
import gamificationRoutes from './routes/gamificationRoutes.js';
import deploymentRoutes from './routes/deploymentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

// Import socket
import { initializeSocket } from './socket/socketManager.js';

// Import jobs
import { startAutoReleaseJob } from './jobs/autoRelease.js';

// Import error handling
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const httpServer = createServer(app);

// ====================
// ENVIRONMENT CONFIGURATION
// ====================
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lumintern';

// ====================
// CORS CONFIGURATION
// ====================
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      // Development
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:3000',
      // Production - Update these with your actual URLs
      process.env.FRONTEND_URL,
      process.env.NETLIFY_URL,
      'https://lumintern.netlify.app',
      'https://www.lumintern.com',
      'https://lumintern.com',
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1 || NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

// ====================
// GLOBAL MIDDLEWARE
// ====================

// Security HTTP headers
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (NODE_ENV === 'production' ? 100 : 1000),
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: NODE_ENV === 'production', // Trust proxy on Render
});
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Trust proxy for rate limiting on Render
app.set('trust proxy', 1);

// ====================
// ROUTES
// ====================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'LUMINTERN API is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: '1.0.0',
    uptime: process.uptime(),
    features: {
      escrowPayments: true,
      autoRelease: true,
      disputeResolution: true,
      realTimeChat: true,
      digitalWallet: true,
      gamification: true,
      qrGenerator: true,
      contractEngine: true,
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminDisputeRoutes);
app.use('/api/admin', adminMasterRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/business', qrRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/deployment', deploymentRoutes);
app.use('/api/notifications', notificationRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to LUMINTERN API',
    documentation: '/api/health',
    version: '1.0.0',
  });
});

// ====================
// ERROR HANDLING
// ====================

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ====================
// DATABASE CONNECTION & SERVER START
// ====================

mongoose.set('strictQuery', false);

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);

    // Initialize Socket.io
    const io = initializeSocket(httpServer);

    // Start auto-release cron job
    if (NODE_ENV === 'production') {
      startAutoReleaseJob();
      console.log('⏰ Auto-release job scheduled');
    }

    // Start server
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('🚀 ══════════════════════════════════════════════════════════════');
      console.log(`🚀  LUMINTERN API Server`);
      console.log(`🚀  Environment: ${NODE_ENV}`);
      console.log(`🚀  Port: ${PORT}`);
      console.log(`🚀  URL: http://localhost:${PORT}`);
      console.log(`🚀  Health: http://localhost:${PORT}/api/health`);
      console.log('🚀 ══════════════════════════════════════════════════════════════');
      console.log('');
      console.log('✅ Socket.io ready for connections');
      console.log('✅ All systems operational');
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('Please check your MONGODB_URI environment variable');
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  if (NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => {
    mongoose.connection.close(false, () => {
      console.log('✅ Process terminated');
      process.exit(0);
    });
  });
});

export default app;