// ── Cup Heroes Service Worker ──────────────────────────────
// 策略：
//   HTML (navigation) → Network First（永遠抓最新版，離線才用快取）
//   JS / CSS / 圖片   → Cache First（Vite 產生 hash 檔名，改了就是新檔）
//   API / 其他        → Network Only（不快取）

const CACHE_NAME = 'cup-heroes-v3'

// ── 安裝：不預快取 HTML，讓 Network First 負責 ────────────
self.addEventListener('install', () => {
  self.skipWaiting()  // 立即取代舊 SW，不等待頁面關閉
})

// ── 啟動：刪除所有舊版快取 ────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())  // 立即接管所有分頁
  )
})

// ── 請求攔截 ──────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // ① HTML / 導覽請求 → Network First
  if (event.request.mode === 'navigate' ||
      url.pathname.endsWith('.html') ||
      url.pathname === '/cup-heroes-pwa/' ||
      url.pathname === '/cup-heroes-pwa') {
    event.respondWith(networkFirst(event.request))
    return
  }

  // ② Vite 產生的 JS/CSS（檔名含 hash）→ Cache First（永久快取）
  if (/\.(js|css)$/.test(url.pathname) && /[a-f0-9]{8}/.test(url.pathname)) {
    event.respondWith(cacheFirst(event.request, true))
    return
  }

  // ③ 圖片 / 字型 / manifest → Cache First（可更新）
  if (/\.(png|jpg|jpeg|webp|gif|svg|woff2?|ttf|ico|json)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(event.request, false))
    return
  }

  // ④ 其他 → 直接走網路
  event.respondWith(fetch(event.request))
})

// ── Network First：先嘗試網路，失敗才用快取 ──────────────
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || new Response('Offline', { status: 503 })
  }
}

// ── Cache First：先查快取，沒有才走網路 ──────────────────
// immutable=true 表示找到快取就直接用，不更新（用於 hash 檔）
async function cacheFirst(request, immutable) {
  const cached = await caches.match(request)
  if (cached && immutable) return cached   // hash 檔永遠不過期
  if (cached) {
    // 非 immutable：背景更新快取（Stale-While-Revalidate）
    fetch(request).then((res) => {
      if (res && res.status === 200) {
        caches.open(CACHE_NAME).then((c) => c.put(request, res))
      }
    }).catch(() => {})
    return cached
  }
  // 快取裡沒有 → 走網路並存快取
  try {
    const response = await fetch(request)
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
