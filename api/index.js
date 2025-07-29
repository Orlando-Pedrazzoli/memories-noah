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

// Security middleware
app.use(helmet());
app.use(morgan('combined'));

// Rate limiting - ajustado para Vercel
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  // ⭐ Configuração específica para Vercel
  skip: req => {
    // Skip rate limiting para health check
    return req.path === '/api/health';
  },
});
app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://noah-memories.vercel.app',
      process.env.CLIENT_URL,
    ].filter(Boolean), // Remove valores undefined/null
    credentials: true,
  })
);

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
  res.json({ status: 'OK', message: 'Memory Site Server is running' });
});

// ⭐ Rota raiz para evitar 404
app.get('/', (req, res) => {
  res.json({
    message: 'Memory Site API',
    status: 'running',
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

// ⭐ DIFERENÇA PRINCIPAL: Export em vez de listen
module.exports = app;
