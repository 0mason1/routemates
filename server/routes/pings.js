const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db/database');
const auth = require('../middleware/auth');
const webpush = require('web-push');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@routemates.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const router = express.Router();

async function sendPushToUser(userId, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  try {
    const subs = (await query('SELECT subscription FROM push_subscriptions WHERE user_id=$1', [userId])).rows;
    for (const row of subs) {
      try {
        await webpush.sendNotification(row.subscription, JSON.stringify(payload));
      } catch (e) {
        if (e.statusCode === 410) {
          await query('DELETE FROM push_subscriptions WHERE user_id=$1 AND subscription=$2', [userId, JSON.stringify(row.subscription)]);
        }
      }
    }
  } catch {}
}

async function sendSmsToUser(phone, message) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !phone) return;
  try {
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({ body: message, from: process.env.TWILIO_FROM, to: phone });
  } catch (e) {
    console.error('SMS error:', e.message);
  }
}

router.post('/', auth, async (req, res, next) => {
  try {
    const { trip_id, recipient_id, message } = req.body;
    if (!trip_id || !recipient_id) return res.status(400).json({ error: 'trip_id and recipient_id required' });

    const trip = (await query('SELECT * FROM trips WHERE id=$1 AND user_id=$2', [trip_id, req.user.id])).rows[0];
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const existing = (await query('SELECT id FROM pings WHERE trip_id=$1 AND sender_id=$2 AND recipient_id=$3', [trip_id, req.user.id, recipient_id])).rows[0];
    if (existing) return res.status(409).json({ error: 'Ping already sent' });

    const id = uuidv4();
    await query('INSERT INTO pings (id,trip_id,sender_id,recipient_id,message) VALUES ($1,$2,$3,$4,$5)', [id, trip_id, req.user.id, recipient_id, message || null]);

    const ping = (await query(`
      SELECT p.*,
        s.name as sender_name, s.phone as sender_phone,
        r.name as recipient_name, r.phone as recipient_phone,
        t.start_address, t.end_address, t.trip_date
      FROM pings p
        JOIN users s ON s.id=p.sender_id
        JOIN users r ON r.id=p.recipient_id
        JOIN trips t ON t.id=p.trip_id
      WHERE p.id=$1
    `, [id])).rows[0];

    const route = `${ping.start_address?.split(',')[0]} → ${ping.end_address?.split(',')[0]}`;
    const smsMsg = message
      ? `${ping.sender_name} wants to meet up on their trip ${route}: "${message}" — Reply at https://routemates.onrender.com`
      : `${ping.sender_name} wants to be RouteMates on their trip: ${route}. Reply at https://routemates.onrender.com`;

    sendPushToUser(recipient_id, {
      title: `${ping.sender_name} wants to meet up! 🏓`,
      body: message || route,
      url: '/trips',
    });

    sendSmsToUser(ping.recipient_phone, smsMsg);

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

    const detail = (await query(`
      SELECT p.sender_id, r.name as recipient_name, t.start_address, t.end_address
      FROM pings p JOIN users r ON r.id=p.recipient_id JOIN trips t ON t.id=p.trip_id
      WHERE p.id=$1
    `, [req.params.id])).rows[0];
    if (detail) {
      const label = { yes: 'Yes! ✅', maybe: 'Maybe 🤔', no: "Can't make it ❌" }[status];
      sendPushToUser(detail.sender_id, {
        title: `${detail.recipient_name} replied: ${label}`,
        body: `${detail.start_address?.split(',')[0]} → ${detail.end_address?.split(',')[0]}`,
        url: '/trips',
      });
    }

    res.json({ success: true, status });
  } catch (err) { next(err); }
});

router.get('/:id/messages', auth, async (req, res, next) => {
  try {
    const ping = (await query('SELECT * FROM pings WHERE id=$1 AND (sender_id=$2 OR recipient_id=$2)', [req.params.id, req.user.id])).rows[0];
    if (!ping) return res.status(404).json({ error: 'Not found' });
    const msgs = (await query(`
      SELECT m.*, u.name as sender_name
      FROM ping_messages m JOIN users u ON u.id=m.sender_id
      WHERE m.ping_id=$1 ORDER BY m.created_at ASC
    `, [req.params.id])).rows;
    res.json(msgs);
  } catch (err) { next(err); }
});

router.post('/:id/messages', auth, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'message required' });
    const ping = (await query('SELECT * FROM pings WHERE id=$1 AND (sender_id=$2 OR recipient_id=$2)', [req.params.id, req.user.id])).rows[0];
    if (!ping) return res.status(404).json({ error: 'Not found' });
    if (ping.status !== 'yes') return res.status(400).json({ error: 'Can only message on accepted pings' });

    const id = uuidv4();
    await query('INSERT INTO ping_messages (id,ping_id,sender_id,message) VALUES ($1,$2,$3,$4)', [id, req.params.id, req.user.id, message.trim()]);

    const otherId = ping.sender_id === req.user.id ? ping.recipient_id : ping.sender_id;
    const sender = (await query('SELECT name FROM users WHERE id=$1', [req.user.id])).rows[0];
    sendPushToUser(otherId, {
      title: `${sender.name} sent a message`,
      body: message.trim(),
      url: '/trips',
    });

    res.json({ id, ping_id: req.params.id, sender_id: req.user.id, sender_name: sender.name, message: message.trim(), created_at: new Date() });
  } catch (err) { next(err); }
});

module.exports = router;
