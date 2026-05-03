import { useState, useRef, useEffect } from 'react';

const DURATION_OPTIONS = [
  { value: '1h', label: '1 hr' },
  { value: '2h', label: '2 hrs' },
  { value: '4h', label: '4 hrs' },
  { value: '1d', label: '1 day' },
  { value: '3d', label: '3 days' },
  { value: '1w', label: '1 week' },
];

/**
 * Timing popup — 3 tabs: Specific date, Deadline (up-to), Duration
 * Props: currentType, currentValue, onApply(type, value), onClear, onClose
 */
export default function TimingPopup({ currentType, currentValue, onApply, onClear, onClose }) {
  const [tab, setTab] = useState(currentType || 'specific');
  const [specificVal, setSpecificVal] = useState(
    currentType === 'specific' ? currentValue : ''
  );
  const [deadlineVal, setDeadlineVal] = useState(
    currentType === 'deadline' ? currentValue : ''
  );
  const [durationVal, setDurationVal] = useState(
    currentType === 'duration' ? currentValue : ''
  );
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleApply = () => {
    if (tab === 'specific' && specificVal) { onApply('specific', specificVal); onClose(); }
    else if (tab === 'deadline' && deadlineVal) { onApply('deadline', deadlineVal); onClose(); }
    else if (tab === 'duration' && durationVal) { onApply('duration', durationVal); onClose(); }
  };

  const handleClear = () => { onClear(); onClose(); };

  // Minimum datetime for specific picker = now
  const nowIso = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);

  return (
    <div className="popup popup-right" ref={ref} style={{ width: 292 }}>
      <div className="popup-title">⏰ Set Timing</div>

      {/* Tabs */}
      <div className="timing-tabs">
        {['specific', 'deadline', 'duration'].map(t => (
          <button
            key={t}
            className={`timing-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'specific' ? '📅 Date' : t === 'deadline' ? '🗓 Until' : '⏱ Duration'}
          </button>
        ))}
      </div>

      {/* Specific Date/Time */}
      {tab === 'specific' && (
        <div className="input-group">
          <div className="input-label">Pick exact date & time</div>
          <input
            type="datetime-local"
            className="input-field"
            min={nowIso}
            value={specificVal}
            onChange={e => setSpecificVal(e.target.value)}
          />
        </div>
      )}

      {/* Deadline (up-to date) */}
      {tab === 'deadline' && (
        <div className="input-group">
          <div className="input-label">Task is due by this date</div>
          <input
            type="date"
            className="input-field"
            min={nowIso.slice(0, 10)}
            value={deadlineVal}
            onChange={e => setDeadlineVal(e.target.value)}
          />
        </div>
      )}

      {/* Duration quick-select */}
      {tab === 'duration' && (
        <>
          <div className="input-label" style={{ marginBottom: 8 }}>From now, complete within</div>
          <div className="duration-grid">
            {DURATION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`duration-btn ${durationVal === opt.value ? 'selected' : ''}`}
                onClick={() => setDurationVal(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      <button className="popup-apply" onClick={handleApply}>Apply</button>
      {(currentType) && (
        <button className="popup-clear" onClick={handleClear}>✕ Clear timing</button>
      )}
    </div>
  );
}
