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

  useEffect(() => {
    api.getInvite(code)
      .then(setInviter)
      .catch(() => setStatus('invalid'));
  }, [code]);

  useEffect(() => {
    if (inviter) setStatus(user ? 'ready' : 'needsAuth');
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
      <div className="card" style={{ textAlign: 'center', width: '100%', maxWidth: 360 }}>
        <div style={{ fontSize: 56 }}>👋</div>
        <h2 style={{ marginTop: 12, fontSize: 22 }}>{inviter?.name} wants to be RouteMates!</h2>
        {inviter?.city && <p style={{ color: 'var(--gray-400)', marginTop: 6 }}>Currently in {inviter.city}</p>}

        {msg ? (
          <div style={{ marginTop: 20, padding: '14px', background: '#D1FAE5', borderRadius: 10, color: '#065F46', fontWeight: 600 }}>{msg}</div>
        ) : (
          <button className="btn-primary" style={{ marginTop: 24 }} onClick={accept}>
            Accept &amp; Connect
          </button>
        )}
      </div>
    </div>
  );
}
