import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

const SEEN_KEY = 'rm_seen_pings';

function getSeenIds() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); }
}
function markSeen(ids) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
}

const statusLabel = { yes: '✅ Yes!', maybe: '🤔 Maybe', no: '❌ Can\'t make it' };
const statusColor = { yes: '#065F46', maybe: '#92400E', no: '#991B1B' };
const statusBg   = { yes: '#D1FAE5', maybe: '#FEF3C7', no: '#FEE2E2' };

export default function NotificationBell() {
  const [responses, setResponses] = useState([]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(getSeenIds);
  const ref = useRef(null);

  useEffect(() => {
    function load() {
      api.getSent()
        .then(pings => setResponses(pings.filter(p => p.status !== 'pending')))
        .catch(() => {});
    }
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unseen = responses.filter(p => !seen.has(p.id));

  function toggle() {
    if (!open && unseen.length) {
      const newSeen = new Set([...seen, ...unseen.map(p => p.id)]);
      setSeen(newSeen);
      markSeen(newSeen);
    }
    setOpen(o => !o);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={toggle} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '6px', borderRadius: '50%', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={unseen.length ? '#F97316' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unseen.length > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: '#F97316', color: 'white',
            borderRadius: '99px', fontSize: 10, fontWeight: 800,
            padding: '1px 5px', lineHeight: 1.5, minWidth: 16, textAlign: 'center',
          }}>
            {unseen.length}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'white', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          border: '1px solid var(--gray-200)', minWidth: 280, zIndex: 200, overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px 10px', fontWeight: 800, fontSize: 15, borderBottom: '1px solid var(--gray-100)' }}>
            Ping replies
          </div>
          {responses.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
              No replies yet
            </div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {responses.map(p => (
                <div key={p.id} style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--gray-100)',
                  background: seen.has(p.id) ? 'white' : '#FFFBF5',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{p.recipient_name}</span>
                      <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
                        {p.start_address?.split(',')[0]} → {p.end_address?.split(',')[0]}
                      </div>
                    </div>
                    <span style={{
                      background: statusBg[p.status], color: statusColor[p.status],
                      borderRadius: 99, fontSize: 12, fontWeight: 700,
                      padding: '3px 10px', whiteSpace: 'nowrap',
                    }}>
                      {statusLabel[p.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
