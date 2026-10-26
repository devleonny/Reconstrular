const CACHE_PREFIX = `reconstrular-${self.registration.scope}-`
const CACHE = `${CACHE_PREFIX}v1.80`
const localUrl = path => new URL(path, self.registration.scope).href
const PUSH_CACHE = `reconstrular-push:${self.registration.scope}`

self.addEventListener('message', event => {
  if (event.data?.tipo === 'chat-push-ativar') {
    event.waitUntil(self.skipWaiting())
    return
  }
  if (event.data?.tipo !== 'chat-push-usuario') return
  event.waitUntil((async () => {
    const cache = await caches.open(PUSH_CACHE)
    await cache.put(localUrl('push-usuario'), new Response(JSON.stringify({ usuario: event.data.usuario || null })))
    if (!event.data.usuario) {
      const notificacoes = await self.registration.getNotifications()
      notificacoes.forEach(n => n.close())
    }
  })())
})

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let dados
    try { dados = event.data?.json() } catch { return }
    if (dados?.tipo !== 'chat_mensagem' || !dados.conversa_id || !dados.usuario) return
    const cache = await caches.open(PUSH_CACHE)
    const resposta = await cache.match(localUrl('push-usuario'))
    const vinculo = resposta ? await resposta.json() : null
    if (vinculo?.usuario !== dados.usuario) return
    await self.registration.showNotification('Reconstrular — Nova mensagem', {
      body: 'Você recebeu uma nova mensagem no chat.',
      icon: localUrl('imagens/pwa/icone-192-v3.png'),
      tag: `chat-${String(dados.conversa_id).slice(0, 150)}`,
      data: { conversa_id: String(dados.conversa_id), usuario: dados.usuario }
    })
  })())
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil((async () => {
    const destino = new URL(self.registration.scope)
    destino.searchParams.set('chat_conversa', event.notification.data.conversa_id)
    destino.searchParams.set('chat_usuario', event.notification.data.usuario)
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existente = janelas.find(c => c.url.startsWith(self.registration.scope))
    if (existente) {
      const navegada = await existente.navigate(destino.href)
      if (navegada) await navegada.focus()
    } else await self.clients.openWindow(destino.href)
  })())
})

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
    // Um recurso opcional ausente não deve bloquear a ativação do app inteiro.
    const resultados = await Promise.allSettled([...arquivos].map(path => cache.add(localUrl(path))))
    resultados.forEach((resultado, i) => {
      if (resultado.status === 'rejected') console.warn('Recurso não armazenado no cache:', [...arquivos][i])
    })
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
