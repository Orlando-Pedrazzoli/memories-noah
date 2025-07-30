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
const PORT = process.env.PORT || 3001;

// ⭐ Trust proxy para Vercel/desenvolvimento
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 🟢 CORS configurado como no projeto anterior
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://noah-memories.vercel.app',
      process.env.CLIENT_URL,
    ].filter(Boolean), // Remove valores undefined/null
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
  res.json({
    status: 'OK',
    message: 'Memory Site Server is running',
    environment: process.env.NODE_ENV || 'development',
    cors: 'enabled',
    timestamp: new Date().toISOString(),
  });
});

// ✅ Rota raiz melhorada
app.get('/', (req, res) => {
  res.json({
    message: 'Memory Site API is Working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    cors: 'enabled',
    routes: {
      health: '/api/health',
      auth: '/api/auth/*',
      memories: '/api/memories/*',
      travel: '/api/travel/*',
      upload: '/api/upload/*',
    },
  });
});

// 🚨 Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Internal server error',
  });
});

// ❌ 404 handler
app.use('*', (req, res) => {
  console.log('❌ Route not found:', req.method, req.originalUrl);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    requestedPath: req.originalUrl,
  });
});

// 🚀 Start server (apenas para desenvolvimento local)
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(
    `🌍 CORS enabled for: http://localhost:5173, https://noah-memories.vercel.app`
  );
  console.log('📋 Available endpoints:');
  console.log('  - GET  /');
  console.log('  - GET  /api/health');
  console.log('  - POST /api/auth/login');
  console.log('🎯 Ready to handle requests!');
});
