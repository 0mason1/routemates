import { useEffect, useState } from 'react';
import { api } from '../lib/api';

function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isPast(d) {
  return new Date(d + 'T23:59:59') < new Date();
}

export default function TripsPage() {
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
              transition: 'all 0.15s',
              border: 'none',
              position: 'relative',
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
          {inbox.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🏓</div>
              <h3>No pings yet</h3>
              <p>When friends ping you, they'll show up here</p>
            </div>
          ) : inbox.map(p => (
            <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{p.sender_name} is driving through your area</div>
                <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 3 }}>
                  {p.start_address} → {p.end_address}
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>{formatDate(p.trip_date)}</div>
              </div>
              {p.status === 'pending' ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-secondary" style={{ flex: 1, background: '#D1FAE5', color: '#065F46' }} onClick={() => respond(p.id, 'yes')}>
                    Yes! 🙌
                  </button>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => respond(p.id, 'maybe')}>
                    Maybe
                  </button>
                  <button className="btn-secondary" style={{ flex: 1, background: '#FEE2E2', color: '#991B1B' }} onClick={() => respond(p.id, 'no')}>
                    Can't
                  </button>
                </div>
              ) : (
                <span className={`badge badge-${p.status}`}>
                  {p.status === 'yes' ? 'You said yes! 🎉' : p.status === 'maybe' ? 'Maybe' : "Can't make it"}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
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
