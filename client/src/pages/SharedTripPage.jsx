import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import RouteMap from '../components/RouteMap';

export default function SharedTripPage() {
  const { code } = useParams();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSharedTrip(code).then(setTrip).catch(() => setError('Trip not found'));
  }, [code]);

  if (error) return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 48 }}>😕</div>
      <p>{error}</p>
    </div>
  );
  if (!trip) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <span className="spinner" style={{ borderColor: 'rgba(249,115,22,0.3)', borderTopColor: '#F97316', width: 28, height: 28, borderWidth: 3 }} />
    </div>
  );

  const coords = trip.route_geometry ? JSON.parse(trip.route_geometry) : [[trip.start_lng, trip.start_lat], [trip.end_lng, trip.end_lat]];
  const date = new Date(trip.trip_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div style={{ padding: '24px 16px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 32 }}>🚗</div>
        <h1 style={{ fontWeight: 800, fontSize: 22, margin: '8px 0 4px' }}>Shared Trip</h1>
        <div style={{ color: 'var(--gray-400)', fontSize: 14 }}>{date}</div>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700 }}>{trip.start_address?.split(',')[0]}</div>
        <div style={{ color: 'var(--orange)', fontWeight: 800, margin: '4px 0' }}>↓</div>
        <div style={{ fontWeight: 700 }}>{trip.end_address?.split(',')[0]}</div>
      </div>
      <RouteMap routeCoords={coords} nearbyFriends={[]} sentPings={[]} />
    </div>
  );
}
