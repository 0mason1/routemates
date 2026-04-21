const express = require('express');
const auth = require('../middleware/auth');
const { query } = require('../db/database');

const router = express.Router();

// In-memory store: pingId -> Map<userId, {lat, lng, name, ts}>
const liveLocations = new Map();

// Purge stale entries (older than 30s) every 15s
setInterval(() => {
  const cutoff = Date.now() - 30000;
  for (const [pingId, users] of liveLocations) {
    for (const [userId, loc] of users) {
      if (loc.ts < cutoff) users.delete(userId);
    }
    if (users.size === 0) liveLocations.delete(pingId);
  }
}, 15000);

// POST /api/locations/:pingId — update your live location
router.post('/:pingId', auth, async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required' });

    // Only participants of an accepted ping can share location
    const ping = (await query(
      'SELECT id FROM pings WHERE id=$1 AND (sender_id=$2 OR recipient_id=$2) AND status=$3',
      [req.params.pingId, req.user.id, 'yes']
    )).rows[0];
    if (!ping) return res.status(403).json({ error: 'Not authorized' });

    const user = (await query('SELECT name FROM users WHERE id=$1', [req.user.id])).rows[0];

    if (!liveLocations.has(req.params.pingId)) {
      liveLocations.set(req.params.pingId, new Map());
    }
    liveLocations.get(req.params.pingId).set(req.user.id, {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      name: user?.name || 'Unknown',
      ts: Date.now(),
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/locations/:pingId — stop sharing
router.delete('/:pingId', auth, (req, res) => {
  liveLocations.get(req.params.pingId)?.delete(req.user.id);
  res.json({ ok: true });
});

// GET /api/locations/:pingId — fetch all active locations
router.get('/:pingId', auth, async (req, res, next) => {
  try {
    const ping = (await query(
      'SELECT id FROM pings WHERE id=$1 AND (sender_id=$2 OR recipient_id=$2) AND status=$3',
      [req.params.pingId, req.user.id, 'yes']
    )).rows[0];
    if (!ping) return res.status(403).json({ error: 'Not authorized' });

    const users = liveLocations.get(req.params.pingId) || new Map();
    const cutoff = Date.now() - 30000;
    const result = [];
    for (const [userId, loc] of users) {
      if (loc.ts > cutoff) {
        result.push({ user_id: userId, lat: loc.lat, lng: loc.lng, name: loc.name, ts: loc.ts });
      }
    }
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
