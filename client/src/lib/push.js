const VAPID_PUBLIC_KEY = 'BBLGJ6FYw9SJgms4xYznAOgjGCaO4e8-VMY-KRpsqNZ8pbduUZypQywN5QmsNcvq7HkfsYcAe1pqmdJkH17A8Ak';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export async function registerPush(saveSubscription) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const existing = await reg.pushManager.getSubscription();
    const sub = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    await saveSubscription(sub.toJSON());
  } catch (e) {
    console.error('Push registration failed:', e);
  }
}
