require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { init } = require('./db/database');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/pings', require('./routes/pings'));

app.get('/api/health', (_, res) => res.json({ ok: true, jwt: !!process.env.JWT_SECRET }));

// JSON error handler — must be before static serving
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// Serve the React build in production
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (_, res) => res.sendFile(path.join(clientDist, 'index.html')));

const PORT = process.env.PORT || 3001;
init()
  .then(() => app.listen(PORT, () => console.log(`RouteMates server on :${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
