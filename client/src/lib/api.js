const BASE = '/api';

function getToken() {
  return localStorage.getItem('rm_token');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  updateCity: (body) => request('/auth/city', { method: 'PUT', body: JSON.stringify(body) }),

  getInvite: (code) => request(`/friends/invite/${code}`),
  acceptInvite: (code) => request(`/friends/invite/${code}/accept`, { method: 'POST' }),
  getFriends: () => request('/friends'),

  createTrip: (body) => request('/trips', { method: 'POST', body: JSON.stringify(body) }),
  getTrips: () => request('/trips'),
  getNearby: (tripId, radius) => request(`/trips/${tripId}/nearby?radius=${radius}`),

  savePushSubscription: (sub) => request('/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription: sub }) }),

  getDirectMessages: (friendId) => request(`/messages/${friendId}`),
  sendDirectMessage: (friendId, message) => request(`/messages/${friendId}`, { method: 'POST', body: JSON.stringify({ message }) }),

  sendPing: (body) => request('/pings', { method: 'POST', body: JSON.stringify(body) }),
  getInbox: () => request('/pings/inbox'),
  getSent: () => request('/pings/sent'),
  respondPing: (id, status) => request(`/pings/${id}/respond`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getPingMessages: (id) => request(`/pings/${id}/messages`),
  sendPingMessage: (id, message) => request(`/pings/${id}/messages`, { method: 'POST', body: JSON.stringify({ message }) }),
};
