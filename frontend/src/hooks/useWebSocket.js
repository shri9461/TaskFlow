import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function useWebSocket() {
  const { user } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (!user) return;

    const wsUrl = `ws://localhost:3001?userId=${user.id}`;
    let ws;
    let retryTimeout;

    function connect() {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => console.log('[WS] Connected');

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'REMINDER') {
            addToast(data.message, 'reminder', '⏰');
            // Also trigger browser notification if permission granted
            if (Notification.permission === 'granted') {
              new Notification('TaskFlow Reminder', {
                body: data.message,
                icon: '/favicon.svg',
              });
            }
          }
        } catch (e) {
          console.error('[WS] Parse error', e);
        }
      };

      ws.onclose = () => {
        // Reconnect after 5s
        retryTimeout = setTimeout(connect, 5000);
      };

      ws.onerror = () => ws.close();
    }

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    connect();

    return () => {
      clearTimeout(retryTimeout);
      ws?.close();
    };
  }, [user, addToast]);
}
