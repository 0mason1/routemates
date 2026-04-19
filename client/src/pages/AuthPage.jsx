import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

export default function AuthPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = mode === 'login'
        ? await api.login({ email: form.email, password: form.password })
        : await api.signup({ name: form.name, email: form.email, password: form.password, phone: form.phone });
      login(res.token, res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-logo">
        <h1>🚗 RouteMates</h1>
        <p>Find friends along the way</p>
      </div>

      <form className="auth-card" onSubmit={submit}>
        {mode === 'signup' && (
          <div className="field">
            <label>Your name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Mason McAfee" required />
          </div>
        )}

        <div className="field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" required />
        </div>

        <div className="field">
          <label>Password</label>
          <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" required />
        </div>

        {mode === 'signup' && (
          <div className="field">
            <label>Phone (optional)</label>
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 555 000 0000" />
          </div>
        )}

        {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: 8, fontSize: 14 }}>
            {error}
          </div>
        )}

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : mode === 'login' ? 'Log in' : 'Create account'}
        </button>

        <div className="auth-toggle">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          <button type="button" onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </form>
    </div>
  );
}
