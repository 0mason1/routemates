import { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function LiveLocationMap({ locations, myUserId }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false })
      .setView([39.5, -98.35], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; markersRef.current = {}; };
  }, []);

  // Update markers whenever locations change
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !locations) return;

    const bounds = [];
    const seen = new Set();

    locations.forEach(loc => {
      const isMe = loc.user_id === myUserId;
      seen.add(loc.user_id);

      const color = isMe ? '#F97316' : '#1D4ED8';
      const label = isMe ? 'You' : loc.name.split(' ')[0];
      const html = `
        <div style="display:flex;align-items:center;gap:5px">
          <div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 0 2px ${color};flex-shrink:0"></div>
          <div style="background:${color};color:white;border-radius:99px;padding:3px 8px;font-size:11px;font-weight:800;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2)">${label}</div>
        </div>`;
      const icon = L.divIcon({ className: '', html, iconAnchor: [0, 5] });

      if (markersRef.current[loc.user_id]) {
        markersRef.current[loc.user_id].setLatLng([loc.lat, loc.lng]);
        markersRef.current[loc.user_id].setIcon(icon);
      } else {
        markersRef.current[loc.user_id] = L.marker([loc.lat, loc.lng], { icon }).addTo(map);
      }
      bounds.push([loc.lat, loc.lng]);
    });

    // Remove markers for users who stopped sharing
    for (const userId of Object.keys(markersRef.current)) {
      if (!seen.has(userId)) {
        map.removeLayer(markersRef.current[userId]);
        delete markersRef.current[userId];
      }
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
    }
  }, [locations, myUserId]);

  return (
    <div ref={mapRef} style={{
      height: 180,
      borderRadius: 12,
      overflow: 'hidden',
      border: '1.5px solid var(--gray-200)',
      marginTop: 4,
    }} />
  );
}
