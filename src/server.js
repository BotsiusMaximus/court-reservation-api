const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { errorHandler } = require('./utils/errors');
const { pool } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const courtsRoutes = require('./routes/courts');
const reservationsRoutes = require('./routes/reservations');
const emailRoutes = require('./routes/email');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (admin dashboard)
app.use(express.static('public'));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courts', courtsRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/email', emailRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Court Reservation API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      courts: '/api/courts',
      reservations: '/api/reservations',
    },
    documentation: 'See README.md for API documentation',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   Court Reservation API Server       ║
║                                       ║
║   Port: ${PORT}                      ║
║   Environment: ${process.env.NODE_ENV || 'development'}           ║
║   Time: ${new Date().toISOString()}  ║
╚═══════════════════════════════════════╝
  `);
  console.log(`API available at: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
