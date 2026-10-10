const CACHE_PREFIX = `reconstrular-${self.registration.scope}-`
const CACHE = `${CACHE_PREFIX}v1.72`
const localUrl = path => new URL(path, self.registration.scope).href

// Prepara a interface local. APIs e bibliotecas externas continuam online.
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    const resposta = await fetch(localUrl('index.html'), { cache: 'reload' })
    if (!resposta.ok) throw new Error('Não foi possível carregar a interface do app.')
    const html = await resposta.clone().text()
    const arquivos = new Set(['manifest.json', 'imagens/logo.png',
      'imagens/pwa/icone-192-v3.png', 'imagens/pwa/icone-512-v3.png'])
    for (const atributo of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      const url = new URL(atributo[1], self.registration.scope)
      if (url.href.startsWith(self.registration.scope)) arquivos.add(url.href)
    }
    await cache.addAll([...arquivos].map(localUrl))
    await cache.put(localUrl('index.html'), resposta)
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const chaves = await caches.keys()
    await Promise.all(chaves.filter(chave => chave.startsWith(CACHE_PREFIX) && chave !== CACHE)
      .map(chave => caches.delete(chave)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || !url.href.startsWith(self.registration.scope)) return
  const navegacao = request.mode === 'navigate'
  const caminho = url.pathname.slice(new URL(self.registration.scope).pathname.length)
  const estatico = /^(?:css|js|imagens|gifs)\//.test(caminho)
    || caminho === 'manifest.json' || caminho === 'index.html'
  if (!navegacao && !estatico) return
  event.respondWith((async () => {
    const cache = await caches.open(CACHE)
    try {
      const resposta = await fetch(request)
      if (resposta.ok && resposta.type === 'basic' && !navegacao) {
        await cache.put(request, resposta.clone())
      }
      return resposta
    } catch (erro) {
      const salva = await cache.match(navegacao ? localUrl('index.html') : request)
      if (salva) return salva
      return new Response('Sem conexão. Conecte-se à internet para carregar este recurso.',
        { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    }
  })())
})
