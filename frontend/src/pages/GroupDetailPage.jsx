import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [group, setGroup] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'feed' | 'members'
  const [taskFilter, setTaskFilter] = useState('all'); // 'all' | 'mine' | 'active' | 'completed' | 'high'

  // Task creation modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    importance: 'medium',
    dueDate: '',
    assignedTo: '',
    assignedName: '',
  });
  const [submittingTask, setSubmittingTask] = useState(false);

  // Community feed message input
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef(null);

  // Load group details, tasks, and messages
  const loadGroupWorkspace = useCallback(async () => {
    try {
      const [grpRes, tasksRes, msgsRes] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/groups/${groupId}/tasks`),
        api.get(`/groups/${groupId}/messages`),
      ]);
      setGroup(grpRes.data);
      setTasks(tasksRes.data);
      setMessages(msgsRes.data);
    } catch (err) {
      console.error('Failed to load group workspace:', err);
      addToast(err.response?.data?.error || 'Failed to load community group', 'danger', '⚠');
      navigate('/groups');
    } finally {
      setLoading(false);
    }
  }, [groupId, navigate, addToast]);

  useEffect(() => {
    loadGroupWorkspace();
  }, [loadGroupWorkspace]);

  // Scroll community feed to bottom on new message
  useEffect(() => {
    if (activeTab === 'feed' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Copy shareable invite link
  const handleCopyInvite = () => {
    if (!group) return;
    const url = `${window.location.origin}/join/${group.inviteCode}`;
    navigator.clipboard.writeText(url).then(() => {
      addToast('Invite link copied to clipboard! Share it with teammates 📋', 'info', '🔗');
    }).catch(() => {
      addToast(`Invite link: ${url}`, 'info', '📋');
    });
  };

  // Leave group
  const handleLeaveGroup = async () => {
    if (!window.confirm(`Are you sure you want to leave "${group?.name}"?`)) return;
    try {
      await api.delete(`/groups/${groupId}/leave`);
      addToast(`You left "${group?.name}"`, 'info', '👋');
      navigate('/groups');
    } catch (err) {
      console.error('Leave group error:', err);
      addToast('Failed to leave group', 'danger', '⚠');
    }
  };

  // Create shared task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      addToast('Please enter a task title', 'danger', '⚠');
      return;
    }

    setSubmittingTask(true);
    try {
      const payload = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        importance: taskForm.importance,
        dueDate: taskForm.dueDate || null,
        assignedTo: taskForm.assignedTo || null,
        assignedName: taskForm.assignedName || null,
      };

      const res = await api.post(`/groups/${groupId}/tasks`, payload);
      setTasks(prev => [res.data, ...prev]);
      addToast(`Task "${res.data.title}" added to group!`, 'info', '📋');
      setShowTaskModal(false);
      setTaskForm({
        title: '',
        description: '',
        importance: 'medium',
        dueDate: '',
        assignedTo: '',
        assignedName: '',
      });
    } catch (err) {
      console.error('Create group task error:', err);
      addToast(err.response?.data?.error || 'Failed to create task', 'danger', '⚠');
    } finally {
      setSubmittingTask(false);
    }
  };

  // Toggle complete on a shared task
  const handleToggleTask = async (task) => {
    const nextStatus = !task.completed;
    try {
      const res = await api.patch(`/groups/${groupId}/tasks/${task.id}`, {
        completed: nextStatus,
      });
      setTasks(prev => prev.map(t => (t.id === task.id ? res.data : t)));
      addToast(
        nextStatus ? `Task marked completed by ${user.name}! 🎉` : 'Task reopened',
        'info',
        nextStatus ? '✅' : '↺'
      );
    } catch (err) {
      console.error('Toggle task error:', err);
      addToast('Failed to update task', 'danger', '⚠');
    }
  };

  // Delete shared task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this shared task from the group?')) return;
    try {
      await api.delete(`/groups/${groupId}/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      addToast('Task deleted', 'info', '🗑');
    } catch (err) {
      console.error('Delete task error:', err);
      addToast('Failed to delete task', 'danger', '⚠');
    }
  };

  // Send message to community feed
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessageText.trim()) return;

    setSendingMsg(true);
    try {
      const res = await api.post(`/groups/${groupId}/messages`, {
        text: newMessageText.trim(),
      });
      setMessages(prev => [...prev, res.data]);
      setNewMessageText('');
    } catch (err) {
      console.error('Send message error:', err);
      addToast('Failed to post message', 'danger', '⚠');
    } finally {
      setSendingMsg(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'mine') return t.assignedTo === user?.id;
    if (taskFilter === 'active') return !t.completed;
    if (taskFilter === 'completed') return t.completed;
    if (taskFilter === 'high') return t.importance === 'high';
    return true;
  });

  const activeTaskCount = tasks.filter(t => !t.completed).length;
  const completedTaskCount = tasks.filter(t => t.completed).length;

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⏳</div>
        <h3>Loading community workspace…</h3>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div>
      {/* ── Back Navigation ── */}
      <div style={{ marginBottom: 16 }}>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => navigate('/groups')}
          style={{ gap: 6 }}
        >
          ← Back to All Communities
        </button>
      </div>

      {/* ── Group Hero Banner ── */}
      <div className="group-hero">
        <div className="group-hero-top">
          <div className="group-hero-identity">
            <div className="group-hero-icon">{group.icon || '👥'}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 className="group-hero-title">{group.name}</h1>
                <span className="badge-category">{group.category || 'General'}</span>
                <span className="badge-role">
                  {group.role === 'admin' ? '👑 Admin' : '👤 Member'}
                </span>
                {group.isPublic === false && (
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.06)' }}>🔒 Private</span>
                )}
              </div>
              <p className="group-hero-desc">
                {group.description || 'Welcome to this community! Share tasks, coordinate sprint actions, and stay aligned.'}
              </p>
            </div>
          </div>

          <div className="group-hero-toolbar">
            {/* 1-Click Copy Invite Link */}
            <button
              id="btn-copy-invite-hero"
              className="invite-pill"
              onClick={handleCopyInvite}
              title="Click to copy full invite link"
            >
              <span>🔗</span> Copy Invite Link <span className="invite-code-tag">{group.inviteCode}</span>
            </button>

            <button
              id="btn-add-shared-task"
              className="btn btn-primary"
              onClick={() => setShowTaskModal(true)}
            >
              ➕ New Shared Task
            </button>

            <button
              className="btn btn-ghost btn-sm"
              onClick={handleLeaveGroup}
              title="Leave this group"
              style={{ color: 'var(--high)' }}
            >
              🚪 Leave
            </button>
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="group-stats-row" style={{ margin: '16px 0 0', background: 'var(--bg-glass)' }}>
          <div className="group-stat-item">
            <span>👥</span> <strong>{group.members?.length || 1}</strong> members
          </div>
          <div className="group-stat-item">
            <span>📋</span> <strong>{activeTaskCount}</strong> active tasks
          </div>
          <div className="group-stat-item">
            <span>✅</span> <strong>{completedTaskCount}</strong> completed
          </div>
          <div className="group-stat-item">
            <span>💬</span> <strong>{messages.length}</strong> community messages
          </div>
        </div>
      </div>

      {/* ── Workspace Sub-Tabs ── */}
      <div className="group-tabs">
        <button
          className={`group-tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
          id="tab-shared-tasks"
        >
          <span>📋</span> Shared Tasks ({tasks.length})
        </button>
        <button
          className={`group-tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('feed')}
          id="tab-community-feed"
        >
          <span>💬</span> Community Discussion ({messages.length})
        </button>
        <button
          className={`group-tab-btn ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
          id="tab-members-directory"
        >
          <span>👥</span> Members Directory ({group.members?.length || 1})
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────
          TAB 1: SHARED TASKS
          ────────────────────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div>
          {/* Task Filters */}
          <div className="filters" style={{ marginBottom: 20 }}>
            {[
              { key: 'all', label: `All (${tasks.length})` },
              { key: 'mine', label: `Assigned to Me (${tasks.filter(t => t.assignedTo === user?.id).length})` },
              { key: 'active', label: `Active (${activeTaskCount})` },
              { key: 'completed', label: `Completed (${completedTaskCount})` },
              { key: 'high', label: `High Priority (${tasks.filter(t => t.importance === 'high').length})` },
            ].map(f => (
              <button
                key={f.key}
                className={`filter-chip ${taskFilter === f.key ? 'active' : ''}`}
                onClick={() => setTaskFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>No shared tasks found</h3>
              <p style={{ marginTop: 6, marginBottom: 20 }}>
                {taskFilter === 'all'
                  ? 'Start by creating the first task to collaborate with your group members.'
                  : `No tasks match the filter "${taskFilter}".`}
              </p>
              <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>
                ➕ Create Shared Task
              </button>
            </div>
          ) : (
            <div className="tasks-grid">
              {filteredTasks.map(t => (
                <div
                  key={t.id}
                  className={`task-card shared-task-card ${t.completed ? 'completed' : ''} priority-${t.importance || 'medium'}`}
                >
                  <div className="task-card-header">
                    <div
                      className={`task-checkbox ${t.completed ? 'checked' : ''}`}
                      onClick={() => handleToggleTask(t)}
                      title={t.completed ? 'Mark as active' : 'Mark as complete'}
                    />

                    <div className="task-title-wrap">
                      <div className={`task-title ${t.completed ? 'completed' : ''}`}>
                        {t.title}
                      </div>
                      {t.description && (
                        <div className="task-description">{t.description}</div>
                      )}
                    </div>

                    {(group.role === 'admin' || t.creatorId === user?.id) && (
                      <button
                        className="btn-icon"
                        title="Delete task"
                        onClick={() => handleDeleteTask(t.id)}
                        style={{ opacity: 0.6 }}
                      >
                        🗑
                      </button>
                    )}
                  </div>

                  {/* Badges row */}
                  <div className="task-badges">
                    <span className={`badge badge-${t.importance || 'medium'}`}>
                      {t.importance ? t.importance.toUpperCase() : 'MEDIUM'}
                    </span>

                    {t.dueDate && (
                      <span className="badge badge-timing">
                        📅 {new Date(t.dueDate).toLocaleDateString()}
                      </span>
                    )}

                    {t.assignedName ? (
                      <span className={`assignee-chip ${t.assignedTo === user?.id ? 'mine' : ''}`}>
                        👤 {t.assignedTo === user?.id ? 'You' : t.assignedName}
                      </span>
                    ) : (
                      <span className="assignee-chip" style={{ opacity: 0.5 }}>
                        ⚪ Unassigned
                      </span>
                    )}

                    {t.completed && t.completedBy && (
                      <span className="badge" style={{ background: 'rgba(6,214,160,0.12)', color: 'var(--low)' }}>
                        ✓ by {t.completedBy === user?.name ? 'You' : t.completedBy}
                      </span>
                    )}
                  </div>

                  <div className="task-card-footer">
                    <span className="task-meta">Created by {t.creatorName || 'Member'}</span>
                    <span className="task-meta">{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          TAB 2: COMMUNITY DISCUSSION FEED
          ────────────────────────────────────────────────────────── */}
      {activeTab === 'feed' && (
        <div className="community-feed-box">
          <div className="community-feed-messages">
            {messages.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-icon">💬</div>
                <h3>No messages yet</h3>
                <p>Say hello to the community and start collaborating!</p>
              </div>
            ) : (
              messages.map(msg => {
                const isBot = msg.userName === 'TaskFlow Bot';
                const isMe = msg.userId === user?.id;

                return (
                  <div
                    key={msg.id}
                    className={`feed-message-row ${isBot ? 'is-bot' : ''}`}
                    style={isMe ? { flexDirection: 'row-reverse' } : {}}
                  >
                    <div className={`feed-avatar ${isBot ? 'bot' : ''}`}>
                      {isBot ? '🤖' : (msg.userName || 'U')[0].toUpperCase()}
                    </div>

                    <div className="feed-bubble-wrap" style={isMe ? { textAlign: 'right' } : {}}>
                      <div className="feed-bubble-meta" style={isMe ? { justifyContent: 'flex-end' } : {}}>
                        <span className="feed-author-name">
                          {isMe ? 'You' : msg.userName}
                        </span>
                        <span className="feed-time">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="feed-bubble-body">
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="community-feed-input-bar" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="community-feed-input"
              placeholder="Write a message, share an update, or celebrate a win…"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              id="input-community-message"
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={sendingMsg || !newMessageText.trim()}
              id="btn-send-community-message"
            >
              Send 🚀
            </button>
          </form>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          TAB 3: MEMBERS DIRECTORY
          ────────────────────────────────────────────────────────── */}
      {activeTab === 'members' && (
        <div className="members-table-wrap">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Group Members ({group.members?.length || 1})</h3>
            <button className="btn btn-sm btn-ghost" onClick={handleCopyInvite}>
              🔗 Invite More Members
            </button>
          </div>

          {group.members?.map(mem => {
            const isMe = mem.userId === user?.id;
            const assignedCount = tasks.filter(t => t.assignedTo === mem.userId).length;

            return (
              <div key={mem.id} className="member-row">
                <div className="member-info">
                  <div className="feed-avatar">
                    {(mem.userName || 'M')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="member-name">
                      {mem.userName} {isMe && <span style={{ color: 'var(--accent-hover)', fontSize: 12 }}>(You)</span>}
                    </div>
                    <div className="member-email">{mem.userEmail}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="assignee-chip">
                    📋 {assignedCount} {assignedCount === 1 ? 'task' : 'tasks'} assigned
                  </span>

                  <span className="badge-role">
                    {mem.role === 'admin' ? '👑 Admin' : '👤 Member'}
                  </span>

                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Joined {new Date(mem.joinedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          MODAL: CREATE SHARED TASK
          ────────────────────────────────────────────────────────── */}
      {showTaskModal && (
        <div className="modal-backdrop" onClick={() => setShowTaskModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>📋</span> New Shared Group Task
              </div>
              <button className="btn-icon" onClick={() => setShowTaskModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div className="modal-body">
                {/* Task Title */}
                <div className="form-group">
                  <label className="form-label">Task Title *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Implement WebSocket group notifications"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    id="input-group-task-title"
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Description / Instructions</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Add details, acceptance criteria, or relevant links…"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                {/* Priority */}
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={taskForm.importance}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, importance: e.target.value }))}
                  >
                    <option value="high">🔴 High Priority</option>
                    <option value="medium">🟡 Medium Priority</option>
                    <option value="low">🟢 Low Priority</option>
                  </select>
                </div>

                {/* Assign to Group Member */}
                <div className="form-group">
                  <label className="form-label">Assignee</label>
                  <select
                    className="form-select"
                    value={taskForm.assignedTo}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const member = group.members?.find(m => m.userId === selectedId);
                      setTaskForm(prev => ({
                        ...prev,
                        assignedTo: selectedId,
                        assignedName: member ? member.userName : '',
                      }));
                    }}
                    id="select-group-task-assignee"
                  >
                    <option value="">⚪ Unassigned</option>
                    {group.members?.map(mem => (
                      <option key={mem.userId} value={mem.userId}>
                        👤 {mem.userName} {mem.userId === user?.id ? '(You)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Due Date */}
                <div className="form-group">
                  <label className="form-label">Due Date (Optional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowTaskModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingTask}
                  id="btn-submit-group-task"
                >
                  {submittingTask ? 'Creating…' : 'Share Task 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
