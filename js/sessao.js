// Sessão com renovação automática: o servidor emite tokens de acesso de 1 h e um token de renovação
// (até 30 dias sem uso). O app troca o token de acesso antes de ele vencer, sem o usuário perceber.
// As chamadas leem o token do armazenamento na hora, por isso todas passam a usar o novo automaticamente.
const SESSAO_MARGEM_MS = 10 * 60 * 1000 // renova quando faltar menos que isto
let sessaoRenovacao = null

function lerAcessoGuardado() {
    try { return JSON.parse(localStorage.getItem('acesso')) || null } catch { return null }
}

function expiracaoTokenMs(token) {
    try {
        const parte = String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
        return JSON.parse(atob(parte + '='.repeat((4 - parte.length % 4) % 4))).exp * 1000
    } catch { return 0 }
}

// Passa o token novo para a variável global e para o websocket aberto (que senão cairia ao vencer o antigo).
function usarAcesso(novo, gravar) {
    if (gravar) localStorage.setItem('acesso', JSON.stringify(novo))
    const anterior = acesso?.token
    if (acesso && typeof acesso === 'object') Object.assign(acesso, novo)
    else acesso = novo
    if (novo.token && novo.token !== anterior && typeof socket !== 'undefined' && socket?.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify({ tipo: 'renovar', token: novo.token }))
}

/**
 * Renova o token de acesso. Uma renovação por vez, mesmo com várias abas (navigator.locks).
 * @param {{ tokenRecusado?: string }} opcoes token que o servidor acabou de recusar (força a renovação)
 * @returns {Promise<'ok'|'recusada'|'falhou'>} recusada = fazer login; falhou = sem rede/servidor, tentar mais tarde
 */
function renovarSessao({ tokenRecusado = null } = {}) {
    sessaoRenovacao ||= (async () => {
        const executar = async () => {
            const atual = lerAcessoGuardado()
            if (!atual?.refreshToken) return 'recusada'
            // Outra aba (ou outra chamada) já renovou: basta usar o token novo.
            const jaRenovado = tokenRecusado ? atual.token !== tokenRecusado : expiracaoTokenMs(atual.token) - Date.now() > SESSAO_MARGEM_MS
            if (jaRenovado) { usarAcesso(atual, false); return 'ok' }
            let resposta
            try {
                resposta = await fetch(`${api}/sessao/renovar`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken: atual.refreshToken })
                })
            } catch { return 'falhou' }
            if (resposta.status === 409) {
                const depois = lerAcessoGuardado()
                if (depois?.refreshToken && depois.refreshToken !== atual.refreshToken) { usarAcesso(depois, false); return 'ok' }
                return 'falhou'
            }
            if (resposta.status === 429 || resposta.status >= 500) return 'falhou'
            if (!resposta.ok) return 'recusada'
            const dados = await resposta.json()
            usarAcesso({ ...atual, ...dados }, true)
            return 'ok'
        }
        return navigator.locks?.request ? navigator.locks.request('reconst-sessao', executar) : executar()
    })().finally(() => { sessaoRenovacao = null })
    return sessaoRenovacao
}

// Verificação periódica e ao voltar ao app (o telemóvel pode ter ficado horas em segundo plano).
async function verificarSessao() {
    const guardado = lerAcessoGuardado()
    if (!guardado?.refreshToken) return
    if (expiracaoTokenMs(guardado.token) - Date.now() > SESSAO_MARGEM_MS) {
        if (acesso?.token !== guardado.token) usarAcesso(guardado, false)
        return
    }
    if (await renovarSessao() === 'recusada') await encerrarAcesso('Sessão expirada, faça login novamente')
}
setInterval(verificarSessao, 60 * 1000)
// Sessões abertas antes da proteção dos ficheiros (/uploads) não têm o token de ficheiros: renova já para o obter.
setTimeout(() => {
    const guardado = lerAcessoGuardado()
    if (guardado?.refreshToken && !guardado.tokenArquivos) renovarSessao({ tokenRecusado: guardado.token })
}, 0)
document.addEventListener('visibilitychange', () => { if (!document.hidden) verificarSessao() })
window.addEventListener('online', verificarSessao)
// Outra aba renovou: esta passa a usar o token novo também.
window.addEventListener('storage', evento => {
    if (evento.key !== 'acesso' || !evento.newValue) return
    try { const novo = JSON.parse(evento.newValue); if (novo?.token && novo.token !== acesso?.token) usarAcesso(novo, false) } catch { }
})

// Logout de verdade: encerra a sessão no servidor (token de renovação e o de acesso em uso).
async function encerrarSessaoServidor() {
    const guardado = lerAcessoGuardado()
    if (!guardado?.refreshToken && !guardado?.token) return
    try {
        await fetch(`${api}/sessao/encerrar`, {
            method: 'POST', keepalive: true,
            headers: { 'Content-Type': 'application/json', ...(guardado.token ? { Authorization: `Bearer ${guardado.token}` } : {}) },
            body: JSON.stringify({ refreshToken: guardado.refreshToken || null })
        })
    } catch { }
}

// Aparelhos com sessão ativa do próprio usuário, com opção de encerrar um ou todos os outros.
async function telaSessoes() {
    try {
        overlayAguarde()
        const { sessaoId } = lerAcessoGuardado() || {}
        const resposta = await fetchAutenticado(`${api}/sessao/lista`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${acesso.token}` },
            body: JSON.stringify({ sessaoId })
        })
        if (!resposta) return
        const { items = [] } = await resposta.json()
        const data = v => v ? new Date(v).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }) : ''
        const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
        const icone = aparelho => /android|iphone|ipad|telemóvel|mobile/i.test(aparelho || '')
            ? '<svg viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10.5 18.5h3"/></svg>'
            : '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>'
        const linhas = items.map(s => `<div class="sessao-item${s.atual ? ' atual' : ''}">
                <div class="sessao-icone">${icone(s.aparelho)}</div>
                <div class="sessao-info">
                    <div class="sessao-nome">${esc(s.aparelho || 'Aparelho')}${s.atual ? '<span class="sessao-atual">este aparelho</span>' : ''}</div>
                    <div class="sessao-datas"><span>Último uso <b>${data(s.ultimo_uso)}</b></span><span>Entrada <b>${data(s.criado_em)}</b></span></div>
                </div>
                ${s.atual ? '' : `<button type="button" class="sessao-encerrar" onclick="terminarSessao('${esc(s.id)}')">Encerrar</button>`}
            </div>`).join('')
        popup({
            titulo: 'Aparelhos conectados',
            elemento: `<div class="sessoes-lista"><p>Aparelhos com a sua sessão aberta. A sessão de um aparelho termina sozinha após ${30} dias sem uso.</p>
                <div class="sessoes-itens">${linhas || '<div class="sessoes-vazio">Nenhuma sessão ativa.</div>'}</div></div>`,
            botoes: items.some(s => !s.atual) ? [{ texto: 'Encerrar todos os outros', img: 'cancel', funcao: `terminarSessao('outras')` }] : []
        })
    } catch (erro) { popup({ mensagem: `Não foi possível listar os aparelhos: ${erro.message}` }) }
}

async function terminarSessao(id) {
    const { sessaoId } = lerAcessoGuardado() || {}
    const resposta = await fetchAutenticado(`${api}/sessao/terminar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${acesso.token}` },
        body: JSON.stringify({ id, sessaoId })
    })
    if (!resposta) return
    removerPopup()
    await telaSessoes()
}
