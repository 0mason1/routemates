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

// Find the closest [lng, lat] point on a route polyline to a given location
export function closestPointOnRoute(friendLat, friendLng, routeCoords) {
  let minDist = Infinity;
  let closest = routeCoords[0];
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const [aLng, aLat] = routeCoords[i];
    const [bLng, bLat] = routeCoords[i + 1];
    const dx = bLng - aLng, dy = bLat - aLat;
    if (dx === 0 && dy === 0) continue;
    const t = Math.max(0, Math.min(1, ((friendLng - aLng) * dx + (friendLat - aLat) * dy) / (dx * dx + dy * dy)));
    const ptLat = aLat + t * dy, ptLng = aLng + t * dx;
    const d = Math.hypot(ptLat - friendLat, ptLng - friendLng);
    if (d < minDist) { minDist = d; closest = [ptLng, ptLat]; }
  }
  return closest; // [lng, lat]
}

// Overpass API — find restaurants, cafes, gas stations near a lat/lng (free, no key)
export async function getMeetingPlaces(lat, lng, radiusMeters = 8000) {
  try {
    const q = `[out:json][timeout:20];
(
  node["amenity"="restaurant"](around:${radiusMeters},${lat},${lng});
  node["amenity"="fast_food"](around:${radiusMeters},${lat},${lng});
  node["amenity"="cafe"](around:${radiusMeters},${lat},${lng});
  node["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
  node["amenity"="bar"](around:${radiusMeters},${lat},${lng});
);
out body 40;`;
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`);
    const data = await res.json();
    return data.elements
      .filter(e => e.tags?.name)
      .map(e => ({
        name: e.tags.name,
        type: e.tags.amenity,
        lat: e.lat,
        lng: e.lon,
        cuisine: e.tags.cuisine,
      }))
      .slice(0, 8);
  } catch {
    return [];
  }
}
