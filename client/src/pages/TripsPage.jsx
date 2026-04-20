import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isPast(d) {
  return new Date(d + 'T23:59:59') < new Date();
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function TripsPage() {
  const { user } = useAuth();
  const { toast, showToast } = useToast();
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

  async function handleShare(shareCode) {
    const link = `${window.location.origin}/trip/${shareCode}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
      } else {
        const el = document.createElement('textarea');
        el.value = link;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      showToast('Trip link copied!');
    } catch {
      showToast('Link: ' + link);
    }
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
          ) : upcoming.map(t => <TripCard key={t.id} trip={t} onShare={handleShare} onDelete={id => setTrips(ts => ts.filter(t => t.id !== id))} />)}
        </div>
      )}

      {tab === 'past' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {past.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📍</div>
              <h3>No past trips</h3>
            </div>
          ) : past.map(t => <TripCard key={t.id} trip={t} past onShare={handleShare} onDelete={id => setTrips(ts => ts.filter(t => t.id !== id))} />)}
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

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function SwipeToDismiss({ onDismiss, children }) {
  const ref = useRef(null);
  const startX = useRef(null);
  const [offset, setOffset] = useState(0);
  const [dismissing, setDismissing] = useState(false);

  const onTouchStart = useCallback(e => { startX.current = e.touches[0].clientX; }, []);

  const onTouchMove = useCallback(e => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) setOffset(dx);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (offset < -80) {
      setDismissing(true);
      setTimeout(onDismiss, 250);
    } else {
      setOffset(0);
    }
    startX.current = null;
  }, [offset, onDismiss]);

  return (
    <div ref={ref} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{ transform: `translateX(${dismissing ? -400 : offset}px)`, transition: dismissing ? 'transform 0.25s ease' : offset === 0 ? 'transform 0.2s ease' : 'none', position: 'relative' }}>
      {children}
    </div>
  );
}

function PingCard({ ping: p, currentUserId, onRespond, onDelete }) {
  const [showChat, setShowChat] = useState(false);
  const [changingResponse, setChangingResponse] = useState(false);

  async function handleDelete() {
    try { await api.deletePing(p.id); onDelete(p.id); } catch {}
  }

  return (
    <SwipeToDismiss onDismiss={handleDelete}>
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

      {p.direction === 'received' && (p.status === 'pending' || changingResponse) && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" style={{ flex: 1, background: '#D1FAE5', color: '#065F46' }} onClick={() => { onRespond(p.id, 'yes'); setChangingResponse(false); }}>
            Yes! 🙌
          </button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { onRespond(p.id, 'maybe'); setChangingResponse(false); }}>
            Maybe
          </button>
          <button className="btn-secondary" style={{ flex: 1, background: '#FEE2E2', color: '#991B1B' }} onClick={() => { onRespond(p.id, 'no'); setChangingResponse(false); }}>
            Can't
          </button>
        </div>
      )}

      {p.status !== 'pending' && !changingResponse && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className={`badge badge-${p.status}`}>
            {p.status === 'yes' ? (p.direction === 'received' ? 'You said yes! 🎉' : 'They said yes! 🎉') : p.status === 'maybe' ? 'Maybe' : "Can't make it"}
          </span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {p.direction === 'received' && (
              <button onClick={() => setChangingResponse(true)}
                style={{ fontSize: 12, color: 'var(--gray-400)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Change
              </button>
            )}
            {p.status === 'yes' && (
              <button onClick={() => setShowChat(v => !v)}
                style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {showChat ? 'Hide chat' : 'Chat 💬'}
              </button>
            )}
          </div>
        </div>
      )}

      {p.status === 'yes' && (
        <NavigateButtons ping={p} />
      )}

      {p.direction === 'sent' && p.seen_at && (
        <div style={{ fontSize: 11, color: 'var(--gray-400)', textAlign: 'right' }}>
          Seen {timeAgo(p.seen_at)}
        </div>
      )}

      {showChat && p.status === 'yes' && (
        <PingChat pingId={p.id} currentUserId={currentUserId} />
      )}
    </div>
    </SwipeToDismiss>
  );
}

function PingChat({ pingId, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.getPingMessages(pingId).then(setMessages).catch(() => {});
    const t = setInterval(() => api.getPingMessages(pingId).then(setMessages).catch(() => {}), 2000);
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
              {m.created_at && (
                <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>
                  {timeAgo(m.created_at)}
                </div>
              )}
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

  const hasMidpoint = p.sender_lat && p.sender_lng && p.recipient_lat && p.recipient_lng;
  const midLat = hasMidpoint ? ((p.sender_lat + p.recipient_lat) / 2).toFixed(6) : null;
  const midLng = hasMidpoint ? ((p.sender_lng + p.recipient_lng) / 2).toFixed(6) : null;

  const midUrls = hasMidpoint ? {
    apple: `maps://maps.apple.com/?daddr=${midLat},${midLng}&dirflg=d`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${midLat},${midLng}`,
    waze: `https://waze.com/ul?ll=${midLat},${midLng}&navigate=yes`,
  } : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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

      {midUrls && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 4, fontWeight: 600 }}>
            🤝 Suggested meeting point
          </div>
          <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 8 }}>
            Midpoint between your locations
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { key: 'apple', label: '🍎 Apple Maps' },
              { key: 'google', label: '🗺️ Google Maps' },
              { key: 'waze', label: '🚗 Waze' },
            ].map(({ key, label }) => (
              <a
                key={key}
                href={midUrls[key]}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 10,
                  background: '#FFF7ED', color: 'var(--orange)',
                  fontSize: 12, fontWeight: 700, textDecoration: 'none',
                  border: '1px solid var(--orange-light)',
                }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr + 'T00:00:00'); d.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1) return `In ${diff} days`;
  return null;
}

function TripCard({ trip, past, onShare, onDelete }) {
  const [deleted, setDeleted] = useState(false);

  async function handleDelete() {
    if (!window.confirm('Cancel this trip?')) return;
    setDeleted(true);
    try { await api.deleteTrip(trip.id); onDelete(trip.id); } catch { setDeleted(false); }
  }

  const until = !past && daysUntil(trip.trip_date);
  let waypoints = [];
  try { if (trip.waypoints) waypoints = JSON.parse(trip.waypoints); } catch {}

  return (
    <div style={{
      background: 'white', borderRadius: 18, overflow: 'hidden',
      boxShadow: 'var(--shadow)', opacity: deleted ? 0.4 : past ? 0.65 : 1,
      transition: 'opacity 0.2s',
    }}>
      {/* Orange accent top bar */}
      <div style={{ background: past ? 'var(--gray-200)' : 'linear-gradient(90deg, #F97316, #F59E0B)', height: 4 }} />

      <div style={{ padding: '16px 16px 14px' }}>
        {/* Date row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              background: past ? 'var(--gray-100)' : '#FFF7ED',
              border: `1.5px solid ${past ? 'var(--gray-200)' : 'var(--orange-light)'}`,
              borderRadius: 10, padding: '4px 10px',
              fontSize: 12, fontWeight: 800,
              color: past ? 'var(--gray-400)' : 'var(--orange)',
            }}>
              {formatDate(trip.trip_date)}
            </div>
            {until && (
              <span style={{ fontSize: 12, fontWeight: 700, color: until === 'Today' ? '#16A34A' : until === 'Tomorrow' ? 'var(--orange)' : 'var(--gray-400)' }}>
                {until}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {trip.share_code && (
              <button onClick={() => onShare(trip.share_code)} title="Copy share link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: '4px 6px', borderRadius: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </button>
            )}
            <button onClick={handleDelete} title="Cancel trip"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-300)', padding: '4px 6px', borderRadius: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Route stops */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Start */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: past ? 'var(--gray-300)' : 'var(--orange)', border: '2px solid white', boxShadow: `0 0 0 2px ${past ? 'var(--gray-300)' : 'var(--orange)'}` }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-800)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {trip.start_address.split(',')[0]}
            </div>
          </div>

          {/* Connector + waypoints */}
          {waypoints.length > 0 ? waypoints.map((wp, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                  <div style={{ width: 2, flex: 1, background: 'repeating-linear-gradient(to bottom, var(--gray-200) 0px, var(--gray-200) 4px, transparent 4px, transparent 8px)', minHeight: 12 }} />
                </div>
                <div style={{ flex: 1 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', border: '2px solid var(--gray-300)' }} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray-600)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {wp.text?.split(',')[0]}
                </div>
              </div>
            </div>
          )) : (
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                <div style={{ width: 2, height: 18, background: 'repeating-linear-gradient(to bottom, var(--gray-200) 0px, var(--gray-200) 4px, transparent 4px, transparent 8px)' }} />
              </div>
              <div style={{ flex: 1 }} />
            </div>
          )}

          {/* Dashed connector before end */}
          {waypoints.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                <div style={{ width: 2, height: 14, background: 'repeating-linear-gradient(to bottom, var(--gray-200) 0px, var(--gray-200) 4px, transparent 4px, transparent 8px)' }} />
              </div>
            </div>
          )}

          {/* End */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: past ? 'var(--gray-300)' : '#1D4ED8', border: '2px solid white', boxShadow: `0 0 0 2px ${past ? 'var(--gray-300)' : '#1D4ED8'}` }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-800)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {trip.end_address.split(',')[0]}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
