/**
 * Format timing info for display on task card badges.
 */
export function formatTimingBadge(task) {
  if (!task.timingType) return null;

  const { timingType, timingValue, dueDate } = task;

  if (timingType === 'specific' && dueDate) {
    const d = new Date(dueDate);
    const now = new Date();
    const isOverdue = d < now && !task.completed;
    const label = d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    return { label: `📅 Due ${label}`, overdue: isOverdue };
  }

  if (timingType === 'deadline' && dueDate) {
    const d = new Date(dueDate);
    const now = new Date();
    const isOverdue = d < now && !task.completed;
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { label: `🗓 Until ${label}`, overdue: isOverdue };
  }

  if (timingType === 'duration' && timingValue) {
    const labels = {
      '1h': '⏱ 1 Hour', '2h': '⏱ 2 Hours', '4h': '⏱ 4 Hours',
      '1d': '📆 1 Day', '3d': '📆 3 Days', '1w': '📆 1 Week',
    };
    return { label: labels[timingValue] || `⏱ ${timingValue}`, overdue: false };
  }

  return null;
}

export function formatImportanceBadge(importance) {
  const map = {
    high:   { label: '🔴 High',   cls: 'badge-high' },
    medium: { label: '🟡 Medium', cls: 'badge-medium' },
    low:    { label: '🟢 Low',    cls: 'badge-low' },
  };
  return map[importance] || null;
}

export function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;
  return new Date(task.dueDate) < new Date();
}
