const express = require('express');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

// ⭐ CORS PRIMEIRO - antes de tudo
app.use((req, res, next) => {
  const allowedOrigin = 'https://noah-memories.vercel.app';
  const origin = req.headers.origin;

  console.log(`Request: ${req.method} ${req.url} from origin: ${origin}`);

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

  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request handled for:', req.url);
    return res.status(200).json({
      success: true,
      message: 'CORS preflight OK',
    });
  }

  next();
});

// ⭐ BODY PARSING
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ⭐ ROTAS PÚBLICAS PRIMEIRO
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Memory Site API',
    cors: 'manual headers applied',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server running',
    cors: 'manual headers applied',
    timestamp: new Date().toISOString(),
  });
});

// ⭐ IMPORTAR ROTAS (não aplicar middleware global)
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const memoriesRoutes = require('./routes/memories');
const travelRoutes = require('./routes/travel');

// ⭐ ROTAS - cada uma gerencia sua própria autenticação
app.use('/api/auth', authRoutes); // auth/login é público
app.use('/api/upload', uploadRoutes); // protegidas individualmente
app.use('/api/memories', memoriesRoutes); // protegidas individualmente
app.use('/api/travel', travelRoutes); // protegidas individualmente

// ⭐ ERROR HANDLERS
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.use('*', (req, res) => {
  console.log('404 for:', req.method, req.url);
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
