import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext, useAuthProvider } from './hooks/useAuth';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import TripsPage from './pages/TripsPage';
import FriendsPage from './pages/FriendsPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import { useEffect, useState } from 'react';
import { api } from './lib/api';

function NavIcon({ path, label, icon }) {
  const location = useLocation();
  const navigate = useNavigate();
  const active = location.pathname === path;
  return (
    <button className={`nav-btn${active ? ' active' : ''}`} onClick={() => navigate(path)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">{icon}</svg>
      {label}
    </button>
  );
}

function PingsIndicator() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    api.getInbox()
      .then(pings => setCount(pings.filter(p => p.status === 'pending').length))
      .catch(() => {});
  }, []);
  if (!count) return null;
  return <span className="notif-dot" />;
}

function MainApp() {
  const { user, loading } = useAuthProvider();

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🚗</div>
        <div style={{ marginTop: 12, color: 'var(--gray-400)' }}>Loading RouteMates...</div>
      </div>
    </div>
  );

  return (
    <AuthContext.Provider value={{ user, loading, login: () => {}, logout: () => {}, updateUser: () => {} }}>
      <InnerApp />
    </AuthContext.Provider>
  );
}

function InnerApp() {
  const auth = useAuthProvider();
  const location = useLocation();

  useEffect(() => {
    const pending = localStorage.getItem('rm_pending_invite');
    if (pending && auth.user) {
      localStorage.removeItem('rm_pending_invite');
      api.acceptInvite(pending).catch(() => {});
    }
  }, [auth.user]);

  if (!auth.user) return <AuthPage />;

  const hideNav = location.pathname.startsWith('/invite');

  return (
    <AuthContext.Provider value={auth}>
      <div className="app">
        <div className="page" style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/trips" element={<TripsPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/invite/:code" element={<AcceptInvitePage />} />
          </Routes>
        </div>
        {!hideNav && (
          <nav className="bottom-nav">
            <NavIcon path="/" label="Drive" icon={
              <><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" /></>
            } />
            <NavIcon path="/trips" label="Trips" icon={
              <><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round" /></>
            } />
            <NavIcon path="/friends" label="Friends" icon={
              <><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" /></>
            } />
          </nav>
        )}
      </div>
    </AuthContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <InnerAppWrapper />
    </BrowserRouter>
  );
}

function InnerAppWrapper() {
  const auth = useAuthProvider();
  const location = useLocation();

  useEffect(() => {
    const pending = localStorage.getItem('rm_pending_invite');
    if (pending && auth.user) {
      localStorage.removeItem('rm_pending_invite');
      api.acceptInvite(pending).catch(() => {});
    }
  }, [auth.user]);

  if (auth.loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🚗</div>
        <div style={{ marginTop: 12, color: 'var(--gray-400)' }}>Loading...</div>
      </div>
    </div>
  );

  if (!auth.user) {
    if (location.pathname.startsWith('/invite/')) {
      return (
        <AuthContext.Provider value={auth}>
          <Routes>
            <Route path="/invite/:code" element={<AcceptInvitePage />} />
            <Route path="*" element={<AuthPage />} />
          </Routes>
        </AuthContext.Provider>
      );
    }
    return (
      <AuthContext.Provider value={auth}>
        <AuthPage />
      </AuthContext.Provider>
    );
  }

  const hideNav = location.pathname.startsWith('/invite');

  return (
    <AuthContext.Provider value={auth}>
      <div className="app">
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/trips" element={<TripsPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/invite/:code" element={<AcceptInvitePage />} />
          </Routes>
        </div>
        {!hideNav && (
          <nav className="bottom-nav">
            <NavIcon path="/" label="Drive" icon={
              <><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" /></>
            } />
            <NavIcon path="/trips" label="Trips" icon={
              <><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round" /></>
            } />
            <NavIcon path="/friends" label="Friends" icon={
              <><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" /></>
            } />
          </nav>
        )}
      </div>
    </AuthContext.Provider>
  );
}
