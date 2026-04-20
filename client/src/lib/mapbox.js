// Nominatim (OpenStreetMap) geocoding — free, no key needed
export async function geocode(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    return data.map(f => ({
      id: f.place_id,
      place_name: f.display_name,
      center: [parseFloat(f.lon), parseFloat(f.lat)],
    }));
  } catch {
    return [];
  }
}

// OSRM (OpenStreetMap Routing Machine) — free, no key needed
// points: array of {lng, lat}
export async function getRoute(points) {
  try {
    const coords = points.map(p => `${p.lng},${p.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates;
    }
  } catch {}
  return points.map(p => [p.lng, p.lat]);
}

export const MAPBOX_TOKEN = '';
