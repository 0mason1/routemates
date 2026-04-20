import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

export default function AcceptInvitePage() {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inviter, setInviter] = useState(null);
  const [status, setStatus] = useState('loading');
  const [msg, setMsg] = useState('');
  const [mutual, setMutual] = useState(null);

  useEffect(() => {
    api.getInvite(code)
      .then(setInviter)
      .catch(() => setStatus('invalid'));
  }, [code]);

  useEffect(() => {
    if (inviter) {
      setStatus(user ? 'ready' : 'needsAuth');
      if (user) {
        api.getMutualFriends(inviter.id).then(setMutual).catch(() => {});
      }
    }
  }, [inviter, user]);

  async function accept() {
    try {
      await api.acceptInvite(code);
      setMsg(`You're now friends with ${inviter.name}! 🎉`);
      setTimeout(() => navigate('/friends'), 1800);
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ borderColor: 'rgba(249,115,22,0.3)', borderTopColor: '#F97316' }} />
    </div>
  );

  if (status === 'invalid') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>😕</div>
        <h2 style={{ marginTop: 12 }}>Invite not found</h2>
        <p style={{ color: 'var(--gray-400)', marginTop: 8 }}>This link may have expired or is invalid.</p>
      </div>
    </div>
  );

  if (status === 'needsAuth') {
    localStorage.setItem('rm_pending_invite', code);
    navigate('/');
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'linear-gradient(160deg, #F97316 0%, #F59E0B 100%)' }}>
      <button onClick={() => navigate('/')} style={{ position: 'fixed', top: 16, right: 16, background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <div className="card" style={{ textAlign: 'center', width: '100%', maxWidth: 360 }}>
        <div style={{ fontSize: 56 }}>👋</div>
        <h2 style={{ marginTop: 12, fontSize: 22 }}>{inviter?.name} wants to be RouteMates!</h2>
        {inviter?.city && <p style={{ color: 'var(--gray-400)', marginTop: 6 }}>Currently in {inviter.city}</p>}
        {mutual && mutual.count > 0 && (
          <p style={{ color: 'var(--orange)', fontWeight: 600, fontSize: 14, marginTop: 6 }}>
            {mutual.count} mutual friend{mutual.count !== 1 ? 's' : ''}{mutual.names.length > 0 ? ` · ${mutual.names.join(', ')}` : ''}
          </p>
        )}

        {msg ? (
          <div style={{ marginTop: 20, padding: '14px', background: '#D1FAE5', borderRadius: 10, color: '#065F46', fontWeight: 600 }}>{msg}</div>
        ) : (
          <>
            <button className="btn-primary" style={{ marginTop: 24 }} onClick={accept}>
              Accept &amp; Connect
            </button>
            <button onClick={() => navigate('/')} style={{ marginTop: 12, width: '100%', background: 'none', border: 'none', color: 'var(--gray-400)', fontSize: 14, cursor: 'pointer', padding: '8px 0' }}>
              Maybe later
            </button>
          </>
        )}
      </div>
    </div>
  );
}
