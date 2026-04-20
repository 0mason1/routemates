import { useState, useEffect } from 'react';
import AddressInput from '../components/AddressInput';
import RouteMap from '../components/RouteMap';
import { getRoute } from '../lib/mapbox';
import { api } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

export default function HomePage() {
  const { user } = useAuth();
  const { toast, showToast } = useToast();

  function load(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  }

  const [start, setStart] = useState(() => load('rm_hp_start', { text: '', lat: null, lng: null }));
  const [end, setEnd] = useState(() => load('rm_hp_end', { text: '', lat: null, lng: null }));
  const [date, setDate] = useState(() => load('rm_hp_date', ''));
  const [routeCoords, setRouteCoords] = useState(() => load('rm_hp_route', null));
  const [radius, setRadius] = useState(() => load('rm_hp_radius', 20));
  const [nearby, setNearby] = useState(() => load('rm_hp_nearby', null));
  const [sentPings, setSentPings] = useState([]);
  const [trip, setTrip] = useState(() => load('rm_hp_trip', null));
  const [loading, setLoading] = useState(false);
  const [pingModal, setPingModal] = useState(null);
  const [pingNote, setPingNote] = useState('');
  const [pingSending, setPingSending] = useState(false);

  useEffect(() => { localStorage.setItem('rm_hp_start', JSON.stringify(start)); }, [start]);
  useEffect(() => { localStorage.setItem('rm_hp_end', JSON.stringify(end)); }, [end]);
  useEffect(() => { localStorage.setItem('rm_hp_date', JSON.stringify(date)); }, [date]);
  useEffect(() => { localStorage.setItem('rm_hp_route', JSON.stringify(routeCoords)); }, [routeCoords]);
  useEffect(() => { localStorage.setItem('rm_hp_radius', JSON.stringify(radius)); }, [radius]);
  useEffect(() => { localStorage.setItem('rm_hp_nearby', JSON.stringify(nearby)); }, [nearby]);
  useEffect(() => { localStorage.setItem('rm_hp_trip', JSON.stringify(trip)); }, [trip]);

  useEffect(() => {
    api.getSent().then(setSentPings).catch(() => {});
  }, []);

  async function planTrip() {
    if (!start.lat || !end.lat || !date) return;
    setLoading(true);
    try {
      const coords = await getRoute(start.lng, start.lat, end.lng, end.lat);
      setRouteCoords(coords);

      const newTrip = await api.createTrip({
        start_address: start.text,
        end_address: end.text,
        start_lat: start.lat,
        start_lng: start.lng,
        end_lat: end.lat,
        end_lng: end.lng,
        trip_date: date,
        route_geometry: coords,
      });
      setTrip(newTrip);

      const near = await api.getNearby(newTrip.id, radius);
      setNearby(near);
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateRadius(r) {
    setRadius(r);
    if (!trip) return;
    try {
      const near = await api.getNearby(trip.id, r);
      setNearby(near);
    } catch {}
  }

  function openPingModal(friend) {
    if (!trip) return;
    setPingModal(friend);
    setPingNote('');
  }

  async function sendPing() {
    if (!trip || !pingModal) return;
    setPingSending(true);
    try {
      await api.sendPing({ trip_id: trip.id, recipient_id: pingModal.id, message: pingNote.trim() || undefined });
      setSentPings(prev => [...prev, { recipient_id: pingModal.id }]);
      showToast(`Ping sent to ${pingModal.name}! 🏓`);
      setPingModal(null);
    } catch (err) {
      showToast(err.message);
    } finally {
      setPingSending(false);
    }
  }

  const canPlan = start.lat && end.lat && date;
  const hasAnything = start.text || end.text || date || routeCoords || nearby;

  function clearAll() {
    const empty = { text: '', lat: null, lng: null };
    setStart(empty); setEnd(empty); setDate('');
    setRouteCoords(null); setNearby(null); setTrip(null);
    setSentPings([]); setRadius(20);
    ['rm_hp_start','rm_hp_end','rm_hp_date','rm_hp_route','rm_hp_nearby','rm_hp_trip','rm_hp_radius'].forEach(k => localStorage.removeItem(k));
  }

  return (
    <div className="page" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="section-header">Where are you driving?</h1>
          <p className="section-sub">Find friends along your route</p>
        </div>
        {hasAnything && (
          <button onClick={clearAll} style={{ background: 'none', border: '1.5px solid var(--gray-200)', borderRadius: 99, padding: '6px 14px', fontSize: 13, fontWeight: 700, color: 'var(--gray-500)', cursor: 'pointer', flexShrink: 0 }}>
            Clear
          </button>
        )}
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <AddressInput
          label="From"
          value={start.text}
          onChange={t => setStart(s => ({ ...s, text: t, lat: null, lng: null }))}
          onSelect={({ name, lat, lng }) => setStart({ text: name, lat, lng })}
          placeholder="Select starting location"
        />
        <AddressInput
          label="To"
          value={end.text}
          onChange={t => setEnd(s => ({ ...s, text: t, lat: null, lng: null }))}
          onSelect={({ name, lat, lng }) => setEnd({ text: name, lat, lng })}
          placeholder="Select destination"
        />
        <div className="field">
          <label>Date</label>
          <input
            type="date"
            value={date}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={planTrip} disabled={!canPlan || loading}>
          {loading ? <span className="spinner" /> : 'Find Friends on Route'}
        </button>
      </div>

      {(routeCoords || trip) && (
        <>
          <RouteMap
            trip={trip}
            routeCoords={routeCoords || [
              [trip?.start_lng, trip?.start_lat],
              [trip?.end_lng, trip?.end_lat],
            ]}
            nearbyFriends={nearby}
            onPing={openPingModal}
            sentPings={sentPings}
          />

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Search radius</span>
              <span style={{ fontWeight: 800, color: 'var(--orange)', fontSize: 15 }}>{radius} mi</span>
            </div>
            <input
              type="range"
              min="5" max="50" step="5"
              value={radius}
              onChange={e => updateRadius(Number(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>
              <span>5 mi</span><span>50 mi</span>
            </div>
          </div>

          {nearby !== null && (
            <div>
              <h2 style={{ fontWeight: 800, fontSize: 18, marginBottom: 12 }}>
                {nearby.length === 0 ? 'No friends nearby' : `${nearby.length} friend${nearby.length !== 1 ? 's' : ''} along your route`}
              </h2>
              {nearby.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">🗺️</div>
                  <h3>No one nearby yet</h3>
                  <p>Invite more friends or expand your radius</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {nearby.map(f => {
                    const pinged = sentPings.some(p => p.recipient_id === f.id);
                    return (
                      <div key={f.id} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{f.name}</div>
                          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>{f.city} · {f.distance_miles} mi off route</div>
                        </div>
                        {pinged ? (
                          <span style={{ fontSize: 13, color: 'var(--gray-400)', fontStyle: 'italic' }}>Pinged ✓</span>
                        ) : (
                          <button className="btn-secondary" onClick={() => openPingModal(f)}>Ping</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {toast && <div className="toast">{toast}</div>}

      {pingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setPingModal(null); }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: 480 }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Ping {pingModal.name} 🏓</div>
            <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 16 }}>
              {trip?.start_address?.split(',')[0]} → {trip?.end_address?.split(',')[0]}
            </div>
            <div className="field">
              <label>Add a note (optional)</label>
              <textarea
                value={pingNote}
                onChange={e => setPingNote(e.target.value)}
                placeholder="e.g. Leaving at 8am, want to grab coffee on the way?"
                rows={3}
                style={{ resize: 'none', fontSize: 15 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setPingModal(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={sendPing} disabled={pingSending}>
                {pingSending ? <span className="spinner" /> : 'Send Ping'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
