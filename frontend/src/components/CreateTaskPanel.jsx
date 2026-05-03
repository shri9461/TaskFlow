import { useState } from 'react';
import TimingPopup from './TimingPopup';
import ImportancePopup from './ImportancePopup';
import api from '../services/api';

const PRIORITY_ICONS = { high: '🔴', medium: '🟡', low: '🟢' };
const TIMING_LABELS = {
  specific: '📅 Date set', deadline: '🗓 Deadline set', duration: '⏱ Duration set',
};

/**
 * CreateTaskPanel — the form at the top of the dashboard for creating new tasks.
 * Includes inline timing + importance pickers that mirror the card controls.
 */
export default function CreateTaskPanel({ onCreated }) {
  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [showDesc, setShowDesc]          = useState(false);
  const [timingType, setTimingType]      = useState(null);
  const [timingValue, setTimingValue]    = useState(null);
  const [importance, setImportance]      = useState(null);
  const [showTimingPop, setShowTimingPop]       = useState(false);
  const [showImportancePop, setShowImportancePop] = useState(false);
  const [loading, setLoading]            = useState(false);
  const [error, setError]                = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/tasks', {
        title: title.trim(),
        description: description.trim() || undefined,
        timingType: timingType || undefined,
        timingValue: timingValue || undefined,
        importance: importance || undefined,
      });
      onCreated(res.data);
      // Reset
      setTitle(''); setDescription(''); setShowDesc(false);
      setTimingType(null); setTimingValue(null); setImportance(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const timingClass = timingType
    ? 'create-option-badge has-value-timing'
    : 'create-option-badge';

  const impClass = importance
    ? `create-option-badge has-value-${importance}`
    : 'create-option-badge';

  return (
    <div className="create-panel">
      <div className="create-panel-title">✨ Add a new task</div>

      <form onSubmit={handleSubmit}>
        <div className="create-row">
          <div className="input-group" style={{ flex: 1 }}>
            <input
              id="task-title-input"
              className="input-field"
              placeholder="What's on your mind? Type a task..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            id="create-task-submit"
          >
            {loading ? '…' : '＋ Add Task'}
          </button>
        </div>

        {/* Optional description */}
        {showDesc ? (
          <div className="input-group" style={{ marginTop: 10 }}>
            <textarea
              className="input-field"
              placeholder="Add a description (optional)"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
        ) : (
          <button
            type="button"
            style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setShowDesc(true)}
          >
            + Add description
          </button>
        )}

        {/* Options row */}
        <div className="create-options">
          {/* Timing picker */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              id="create-timing-btn"
              className={timingClass}
              onClick={() => { setShowTimingPop(p => !p); setShowImportancePop(false); }}
            >
              🕐 {timingType ? TIMING_LABELS[timingType] : 'Set timing'}
              {timingType && (
                <span
                  onClick={e => { e.stopPropagation(); setTimingType(null); setTimingValue(null); }}
                  style={{ marginLeft: 6, opacity: 0.7, fontSize: 11 }}
                  title="Clear"
                >✕</span>
              )}
            </button>
            {showTimingPop && (
              <TimingPopup
                currentType={timingType}
                currentValue={timingValue}
                onApply={(t, v) => { setTimingType(t); setTimingValue(v); }}
                onClear={() => { setTimingType(null); setTimingValue(null); }}
                onClose={() => setShowTimingPop(false)}
              />
            )}
          </div>

          {/* Importance picker */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              id="create-importance-btn"
              className={impClass}
              onClick={() => { setShowImportancePop(p => !p); setShowTimingPop(false); }}
            >
              🚩 {importance ? `${PRIORITY_ICONS[importance]} ${importance.charAt(0).toUpperCase() + importance.slice(1)}` : 'Set importance'}
              {importance && (
                <span
                  onClick={e => { e.stopPropagation(); setImportance(null); }}
                  style={{ marginLeft: 6, opacity: 0.7, fontSize: 11 }}
                  title="Clear"
                >✕</span>
              )}
            </button>
            {showImportancePop && (
              <ImportancePopup
                current={importance}
                onSelect={(v) => setImportance(v)}
                onClear={() => setImportance(null)}
                onClose={() => setShowImportancePop(false)}
              />
            )}
          </div>
        </div>

        {error && <div className="auth-error" style={{ marginTop: 10 }}>{error}</div>}
      </form>
    </div>
  );
}
