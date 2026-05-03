const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Polls every 60 seconds for tasks with reminders due in the next 15 minutes.
 * Sends a WebSocket notification to the task owner and marks as sent.
 */
function startReminderPoller(wsClients) {
  console.log('[Reminder] Poller started — checking every 60s');

  setInterval(async () => {
    try {
      const now = new Date();
      const fifteenMinutes = new Date(now.getTime() + 15 * 60 * 1000);

      const tasks = await prisma.task.findMany({
        where: {
          reminderSent: false,
          completed: false,
          reminderAt: { gte: now, lte: fifteenMinutes },
        },
        include: { user: { select: { id: true, name: true } } },
      });

      if (tasks.length === 0) return;

      const sentIds = [];

      for (const task of tasks) {
        const ws = wsClients.get(task.userId);
        if (ws && ws.readyState === 1 /* OPEN */) {
          ws.send(
            JSON.stringify({
              type: 'REMINDER',
              task: {
                id: task.id,
                title: task.title,
                dueDate: task.dueDate,
                importance: task.importance,
              },
              message: `⏰ Reminder: "${task.title}" is due soon!`,
            })
          );
          sentIds.push(task.id);
        }
      }

      if (sentIds.length > 0) {
        await prisma.task.updateMany({
          where: { id: { in: sentIds } },
          data: { reminderSent: true },
        });
        console.log(`[Reminder] Sent ${sentIds.length} reminder(s)`);
      }
    } catch (err) {
      console.error('[Reminder] Poller error:', err);
    }
  }, 60_000);
}

module.exports = { startReminderPoller };
