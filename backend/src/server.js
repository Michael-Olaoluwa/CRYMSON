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
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
const explicitAllowedOrigins = [clientOrigin, ...(process.env.ALLOWED_ORIGINS || '').split(',')]
  .map((value) => value.trim())
  .filter(Boolean);

function isPrivateNetworkOrigin(origin) {
  return /^https?:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/i.test(origin);
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
app.use(express.json());

app.get('/api/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: 'ok',
    db: {
      connected: dbConnected,
      name: mongoose.connection.name || '',
      host: mongoose.connection.host || '',
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/academic-events', academicRoutes);
app.use('/api/user-state', userStateRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error.' });
});

async function startServer() {
  await initDb();
  app.listen(port, () => {
    console.log(`Crymson backend running on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
