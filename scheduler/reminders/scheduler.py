import logging
import requests
from django.conf import settings
from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)


def check_and_notify():
    """
    Polls the Node.js backend for tasks due within 15 minutes
    and marks them as sent. The actual WebSocket push is done
    by the Node.js reminder poller; this service acts as a
    secondary fallback notifier and logger.
    """
    try:
        url = f"{settings.NODE_BACKEND_URL}/api/reminders/pending"
        response = requests.get(url, timeout=5)

        if response.status_code != 200:
            logger.warning(f"[Django Scheduler] Backend returned {response.status_code}")
            return

        tasks = response.json()
        if not tasks:
            return

        task_ids = [t['id'] for t in tasks]
        logger.info(f"[Django Scheduler] Found {len(tasks)} pending reminder(s): {task_ids}")

        # Mark tasks as sent via backend
        mark_url = f"{settings.NODE_BACKEND_URL}/api/reminders/mark-sent"
        mark_resp = requests.post(mark_url, json={"taskIds": task_ids}, timeout=5)

        if mark_resp.status_code == 200:
            logger.info(f"[Django Scheduler] Marked {len(task_ids)} task(s) as reminder-sent")
        else:
            logger.error(f"[Django Scheduler] Failed to mark tasks: {mark_resp.text}")

    except requests.exceptions.ConnectionError:
        logger.warning("[Django Scheduler] Could not connect to Node.js backend (is it running?)")
    except Exception as e:
        logger.error(f"[Django Scheduler] Unexpected error: {e}")


def start_scheduler():
    scheduler = BackgroundScheduler()
    # Run the check every 60 seconds
    scheduler.add_job(check_and_notify, 'interval', seconds=60, id='reminder_check')
    scheduler.start()
    logger.info("[Django Scheduler] APScheduler started — polling every 60s")
