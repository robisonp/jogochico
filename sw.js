// Service worker: guarda o jogo no tablet para funcionar sem internet.
// Ao mudar qualquer arquivo, aumente a versão abaixo.
const VERSAO = 'chico-v2';
const ARQUIVOS = [
  './', 'index.html', 'manifest.webmanifest',
  'src/dados.js', 'src/audio.js', 'src/graficos.js', 'src/jogo.js',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Arquivos do jogo e a fonte: responde do cache e atualiza em segundo plano.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const fonte = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !fonte) return;
  e.respondWith(caches.open(VERSAO).then(async cache => {
    const salvo = await cache.match(e.request, { ignoreSearch: true });
    const rede = fetch(e.request).then(r => {
      if (r && (r.ok || r.type === 'opaque')) cache.put(e.request, r.clone());
      return r;
    }).catch(() => salvo);
    return salvo || rede;
  }));
});
