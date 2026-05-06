require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { initDb } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const academicRoutes = require('./routes/academicRoutes');
const userStateRoutes = require('./routes/userStateRoutes');

const app = express();
const port = Number(process.env.PORT) || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
const explicitAllowedOrigins = [clientOrigin, ...(process.env.ALLOWED_ORIGINS || '').split(',')]
  .map((value) => value.trim())
  .filter(Boolean);

function isPrivateNetworkOrigin(origin) {
  return /^https?:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/i.test(origin);
}

// Security headers for production
if (isProduction) {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
}

app.use(cors({
  origin(origin, callback) {
    // Allow server-to-server requests and local dev frontends across ports.
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
      return callback(null, true);
    }

    if (explicitAllowedOrigins.includes(origin) || isPrivateNetworkOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  }
}));

// Request size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.get('/api/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const healthPayload = {
    status: dbConnected ? 'ok' : 'degraded',
    db: {
      connected: dbConnected,
    },
  };
  // Hide sensitive info in production
  if (!isProduction) {
    healthPayload.db.name = mongoose.connection.name || '';
    healthPayload.db.host = mongoose.connection.host || '';
  }
  res.status(dbConnected ? 200 : 503).json(healthPayload);
});

app.use('/api/auth', authRoutes);
app.use('/api/academic-events', academicRoutes);
app.use('/api/user-state', userStateRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  // Hide error details in production
  const errorMessage = isProduction ? 'Internal server error.' : err.message || 'Internal server error.';
  res.status(500).json({ message: errorMessage });
});

async function startServer() {
  await initDb();
  const server = app.listen(port, () => {
    console.log(`Crymson backend running on port ${port}`);
  });

  return server;
}

// Validate required environment variables in production
function validateProductionEnv() {
  if (!isProduction) return;

  const required = ['JWT_SECRET', 'MONGODB_URI', 'CLIENT_ORIGIN'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (process.env.JWT_SECRET === 'dev-only-secret-change-me') {
    throw new Error('JWT_SECRET must not be the development default value in production');
  }
}

if (require.main === module) {
  try {
    validateProductionEnv();
    startServer().catch((error) => {
      console.error('Failed to start backend:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Startup validation failed:', error.message);
    process.exit(1);
  }
}

module.exports = {
  app,
  startServer
};
