function chatPushSuportado() {
    return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function chatPushApi(rota, dados = {}) {
    const { token } = JSON.parse(localStorage.getItem('acesso')) || {}
    const resposta = await fetchAutenticado(`${api}/chat/push/${rota}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(dados)
    })
    if (!resposta) throw new Error('Sua sessão foi encerrada.')
    const resultado = await resposta.json().catch(() => null)
    if (!resposta.ok || resultado?.success !== true) throw new Error(resultado?.mensagem || 'O servidor ainda não confirmou as notificações do chat.')
    return resultado
}

function chatPushChave(valor) {
    const texto = valor.replace(/-/g, '+').replace(/_/g, '/')
    return Uint8Array.from(atob(texto + '='.repeat((4 - texto.length % 4) % 4)), c => c.charCodeAt(0))
}

async function chatPushRegistro() {
    const registro = await navigator.serviceWorker.register(new URL('sw.js', document.baseURI))
    if (registro.waiting) registro.waiting.postMessage({ tipo: 'chat-push-ativar' })
    if (registro.active && !registro.installing && !registro.waiting) return registro
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            limpar()
            reject(new Error('O service worker não conseguiu ativar. Verifique no Console se algum ficheiro do app falhou ao carregar.'))
        }, 20000)
        const worker = registro.installing || registro.waiting
        function limpar() {
            clearTimeout(timer)
            worker?.removeEventListener('statechange', verificar)
        }
        function verificar() {
            if (worker?.state === 'installed') worker.postMessage({ tipo: 'chat-push-ativar' })
            if (worker?.state === 'redundant') {
                limpar()
                reject(new Error('A instalação do service worker falhou. Confira os erros de carregamento no Console.'))
            } else if (worker?.state === 'activated' || (!worker && registro.active)) {
                limpar()
                resolve(registro)
            }
        }
        worker?.addEventListener('statechange', verificar)
        verificar()
    })
}

// Escolha do usuário neste aparelho: ativou e não desativou. Sobrevive ao logout, para a inscrição ser
// refeita sozinha (logout, renovação do navegador) sem precisar de ativar de novo.
const chatPushChaveDesejo = usuario => `chatPushAtivo:${usuario}`
const chatPushDesejado = usuario => { try { return localStorage.getItem(chatPushChaveDesejo(usuario)) === '1' } catch { return false } }
function chatPushMarcarDesejo(usuario, ativo) {
    try { ativo ? localStorage.setItem(chatPushChaveDesejo(usuario), '1') : localStorage.removeItem(chatPushChaveDesejo(usuario)) } catch { }
}

async function chatPushSincronizar() {
    if (!chatPushSuportado() || Notification.permission !== 'granted' || !acesso?.usuario) return
    const registro = await chatPushRegistro()
    let inscricao = await registro.pushManager.getSubscription()
    // Permissão já concedida: refazer a inscrição não exige clique do usuário.
    if (!inscricao && chatPushDesejado(acesso.usuario)) {
        const configuracao = await chatPushApi('config')
        if (!configuracao.publicKey) return
        inscricao = await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chatPushChave(configuracao.publicKey) })
    }
    if (!inscricao) return
    const usuario = acesso.usuario
    chatPushMarcarDesejo(usuario, true) // quem ativou antes desta versão também passa a ter a reativação automática
    await chatPushApi('inscrever', { subscription: inscricao.toJSON() })
    if (acesso?.usuario !== usuario) return
    registro.active.postMessage({ tipo: 'chat-push-usuario', usuario })
}

async function chatPushConfigurar() {
    if (!chatPushSuportado()) {
        return popup({ mensagem: 'Notificações indisponíveis neste navegador. No iPhone, abra o app instalado no ecrã inicial.' })
    }
    try {
        if (Notification.permission !== 'granted') {
            const permissao = await Notification.requestPermission()
            if (permissao !== 'granted') throw new Error('Permita notificações nas configurações do navegador para receber mensagens do chat.')
        }
        const registro = await chatPushRegistro()
        const atual = await registro.pushManager.getSubscription()
        if (atual) {
            await chatPushApi('remover', { endpoint: atual.endpoint })
            await atual.unsubscribe()
            chatPushMarcarDesejo(acesso.usuario, false)
            registro.active.postMessage({ tipo: 'chat-push-usuario', usuario: null })
            popup({ mensagem: 'Notificações de mensagens desativadas neste dispositivo.' })
            return
        }
        // A permissão é solicitada somente por este clique do usuário.
        const configuracao = await chatPushApi('config')
        if (!configuracao.publicKey) throw new Error('O servidor não forneceu a chave pública de notificações.')
        const inscricao = await registro.pushManager.subscribe({ userVisibleOnly: true,
            applicationServerKey: chatPushChave(configuracao.publicKey) })
        try { await chatPushSincronizar() }
        catch (erro) { await inscricao.unsubscribe(); throw erro }
        chatPushMarcarDesejo(acesso.usuario, true)
        popup({ imagem: 'imagens/concluido.png', mensagem: 'Notificações de mensagens ativadas neste dispositivo.' })
    } catch (erro) { popup({ mensagem: chatHtml(erro.message) }) }
}

async function chatPushEncerrar() {
    if (!chatPushSuportado()) return
    try {
        const registro = await chatPushRegistro()
        registro.active.postMessage({ tipo: 'chat-push-usuario', usuario: null })
        const inscricao = await registro.pushManager.getSubscription()
        if (inscricao) await inscricao.unsubscribe()
    } catch (erro) { console.warn('Não foi possível encerrar notificações:', erro.message) }
}

async function chatPushAbrirDestino() {
    const url = new URL(location.href)
    const conversa = url.searchParams.get('chat_conversa')
    if (!conversa || !acesso?.usuario) return
    const usuario = url.searchParams.get('chat_usuario')
    if (usuario && usuario !== acesso.usuario) return
    url.searchParams.delete('chat_conversa')
    url.searchParams.delete('chat_usuario')
    history.replaceState(null, '', url)
    await painelChat()
    const estado = chatAtual
    while (chatVivo(estado) && !estado.conversas.some(c => c.id === conversa) && estado.pagina < estado.paginas) {
        const pagina = estado.pagina
        await chatListar(estado, pagina + 1)
        if (estado.pagina === pagina) break
    }
    if (chatVivo(estado)) await chatAbrirConversa(conversa)
}
