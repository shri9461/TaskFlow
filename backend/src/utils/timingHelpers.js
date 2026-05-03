/**
 * Computes dueDate and reminderAt from timing type + value.
 *
 * timingType: "specific" | "deadline" | "duration"
 * timingValue:
 *   - "specific"  → ISO date string, e.g. "2024-05-10T14:00:00"
 *   - "deadline"  → ISO date string (end of day), e.g. "2024-05-15"
 *   - "duration"  → string like "1h", "4h", "1d", "3d", "1w"
 */
function computeReminderAt(timingType, timingValue) {
  if (!timingType || !timingValue) return { dueDate: null, reminderAt: null };

  let dueDate = null;

  if (timingType === 'specific') {
    dueDate = new Date(timingValue);
  } else if (timingType === 'deadline') {
    dueDate = new Date(timingValue);
    // Set to end of the selected day (23:59:59)
    dueDate.setHours(23, 59, 59, 999);
  } else if (timingType === 'duration') {
    dueDate = parseDuration(timingValue);
  }

  if (!dueDate || isNaN(dueDate.getTime())) {
    return { dueDate: null, reminderAt: null };
  }

  // Reminder fires 15 minutes before due
  const reminderAt = new Date(dueDate.getTime() - 15 * 60 * 1000);

  return { dueDate, reminderAt };
}

function parseDuration(value) {
  const now = new Date();
  const match = value.match(/^(\d+)(h|d|w)$/);
  if (!match) return null;

  const amount = parseInt(match[1], 10);
  const unit = match[2];

  if (unit === 'h') {
    return new Date(now.getTime() + amount * 60 * 60 * 1000);
  } else if (unit === 'd') {
    return new Date(now.getTime() + amount * 24 * 60 * 60 * 1000);
  } else if (unit === 'w') {
    return new Date(now.getTime() + amount * 7 * 24 * 60 * 60 * 1000);
  }
  return null;
}

/**
 * Format timing value for display on task card
 */
function formatTimingDisplay(timingType, timingValue, dueDate) {
  if (!timingType) return null;

  if (timingType === 'specific' && dueDate) {
    const d = new Date(dueDate);
    return `Due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  }

  if (timingType === 'deadline' && dueDate) {
    const d = new Date(dueDate);
    return `Until ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }

  if (timingType === 'duration' && timingValue) {
    const labels = { '1h': '1 Hour', '2h': '2 Hours', '4h': '4 Hours', '1d': '1 Day', '3d': '3 Days', '1w': '1 Week' };
    return labels[timingValue] || timingValue;
  }

  return null;
}

module.exports = { computeReminderAt, parseDuration, formatTimingDisplay };
