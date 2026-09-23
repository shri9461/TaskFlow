import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

/**
 * Polls the backend every 60 seconds for reminders due in the next
 * 15 minutes. Replaces the WebSocket push used in local development,
 * because Vercel serverless functions can't hold long-lived connections.
 */
export function useReminders() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const notifiedRef = useRef(new Set());

  useEffect(() => {
    if (!user) return;

    async function checkReminders() {
      try {
        const res = await api.get('/reminders/pending');
        const due = Array.isArray(res.data) ? res.data : [];

        // Only act on reminders we haven't already shown in this session
        const fresh = due.filter(t => !notifiedRef.current.has(t.id));
        if (fresh.length === 0) return;

        for (const task of fresh) {
          const message = `⏰ Reminder: "${task.title}" is due soon!`;
          addToast(message, 'reminder', '⏰');
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('TaskFlow Reminder', {
              body: message,
              icon: '/favicon.svg',
            });
          }
          notifiedRef.current.add(task.id);
        }

        // Tell the backend we've displayed these (scoped to this user server-side)
        await api.post('/reminders/mark-sent', { taskIds: fresh.map(t => t.id) });
      } catch (err) {
        // Network hiccups are expected — retry on the next tick
        console.warn('[Reminders] poll failed:', err?.message || err);
      }
    }

    // Request browser notification permission once
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    checkReminders();
    const interval = setInterval(checkReminders, 60_000);
    return () => clearInterval(interval);
  }, [user, addToast]);
}
