// amatda — Service Worker
// 알림 수신 + 백그라운드 처리

const CACHE = 'amatda-v1';
const ASSETS = ['/', '/index.html'];

// 설치 — 앱 파일 캐시
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 활성화
self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// 네트워크 요청 — 캐시 우선
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// ── 푸시 알림 수신 ──
self.addEventListener('push', e => {
  const data = e.data?.json() ?? {};

  const title = data.title || 'amatda';
  const body  = data.body  || '다시 마주칠 시간이에요.';
  const type  = data.type  || 'do';   // say / do / think
  const id    = data.id    || '';

  const icons = { say:'💬', do:'🔲', think:'🌀' };
  const icon  = icons[type] || '○';

  const options = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: `amatda-${id}`,           // 같은 id면 덮어써서 중복 방지
    renotify: true,
    data: { url: '/', needId: id, type },
    actions: [
      { action: 'done',  title: '✓ 했어요'   },
      { action: 'later', title: '나중에요'    },
      { action: 'drop',  title: '안 해도 됨' },
    ],
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ── 알림 클릭 처리 ──
self.addEventListener('notificationclick', e => {
  e.notification.close();

  const { action } = e;
  const { url, needId, type } = e.notification.data;

  // 응답을 Supabase에 기록 (백그라운드)
  if (action && needId) {
    e.waitUntil(
      fetch('/api/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: needId, action }),
      }).catch(() => {})   // 실패해도 앱 열리는 데 영향 없게
    );
  }

  // 앱 포커스 or 새 탭
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow(url || '/');
    })
  );
});
