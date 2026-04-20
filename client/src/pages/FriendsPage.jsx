import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import AddressInput from '../components/AddressInput';

export default function FriendsPage() {
  const { user, updateUser } = useAuth();
  const { toast, showToast } = useToast();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cityText, setCityText] = useState(user?.city || '');
  const [cityCoords, setCityCoords] = useState(null);
  const [savingCity, setSavingCity] = useState(false);
  const [showCityEdit, setShowCityEdit] = useState(!user?.city);

  useEffect(() => {
    api.getFriends()
      .then(setFriends)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const inviteLink = `${window.location.origin}/invite/${user?.invite_code}`;

  async function copyLink() {
    // navigator.clipboard requires HTTPS — fall back to execCommand for HTTP
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
            <div style={{ fontWeight: 700, fontSize: 15 }}>Your current city</div>
            {user?.city && !showCityEdit && (
              <div style={{ fontSize: 14, color: 'var(--gray-400)', marginTop: 2 }}>{user.city}</div>
            )}
          </div>
          {!showCityEdit && (
            <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => setShowCityEdit(true)}>
              {user?.city ? 'Update' : 'Set city'}
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
        {!loading && friends.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">👯</div>
            <h3>No friends yet</h3>
            <p>Share your invite link to connect</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {friends.map(f => (
              <div key={f.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--orange), var(--amber))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 800, fontSize: 16, flexShrink: 0,
                }}>
                  {f.name[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{f.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
                    {f.city || 'No city set'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
