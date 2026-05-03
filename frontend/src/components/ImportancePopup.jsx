import { useRef, useEffect } from 'react';

const PRIORITY_OPTIONS = [
  { value: 'high',   label: 'High Priority',   dot: '#ff4d6d', cls: 'selected-high' },
  { value: 'medium', label: 'Medium Priority',  dot: '#ffd166', cls: 'selected-medium' },
  { value: 'low',    label: 'Low Priority',     dot: '#06d6a0', cls: 'selected-low' },
];

/**
 * ImportancePopup — flag icon expands into 3-choice priority selector
 * Props: current, onSelect(value), onClear, onClose
 */
export default function ImportancePopup({ current, onSelect, onClear, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="popup popup-right" ref={ref} style={{ width: 220 }}>
      <div className="popup-title">🚩 Importance</div>

      <div className="priority-options">
        {PRIORITY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`priority-option ${current === opt.value ? opt.cls : ''}`}
            onClick={() => { onSelect(opt.value); onClose(); }}
          >
            <span className="priority-dot" style={{ background: opt.dot }} />
            {opt.label}
            {current === opt.value && (
              <span style={{ marginLeft: 'auto', fontSize: 12 }}>✓</span>
            )}
          </button>
        ))}
      </div>

      {current && (
        <button className="priority-clear" onClick={() => { onClear(); onClose(); }}>
          ✕ Clear priority
        </button>
      )}
    </div>
  );
}
