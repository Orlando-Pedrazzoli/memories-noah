const express = require('express');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const memoriesRoutes = require('./routes/memories');
const travelRoutes = require('./routes/travel');

const app = express();

app.set('trust proxy', 1);

// ⭐ CORS MANUAL - GARANTIDO para funcionar
app.use((req, res, next) => {
  // Definir origem permitida
  const allowedOrigin = 'https://noah-memories.vercel.app';
  const origin = req.headers.origin;

  if (origin === allowedOrigin || !origin) {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,DELETE,PATCH,OPTIONS'
  );
  res.header(
    'Access-Control-Allow-Headers',
    'Origin,X-Requested-With,Content-Type,Accept,Authorization,X-CSRF-Token'
  );

  // Responder imediatamente para OPTIONS
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request for:', req.url);
    return res.status(200).json({
      success: true,
      message: 'CORS preflight OK',
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
        'Access-Control-Allow-Headers':
          'Origin,X-Requested-With,Content-Type,Accept,Authorization,X-CSRF-Token',
      },
    });
  }

  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/memories', memoriesRoutes);
app.use('/api/travel', travelRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server running',
    cors: 'manual headers applied',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Memory Site API',
    cors: 'manual headers applied',
    timestamp: new Date().toISOString(),
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
