const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Send a ping
router.post('/', auth, (req, res) => {
  const { trip_id, recipient_id } = req.body;
  if (!trip_id || !recipient_id) return res.status(400).json({ error: 'trip_id and recipient_id required' });

  const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND user_id = ?').get(trip_id, req.user.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  const existing = db.prepare('SELECT id FROM pings WHERE trip_id = ? AND sender_id = ? AND recipient_id = ?')
    .get(trip_id, req.user.id, recipient_id);
  if (existing) return res.status(409).json({ error: 'Ping already sent' });

  const id = uuidv4();
  db.prepare('INSERT INTO pings (id, trip_id, sender_id, recipient_id) VALUES (?, ?, ?, ?)').run(id, trip_id, req.user.id, recipient_id);

  const ping = db.prepare(`
    SELECT p.*, u.name as sender_name, t.start_address, t.end_address, t.trip_date
    FROM pings p
    JOIN users u ON u.id = p.sender_id
    JOIN trips t ON t.id = p.trip_id
    WHERE p.id = ?
  `).get(id);

  res.json(ping);
});

// Inbox: pings received by me
router.get('/inbox', auth, (req, res) => {
  const pings = db.prepare(`
    SELECT p.*, u.name as sender_name, t.start_address, t.end_address, t.trip_date
    FROM pings p
    JOIN users u ON u.id = p.sender_id
    JOIN trips t ON t.id = p.trip_id
    WHERE p.recipient_id = ?
    ORDER BY p.created_at DESC
  `).all(req.user.id);
  res.json(pings);
});

// Sent pings
router.get('/sent', auth, (req, res) => {
  const pings = db.prepare(`
    SELECT p.*, u.name as recipient_name, t.start_address, t.end_address, t.trip_date
    FROM pings p
    JOIN users u ON u.id = p.recipient_id
    JOIN trips t ON t.id = p.trip_id
    WHERE p.sender_id = ?
    ORDER BY p.created_at DESC
  `).all(req.user.id);
  res.json(pings);
});

// Respond to a ping
router.put('/:id/respond', auth, (req, res) => {
  const { status } = req.body;
  if (!['yes', 'maybe', 'no'].includes(status)) return res.status(400).json({ error: 'status must be yes, maybe, or no' });

  const ping = db.prepare('SELECT * FROM pings WHERE id = ? AND recipient_id = ?').get(req.params.id, req.user.id);
  if (!ping) return res.status(404).json({ error: 'Ping not found' });

  db.prepare("UPDATE pings SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
  res.json({ success: true, status });
});

module.exports = router;
