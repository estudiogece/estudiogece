// Service worker mínimo do Estúdio Gecê.
// Sem cache e sem interceptar respostas (o painel/portal são dinâmicos,
// autenticados e usam redirecionamentos). Serve só para habilitar a
// instalação como PWA; toda requisição segue direto para a rede.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* passa direto para a rede */ });
