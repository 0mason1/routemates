import { useState } from 'react';

const STEPS = [
  {
    icon: '🚗',
    title: 'Welcome to RouteMates',
    body: 'Connect with friends who live along your driving routes. Turn solo drives into shared adventures.',
  },
  {
    icon: '🗺️',
    title: 'Plan your drive',
    body: 'Enter your start, destination, and date. We\'ll show every friend who lives within your chosen radius of the route.',
  },
  {
    icon: '🏓',
    title: 'Ping friends to meet up',
    body: 'Send a ping with a note. They\'ll get a text, email, and push notification. When they say yes, you can chat and navigate to them.',
  },
  {
    icon: '🤝',
    title: 'You\'re all set!',
    body: 'Invite your friends using your personal link on the Friends tab so they show up on your route.',
  },
];

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;

  function next() {
    if (last) { onDone(); return; }
    setStep(s => s + 1);
  }

  const s = STEPS[step];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'linear-gradient(160deg, #F97316 0%, #F59E0B 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: 'white', borderRadius: 24, padding: '40px 28px',
        width: '100%', maxWidth: 360, textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>{s.icon}</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px', color: '#111827' }}>{s.title}</h2>
        <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.6, margin: '0 0 32px' }}>{s.body}</p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 8, height: 8, borderRadius: 99,
              background: i === step ? '#F97316' : '#E5E7EB',
              transition: 'all 0.25s',
            }} />
          ))}
        </div>

        <button className="btn-primary" style={{ width: '100%' }} onClick={next}>
          {last ? 'Get Started 🚀' : 'Next →'}
        </button>

        {!last && (
          <button onClick={onDone} style={{ marginTop: 14, background: 'none', border: 'none', color: '#9CA3AF', fontSize: 13, cursor: 'pointer' }}>
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
