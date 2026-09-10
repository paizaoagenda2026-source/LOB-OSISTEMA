// =============================================
// SERVICE WORKER - LOBÃO PWA
// =============================================
const CACHE_NAME = 'lobao-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './lobao.jpg'
];

// Instalação - armazena em cache os arquivos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn('Aviso: alguns arquivos não puderam ser cacheados:', err);
      });
    })
  );
  self.skipWaiting();
});

// Ativação - limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Ignora requisições do Firebase, CDNs e métodos não-GET
  if (event.request.method !== 'GET' ||
      url.includes('firebase') ||
      url.includes('gstatic') ||
      url.includes('googleapis') ||
      url.includes('jsdelivr') ||
      url.includes('cloudflare') ||
      url.includes('chart.js')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retorna do cache e atualiza em background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // Não está em cache - busca da rede
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
          return networkResponse;
        }
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback offline - tenta o index.html
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
