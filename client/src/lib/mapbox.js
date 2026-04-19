export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export async function geocode(query) {
  if (!MAPBOX_TOKEN) return null;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=place,address&limit=5`;
  const res = await fetch(url);
  const data = await res.json();
  return data.features || [];
}

export async function getRoute(startLng, startLat, endLng, endLat) {
  if (!MAPBOX_TOKEN) return null;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.routes && data.routes.length > 0) {
    return data.routes[0].geometry.coordinates;
  }
  return null;
}
