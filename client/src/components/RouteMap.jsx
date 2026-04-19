import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { MAPBOX_TOKEN } from '../lib/mapbox';
import { api } from '../lib/api';

mapboxgl.accessToken = MAPBOX_TOKEN;

export default function RouteMap({ trip, routeCoords, nearbyFriends, onPing, sentPings }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const popupRef = useRef(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!MAPBOX_TOKEN) { setMapError(true); return; }
    if (!mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      zoom: 5,
      center: routeCoords?.length
        ? [
            (routeCoords[0][0] + routeCoords[routeCoords.length - 1][0]) / 2,
            (routeCoords[0][1] + routeCoords[routeCoords.length - 1][1]) / 2,
          ]
        : [-98.5795, 39.8283],
    });

    mapInstance.current = map;

    map.on('load', () => {
      if (routeCoords && routeCoords.length >= 2) {
        map.addSource('route', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'LineString', coordinates: routeCoords } },
        });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#F97316', 'line-width': 4, 'line-opacity': 0.9 },
        });

        // Start marker
        new mapboxgl.Marker({ color: '#F97316' })
          .setLngLat(routeCoords[0])
          .addTo(map);
        // End marker
        new mapboxgl.Marker({ color: '#C2410C' })
          .setLngLat(routeCoords[routeCoords.length - 1])
          .addTo(map);

        const bounds = routeCoords.reduce(
          (b, c) => b.extend(c),
          new mapboxgl.LngLatBounds(routeCoords[0], routeCoords[0])
        );
        map.fitBounds(bounds, { padding: 60 });
      }
    });

    return () => map.remove();
  }, []);

  // Update friend pins when nearby friends change
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !map.isStyleLoaded()) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (!nearbyFriends) return;

    nearbyFriends.forEach(friend => {
      const el = document.createElement('div');
      el.style.cssText = `
        background: white;
        border: 2.5px solid #F97316;
        border-radius: 99px;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 700;
        color: #1F2937;
        white-space: nowrap;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      `;
      el.textContent = friend.name;

      const alreadyPinged = sentPings?.some(p => p.recipient_id === friend.id || p.recipient_name === friend.name);

      const popupHTML = `
        <div style="font-family: -apple-system, sans-serif; min-width: 160px;">
          <div style="font-weight: 800; font-size: 16px; margin-bottom: 2px;">${friend.name}</div>
          <div style="font-size: 13px; color: #6B7280;">${friend.city}</div>
          <div style="font-size: 12px; color: #F97316; margin: 6px 0;">${friend.distance_miles} mi off route</div>
          ${alreadyPinged
            ? `<div style="font-size: 13px; color: #6B7280; font-style: italic;">Ping sent ✓</div>`
            : `<button id="ping-${friend.id}" style="
                width: 100%; padding: 9px; background: #F97316; color: white;
                border: none; border-radius: 8px; font-weight: 700; font-size: 14px;
                cursor: pointer; margin-top: 4px;">
                Send ping
              </button>`
          }
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 20, className: 'map-popup' })
        .setHTML(popupHTML);

      popup.on('open', () => {
        setTimeout(() => {
          const btn = document.getElementById(`ping-${friend.id}`);
          if (btn) btn.onclick = () => { onPing(friend); popup.remove(); };
        }, 50);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([friend.city_lng, friend.city_lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [nearbyFriends, sentPings]);

  if (mapError) {
    return (
      <div className="map-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 32 }}>🗺️</span>
        <span style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', padding: '0 20px' }}>
          Add your Mapbox token in <code>.env</code> to see the map
        </span>
      </div>
    );
  }

  return <div ref={mapRef} className="map-container" />;
}
