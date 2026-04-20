import { useEffect, useRef } from 'react';
import L from 'leaflet';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function RouteMap({ routeCoords, nearbyFriends, onPing, sentPings }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const layersRef = useRef([]);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, { zoomControl: true }).setView([39.5, -98.35], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Draw route + friend pins whenever data changes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Remove old layers
    layersRef.current.forEach(l => map.removeLayer(l));
    layersRef.current = [];

    const bounds = [];

    if (routeCoords && routeCoords.length >= 2) {
      const latlngs = routeCoords.map(([lng, lat]) => [lat, lng]);

      const line = L.polyline(latlngs, { color: '#F97316', weight: 5, opacity: 0.85 }).addTo(map);
      layersRef.current.push(line);
      bounds.push(...latlngs);

      const startIcon = L.divIcon({ className: '', html: '<div style="width:14px;height:14px;background:#F97316;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>', iconAnchor: [7, 7] });
      const endIcon = L.divIcon({ className: '', html: '<div style="width:14px;height:14px;background:#C2410C;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>', iconAnchor: [7, 7] });

      const sm = L.marker(latlngs[0], { icon: startIcon }).addTo(map);
      const em = L.marker(latlngs[latlngs.length - 1], { icon: endIcon }).addTo(map);
      layersRef.current.push(sm, em);
    }

    if (nearbyFriends) {
      nearbyFriends.forEach(friend => {
        const alreadyPinged = sentPings?.some(p => p.recipient_id === friend.id);

        const html = alreadyPinged
          ? `<div style="background:#F3F4F6;border:2.5px solid #9CA3AF;border-radius:99px;padding:4px 10px;font-size:12px;font-weight:700;color:#6B7280;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.1);cursor:pointer">${friend.name} ✓</div>`
          : `<div style="background:white;border:2.5px solid #F97316;border-radius:99px;padding:4px 10px;font-size:12px;font-weight:700;color:#1F2937;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.15);cursor:pointer">${friend.name}</div>`;
        const icon = L.divIcon({ className: '', html, iconAnchor: [0, 0] });

        const popupContent = `
          <div style="font-family:-apple-system,sans-serif;min-width:160px">
            <div style="font-weight:800;font-size:16px;margin-bottom:2px">${friend.name}</div>
            <div style="font-size:13px;color:#6B7280">${friend.city}</div>
            <div style="font-size:12px;color:#F97316;margin:6px 0">${friend.distance_miles} mi off route</div>
            ${alreadyPinged
              ? `<div style="font-size:13px;color:#6B7280;font-style:italic">Ping sent ✓</div>`
              : `<button onclick="window._pingFriend('${friend.id}')" style="width:100%;padding:9px;background:#F97316;color:white;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer">Send ping</button>`
            }
          </div>`;

        const marker = L.marker([friend.city_lat, friend.city_lng], { icon })
          .bindPopup(popupContent)
          .addTo(map);

        layersRef.current.push(marker);
        bounds.push([friend.city_lat, friend.city_lng]);
      });

      // Global ping handler called from popup button
      window._pingFriend = (friendId) => {
        const friend = nearbyFriends.find(f => f.id === friendId);
        if (friend) { onPing(friend); map.closePopup(); }
      };
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routeCoords, nearbyFriends, sentPings]);

  return <div ref={mapRef} className="map-container" />;
}
