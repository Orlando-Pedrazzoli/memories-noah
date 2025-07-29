const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const memoriesRoutes = require('./routes/memories');
const travelRoutes = require('./routes/travel');

const app = express();

// ⭐ CORREÇÃO: Trust proxy para Vercel
app.set('trust proxy', 1);

// ⭐ CORS CORRETO - Aplicar headers SEMPRE
app.use((req, res, next) => {
  // Aplicar headers CORS em TODA resposta
  res.header('Access-Control-Allow-Origin', 'https://noah-memories.vercel.app');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,DELETE,PATCH,OPTIONS'
  );
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token, X-Api-Version'
  );

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received for:', req.url);
    return res.status(200).json({
      status: 'OK',
      message: 'CORS preflight successful',
    });
  }

  next();
});

// Security middleware
app.use(helmet());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => {
    return req.path === '/api/health' || req.method === 'OPTIONS';
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/memories', memoriesRoutes);
app.use('/api/travel', travelRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Memory Site Server is running',
    cors: 'properly configured',
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Memory Site API',
    status: 'running',
    cors: 'properly configured',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      memories: '/api/memories',
      travel: '/api/travel',
      upload: '/api/upload',
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Internal server error',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
