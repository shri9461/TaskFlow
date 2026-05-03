import { useState } from 'react';
import TimingPopup from './TimingPopup';
import ImportancePopup from './ImportancePopup';
import { formatTimingBadge, formatImportanceBadge, isOverdue } from '../utils/taskHelpers';
import api from '../services/api';

/**
 * TaskCard — displays a single task with:
 *  - Compact controls (clock + flag icons in top-right)
 *  - Timing badge and importance badge
 *  - Overdue pulsing border
 *  - Complete toggle, delete button
 */
export default function TaskCard({ task, onUpdate, onDelete }) {
  const [showTimingPopup, setShowTimingPopup]       = useState(false);
  const [showImportancePopup, setShowImportancePopup] = useState(false);
  const [localTask, setLocalTask] = useState(task);
  const [saving, setSaving] = useState(false);

  // Patch a field immediately on the server
  const patch = async (fields) => {
    setSaving(true);
    try {
      const res = await api.patch(`/tasks/${localTask.id}`, fields);
      setLocalTask(res.data);
      onUpdate(res.data);
    } catch (e) {
      console.error('Patch failed', e);
    } finally {
      setSaving(false);
    }
  };

  const handleTimingApply = (type, value) => patch({ timingType: type, timingValue: value });
  const handleTimingClear = () => patch({ timingType: null, timingValue: null });
  const handleImportanceSelect = (level) => patch({ importance: level });
  const handleImportanceClear = () => patch({ importance: null });
  const handleToggleComplete = () => patch({ completed: !localTask.completed });
  const handleDelete = () => onDelete(localTask.id);

  const timingBadge = formatTimingBadge(localTask);
  const importanceBadge = formatImportanceBadge(localTask.importance);
  const overdue = isOverdue(localTask);

  // Control button classes
  const clockClass = `control-btn ${showTimingPopup ? 'active' : ''} ${localTask.timingType ? 'timing-set' : ''}`;
  const flagClass  = `control-btn ${showImportancePopup ? 'active' : ''} ${
    localTask.importance === 'high' ? 'priority-high' :
    localTask.importance === 'medium' ? 'priority-medium' :
    localTask.importance === 'low' ? 'priority-low' : ''
  }`;

  const cardClass = [
    'task-card',
    localTask.completed ? 'completed' : '',
    overdue ? 'overdue' : '',
    localTask.importance ? `priority-${localTask.importance}` : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass}>
      {/* ── Header ── */}
      <div className="task-card-header">
        {/* Checkbox */}
        <button
          className={`task-checkbox ${localTask.completed ? 'checked' : ''}`}
          onClick={handleToggleComplete}
          aria-label="Toggle complete"
        />

        {/* Title + description */}
        <div className="task-title-wrap">
          <div className={`task-title ${localTask.completed ? 'completed' : ''}`}>
            {localTask.title}
          </div>
          {localTask.description && (
            <div className="task-description">{localTask.description}</div>
          )}
        </div>

        {/* ── Compact controls (top-right) ── */}
        <div className="task-controls">
          {/* Clock — Timing */}
          <div style={{ position: 'relative' }}>
            <button
              id={`timing-btn-${localTask.id}`}
              className={clockClass}
              title="Set timing / due date"
              onClick={() => { setShowTimingPopup(p => !p); setShowImportancePopup(false); }}
              aria-label="Set timing"
            >
              🕐
            </button>
            {showTimingPopup && (
              <TimingPopup
                currentType={localTask.timingType}
                currentValue={localTask.timingValue}
                onApply={handleTimingApply}
                onClear={handleTimingClear}
                onClose={() => setShowTimingPopup(false)}
              />
            )}
          </div>

          {/* Flag — Importance */}
          <div style={{ position: 'relative' }}>
            <button
              id={`importance-btn-${localTask.id}`}
              className={flagClass}
              title="Set importance"
              onClick={() => { setShowImportancePopup(p => !p); setShowTimingPopup(false); }}
              aria-label="Set importance"
            >
              🚩
            </button>
            {showImportancePopup && (
              <ImportancePopup
                current={localTask.importance}
                onSelect={handleImportanceSelect}
                onClear={handleImportanceClear}
                onClose={() => setShowImportancePopup(false)}
              />
            )}
          </div>

          {/* Delete */}
          <button
            className="control-btn"
            title="Delete task"
            onClick={handleDelete}
            style={{ color: 'var(--text-muted)' }}
            aria-label="Delete task"
          >
            🗑
          </button>
        </div>
      </div>

      {/* ── Badges ── */}
      {(timingBadge || importanceBadge || overdue) && (
        <div className="task-badges">
          {overdue && <span className="badge badge-overdue">⚠ Overdue</span>}
          {timingBadge && (
            <span className={`badge badge-timing`}>{timingBadge.label}</span>
          )}
          {importanceBadge && (
            <span className={`badge ${importanceBadge.cls}`}>{importanceBadge.label}</span>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="task-card-footer">
        <span className="task-meta">
          {new Date(localTask.createdAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric',
          })}
        </span>
        {saving && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>saving…</span>}
        {localTask.focusMode && (
          <span className="badge" style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--accent)', fontSize: 11 }}>
            🎯 Focus
          </span>
        )}
      </div>
    </div>
  );
}
