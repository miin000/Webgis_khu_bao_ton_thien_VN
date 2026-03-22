require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const healthRoutes = require('./routes/health');
const protectedAreaRoutes = require('./routes/protected-areas');

const app = express();

app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim()),
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.use('/api/v1', healthRoutes);
app.use('/api/v1', protectedAreaRoutes);

app.use((err, _req, res, _next) => {
  res.status(500).json({ message: err.message || 'Internal server error' });
});

module.exports = app;
