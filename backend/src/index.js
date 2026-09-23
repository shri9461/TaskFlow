require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const reminderRoutes = require('./routes/reminders');
const groupRoutes = require('./routes/groups');
const { startReminderPoller } = require('./services/reminderPoller');

const app = express();
const server = createServer(app);

// WebSocket server for real-time notifications
const wss = new WebSocketServer({ server });
const clients = new Map();

wss.on('connection', (ws, req) => {
  const userId = req.url.split('?userId=')[1];
  if (userId) {
    clients.set(userId, ws);
    console.log(`[WS] Client connected: ${userId}`);
  }

  ws.on('close', () => {
    clients.forEach((client, id) => {
      if (client === ws) clients.delete(id);
    });
  });
});

// Expose clients map for reminder poller
app.locals.wsClients = clients;

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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  startReminderPoller(app.locals.wsClients);
});
