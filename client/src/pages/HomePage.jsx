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

  const [start, setStart] = useState({ text: '', lat: null, lng: null });
  const [end, setEnd] = useState({ text: '', lat: null, lng: null });
  const [date, setDate] = useState('');
  const [routeCoords, setRouteCoords] = useState(null);
  const [radius, setRadius] = useState(20);
  const [nearby, setNearby] = useState(null);
  const [sentPings, setSentPings] = useState([]);
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(false);

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

  async function handlePing(friend) {
    if (!trip) return;
    try {
      await api.sendPing({ trip_id: trip.id, recipient_id: friend.id });
      setSentPings(prev => [...prev, { recipient_id: friend.id }]);
      showToast(`Ping sent to ${friend.name}! 🏓`);
    } catch (err) {
      showToast(err.message);
    }
  }

  const canPlan = start.lat && end.lat && date;

  return (
    <div className="page" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 className="section-header">Where are you driving?</h1>
        <p className="section-sub">Find friends along your route</p>
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
            onPing={handlePing}
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
                          <button className="btn-secondary" onClick={() => handlePing(f)}>Ping</button>
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
    </div>
  );
}
