require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const screenshotRoutes = require('./routes/screenshotRoutes');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Headers with Helmet
app.use(helmet());

// CORS configuration based on CLIENT_ORIGINS from .env
const clientOriginsRaw =
  process.env.CLIENT_ORIGINS ||
  process.env.CLIENT_URL ||
  'http://localhost:5173,http://127.0.0.1:5173,https://ishot.vercel.app';

const allowedOrigins = clientOriginsRaw
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, watcher)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, '');

      if (
        allowedOrigins.includes(normalizedOrigin) ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }
      return callback(new Error('CORS policy: origin not allowed'));
    },
    credentials: true,
  })
);

// General rate limiter on all /api routes
app.use('/api', generalLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (Public)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ishot-api',
  });
});

// Authentication routes (Public: /register, /login; Authenticated: /me)
app.use('/api/auth', authRoutes);

// Screenshot library routes (Protected with authMiddleware)
app.use('/api', screenshotRoutes);

// 404 & Centralized Error middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`🚀 [Server] ishot API running on http://localhost:${PORT}`);
    });
    return server;
  } catch (error) {
    console.error('❌ [Server] Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
