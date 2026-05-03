const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { computeReminderAt } = require('../utils/timingHelpers');

const router = express.Router();
const prisma = new PrismaClient();

// All task routes require auth
router.use(authenticateToken);

// GET /api/tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      timingType,
      timingValue,
      importance,
      focusMode,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required' });

    const { dueDate, reminderAt } = computeReminderAt(timingType, timingValue);

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        timingType: timingType || null,
        timingValue: timingValue || null,
        dueDate: dueDate || null,
        importance: importance || null,
        focusMode: focusMode || false,
        reminderAt: reminderAt || null,
        userId: req.user.userId,
      },
    });

    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /api/tasks/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      completed,
      timingType,
      timingValue,
      importance,
      focusMode,
      reminderSent,
    } = req.body;

    // Verify ownership
    const existing = await prisma.task.findFirst({
      where: { id, userId: req.user.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    // Recompute reminder if timing changed
    let dueDate = existing.dueDate;
    let reminderAt = existing.reminderAt;

    if (timingType !== undefined || timingValue !== undefined) {
      const newType = timingType !== undefined ? timingType : existing.timingType;
      const newValue = timingValue !== undefined ? timingValue : existing.timingValue;
      const computed = computeReminderAt(newType, newValue);
      dueDate = computed.dueDate || null;
      reminderAt = computed.reminderAt || null;
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(completed !== undefined && { completed }),
        ...(timingType !== undefined && { timingType }),
        ...(timingValue !== undefined && { timingValue }),
        ...(importance !== undefined && { importance }),
        ...(focusMode !== undefined && { focusMode }),
        ...(reminderSent !== undefined && { reminderSent }),
        dueDate,
        reminderAt,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.task.findFirst({
      where: { id, userId: req.user.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    await prisma.task.delete({ where: { id } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
