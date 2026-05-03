import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import DashboardPage from '../pages/DashboardPage';

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  useWebSocket(); // connect WebSocket for live reminders

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">Task<span>Flow</span></div>

        <NavLink
          to="/"
          end
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          id="nav-dashboard"
        >
          <span className="sidebar-icon">📋</span> Dashboard
        </NavLink>

        <NavLink
          to="/focus"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          id="nav-focus"
        >
          <span className="sidebar-icon">🎯</span> Focus Mode
        </NavLink>

        <div style={{ marginTop: 'auto' }}>
          <div className="sidebar-nav-item" style={{ cursor: 'default', opacity: 0.6, fontSize: 12 }}>
            👤 {user?.name}
          </div>
          <button
            className="sidebar-nav-item btn-ghost"
            onClick={handleLogout}
            id="logout-btn"
            style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 8 }}
          >
            <span className="sidebar-icon">🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/focus" element={<FocusPage />} />
        </Routes>
      </main>
    </div>
  );
}

// Placeholder focus page
function FocusPage() {
  return (
    <div style={{ textAlign: 'center', paddingTop: 80 }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>🎯</div>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Focus Mode</h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
        Coming soon — distraction-free mode will show your highest-priority task front and center.
      </p>
    </div>
  );
}
