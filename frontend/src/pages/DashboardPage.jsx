import { useState, useEffect, useCallback } from 'react';
import CreateTaskPanel from '../components/CreateTaskPanel';
import TaskCard from '../components/TaskCard';
import api from '../services/api';

const FILTERS = ['all', 'active', 'completed', 'high', 'medium', 'low', 'overdue'];

export default function DashboardPage() {
  const [tasks, setTasks]     = useState([]);
  const [filter, setFilter]   = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (e) {
      console.error('Failed to fetch tasks', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleCreated = (task) => setTasks(prev => [task, ...prev]);
  const handleUpdate  = (updated) => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
  const handleDelete  = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (e) { console.error('Delete failed', e); }
  };

  // Filter logic
  const filtered = tasks.filter(t => {
    const overdue = t.dueDate && new Date(t.dueDate) < new Date() && !t.completed;
    if (filter === 'all')       return true;
    if (filter === 'active')    return !t.completed;
    if (filter === 'completed') return t.completed;
    if (filter === 'high')      return t.importance === 'high';
    if (filter === 'medium')    return t.importance === 'medium';
    if (filter === 'low')       return t.importance === 'low';
    if (filter === 'overdue')   return overdue;
    return true;
  });

  const counts = {
    all: tasks.length,
    active: tasks.filter(t => !t.completed).length,
    completed: tasks.filter(t => t.completed).length,
    high: tasks.filter(t => t.importance === 'high').length,
    medium: tasks.filter(t => t.importance === 'medium').length,
    low: tasks.filter(t => t.importance === 'low').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !t.completed).length,
  };

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div>
          <h1 className="topbar-title">My <span>Tasks</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            {counts.active} active · {counts.completed} done
            {counts.overdue > 0 && <span style={{ color: 'var(--high)', marginLeft: 8 }}>· {counts.overdue} overdue ⚠</span>}
          </p>
        </div>
      </div>

      {/* Create panel */}
      <CreateTaskPanel onCreated={handleCreated} />

      {/* Filters */}
      <div className="filters">
        {FILTERS.map(f => (
          <button
            key={f}
            id={`filter-${f}`}
            className={`filter-chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {counts[f] > 0 && (
              <span style={{ marginLeft: 6, opacity: 0.7 }}>({counts[f]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tasks grid */}
      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <h3>Loading tasks…</h3>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            {filter === 'completed' ? '🎉' : filter === 'overdue' ? '✅' : '📝'}
          </div>
          <h3>
            {filter === 'completed' ? 'No completed tasks yet' :
             filter === 'overdue'   ? 'No overdue tasks!' :
             'No tasks here'}
          </h3>
          <p>
            {filter === 'all'
              ? 'Add your first task above to get started.'
              : `No ${filter} tasks to show.`}
          </p>
        </div>
      ) : (
        <div className="tasks-grid">
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </>
  );
}
