const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Haversine distance in miles between two lat/lng points
function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Shortest distance from point P to segment AB (in miles)
function pointToSegmentDist(pLat, pLng, aLat, aLng, bLat, bLng) {
  const dx = bLng - aLng;
  const dy = bLat - aLat;
  if (dx === 0 && dy === 0) return haversine(pLat, pLng, aLat, aLng);
  const t = Math.max(0, Math.min(1, ((pLng - aLng) * dx + (pLat - aLat) * dy) / (dx * dx + dy * dy)));
  return haversine(pLat, pLng, aLat + t * dy, aLng + t * dx);
}

// Shortest distance from point to entire route polyline
function distToRoute(lat, lng, coords) {
  let minDist = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const [aLng, aLat] = coords[i];
    const [bLng, bLat] = coords[i + 1];
    const d = pointToSegmentDist(lat, lng, aLat, aLng, bLat, bLng);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

router.post('/', auth, (req, res) => {
  const { start_address, end_address, start_lat, start_lng, end_lat, end_lng, trip_date, route_geometry } = req.body;
  if (!start_address || !end_address || !trip_date) return res.status(400).json({ error: 'Missing fields' });

  const id = uuidv4();
  db.prepare(
    `INSERT INTO trips (id, user_id, start_address, end_address, start_lat, start_lng, end_lat, end_lng, trip_date, route_geometry)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.user.id, start_address, end_address, start_lat, start_lng, end_lat, end_lng, trip_date, route_geometry ? JSON.stringify(route_geometry) : null);

  res.json(db.prepare('SELECT * FROM trips WHERE id = ?').get(id));
});

router.get('/', auth, (req, res) => {
  const trips = db.prepare('SELECT * FROM trips WHERE user_id = ? ORDER BY trip_date DESC').all(req.user.id);
  res.json(trips);
});

router.get('/:id', auth, (req, res) => {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!trip) return res.status(404).json({ error: 'Not found' });
  res.json(trip);
});

// Friends near this trip's route
router.get('/:id/nearby', auth, (req, res) => {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  const radius = parseFloat(req.query.radius) || 20;
  const friends = db.prepare(`
    SELECT u.id, u.name, u.city, u.city_lat, u.city_lng
    FROM friendships f
    JOIN users u ON u.id = f.friend_id
    WHERE f.user_id = ? AND u.city_lat IS NOT NULL AND u.city_lng IS NOT NULL
  `).all(req.user.id);

  let coords = null;
  if (trip.route_geometry) {
    try { coords = JSON.parse(trip.route_geometry); } catch {}
  }
  if (!coords) {
    coords = [[trip.start_lng, trip.start_lat], [trip.end_lng, trip.end_lat]];
  }

  const nearby = friends
    .map(f => {
      const dist = distToRoute(f.city_lat, f.city_lng, coords);
      return { ...f, distance_miles: Math.round(dist * 10) / 10 };
    })
    .filter(f => f.distance_miles <= radius)
    .sort((a, b) => a.distance_miles - b.distance_miles);

  res.json(nearby);
});

module.exports = router;
