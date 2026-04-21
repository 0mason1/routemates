import { useState, useEffect } from 'react';
import AddressInput from '../components/AddressInput';
import RouteMap from '../components/RouteMap';
import { getRoute, closestPointOnRoute, getMeetingPlaces } from '../lib/mapbox';
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
  const [waypoints, setWaypoints] = useState(() => load('rm_hp_waypoints', []));
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
  const [meetingSpots, setMeetingSpots] = useState([]);
  const [spotsLoading, setSpotsLoading] = useState(false);

  useEffect(() => { localStorage.setItem('rm_hp_start', JSON.stringify(start)); }, [start]);
  useEffect(() => { localStorage.setItem('rm_hp_end', JSON.stringify(end)); }, [end]);
  useEffect(() => { localStorage.setItem('rm_hp_waypoints', JSON.stringify(waypoints)); }, [waypoints]);
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
      const allPoints = [
        { lng: start.lng, lat: start.lat },
        ...waypoints.filter(w => w.lat).map(w => ({ lng: w.lng, lat: w.lat })),
        { lng: end.lng, lat: end.lat },
      ];
      const coords = await getRoute(allPoints);
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
        waypoints: waypoints.filter(w => w.lat),
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

  async function openPingModal(friend) {
    if (!trip) return;
    setPingModal(friend);
    setPingNote('');
    setMeetingSpots([]);

    if (routeCoords && friend.city_lat && friend.city_lng) {
      setSpotsLoading(true);
      try {
        const [closeLng, closeLat] = closestPointOnRoute(
          parseFloat(friend.city_lat), parseFloat(friend.city_lng), routeCoords
        );
        const meetLat = (closeLat + parseFloat(friend.city_lat)) / 2;
        const meetLng = (closeLng + parseFloat(friend.city_lng)) / 2;
        const spots = await getMeetingPlaces(meetLat, meetLng);
        setMeetingSpots(spots);
      } catch {}
      setSpotsLoading(false);
    }
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

  function addWaypoint() {
    setWaypoints(ws => [...ws, { text: '', lat: null, lng: null }]);
  }

  function removeWaypoint(i) {
    setWaypoints(ws => ws.filter((_, idx) => idx !== i));
  }

  function updateWaypoint(i, update) {
    setWaypoints(ws => ws.map((w, idx) => idx === i ? { ...w, ...update } : w));
  }

  const canPlan = start.lat && end.lat && date;
  const hasAnything = start.text || end.text || date || routeCoords || nearby;

  function clearAll() {
    const empty = { text: '', lat: null, lng: null };
    setStart(empty); setEnd(empty); setDate('');
    setRouteCoords(null); setNearby(null); setTrip(null);
    setSentPings([]); setRadius(20); setWaypoints([]);
    ['rm_hp_start','rm_hp_end','rm_hp_date','rm_hp_route','rm_hp_nearby','rm_hp_trip','rm_hp_radius','rm_hp_waypoints'].forEach(k => localStorage.removeItem(k));
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
        {waypoints.map((wp, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <AddressInput
                label={`Stop ${i + 1}`}
                value={wp.text}
                onChange={t => updateWaypoint(i, { text: t, lat: null, lng: null })}
                onSelect={({ name, lat, lng }) => updateWaypoint(i, { text: name, lat, lng })}
                placeholder="Add a stop"
              />
            </div>
            <button onClick={() => removeWaypoint(i)} style={{ background: 'none', border: '1.5px solid var(--gray-200)', borderRadius: 8, padding: '10px 10px', cursor: 'pointer', color: 'var(--gray-400)', flexShrink: 0, marginBottom: 2 }}>
              ✕
            </button>
          </div>
        ))}
        <AddressInput
          label="To"
          value={end.text}
          onChange={t => setEnd(s => ({ ...s, text: t, lat: null, lng: null }))}
          onSelect={({ name, lat, lng }) => setEnd({ text: name, lat, lng })}
          placeholder="Select destination"
        />
        <button onClick={addWaypoint} style={{ background: 'none', border: '1.5px dashed var(--gray-200)', borderRadius: 10, padding: '9px 0', fontSize: 13, fontWeight: 700, color: 'var(--gray-400)', cursor: 'pointer', width: '100%' }}>
          + Add stop
        </button>
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
                    const pendingCount = sentPings.filter(p => p.recipient_id === f.id && p.status === 'pending').length;
                    const maxed = pendingCount >= 3;
                    return (
                      <div key={f.id} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{f.name}</div>
                          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>{f.city} · {f.distance_miles} mi off route</div>
                        </div>
                        {maxed ? (
                          <span style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic', textAlign: 'right' }}>3/3 pings sent</span>
                        ) : pendingCount > 0 ? (
                          <button className="btn-secondary" onClick={() => openPingModal(f)}>
                            Ping ({pendingCount}/3)
                          </button>
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

            {/* Meeting spots */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                📍 Meetup spots near your route
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--gray-400)' }}>midway to {pingModal.name.split(' ')[0]}</span>
              </div>
              {spotsLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-400)', fontSize: 13 }}>
                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(249,115,22,0.2)', borderTopColor: 'var(--orange)' }} />
                  Finding nearby spots…
                </div>
              ) : meetingSpots.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>No spots found nearby</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                  {meetingSpots.map((s, i) => {
                    const emoji = { restaurant: '🍽️', fast_food: '🍔', cafe: '☕', fuel: '⛽', bar: '🍺' }[s.type] || '📌';
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name)}&center=${s.lat},${s.lng}`;
                    return (
                      <a key={i} href={mapsUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--gray-100)', borderRadius: 10, padding: '10px 12px', textDecoration: 'none' }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{emoji}</span>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 1, textTransform: 'capitalize' }}>
                            {s.type.replace('_', ' ')}{s.cuisine ? ` · ${s.cuisine.split(';')[0]}` : ''}
                          </div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </a>
                    );
                  })}
                </div>
              )}
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
