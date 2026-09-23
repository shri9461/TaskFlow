import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function JoinGroupPage() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    async function fetchPreview() {
      try {
        const res = await api.get(`/groups/invite/${inviteCode}`);
        setPreview(res.data);
      } catch (err) {
        console.error('Failed to load invite link:', err);
        setError('This invitation link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    }
    fetchPreview();
  }, [inviteCode]);

  // Handle joining
  const handleJoin = async () => {
    if (!user) {
      localStorage.setItem('tf_redirect', `/join/${inviteCode}`);
      navigate('/login');
      return;
    }

    setJoining(true);
    try {
      const res = await api.post('/groups/join', { inviteCode });
      addToast(res.data.message || 'Joined group successfully! 🎉', 'info', '✨');
      navigate(`/groups/${res.data.group.id}`);
    } catch (err) {
      console.error('Join error:', err);
      if (err.response?.data?.error) {
        addToast(err.response.data.error, 'danger', '⚠');
      } else {
        addToast('Failed to join group', 'danger', '⚠');
      }
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="join-page-wrapper">
        <div className="join-card">
          <div className="join-icon-large">⏳</div>
          <h2 className="join-title">Inspecting Invitation…</h2>
          <p className="join-desc">Validating your invite link to TaskFlow Community.</p>
        </div>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="join-page-wrapper">
        <div className="join-card">
          <div className="join-icon-large" style={{ borderColor: 'var(--high-border)', color: 'var(--high)' }}>⚠</div>
          <h2 className="join-title">Invalid Invitation</h2>
          <p className="join-desc">{error || 'This invite link is invalid or the group was removed.'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Go to TaskFlow Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="join-page-wrapper">
      <div className="join-card">
        <div className="join-icon-large">{preview.icon || '👥'}</div>

        <span className="badge-category" style={{ marginBottom: 12, display: 'inline-block' }}>
          {preview.category || 'Productivity'}
        </span>

        <h1 className="join-title">{preview.name}</h1>

        <p className="join-desc">
          {preview.description || 'You have been invited to join this collaborative workspace on TaskFlow.'}
        </p>

        <div className="join-meta-box">
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
              {preview.memberCount || 1}
            </div>
            <div>Members</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)', padding: '0 16px' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
              {preview.taskCount || 0}
            </div>
            <div>Tasks</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
              {preview.creatorName || 'Team Lead'}
            </div>
            <div>Host</div>
          </div>
        </div>

        {user ? (
          <div>
            <button
              id="btn-confirm-join-group"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16 }}
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? 'Joining…' : 'Accept Invite & Join Community ✨'}
            </button>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
              Signed in as <strong>{user.name}</strong> ({user.email})
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              You need a TaskFlow account to collaborate on tasks in this group.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Link
                to="/login"
                className="btn btn-primary"
                onClick={() => localStorage.setItem('tf_redirect', `/join/${inviteCode}`)}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Log In to Join
              </Link>
              <Link
                to="/register"
                className="btn btn-ghost"
                onClick={() => localStorage.setItem('tf_redirect', `/join/${inviteCode}`)}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
