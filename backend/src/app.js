const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const reminderRoutes = require('./routes/reminders');
const groupRoutes = require('./routes/groups');

// Shared Express app — used by:
//   - src/index.js       (local dev: adds HTTP server + WebSocket + reminder poller)
//   - ../../api/index.js (Vercel serverless: no long-lived connections possible)
const app = express();

// Populated by the local dev server when WebSockets are available.
// On Vercel this stays an empty Map — broadcasts simply no-op.
app.locals.wsClients = new Map();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/groups', groupRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = app;
