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

const CHAT_PUSH_AJUDA_BLOQUEIO = `As notificações estão bloqueadas neste aparelho. Para as voltar a permitir:<ul style="text-align: left; margin: 8px 0; padding-left: 18px;">
    <li><b>App instalado (Android):</b> Definições → Apps → Reconstrular → Notificações → permitir.</li>
    <li><b>No navegador:</b> toque no cadeado 🔒 ao lado do endereço → Permissões → Notificações → Permitir.</li>
    <li><b>iPhone:</b> Definições → Notificações → Reconstrular → Permitir notificações.</li></ul>Depois toque novamente no sino.`

// Estado deste aparelho para o sino do topo: ativo, inativo, bloqueado (negado no navegador) ou indisponivel.
async function chatPushEstado() {
    if (!chatPushSuportado()) return 'indisponivel'
    if (Notification.permission === 'denied') return 'bloqueado'
    if (Notification.permission !== 'granted') return 'inativo'
    const registro = await navigator.serviceWorker.getRegistration(document.baseURI)
    return (await registro?.pushManager.getSubscription()) ? 'ativo' : 'inativo'
}

const CHAT_PUSH_ICONES = {
    ativo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    desligado: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"/><path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="m2 2 20 20"/></svg>'
}
const CHAT_PUSH_ROTULOS = {
    ativo: 'Notificações ativas neste aparelho (toque para desativar)',
    inativo: 'Notificações desativadas (toque para ativar)',
    bloqueado: 'Notificações bloqueadas no navegador (toque para ver como permitir)',
    indisponivel: 'Notificações indisponíveis neste navegador'
}
async function chatPushAtualizarBotao() {
    const botao = document.querySelector('.chat-push-controle')
    if (!botao) return
    const estado = await chatPushEstado().catch(() => 'inativo')
    botao.dataset.estado = estado
    botao.innerHTML = estado === 'ativo' ? CHAT_PUSH_ICONES.ativo : CHAT_PUSH_ICONES.desligado
    botao.title = CHAT_PUSH_ROTULOS[estado]
    botao.setAttribute('aria-label', CHAT_PUSH_ROTULOS[estado])
}

// Sino do topo: alterna entre ativar e desativar neste aparelho.
async function chatPushConfigurar() {
    const estado = await chatPushEstado().catch(() => 'inativo')
    if (estado === 'ativo') return chatPushDesativar()
    return chatPushAtivar()
}

async function chatPushAtivar() {
    if (!chatPushSuportado()) {
        return popup({ mensagem: 'Notificações indisponíveis neste navegador. No iPhone, abra o app instalado no ecrã inicial.' })
    }
    if (Notification.permission === 'denied') return popup({ titulo: 'Notificações bloqueadas', mensagem: CHAT_PUSH_AJUDA_BLOQUEIO })
    try {
        // A permissão é pedida só a partir de um toque do utilizador (sino ou "Ativar" do convite).
        if (Notification.permission !== 'granted') {
            const permissao = await Notification.requestPermission()
            if (permissao === 'denied') return popup({ titulo: 'Notificações bloqueadas', mensagem: CHAT_PUSH_AJUDA_BLOQUEIO })
            if (permissao !== 'granted') return
        }
        const registro = await chatPushRegistro()
        const configuracao = await chatPushApi('config')
        if (!configuracao.publicKey) throw new Error('O servidor não forneceu a chave pública de notificações.')
        const inscricao = await registro.pushManager.getSubscription() || await registro.pushManager.subscribe({ userVisibleOnly: true,
            applicationServerKey: chatPushChave(configuracao.publicKey) })
        chatPushMarcarDesejo(acesso.usuario, true)
        try { await chatPushSincronizar() }
        catch (erro) { chatPushMarcarDesejo(acesso.usuario, false); await inscricao.unsubscribe(); throw erro }
        popup({ imagem: 'imagens/concluido.png', mensagem: 'Notificações de mensagens ativadas neste aparelho.' })
    } catch (erro) { popup({ mensagem: chatHtml(erro.message) }) }
    finally { chatPushAtualizarBotao() }
}

async function chatPushDesativar() {
    try {
        const registro = await chatPushRegistro()
        const atual = await registro.pushManager.getSubscription()
        if (atual) {
            await chatPushApi('remover', { endpoint: atual.endpoint })
            await atual.unsubscribe()
        }
        chatPushMarcarDesejo(acesso.usuario, false)
        registro.active.postMessage({ tipo: 'chat-push-usuario', usuario: null })
        popup({ mensagem: 'Notificações de mensagens desativadas neste aparelho.' })
    } catch (erro) { popup({ mensagem: chatHtml(erro.message) }) }
    finally { chatPushAtualizarBotao() }
}

// App instalado (PWA) aberto com sessão e notificações ainda por decidir: convida uma única vez por utilizador.
// O pedido do navegador só sai do toque em "Ativar" (o iPhone exige um gesto do utilizador).
const chatPushAppInstalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
function chatPushOferecer() {
    if (!chatPushSuportado() || !chatPushAppInstalado() || !acesso?.usuario || Notification.permission !== 'default') return
    const chave = `chatPushConvidado:${acesso.usuario}`
    try { if (localStorage.getItem(chave)) return; localStorage.setItem(chave, '1') } catch { return }
    popup({
        titulo: 'Notificações',
        mensagem: 'Quer ser avisado quando receber mensagens no chat, mesmo com o app fechado?<br><br><small>Pode mudar a qualquer momento no sino 🔔 do topo.</small>',
        botoes: [
            { texto: 'Ativar', img: 'concluido', funcao: 'chatPushAtivar()', fechar: true },
            { texto: 'Agora não', img: 'cancel', fechar: true }
        ]
    })
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
