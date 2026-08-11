const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Render đặt sau 1 reverse proxy, luôn gắn X-Forwarded-For — cần khai báo để
// express-rate-limit nhận đúng IP thật của khách thay vì IP nội bộ của proxy.
app.set('trust proxy', 1);

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/', routes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

module.exports = app;
