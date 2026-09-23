require('dotenv').config();
const { createServer } = require('http');
const { WebSocketServer } = require('ws');

const app = require('./app');
const { startReminderPoller } = require('./services/reminderPoller');

const server = createServer(app);

// WebSocket server for real-time notifications (local development only;
// the deployed Vercel version uses frontend polling instead — see useReminders).
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

// Expose clients map for reminder poller + group broadcasts
app.locals.wsClients = clients;

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  startReminderPoller(clients);
});
