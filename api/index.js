const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const memoriesRoutes = require('./routes/memories');
const travelRoutes = require('./routes/travel');

const app = express();

app.set('trust proxy', 1);

// ⭐ CORS com suporte específico para mobile
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://noah-memories.vercel.app',
      'http://192.168.*.*:5173', // Permitir IPs locais para teste mobile
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
  })
);

// ⭐ AUMENTAR LIMITES PARA UPLOADS MOBILE
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// ⭐ TIMEOUT MAIS LONGO PARA MOBILE
app.use((req, res, next) => {
  req.setTimeout(300000); // 5 minutos
  res.setTimeout(300000); // 5 minutos
  next();
});

// Rotas públicas primeiro
app.get('/', (req, res) => {
  res.json({
    message: 'Memory Site API is Working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    cors: 'enabled',
    limits: {
      jsonLimit: '100mb',
      uploadLimit: '100mb',
      timeout: '5min',
    },
    routes: {
      health: '/api/health',
      auth: '/api/auth/*',
      memories: '/api/memories/*',
      travel: '/api/travel/*',
      upload: '/api/upload/*',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Memory Site Server is running',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    mobile: 'optimized',
  });
});

// Rotas da aplicação
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/memories', memoriesRoutes);
app.use('/api/travel', travelRoutes);

// Error handling melhorado
app.use((error, req, res, next) => {
  console.error('❌ Server Error:', error);

  // Erro específico de payload muito grande
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message:
        'Arquivo muito grande. Por favor, comprima as imagens ou envie menos arquivos por vez.',
      mobile: true,
    });
  }

  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : error.message,
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedPath: req.originalUrl,
  });
});

module.exports = app;
