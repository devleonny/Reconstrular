let socket
let reconnectInterval = 30000
let reconnectTimeout = null
let reconectando = false
let priExe = true
let encerrandoAcesso = false

// Ausência automática (como no GCS): sem interação por 10 min em nenhuma aba, avisa o servidor
// (esta conexão fica "ausente"); na primeira interação depois disso, avisa a volta. O servidor só mostra
// a pessoa como ausente quando TODAS as conexões dela estão ociosas (RECONST/SCRIPTS/presenca.js).
// A hora da última atividade fica no localStorage para as abas abertas valerem como uma só.
const TEMPO_AUSENCIA_MS = 10 * 60 * 1000
const CHAVE_ATIVIDADE = 'ultimaAtividadeReconst'
let ultimaAtividadeGravada = 0
let ausenciaInformada = false

function ultimaAtividade() {
    let partilhada = 0
    try { partilhada = Number(localStorage.getItem(CHAVE_ATIVIDADE)) || 0 } catch { }
    return Math.max(ultimaAtividadeGravada, partilhada)
}

function informarAusencia(ausente) {
    ausenciaInformada = ausente
    msg({ tipo: 'ausencia', ausente })
}

function registrarAtividade() {
    const agora = Date.now()
    // Gravar a cada movimento do rato seria excessivo: no máximo a cada 5 s.
    if (agora - ultimaAtividadeGravada > 5000) {
        ultimaAtividadeGravada = agora
        try { localStorage.setItem(CHAVE_ATIVIDADE, String(agora)) } catch { }
    }
    if (ausenciaInformada) informarAusencia(false)
}

for (const evento of ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'scroll'])
    window.addEventListener(evento, registrarAtividade, { passive: true, capture: true })

setInterval(() => {
    const parado = Date.now() - ultimaAtividade() >= TEMPO_AUSENCIA_MS
    if (parado && !ausenciaInformada) informarAusencia(true)
    else if (!parado && ausenciaInformada) informarAusencia(false) // houve interação noutra aba
}, 30000)

registrarAtividade()

// Uma só ligação por navegador: com várias abas, só a aba ativa mantém o websocket. As outras não recebem
// atualizações nem alertas (antes cada aba recebia tudo, repetido, e o servidor enviava os mesmos dados N vezes).
// Web Locks: o navegador garante um só dono. A aba que fica visível rouba a ligação (steal); se a dona fechar,
// a próxima da fila assume sozinha e a pessoa não aparece "offline" só por ter fechado uma aba.
const LOCK_WEBSOCKET = 'reconst-websocket'
let liderWebSocket = false
let largarLideranca = null
let pedidoLideranca = 0
let filaLideranca = null
let ficouSemLigacao = false

function candidatarWebSocket(roubar = false) {
    if (!navigator.locks) { liderWebSocket = true; return connectWebSocket() } // navegador antigo: como antes
    const pedido = ++pedidoLideranca
    filaLideranca?.abort()
    filaLideranca = roubar ? null : new AbortController()
    navigator.locks.request(LOCK_WEBSOCKET, roubar ? { steal: true } : { signal: filaLideranca.signal }, () => new Promise(fim => {
        if (pedido !== pedidoLideranca) return fim()
        liderWebSocket = true
        largarLideranca = fim
        connectWebSocket()
    })).catch(() => {
        if (pedido !== pedidoLideranca) return // pedido substituído por um mais recente (cancelado aqui)
        // Outra aba ficou visível e levou a ligação: esta fecha a sua e volta para a fila.
        deixarLiderancaWebSocket()
        candidatarWebSocket()
    })
}

function deixarLiderancaWebSocket() {
    liderWebSocket = false
    ficouSemLigacao = true
    largarLideranca?.()
    largarLideranca = null
    clearTimeout(reconnectTimeout)
    reconectando = false
    if (socket) {
        socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null
        try { socket.close() } catch { }
        socket = null
    }
}

// Ao voltar a esta aba, assume a ligação se ficar visível por 2 s (trocar de aba depressa não reconecta).
let assumirTimeout = null
document.addEventListener('visibilitychange', () => {
    clearTimeout(assumirTimeout)
    if (document.visibilityState !== 'visible' || liderWebSocket || !localStorage.getItem('acesso')) return
    assumirTimeout = setTimeout(() => {
        if (document.visibilityState === 'visible' && !liderWebSocket) candidatarWebSocket(true)
    }, 2000)
})

// Depois do login (central.js) ou ao abrir: entra já se estiver visível, senão fica na fila.
function iniciarWebSocket() {
    if (liderWebSocket) return connectWebSocket()
    const visivel = document.visibilityState === 'visible'
    if (!visivel) ficouSemLigacao = true // aberta em segundo plano: atualiza os dados quando assumir
    candidatarWebSocket(visivel)
}

iniciarWebSocket()

async function encerrarAcesso(mensagem) {
    clearTimeout(reconnectTimeout)
    await chatPushEncerrar()
    await encerrarSessaoServidor()

    localStorage.removeItem('acesso')

    if (acesso && typeof acesso === 'object') {
        for (const chave of Object.keys(acesso))
            delete acesso[chave]
    }

    if (socket?.readyState === WebSocket.OPEN)
        socket.close()

    await telaLogin()

    const info = `<span id="bloqueio_acesso">${mensagem}</span>`
    const existente = document.getElementById('bloqueio_acesso')
    if (!existente)
        popup({ mensagem: info })

}

function connectWebSocket() {
    if (!liderWebSocket || reconectando || !localStorage.getItem('acesso'))
        return

    reconectando = true

    if (socket) {
        try {
            socket.onopen = null
            socket.onmessage = null
            socket.onerror = null
            socket.onclose = null
            socket.close()
        } catch { }
    }

    socket = new WebSocket(`${api}:8443`)

    comunicacao()

    socket.onopen = async () => {
        reconectando = false
        clearTimeout(reconnectTimeout)

        msgStatus('Conectado ao servidor...')

        const valido = await validarAcesso()

        if (!valido) {
            socket.close()
            return
        }

        msg({
            tipo: 'validar',
            token: acesso.token
        })
    }

    socket.onerror = () => {
        socket.close()
    }

    socket.onclose = () => {
        reconectando = false

        if (!localStorage.getItem('acesso'))
            return

        msgStatus('Servidor offline', 3)

        clearTimeout(reconnectTimeout)
        reconnectTimeout = setTimeout(connectWebSocket, reconnectInterval)
    }
}

async function validarAcesso() {
    let { token } = JSON.parse(localStorage.getItem('acesso')) || {}

    msgStatus('A validar acesso...')

    if (!token) {
        await encerrarAcesso('Sessão inválida')
        return false
    }

    // O telemóvel pode ter ficado horas parado: se o token de acesso já venceu (ou está a vencer), renova antes.
    if (expiracaoTokenMs(token) - Date.now() <= SESSAO_MARGEM_MS) {
        const renovacao = await renovarSessao({ tokenRecusado: token })
        if (renovacao === 'recusada') { await encerrarAcesso('Sessão expirada, faça login novamente'); return false }
        if (renovacao === 'falhou') return false // sem rede: o websocket tenta de novo mais tarde
        token = acesso.token
    }

    try {
        const resp = await fetch(`${api}/validar-token`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        if (!resp.ok) {
            const dadosErro = await resp.json().catch(() => ({}))
            if (resp.status >= 500) return false

            await encerrarAcesso(
                dadosErro.erro === 'Acesso bloqueado'
                    ? 'Seu acesso foi bloqueado'
                    : dadosErro.erro || dadosErro.mensagem || 'Sessão expirada, faça login novamente'
            )

            return false
        }

        return true
    } catch (err) {
        // Falha de rede não encerra a sessão: antes, abrir o app sem internet mandava para o login.
        console.error(err)
        return false
    }
}

function msg(dados) {
    if (socket?.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify(dados))
}

function msgStatus(msg, s = 2) {
    const simbolos = {
        1: '🟢🟢🟢',
        2: '🟠🟠🟠',
        3: '🔴🔴🔴'
    }

    msg = `${simbolos[s]} ${msg} ${new Date().toLocaleString()}`

    const divMensagem = document.querySelector('.div-mensagem')

    if (divMensagem)
        divMensagem.insertAdjacentHTML('beforeend', `<span>${msg}</span>`)

    console.log(msg)
}

function comunicacao() {
    socket.onmessage = async event => {
        let data

        try {
            data = JSON.parse(event.data)
        } catch {
            return
        }

        const {
            tabela,
            desconectar,
            resetarAcesso,
            erro,
            validado,
            tipo,
            usuario,
            status
        } = data

        if (desconectar || resetarAcesso) {
            // Token de acesso vencido na conexão: renova e reconecta, em vez de deslogar.
            if (erro !== 'Acesso bloqueado') {
                const renovacao = await renovarSessao({ tokenRecusado: acesso?.token })
                if (renovacao === 'ok') {
                    clearTimeout(reconnectTimeout)
                    reconnectTimeout = setTimeout(connectWebSocket, 1000)
                    return
                }
                if (renovacao === 'falhou') return // sem rede: o onclose agenda nova tentativa
            }
            await encerrarAcesso(
                erro === 'Acesso bloqueado'
                    ? 'Seu acesso foi bloqueado'
                    : erro || 'Utilizador desconectado'
            )

            return
        }

        if (validado) {
            if (validado === 'Sim') {
                msgStatus('Acesso validado', 1)

                if (priExe) {
                    priExe = false
                    await telaPrincipal()
                }
            } else {
                overlayAguarde()

                msgStatus('Offline', 3)
                msgStatus('Alteração no acesso recebida...')

                await telaPrincipal()

                msg({
                    tipo: 'confirmado',
                    usuario: acesso.usuario
                })

                msgStatus('Tudo certo', 1)
            }

            acesso.status = 'online'
            // Conexão nova nasce ativa: se a pessoa já estava parada, o servidor fica a saber já.
            if (ausenciaInformada) msg({ tipo: 'ausencia', ausente: true })
            await usuariosToolbar()
            // Aba que esteve sem ligação (outra era a ativa): o que mudou entretanto não chegou aqui.
            if (ficouSemLigacao) {
                ficouSemLigacao = false
                await Promise.allSettled([paginacao(), verificarMensagens(), atualizarContadorTarefas(), window.atualizarContadorEmails?.()])
            }
            removerOverlay()
        }

        if (tipo === 'atualizacao') {
            if (tabela === 'tarefas') await atualizarContadorTarefas()
            if (['dados_orcamentos', 'vw_dados_orcamentos', 'execucoes'].includes(tabela)
                && document.getElementById('execucoes-local')) {
                await atualizarExecucoesMemoria()
            }
            if (['chat_conversas', 'chat_mensagens', 'chat_participantes'].includes(tabela)) {
                await chatSincronizar()
                await verificarMensagens()
            }
            await paginacao()
            if (document.querySelector('.objetivos-painel')
                && ['cidades', 'vw_objetivos', 'dados_orcamentos', 'despesas'].includes(tabela)) {
                try { await atualizarDadosObjetivos() }
                catch (erro) { console.warn('Não foi possível atualizar os objetivos:', erro.message) }
            }

        }

        // E-mail recebido ou status de envio alterado na própria caixa.
        if (tipo === 'email') {
            if (!window.recarregarEmails?.()) window.atualizarContadorEmails?.()
        }

        if (tipo === 'status') {
            await usuariosToolbar()
            // Ida e volta de "ausente" (ociosidade) só atualiza as listas, sem balão para todos.
            if (!data.automatico) balaoUsuario(status, usuario)
        }
    }
}

async function verificarMensagens() {
    return chatAtualizarContador()
}
