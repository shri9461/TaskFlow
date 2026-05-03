const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/reminders/pending — used by Django scheduler
router.get('/pending', async (req, res) => {
  try {
    const now = new Date();
    const fifteenMinutes = new Date(now.getTime() + 15 * 60 * 1000);

    const tasks = await prisma.task.findMany({
      where: {
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

// POST /api/reminders/mark-sent — called by Django after sending notification
router.post('/mark-sent', async (req, res) => {
  try {
    const { taskIds } = req.body;
    if (!taskIds || !Array.isArray(taskIds))
      return res.status(400).json({ error: 'taskIds array required' });

    await prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: { reminderSent: true },
    });

    res.json({ marked: taskIds.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark reminders' });
  }
});

module.exports = router;
