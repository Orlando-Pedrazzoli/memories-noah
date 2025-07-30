const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const memoriesRoutes = require('./routes/memories');
const travelRoutes = require('./routes/travel');

const app = express();

// ⭐ Trust proxy para Vercel
app.set('trust proxy', 1);

// 🟢 CORS configurado EXATAMENTE como no projeto anterior que funcionou
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://noah-memories.vercel.app',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// 🔧 Middlewares de parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ Health check melhorado
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

// 📦 Rotas principais
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/memories', memoriesRoutes);
app.use('/api/travel', travelRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Memory Site Server is running',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
  });
});

// 🚨 Middleware de erro
app.use((error, req, res, next) => {
  console.error('❌ Server Error:', error);
  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : error.message,
  });
});

// ❌ Rota não encontrada
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedPath: req.originalUrl,
  });
});

// ⭐ DIFERENÇA PRINCIPAL: Export para Vercel (sem app.listen)
module.exports = app;
