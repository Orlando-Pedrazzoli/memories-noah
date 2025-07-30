const express = require('express');
require('dotenv').config();

const app = express();

console.log('🚀 Starting API server...');

// CORS manual SIMPLES
app.use((req, res, next) => {
  console.log(`📝 Request: ${req.method} ${req.url}`);

  res.header('Access-Control-Allow-Origin', 'https://noah-memories.vercel.app');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request handled');
    return res.status(200).json({ cors: 'ok' });
  }

  next();
});

app.use(express.json());

// Teste SIMPLES
app.get('/', (req, res) => {
  console.log('✅ Root accessed');
  res.json({ message: 'API Working', timestamp: Date.now() });
});

app.get('/api/health', (req, res) => {
  console.log('✅ Health check accessed');
  res.json({ status: 'OK', working: true, timestamp: Date.now() });
});

// AUTH ROUTES - SEM MIDDLEWARE
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

app.use('*', (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not found', path: req.url });
});

console.log('✅ API server configured');

module.exports = app;
