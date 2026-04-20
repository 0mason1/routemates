import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import AddressInput from '../components/AddressInput';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function FriendsPage() {
  const { user, updateUser, logout } = useAuth();
  const { toast, showToast } = useToast();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cityText, setCityText] = useState(user?.city || '');
  const [cityCoords, setCityCoords] = useState(null);
  const [savingCity, setSavingCity] = useState(false);
  const [showCityEdit, setShowCityEdit] = useState(!user?.city);
  const [search, setSearch] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    Promise.all([api.getFriends(), api.getUnreadCounts()])
      .then(([f, counts]) => {
        setFriends(f);
        setUnreadCounts(counts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredFriends = friends.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.username && f.username.toLowerCase().includes(search.toLowerCase()))
  );

  const inviteLink = `${window.location.origin}/invite/${user?.invite_code}`;

  async function copyLink() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(inviteLink);
      } else {
        const el = document.createElement('textarea');
        el.value = inviteLink;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      showToast('Invite link copied! 🎉');
    } catch {
      showToast('Link: ' + inviteLink);
    }
  }

  async function saveCity() {
    if (!cityCoords) { showToast('Select a city from the dropdown'); return; }
    setSavingCity(true);
    try {
      const updated = await api.updateCity({ city: cityText.split(',')[0].trim(), city_lat: cityCoords.lat, city_lng: cityCoords.lng });
      updateUser(updated);
      setShowCityEdit(false);
      showToast('City updated!');
    } catch (err) {
      showToast(err.message);
    } finally {
      setSavingCity(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete your account? This cannot be undone.')) return;
    try {
      await api.deleteAccount();
      logout();
    } catch (err) {
      showToast(err.message);
    }
  }

  function handleChatOpen(friendId) {
    api.markMessagesRead(friendId).catch(() => {});
    setUnreadCounts(prev => ({ ...prev, [friendId]: 0 }));
  }

  return (
    <div className="page" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 className="section-header">Friends</h1>

      {/* Invite link */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)', border: '1px solid var(--orange-light)' }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Invite friends</div>
        <div style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 14 }}>
          Share your link — when they sign up, you'll connect automatically.
        </div>
        <div style={{ background: 'white', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: 'var(--gray-600)', wordBreak: 'break-all', marginBottom: 12, border: '1px solid var(--gray-200)' }}>
          {inviteLink}
        </div>
        <button className="btn-primary" onClick={copyLink}>Copy invite link</button>
      </div>

      {/* Current city */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Your address</div>
            {user?.city && !showCityEdit && (
              <div style={{ fontSize: 14, color: 'var(--gray-400)', marginTop: 2 }}>{user.city}</div>
            )}
          </div>
          {!showCityEdit && (
            <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => setShowCityEdit(true)}>
              {user?.city ? 'Update' : 'Add address'}
            </button>
          )}
        </div>
        {showCityEdit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AddressInput
              value={cityText}
              onChange={t => { setCityText(t); setCityCoords(null); }}
              onSelect={({ name, lat, lng }) => { setCityText(name); setCityCoords({ lat, lng }); }}
              placeholder="Select your city"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={saveCity} disabled={savingCity}>
                {savingCity ? <span className="spinner" /> : 'Save'}
              </button>
              {user?.city && (
                <button className="btn-secondary" onClick={() => { setShowCityEdit(false); setCityText(user.city); }}>Cancel</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Friends list */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
          {loading ? 'Loading...' : `${friends.length} friend${friends.length !== 1 ? 's' : ''}`}
        </div>

        {/* Search */}
        {!loading && friends.length > 0 && (
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search friends..."
            style={{ width: '100%', borderRadius: 10, padding: '10px 14px', border: '1.5px solid var(--gray-200)', fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }}
          />
        )}

        {!loading && friends.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">👯</div>
            <h3>No friends yet</h3>
            <p>Share your invite link to connect</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredFriends.map(f => (
              <FriendCard
                key={f.id}
                friend={f}
                currentUserId={user?.id}
                unreadCount={unreadCounts[f.id] || 0}
                onChatOpen={() => handleChatOpen(f.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Logout + Delete */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <button className="btn-secondary" onClick={logout}>Log out</button>
        <button onClick={handleDelete} style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: 13, cursor: 'pointer' }}>
          Delete account
        </button>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function FriendCard({ friend: f, currentUserId, unreadCount, onChatOpen }) {
  const [showAddress, setShowAddress] = useState(false);
  const [showChat, setShowChat] = useState(false);

  function handleChatToggle() {
    if (!showChat) {
      onChatOpen();
    }
    setShowChat(v => !v);
  }

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--orange), var(--amber))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 800, fontSize: 16, flexShrink: 0,
        }}>
          {f.name[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{f.name}</div>
          {f.city && (
            <button
              onClick={() => setShowAddress(v => !v)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, color: 'var(--gray-400)', marginTop: 2, textAlign: 'left' }}
            >
              {showAddress ? f.city : 'Tap to see location'}
            </button>
          )}
          {parseInt(f.mutual_count) > 0 && (
            <div style={{ fontSize: 12, color: 'var(--orange)', marginTop: 2, fontWeight: 600 }}>
              {f.mutual_count} mutual friend{f.mutual_count !== '1' ? 's' : ''}
            </div>
          )}
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={handleChatToggle}
            style={{ background: showChat ? 'var(--orange)' : 'var(--gray-100)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={showChat ? 'white' : 'var(--gray-500)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -3, right: -3,
              background: 'var(--orange)', color: 'white',
              borderRadius: '99px', fontSize: 10, fontWeight: 800,
              padding: '1px 5px', lineHeight: 1.4, minWidth: 16, textAlign: 'center',
            }}>
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      {showChat && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--gray-100)', paddingTop: 14 }}>
          <DirectChat friendId={f.id} currentUserId={currentUserId} />
        </div>
      )}
    </div>
  );
}

function DirectChat({ friendId, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [friendLastRead, setFriendLastRead] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.getDirectMessages(friendId).then(setMessages).catch(() => {});
    api.getSeenStatus(friendId).then(d => setFriendLastRead(d.last_read_at)).catch(() => {});
    const t = setInterval(() => {
      api.getDirectMessages(friendId).then(setMessages).catch(() => {});
      api.getSeenStatus(friendId).then(d => setFriendLastRead(d.last_read_at)).catch(() => {});
    }, 2000);
    return () => clearInterval(t);
  }, [friendId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const msg = await api.sendDirectMessage(friendId, text.trim());
      setMessages(ms => [...ms, msg]);
      setText('');
    } catch {}
    setSending(false);
  }

  return (
    <div>
      <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        {messages.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--gray-400)', textAlign: 'center', padding: '8px 0' }}>No messages yet</div>
        )}
        {messages.map((m, idx) => {
          const mine = m.sender_id === currentUserId;
          const isLastMine = mine && messages.slice(idx + 1).every(x => x.sender_id !== currentUserId);
          const seenByFriend = isLastMine && friendLastRead && new Date(friendLastRead) >= new Date(m.created_at);
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                background: mine ? 'var(--orange)' : 'var(--gray-100)',
                color: mine ? 'white' : 'var(--gray-800)',
                borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '8px 12px', fontSize: 14, maxWidth: '80%',
              }}>
                {m.message}
              </div>
              {m.created_at && (
                <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>
                  {timeAgo(m.created_at)}
                  {seenByFriend && <span style={{ marginLeft: 6, color: 'var(--orange)' }}>· Seen</span>}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Send a message..."
          style={{ flex: 1, borderRadius: 99, padding: '9px 14px', fontSize: 14, border: '1.5px solid var(--gray-200)' }}
        />
        <button onClick={send} disabled={sending || !text.trim()} style={{
          background: 'var(--orange)', color: 'white', border: 'none',
          borderRadius: '50%', width: 38, height: 38, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
