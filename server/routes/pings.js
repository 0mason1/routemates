const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, async (req, res, next) => {
  try {
    const { trip_id, recipient_id } = req.body;
    if (!trip_id || !recipient_id) return res.status(400).json({ error: 'trip_id and recipient_id required' });

    const trip = (await query('SELECT * FROM trips WHERE id=$1 AND user_id=$2', [trip_id, req.user.id])).rows[0];
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const existing = (await query('SELECT id FROM pings WHERE trip_id=$1 AND sender_id=$2 AND recipient_id=$3', [trip_id, req.user.id, recipient_id])).rows[0];
    if (existing) return res.status(409).json({ error: 'Ping already sent' });

    const id = uuidv4();
    await query('INSERT INTO pings (id,trip_id,sender_id,recipient_id) VALUES ($1,$2,$3,$4)', [id, trip_id, req.user.id, recipient_id]);

    const ping = (await query(`
      SELECT p.*,u.name as sender_name,t.start_address,t.end_address,t.trip_date
      FROM pings p JOIN users u ON u.id=p.sender_id JOIN trips t ON t.id=p.trip_id
      WHERE p.id=$1
    `, [id])).rows[0];
    res.json(ping);
  } catch (err) { next(err); }
});

router.get('/inbox', auth, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT p.*,u.name as sender_name,t.start_address,t.end_address,t.trip_date
      FROM pings p JOIN users u ON u.id=p.sender_id JOIN trips t ON t.id=p.trip_id
      WHERE p.recipient_id=$1 ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.get('/sent', auth, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT p.*,u.name as recipient_name,t.start_address,t.end_address,t.trip_date
      FROM pings p JOIN users u ON u.id=p.recipient_id JOIN trips t ON t.id=p.trip_id
      WHERE p.sender_id=$1 ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.put('/:id/respond', auth, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['yes','maybe','no'].includes(status)) return res.status(400).json({ error: 'status must be yes, maybe, or no' });
    const ping = (await query('SELECT * FROM pings WHERE id=$1 AND recipient_id=$2', [req.params.id, req.user.id])).rows[0];
    if (!ping) return res.status(404).json({ error: 'Ping not found' });
    await query('UPDATE pings SET status=$1, updated_at=NOW() WHERE id=$2', [status, req.params.id]);
    res.json({ success: true, status });
  } catch (err) { next(err); }
});

module.exports = router;
