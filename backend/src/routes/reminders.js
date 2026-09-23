const express = require('express');
const { PrismaClient } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Both endpoints require auth and are scoped to the requesting user —
// this API is publicly reachable in production, so it must never
// expose other users' tasks.
router.use(authenticateToken);

// GET /api/reminders/pending — reminders due in the next 15 minutes
router.get('/pending', async (req, res) => {
  try {
    const now = new Date();
    const fifteenMinutes = new Date(now.getTime() + 15 * 60 * 1000);

    const tasks = await prisma.task.findMany({
      where: {
        userId: req.user.userId,
        reminderSent: false,
        completed: false,
        reminderAt: {
          gte: now,
          lte: fifteenMinutes,
        },
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// POST /api/reminders/mark-sent — called after the user has been notified
router.post('/mark-sent', async (req, res) => {
  try {
    const { taskIds } = req.body;
    if (!taskIds || !Array.isArray(taskIds))
      return res.status(400).json({ error: 'taskIds array required' });

    const result = await prisma.task.updateMany({
      where: { id: { in: taskIds }, userId: req.user.userId },
      data: { reminderSent: true },
    });

    res.json({ marked: result.count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark reminders' });
  }
});

module.exports = router;
