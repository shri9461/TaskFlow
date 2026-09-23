import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const CATEGORIES = ['All', 'Productivity', 'Engineering', 'Design', 'Study & Education', 'General'];
const ICONS = ['👥', '🚀', '💻', '🎯', '🎨', '📚', '⚡', '💼', '🏆', '🔥'];

export default function GroupsHubPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [tab, setTab] = useState('my'); // 'my' | 'discover'
  const [myGroups, setMyGroups] = useState([]);
  const [discoverGroups, setDiscoverGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    category: 'Productivity',
    icon: '👥',
    isPublic: true,
  });
  const [joinCode, setJoinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch groups
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [myRes, discoverRes] = await Promise.all([
        api.get('/groups'),
        api.get('/groups/discover'),
      ]);
      setMyGroups(myRes.data);
      setDiscoverGroups(discoverRes.data);
    } catch (err) {
      console.error('Failed to load groups:', err);
      addToast('Could not load groups list', 'danger', '⚠');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Copy invite link helper
  const handleCopyInvite = (e, inviteCode, groupName) => {
    e.stopPropagation();
    const url = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(url).then(() => {
      addToast(`Invite link for "${groupName}" copied!`, 'info', '📋');
    }).catch(() => {
      addToast(`Invite code: ${inviteCode}`, 'info', '📋');
    });
  };

  // Create Group submission
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      addToast('Please enter a group name', 'danger', '⚠');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/groups', createForm);
      addToast(`Community "${res.data.name}" created! 🎉`, 'info', '🚀');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        description: '',
        category: 'Productivity',
        icon: '👥',
        isPublic: true,
      });
      // Navigate to the newly created group workspace
      navigate(`/groups/${res.data.id}`);
    } catch (err) {
      console.error('Create group failed:', err);
      addToast(err.response?.data?.error || 'Failed to create group', 'danger', '⚠');
    } finally {
      setSubmitting(false);
    }
  };

  // Join Group with code/link submission
  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      addToast('Please enter an invite code or link', 'danger', '⚠');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/groups/join', { inviteCode: joinCode });
      addToast(res.data.message || 'Joined group successfully! 🎉', 'info', '✨');
      setShowJoinModal(false);
      setJoinCode('');
      navigate(`/groups/${res.data.group.id}`);
    } catch (err) {
      console.error('Join group failed:', err);
      addToast(err.response?.data?.error || 'Failed to join group. Check the invite code.', 'danger', '⚠');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter groups
  const currentList = tab === 'my' ? myGroups : discoverGroups;
  const filteredGroups = currentList.filter(g => {
    const matchesCategory = selectedCategory === 'All' || g.category === selectedCategory;
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div>
      {/* ── Top Header ── */}
      <div className="groups-header-wrap">
        <div>
          <h1 className="topbar-title">Community & <span>Groups</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            Collaborate with your team, share tasks, track sprint deliverables, and build your community.
          </p>
        </div>

        <div className="groups-header-actions">
          <button
            id="btn-join-code"
            className="btn btn-ghost"
            onClick={() => setShowJoinModal(true)}
          >
            🔗 Join with Link / Code
          </button>
          <button
            id="btn-create-group"
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            ➕ Create Community Group
          </button>
        </div>
      </div>

      {/* ── Main Tab Navigation ── */}
      <div className="tab-nav">
        <button
          className={`tab-nav-btn ${tab === 'my' ? 'active' : ''}`}
          onClick={() => setTab('my')}
          id="tab-my-groups"
        >
          <span>👥</span> My Groups ({myGroups.length})
        </button>
        <button
          className={`tab-nav-btn ${tab === 'discover' ? 'active' : ''}`}
          onClick={() => setTab('discover')}
          id="tab-discover-groups"
        >
          <span>🌐</span> Explore Communities ({discoverGroups.length})
        </button>
      </div>

      {/* ── Search & Filter Row ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search communities by name or topic..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 320, maxWidth: '100%' }}
          id="input-search-groups"
        />

        <div className="filters" style={{ margin: 0 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content Grid ── */}
      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <h3>Loading communities…</h3>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{tab === 'my' ? '👥' : '🔍'}</div>
          <h3>{tab === 'my' ? 'No groups joined yet' : 'No communities found'}</h3>
          <p style={{ marginTop: 6, marginBottom: 20 }}>
            {tab === 'my'
              ? 'Create a team group or join an existing community with an invite link to collaborate!'
              : 'Try adjusting your search query or create a brand new community group.'}
          </p>
          {tab === 'my' && (
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              ➕ Create Your First Group
            </button>
          )}
        </div>
      ) : (
        <div className="groups-grid">
          {filteredGroups.map(grp => (
            <div
              key={grp.id}
              className="group-card"
              onClick={() => navigate(`/groups/${grp.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="group-card-top">
                <div className="group-icon-box">{grp.icon || '👥'}</div>
                <div className="group-meta-wrap">
                  <div className="group-name" title={grp.name}>{grp.name}</div>
                  <div className="group-badges-row">
                    <span className="badge-category">{grp.category || 'General'}</span>
                    {grp.role && (
                      <span className="badge-role">
                        {grp.role === 'admin' ? '👑 Admin' : '👤 Member'}
                      </span>
                    )}
                    {grp.isPublic === false && (
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', fontSize: 10 }}>🔒 Private</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="group-desc">
                {grp.description || 'A collaborative space to share tasks, track progress, and celebrate achievements together.'}
              </div>

              <div className="group-stats-row">
                <div className="group-stat-item">
                  <span>👥</span> {grp.memberCount || 1} {grp.memberCount === 1 ? 'member' : 'members'}
                </div>
                <div className="group-stat-item">
                  <span>📋</span> {grp.pendingTasks !== undefined ? grp.pendingTasks : grp.totalTasks || 0} active {grp.pendingTasks === 1 ? 'task' : 'tasks'}
                </div>
              </div>

              <div className="group-card-footer">
                <button
                  className="invite-pill"
                  title="Click to copy shareable invite link"
                  onClick={(e) => handleCopyInvite(e, grp.inviteCode, grp.name)}
                >
                  <span>🔗</span> Copy Link <span className="invite-code-tag">{grp.inviteCode}</span>
                </button>

                <button
                  className="btn btn-sm btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/groups/${grp.id}`);
                  }}
                >
                  Open →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Create Group ── */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>➕</span> Create Community Group
              </div>
              <button className="btn-icon" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {/* Icon Selection */}
                <div className="form-group">
                  <label className="form-label">Community Icon</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {ICONS.map(ic => (
                      <button
                        type="button"
                        key={ic}
                        className={`btn-icon ${createForm.icon === ic ? 'active' : ''}`}
                        style={{
                          fontSize: 20,
                          width: 40,
                          height: 40,
                          border: createForm.icon === ic ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: createForm.icon === ic ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                        }}
                        onClick={() => setCreateForm(prev => ({ ...prev, icon: ic }))}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Group Name */}
                <div className="form-group">
                  <label className="form-label">Group Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Frontend Engineering, Product Sprint, Study Club"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    id="input-create-group-name"
                  />
                </div>

                {/* Category */}
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={createForm.category}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="Productivity">⚡ Productivity</option>
                    <option value="Engineering">💻 Engineering</option>
                    <option value="Design">🎨 Design</option>
                    <option value="Study & Education">📚 Study & Education</option>
                    <option value="Marketing">📢 Marketing</option>
                    <option value="General">🌐 General</option>
                  </select>
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Description / Purpose</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Briefly describe what this group is for and how members collaborate..."
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                {/* Privacy */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <input
                    type="checkbox"
                    id="isPublicCheck"
                    checked={createForm.isPublic}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                  />
                  <label htmlFor="isPublicCheck" style={{ fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Make discoverable in public communities explore tab
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  id="btn-submit-create-group"
                >
                  {submitting ? 'Creating…' : 'Create Group 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Join with Code / Link ── */}
      {showJoinModal && (
        <div className="modal-backdrop" onClick={() => setShowJoinModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>🔗</span> Join Community Group
              </div>
              <button className="btn-icon" onClick={() => setShowJoinModal(false)}>✕</button>
            </div>

            <form onSubmit={handleJoinSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Enter the invite code or paste the shareable link you received from a group member or team lead.
                </p>

                <div className="form-group">
                  <label className="form-label">Invite Code or Link *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. grp_8a91b2c3 or http://localhost:5173/join/grp_8a91b2c3"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    id="input-join-code"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowJoinModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  id="btn-submit-join-group"
                >
                  {submitting ? 'Joining…' : 'Join Group ✨'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
