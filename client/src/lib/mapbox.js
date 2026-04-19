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
export async function getRoute(startLng, startLat, endLng, endLat) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates;
    }
  } catch {}
  // Fallback: straight line
  return [[startLng, startLat], [endLng, endLat]];
}

export const MAPBOX_TOKEN = '';
