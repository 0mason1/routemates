import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isPast(d) {
  return new Date(d + 'T23:59:59') < new Date();
}

export default function TripsPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [pings, setPings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');

  useEffect(() => {
    Promise.all([api.getTrips(), api.getInbox(), api.getSent()])
      .then(([t, inbox, sent]) => {
        setTrips(t);
        setPings([
          ...inbox.map(p => ({ ...p, direction: 'received' })),
          ...sent.map(p => ({ ...p, direction: 'sent' })),
        ]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function respond(pingId, status) {
    try {
      await api.respondPing(pingId, status);
      setPings(ps => ps.map(p => p.id === pingId ? { ...p, status } : p));
    } catch {}
  }

  const upcoming = trips.filter(t => !isPast(t.trip_date));
  const past = trips.filter(t => isPast(t.trip_date));
  const inbox = pings.filter(p => p.direction === 'received');
  const allPings = pings;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <span className="spinner" style={{ borderColor: 'rgba(249,115,22,0.3)', borderTopColor: '#F97316', width: 28, height: 28, borderWidth: 3 }} />
    </div>
  );

  return (
    <div className="page" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 className="section-header">My Trips</h1>

      <div style={{ display: 'flex', gap: 8, background: 'var(--gray-100)', borderRadius: 12, padding: 4 }}>
        {['upcoming', 'past', 'pings'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 13, fontWeight: 700,
              background: tab === t ? 'white' : 'transparent',
              color: tab === t ? 'var(--orange)' : 'var(--gray-600)',
              boxShadow: tab === t ? 'var(--shadow)' : 'none',
              transition: 'all 0.15s', border: 'none', position: 'relative',
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'pings' && inbox.filter(p => p.status === 'pending').length > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 8,
                background: 'var(--orange)', color: 'white',
                borderRadius: '99px', fontSize: 10, fontWeight: 800,
                padding: '1px 5px', lineHeight: 1.4,
              }}>
                {inbox.filter(p => p.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'upcoming' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {upcoming.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🚗</div>
              <h3>No upcoming trips</h3>
              <p>Plan a trip from the home screen</p>
            </div>
          ) : upcoming.map(t => <TripCard key={t.id} trip={t} />)}
        </div>
      )}

      {tab === 'past' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {past.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📍</div>
              <h3>No past trips</h3>
            </div>
          ) : past.map(t => <TripCard key={t.id} trip={t} past />)}
        </div>
      )}

      {tab === 'pings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {allPings.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🏓</div>
              <h3>No pings yet</h3>
              <p>When friends ping you, they'll show up here</p>
            </div>
          ) : allPings.map(p => (
            <PingCard key={p.id} ping={p} currentUserId={user?.id} onRespond={respond} onDelete={id => setPings(ps => ps.filter(p => p.id !== id))} />
          ))}
        </div>
      )}
    </div>
  );
}

function PingCard({ ping: p, currentUserId, onRespond, onDelete }) {
  const [showChat, setShowChat] = useState(false);

  async function handleDelete() {
    try { await api.deletePing(p.id); onDelete(p.id); } catch {}
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {p.direction === 'received'
              ? `${p.sender_name} is driving through your area`
              : `You pinged ${p.recipient_name}`}
          </div>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 3 }}>
            {p.start_address?.split(',')[0]} → {p.end_address?.split(',')[0]}
          </div>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>{formatDate(p.trip_date)}</div>
        </div>
        <button onClick={handleDelete} title="Delete ping" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-300)', padding: 4, flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
        </button>
      </div>

      {p.message && (
        <div style={{ background: 'var(--gray-100)', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: 'var(--gray-700)', fontStyle: 'italic' }}>
          "{p.message}"
        </div>
      )}

      {p.direction === 'received' && p.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" style={{ flex: 1, background: '#D1FAE5', color: '#065F46' }} onClick={() => onRespond(p.id, 'yes')}>
            Yes! 🙌
          </button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => onRespond(p.id, 'maybe')}>
            Maybe
          </button>
          <button className="btn-secondary" style={{ flex: 1, background: '#FEE2E2', color: '#991B1B' }} onClick={() => onRespond(p.id, 'no')}>
            Can't
          </button>
        </div>
      )}

      {p.status !== 'pending' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className={`badge badge-${p.status}`}>
            {p.status === 'yes' ? (p.direction === 'received' ? 'You said yes! 🎉' : 'They said yes! 🎉') : p.status === 'maybe' ? 'Maybe' : "Can't make it"}
          </span>
          {p.status === 'yes' && (
            <button
              onClick={() => setShowChat(v => !v)}
              style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {showChat ? 'Hide chat' : 'Open chat 💬'}
            </button>
          )}
        </div>
      )}

      {p.status === 'yes' && (
        <NavigateButtons ping={p} />
      )}

      {showChat && p.status === 'yes' && (
        <PingChat pingId={p.id} currentUserId={currentUserId} />
      )}
    </div>
  );
}

function PingChat({ pingId, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.getPingMessages(pingId).then(setMessages).catch(() => {});
    const t = setInterval(() => api.getPingMessages(pingId).then(setMessages).catch(() => {}), 10000);
    return () => clearInterval(t);
  }, [pingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const msg = await api.sendPingMessage(pingId, text.trim());
      setMessages(ms => [...ms, msg]);
      setText('');
    } catch {}
    setSending(false);
  }

  return (
    <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 12 }}>
      <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {messages.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--gray-400)', textAlign: 'center', padding: '8px 0' }}>
            No messages yet — say hi!
          </div>
        )}
        {messages.map(m => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
              {!mine && <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 2 }}>{m.sender_name}</div>}
              <div style={{
                background: mine ? 'var(--orange)' : 'var(--gray-100)',
                color: mine ? 'white' : 'var(--gray-800)',
                borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '8px 12px', fontSize: 14, maxWidth: '80%',
              }}>
                {m.message}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Send an update or ETA..."
          style={{ flex: 1, borderRadius: 99, padding: '10px 16px', fontSize: 14, border: '1.5px solid var(--gray-200)' }}
        />
        <button onClick={send} disabled={sending || !text.trim()} style={{
          background: 'var(--orange)', color: 'white', border: 'none',
          borderRadius: '50%', width: 40, height: 40, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function NavigateButtons({ ping: p }) {
  const lat = p.direction === 'received' ? p.sender_lat : p.recipient_lat;
  const lng = p.direction === 'received' ? p.sender_lng : p.recipient_lng;
  const name = p.direction === 'received' ? p.sender_name : p.recipient_name;

  if (!lat || !lng) return null;

  const urls = {
    apple: `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 8, fontWeight: 600 }}>
        Navigate to {name}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { key: 'apple', label: '🍎 Apple Maps' },
          { key: 'google', label: '🗺️ Google Maps' },
          { key: 'waze', label: '🚗 Waze' },
        ].map(({ key, label }) => (
          <a
            key={key}
            href={urls[key]}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 10,
              background: 'var(--gray-100)', color: 'var(--gray-800)',
              fontSize: 12, fontWeight: 700, textDecoration: 'none',
              border: '1px solid var(--gray-200)',
            }}
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

function TripCard({ trip, past }) {
  return (
    <div className="trip-card" style={{ opacity: past ? 0.7 : 1 }}>
      <div className="trip-route">
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}>
          {trip.start_address.split(',')[0]}
        </span>
        <span className="trip-arrow">→</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, textAlign: 'right' }}>
          {trip.end_address.split(',')[0]}
        </span>
      </div>
      <div className="trip-date">{formatDate(trip.trip_date)}</div>
    </div>
  );
}
