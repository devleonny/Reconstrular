// Mensageiro: o servidor controla participação, identidade e persistência.
let chatAtual = null
let chatContadorTimer = null
let chatContadorConsulta = null

// Telemóvel: o chat ocupa só a altura realmente visível (sem barra de endereço e sem teclado; ver chat.css).
// O iPhone não encolhe a página ao abrir o teclado, desloca-a para cima: aqui ela fica presa no topo.
function chatAjustarAltura() {
    const raiz = document.documentElement
    if (!window.visualViewport || !document.querySelector('.chat-app')) return raiz.style.removeProperty('--altura-visivel')
    const historico = document.querySelector('.chat-historico')
    const noFim = historico && historico.scrollHeight - historico.scrollTop - historico.clientHeight < 120
    raiz.style.setProperty('--altura-visivel', `${Math.round(visualViewport.height)}px`)
    if (window.scrollY) window.scrollTo(0, 0)
    // A conversa que estava no fim continua no fim quando o teclado abre ou fecha.
    if (noFim) requestAnimationFrame(() => { historico.scrollTop = historico.scrollHeight })
}
window.visualViewport?.addEventListener('resize', chatAjustarAltura)
window.visualViewport?.addEventListener('scroll', chatAjustarAltura)

function chatMostrarContador(quantidade) {
    const contador = document.getElementById('contadorMensagens')
    if (!contador) return
    contador.textContent = String(quantidade)
    contador.style.display = quantidade > 0 ? '' : 'none'
    contador.setAttribute('aria-label', `${quantidade} conversas não lidas`)
    contador.title = `${quantidade} conversas não lidas`
}

async function chatAtualizarContador() {
    clearTimeout(chatContadorTimer)
    if (!acesso?.usuario) { chatMostrarContador(0); return }
    if (chatContadorConsulta) return chatContadorConsulta
    const usuario = acesso.usuario
    chatContadorConsulta = (async () => {
        try {
            const conversas = new Map()
            let pagina = 1, paginas = 1
            do {
                const resposta = await chatApi('conversas/listar', { pagina, limite: 40 })
                if (acesso?.usuario !== usuario) return
                for (const conversa of resposta.resultados || []) conversas.set(conversa.id, conversa)
                paginas = resposta.paginas || 1
                pagina++
            } while (pagina <= paginas)
            chatMostrarContador([...conversas.values()].filter(c => Number(c.nao_lidas) > 0).length)
        } catch (erro) {
            console.warn('Não foi possível atualizar o contador de conversas:', erro.message)
        } finally {
            chatContadorConsulta = null
            if (acesso?.usuario) chatContadorTimer = setTimeout(() => {
                if (!document.hidden) chatAtualizarContador()
                else chatContadorTimer = setTimeout(chatAtualizarContador, 10000)
            }, 10000)
        }
    })()
    return chatContadorConsulta
}

function chatCompararMensagens(a, b) {
    const primeiro = BigInt(a.id), segundo = BigInt(b.id)
    return primeiro < segundo ? -1 : primeiro > segundo ? 1 : 0
}

function chatHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c])
}

function chatIcone(nome) {
    const caminhos = {
        novo: '<path d="M12 5v14M5 12h14"/>',
        anexo: '<path d="m8 13 7-7a3 3 0 0 1 4 4l-9 9a5 5 0 0 1-7-7l9-9m-7 12 9-9"/>',
        grupo: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2"/>',
        enviar: '<path d="m3 3 18 9-18 9 4-9Zm4 9h14"/>',
        voltar: '<path d="m14 5-7 7 7 7"/>',
        conversa: '<path d="M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4Z"/>',
        atualizar: '<path d="M20 4v6h-6M4 20v-6h6"/><path d="M4.5 9a8 8 0 0 1 13.2-2.7L20 10M4 14l2.3 3.7A8 8 0 0 0 19.5 15"/>'
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${caminhos[nome] || caminhos.conversa}</svg>`
}

async function chatApi(rota, dados = {}) {
    const { token } = JSON.parse(localStorage.getItem('acesso')) || {}
    const resposta = await fetchAutenticado(`${api}/chat/${rota}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(dados)
    })
    if (!resposta) throw new Error('Sua sessão foi encerrada.')
    if (resposta.status === 404 || resposta.status === 501)
        throw new Error('O mensageiro aguarda a configuração das rotas no servidor.')
    const resultado = await resposta.json().catch(() => null)
    if (!resposta.ok || !resultado || resultado.success === false)
        throw new Error(resultado?.mensagem || resultado?.erro || 'Não foi possível concluir. Tente novamente.')
    return resultado
}

function chatVivo(estado) {
    return chatAtual === estado && estado.raiz.isConnected && acesso?.usuario === estado.usuario
}

function chatAviso(estado, mensagem = '') {
    if (!chatVivo(estado)) return
    estado.raiz.querySelector('.chat-aviso').textContent = mensagem
}

function chatNome(conversa, usuario) {
    if (conversa.tipo === 'grupo') return conversa.nome || 'Grupo'
    const pessoa = (conversa.participantes || []).find(p => p.usuario !== usuario)
    return pessoa?.nome_completo || pessoa?.usuario || 'Conversa'
}

function chatAvatar(nome) {
    const iniciais = String(nome || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
    return `<span class="chat-avatar" aria-hidden="true">${chatHtml(iniciais)}</span>`
}

async function painelChat() {
    if (!acesso?.usuario) return
    chatAtual?.observer?.disconnect()
    clearTimeout(chatAtual?.timer)
    if (typeof titulo !== 'undefined' && titulo) titulo.textContent = 'Mensageiro'
    tela.innerHTML = `
        <section class="chat-app" aria-label="Mensageiro">
            <aside class="chat-lateral">
                <header class="chat-topo"><div><h2>Conversas</h2><small>Reconstrular</small></div>
                    <div class="chat-acoes">
                        <button type="button" data-acao="novo" title="Nova conversa" aria-label="Nova conversa">${chatIcone('novo')}</button>
                        <button type="button" data-acao="grupo" title="Criar grupo" aria-label="Criar grupo">${chatIcone('grupo')}</button>
                    </div>
                </header>
                <div class="chat-pesquisa"><input type="search" class="chat-filtro" placeholder="Pesquisar conversas" aria-label="Pesquisar conversas"></div>
                <div class="chat-lista"><p class="chat-vazio">A carregar conversas…</p></div>
                <button type="button" class="chat-mais-conversas" hidden>Mais conversas</button>
                <footer class="chat-lateral-rodape">
                    <button type="button" data-acao="atualizar" aria-label="Atualizar conversas" title="Atualizar">${chatIcone('atualizar')}</button></footer>
            </aside>
            <div class="chat-principal">
                <div class="chat-boas-vindas">${chatIcone('conversa')}<h2>Vamos conversar?</h2><p>Escolha uma conversa ou encontre alguém para começar.</p><button type="button" data-acao="novo">Nova conversa</button></div>
                <header class="chat-cabecalho" hidden></header>
                <div class="chat-historico" role="log" aria-label="Mensagens" hidden></div>
                <form class="chat-compositor" hidden><div class="chat-anexos-pendentes"></div>
                    <input type="file" class="chat-arquivos" multiple hidden accept="image/jpeg,image/png,image/webp,application/pdf,.txt,.docx,.xlsx">
                    <button type="button" data-acao="anexar" aria-label="Adicionar anexos" title="Adicionar anexos">${chatIcone('anexo')}</button>
                    <textarea rows="1" maxlength="4000" placeholder="Escreva uma mensagem" aria-label="Mensagem"></textarea>
                    <button type="submit" aria-label="Enviar mensagem">${chatIcone('enviar')}</button></form>
            </div>
            <div class="chat-aviso" role="status" aria-live="polite"></div>
        </section>`
    chatAjustarAltura()
    const estado = chatAtual = {
        raiz: tela.querySelector('.chat-app'), usuario: acesso.usuario,
        conversas: [], selecionada: null, mensagens: [], rascunhos: new Map(),
        pagina: 1, paginas: 1, cursor: null, enviando: false, versao: 0, arquivos: new Map()
    }
    estado.raiz.addEventListener('click', async event => {
        const botao = event.target.closest('button')
        if (!botao) return
        if (botao.dataset.anexoId) return chatBaixarAnexo(estado, botao.dataset.anexoId)
        if (botao.dataset.acao === 'anexar') {
            if (!estado.enviando) estado.raiz.querySelector('.chat-arquivos').click()
            return
        }
        if (botao.dataset.removerAnexo !== undefined) {
            if (estado.enviando) return
            const arquivos = estado.arquivos.get(estado.selecionada.id) || []
            arquivos.splice(Number(botao.dataset.removerAnexo), 1)
            chatRenderArquivos(estado)
            return
        }
        if (botao.dataset.conversa) return chatAbrirConversa(botao.dataset.conversa)
        if (botao.dataset.acao === 'novo') return chatEscolherPessoas(false)
        if (botao.dataset.acao === 'grupo') return chatEscolherPessoas(true)
        if (botao.dataset.acao === 'voltar') return estado.raiz.classList.remove('chat-aberta')
        if (botao.dataset.acao === 'participantes') return chatParticipantes()
        if (botao.dataset.acao === 'atualizar') return chatSincronizar(estado)
        if (botao.classList.contains('chat-mais-conversas')) return chatListar(estado, estado.pagina + 1)
        if (botao.classList.contains('chat-mais-mensagens')) return chatCarregarHistorico(estado, true)
    })
    estado.raiz.querySelector('.chat-filtro').addEventListener('input', () => chatRenderLista(estado))
    const campo = estado.raiz.querySelector('textarea')
    estado.raiz.querySelector('.chat-arquivos').addEventListener('change', event => {
        if (!estado.selecionada || estado.enviando) return
        const arquivos = [...(estado.arquivos.get(estado.selecionada.id) || []), ...event.target.files]
        event.target.value = ''
        try {
            chatValidarArquivos(arquivos)
            estado.arquivos.set(estado.selecionada.id, arquivos)
            chatRenderArquivos(estado)
            chatAviso(estado)
        } catch (erro) { chatAviso(estado, erro.message) }
    })
    campo.addEventListener('input', () => {
        if (estado.selecionada) estado.rascunhos.set(estado.selecionada.id, campo.value)
        campo.style.height = 'auto'
        campo.style.height = `${Math.min(campo.scrollHeight, 120)}px`
    })
    campo.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
            event.preventDefault()
            estado.raiz.querySelector('form').requestSubmit()
        }
    })
    estado.raiz.querySelector('form').addEventListener('submit', event => {
        event.preventDefault()
        enviarMensagem()
    })
    estado.observer = new MutationObserver(() => {
        if (!chatVivo(estado)) {
            clearTimeout(estado.timer)
            estado.observer.disconnect()
        }
    })
    estado.observer.observe(tela, { childList: true })
    await chatListar(estado)
    chatAgendar(estado)
}

function chatAgendar(estado) {
    clearTimeout(estado.timer)
    if (!chatVivo(estado)) return
    estado.timer = setTimeout(async () => {
        if (!document.hidden) await chatSincronizar(estado)
        chatAgendar(estado)
    }, 10000)
}

async function chatListar(estado, pagina = 1) {
    try {
        const resposta = await chatApi('conversas/listar', { pagina, limite: 40 })
        if (!chatVivo(estado)) return
        const mapa = new Map(estado.conversas.map(c => [c.id, c]))
        for (const conversa of resposta.resultados || []) mapa.set(conversa.id, conversa)
        estado.conversas = [...mapa.values()]
        estado.pagina = Math.max(estado.pagina, pagina)
        estado.paginas = resposta.paginas || 1
        chatRenderLista(estado)
        chatAviso(estado)
    } catch (erro) {
        chatAviso(estado, erro.message)
        if (chatVivo(estado) && !estado.conversas.length)
            estado.raiz.querySelector('.chat-lista').innerHTML = '<p class="chat-vazio">Não foi possível carregar as conversas. Use o botão de atualizar para tentar novamente.</p>'
    }
}

function chatRenderLista(estado) {
    if (!chatVivo(estado)) return
    const busca = estado.raiz.querySelector('.chat-filtro').value.toLocaleLowerCase()
    const lista = [...estado.conversas].sort((a, b) => (b.atualizada_em || 0) - (a.atualizada_em || 0))
        .filter(c => chatNome(c, estado.usuario).toLocaleLowerCase().includes(busca))
    estado.raiz.querySelector('.chat-lista').innerHTML = lista.map(c => {
        const nome = chatNome(c, estado.usuario)
        const previa = c.ultima_mensagem?.texto || (c.tipo === 'grupo' ? 'Grupo criado' : 'Comece a conversa')
        return `<button type="button" class="chat-conversa ${estado.selecionada?.id === c.id ? 'selecionada' : ''}" data-conversa="${chatHtml(c.id)}" ${estado.selecionada?.id === c.id ? 'aria-current="true"' : ''}>
            ${chatAvatar(nome)}<span class="chat-resumo"><strong>${chatHtml(nome)}</strong><small>${chatHtml(previa)}</small></span>
            <span class="chat-meta"><time>${c.atualizada_em ? chatHtml(new Date(c.atualizada_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })) : ''}</time>${c.nao_lidas > 0 ? `<b class="chat-contador">${Number(c.nao_lidas)}</b>` : ''}</span></button>`
    }).join('') || '<p class="chat-vazio">Nenhuma conversa encontrada. Clique em + para encontrar pessoas.</p>'
    estado.raiz.querySelector('.chat-mais-conversas').hidden = estado.pagina >= estado.paginas
}

async function chatAbrirConversa(id) {
    const estado = chatAtual
    if (!estado || !chatVivo(estado) || estado.enviando) return
    const conversa = estado.conversas.find(c => c.id === id)
    if (!conversa) return
    estado.versao++
    estado.carregandoHistorico = null
    estado.selecionada = conversa
    chatRenderArquivos(estado)
    estado.mensagens = []
    estado.historicoInicializado = false
    estado.cursor = null
    estado.raiz.classList.add('chat-aberta')
    estado.raiz.querySelector('.chat-boas-vindas').hidden = true
    for (const classe of ['.chat-cabecalho', '.chat-historico', '.chat-compositor']) estado.raiz.querySelector(classe).hidden = false
    chatRenderCabecalho(estado)
    const campo = estado.raiz.querySelector('textarea')
    campo.value = estado.rascunhos.get(id) || ''
    campo.style.height = 'auto'
    estado.raiz.querySelector('.chat-historico').innerHTML = '<p class="chat-vazio">A carregar mensagens…</p>'
    chatRenderLista(estado)
    await chatCarregarHistorico(estado)
}

function chatRenderCabecalho(estado) {
    const conversa = estado.selecionada
    const nome = chatNome(conversa, estado.usuario)
    const descricao = conversa.tipo === 'grupo' ? `${conversa.participantes.length} participantes` : 'Conversa individual'
    estado.raiz.querySelector('.chat-cabecalho').innerHTML = `
        <button type="button" class="chat-voltar" data-acao="voltar" aria-label="Voltar às conversas">${chatIcone('voltar')}</button>
        ${chatAvatar(nome)}<div class="chat-resumo"><strong>${chatHtml(nome)}</strong><small>${descricao}</small></div>
        <button type="button" data-acao="participantes" aria-label="Ver participantes" title="Participantes">${chatIcone('grupo')}</button>`
}

async function chatCarregarHistorico(estado, anteriores = false) {
    if (!chatVivo(estado) || !estado.selecionada || estado.carregandoHistorico) return
    const id = estado.selecionada.id
    const versao = estado.versao
    estado.carregandoHistorico = versao + 1
    try {
        const ultima = estado.mensagens[estado.mensagens.length - 1]
        const incremental = !anteriores && estado.historicoInicializado && ultima
        const resultado = await chatApi('mensagens/listar', {
            conversa_id: id, limite: 50,
            antes: anteriores ? estado.cursor : null,
            depois_id: incremental ? ultima.id : null
        })
        if (!chatVivo(estado) || versao !== estado.versao) return
        const historico = estado.raiz.querySelector('.chat-historico')
        const altura = historico.scrollHeight
        const topo = historico.scrollTop
        const pertoFim = altura - topo - historico.clientHeight < 100
        const mapa = new Map(estado.mensagens.map(m => [m.id, m]))
        for (const m of resultado.resultados || []) mapa.set(m.id, m)
        estado.mensagens = [...mapa.values()].sort((a, b) => chatCompararMensagens(a, b))
        if (anteriores || !estado.historicoInicializado) estado.cursor = resultado.proximo_cursor || null
        estado.historicoInicializado = true
        chatRenderHistorico(estado)
        historico.scrollTop = anteriores ? topo + historico.scrollHeight - altura : pertoFim || topo === 0 ? historico.scrollHeight : topo
        await chatMarcarLidas(estado)
        chatAviso(estado)
    } catch (erro) {
        chatAviso(estado, erro.message)
        if (chatVivo(estado) && versao === estado.versao && !estado.mensagens.length)
            estado.raiz.querySelector('.chat-historico').innerHTML = '<p class="chat-vazio">Não foi possível carregar o histórico. Tente atualizar.</p>'
    } finally {
        if (estado.carregandoHistorico === versao + 1) estado.carregandoHistorico = null
    }
}

function chatRenderHistorico(estado) {
    const historico = estado.raiz.querySelector('.chat-historico')
    let diaAnterior = ''
    historico.innerHTML = (estado.cursor ? '<button type="button" class="chat-mais-mensagens">Carregar mensagens anteriores</button>' : '') + estado.mensagens.map(m => {
        const data = new Date(m.criada_em)
        const dia = data.toLocaleDateString('pt-BR')
        const divisor = dia !== diaAnterior ? `<div class="chat-dia">${chatHtml(dia)}</div>` : ''
        diaAnterior = dia
        const minha = m.remetente === estado.usuario
        return `${divisor}<article class="chat-balao ${minha ? 'minha' : ''}">
            ${estado.selecionada.tipo === 'grupo' && !minha ? `<strong class="chat-autor">${chatHtml(m.nome_remetente || m.remetente)}</strong>` : ''}
            <p>${chatHtml(m.texto || '')}</p>${(m.anexos || []).map(a => `<button type="button" class="chat-arquivo-recebido" data-anexo-id="${chatHtml(a.id)}">${chatIcone('anexo')}<span>${chatHtml(a.nome)} · ${chatHtml(chatTamanhoArquivo(a.tamanho))}</span></button>`).join('')}<time datetime="${data.toISOString()}">${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time></article>`
    }).join('') || '<p class="chat-vazio">Nenhuma mensagem ainda. Diga olá!</p>'
}

async function chatMarcarLidas(estado) {
    if (document.hidden || !chatVivo(estado) || !estado.mensagens.length) return
    if (window.matchMedia('(max-width: 680px)').matches && !estado.raiz.classList.contains('chat-aberta')) return
    const conversa = estado.selecionada
    const ultima = estado.mensagens[estado.mensagens.length - 1]
    if (estado.ultimaLida === `${conversa.id}:${ultima.id}`) return
    await chatApi('conversas/ler', { conversa_id: conversa.id, mensagem_id: ultima.id })
    if (!chatVivo(estado) || estado.selecionada.id !== conversa.id) return
    estado.ultimaLida = `${conversa.id}:${ultima.id}`
    conversa.nao_lidas = 0
    chatRenderLista(estado)
    await chatAtualizarContador()
}

async function chatSincronizar(estado = chatAtual) {
    if (!estado || !chatVivo(estado) || estado.sincronizando || estado.enviando) return
    estado.sincronizando = true
    try {
        await chatListar(estado)
        if (chatVivo(estado) && estado.selecionada) {
            const conversa = estado.conversas.find(c => c.id === estado.selecionada.id)
            if (conversa) { estado.selecionada = conversa; chatRenderCabecalho(estado) }
            await chatCarregarHistorico(estado)
        }
    } finally { estado.sincronizando = false }
}

function chatTamanhoArquivo(tamanho) {
    return `${(Number(tamanho || 0) / 1024 / 1024).toFixed(1)} MB`
}

function chatValidarArquivos(arquivos) {
    if (arquivos.length > 5) throw new Error('Selecione no máximo 5 anexos.')
    for (const arquivo of arquivos) {
        if (!/\.(jpg|jpeg|png|webp|pdf|txt|docx|xlsx)$/i.test(arquivo.name))
            throw new Error('Use JPG, PNG, WEBP, PDF, TXT, DOCX ou XLSX.')
        if (!arquivo.size || arquivo.size > 10 * 1024 * 1024)
            throw new Error('Cada anexo deve ter conteúdo e no máximo 10 MB.')
    }
}

function chatRenderArquivos(estado) {
    const arquivos = estado.arquivos?.get(estado.selecionada?.id) || []
    estado.raiz.querySelector('.chat-anexos-pendentes').innerHTML = arquivos.map((a, i) =>
        `<button type="button" data-remover-anexo="${i}" aria-label="Remover ${chatHtml(a.name)}">${chatHtml(a.name)} · ${chatTamanhoArquivo(a.size)} ×</button>`).join('')
}

async function chatEnviarArquivos(dados, arquivos) {
    chatValidarArquivos(arquivos)
    const formulario = new FormData()
    for (const [chave, valor] of Object.entries(dados)) formulario.append(chave, valor)
    for (const arquivo of arquivos) formulario.append('arquivos', arquivo, arquivo.name)
    const { token } = JSON.parse(localStorage.getItem('acesso')) || {}
    const resposta = await fetchAutenticado(`${api}/chat/mensagens/enviar`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formulario
    })
    if (!resposta) throw new Error('Sua sessão foi encerrada.')
    const resultado = await resposta.json().catch(() => null)
    if (!resposta.ok || !resultado || resultado.success === false)
        throw new Error(resultado?.mensagem || 'Não foi possível enviar os anexos. Verifique se o servidor está atualizado.')
    return resultado
}

async function chatBaixarAnexo(estado, id) {
    try {
        const anexo = estado.mensagens.flatMap(m => m.anexos || []).find(a => String(a.id) === id)
        if (!anexo) return
        const { token } = JSON.parse(localStorage.getItem('acesso')) || {}
        const resposta = await fetchAutenticado(`${api}/chat/anexos/baixar`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ anexo_id: id })
        })
        if (!resposta?.ok) throw new Error('Não foi possível descarregar o anexo.')
        const blob = await resposta.blob()
        if (!chatVivo(estado)) return
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = anexo.nome || 'anexo'
        document.body.appendChild(link)
        link.click()
        link.remove()
        setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (erro) { chatAviso(estado, erro.message) }
}

async function enviarMensagem() {
    const estado = chatAtual
    if (!estado || !chatVivo(estado) || !estado.selecionada || estado.enviando) return
    const campo = estado.raiz.querySelector('textarea')
    const texto = campo.value.trim()
    const arquivos = estado.arquivos?.get(estado.selecionada.id) || []
    if (!texto && !arquivos.length) return
    const conversa = estado.selecionada
    const botao = estado.raiz.querySelector('.chat-compositor button[type="submit"]')
    estado.enviando = true
    botao.disabled = true
    // Uma repetição do mesmo envio após falha mantém a chave de idempotência.
    if (estado.pendente?.texto !== texto || estado.pendente?.conversa_id !== conversa.id
        || arquivos.length !== (estado.pendenteArquivos || []).length
        || arquivos.some((arquivo, i) => arquivo !== estado.pendenteArquivos[i])) {
        estado.pendente = { conversa_id: conversa.id, texto, cliente_id: crypto.randomUUID() }
        estado.pendenteArquivos = [...arquivos]
    }
    try {
        const resposta = arquivos.length ? await chatEnviarArquivos(estado.pendente, arquivos)
            : await chatApi('mensagens/enviar', estado.pendente)
        if (!resposta.mensagem?.id) throw new Error('O servidor não confirmou o envio da mensagem.')
        estado.pendente = null
        estado.pendenteArquivos = null
        estado.arquivos?.delete(conversa.id)
        if (!chatVivo(estado)) return
        if (arquivos.length) chatRenderArquivos(estado)
        const m = resposta.mensagem
        const mapa = new Map(estado.mensagens.map(item => [item.id, item]))
        mapa.set(m.id, m)
        estado.mensagens = [...mapa.values()].sort(chatCompararMensagens)
        conversa.ultima_mensagem = { texto: m.texto }
        conversa.atualizada_em = m.criada_em
        if (campo.value.trim() === texto) { campo.value = ''; campo.style.height = 'auto' }
        estado.rascunhos.set(conversa.id, campo.value)
        chatRenderHistorico(estado)
        const historico = estado.raiz.querySelector('.chat-historico')
        historico.scrollTop = historico.scrollHeight
        chatRenderLista(estado)
        chatAviso(estado)
        campo.focus()
    } catch (erro) { chatAviso(estado, erro.message) }
    finally { estado.enviando = false; botao.disabled = false }
}

async function balaoMensagem() {
    if (!chatAtual || !chatVivo(chatAtual)) await painelChat()
    if (chatAtual && chatVivo(chatAtual)) chatEscolherPessoas(false)
}

function chatPodeEditarGrupo(conversa, usuario) {
    if (conversa?.tipo !== 'grupo') return false
    const participante = conversa.participantes?.find(p => p.usuario === usuario)
    return Boolean(participante && (participante.papel === 'administrador'
        || (!participante.papel && conversa.criada_por === usuario)))
}

function chatEscolherPessoas(grupo, editar = null) {
    const estado = chatAtual
    if (!estado || !chatVivo(estado)) return
    if (editar && !chatPodeEditarGrupo(editar, estado.usuario)) return
    const selecionados = new Map((editar?.participantes || [])
        .filter(p => p.usuario !== estado.usuario).map(p => [p.usuario, p]))
    const id = popup({
        titulo: editar ? 'Editar grupo' : grupo ? 'Criar grupo' : 'Nova conversa', elemento: `
        <div class="chat-pessoas">
            ${grupo ? `<label>Nome do grupo<input class="chat-nome-grupo" maxlength="80" placeholder="Ex.: Equipa da obra" value="${chatHtml(editar?.nome || '')}"></label>` : ''}
            <label>Encontrar pessoas<input type="search" class="chat-busca-pessoas" placeholder="Nome ou utilizador" autocomplete="off"></label>
            <div class="chat-selecionados" aria-live="polite"></div>
            <div class="chat-resultados-pessoas"><p>A carregar pessoas…</p></div>
            <div class="chat-paginacao-pessoas"><button type="button" data-pagina="-1">Anterior</button><span></span><button type="button" data-pagina="1">Próxima</button></div>
            ${grupo ? `<button type="button" class="chat-criar-grupo">${editar ? 'Guardar alterações' : 'Criar grupo'}</button>` : ''}
            <p class="chat-erro-pessoas" role="status"></p>
        </div>` })
    const modal = document.getElementById(id)
    const lista = modal.querySelector('.chat-resultados-pessoas')
    const erroLocal = modal.querySelector('.chat-erro-pessoas')
    let pagina = 1, paginas = 1, versao = 0, timer, ocupada = false
    function renderSelecionados() {
        modal.querySelector('.chat-selecionados').innerHTML = [...selecionados.values()]
            .map(p => `<button type="button" data-remover-usuario="${chatHtml(p.usuario)}" aria-label="Remover ${chatHtml(p.nome_completo || p.usuario)}">${chatHtml(p.nome_completo || p.usuario)} ×</button>`).join('')
        lista.querySelectorAll('[data-usuario]').forEach(botao =>
            botao.setAttribute('aria-pressed', String(selecionados.has(botao.dataset.usuario))))
    }
    modal.querySelector('.chat-selecionados').addEventListener('click', event => {
        const botao = event.target.closest('[data-remover-usuario]')
        if (!botao || ocupada) return
        selecionados.delete(botao.dataset.removerUsuario)
        renderSelecionados()
    })
    renderSelecionados()
    async function pesquisar() {
        const versaoLocal = ++versao
        lista.innerHTML = '<p>A procurar pessoas…</p>'
        const busca = modal.querySelector('.chat-busca-pessoas').value.trim().toLocaleLowerCase()
        try {
            const resposta = await chatApi('pessoas/listar', { pagina, limite: 30, busca })
            if (!modal.isConnected || versaoLocal !== versao) return
            paginas = resposta?.paginas || 1
            const pessoas = (resposta?.resultados || []).filter(p => p.usuario && p.usuario !== estado.usuario)
            lista.innerHTML = ''
            for (const pessoa of pessoas) {
                const botao = document.createElement('button')
                botao.type = 'button'
                botao.className = 'chat-pessoa'
                botao.dataset.usuario = pessoa.usuario
                botao.setAttribute('aria-pressed', String(selecionados.has(pessoa.usuario)))
                botao.innerHTML = `${chatAvatar(pessoa.nome_completo || pessoa.usuario)}<span><strong>${chatHtml(pessoa.nome_completo || pessoa.usuario)}</strong><small>${chatHtml(pessoa.usuario)} · ${chatHtml(pessoa.funcao || '')}</small></span>`
                botao.addEventListener('click', async () => {
                    if (ocupada) return
                    if (!grupo) return criar({ tipo: 'individual', participantes: [pessoa.usuario] })
                    if (selecionados.has(pessoa.usuario)) selecionados.delete(pessoa.usuario)
                    else selecionados.set(pessoa.usuario, pessoa)
                    botao.setAttribute('aria-pressed', String(selecionados.has(pessoa.usuario)))
                    renderSelecionados()
                })
                lista.appendChild(botao)
            }
            if (!pessoas.length) lista.innerHTML = '<p>Nenhuma pessoa encontrada.</p>'
            modal.querySelector('.chat-paginacao-pessoas span').textContent = `${pagina} de ${paginas}`
            modal.querySelector('[data-pagina="-1"]').disabled = pagina <= 1
            modal.querySelector('[data-pagina="1"]').disabled = pagina >= paginas
            erroLocal.textContent = ''
        } catch (erro) {
            if (modal.isConnected && versaoLocal === versao) { lista.innerHTML = ''; erroLocal.textContent = erro.message }
        }
    }
    async function criar(dados) {
        if (ocupada || !chatVivo(estado)) return
        ocupada = true
        erroLocal.textContent = editar ? 'A guardar alterações…' : 'Criando conversa…'
        try {
            const resposta = await chatApi(editar ? 'grupos/editar' : 'conversas/criar', editar
                ? { conversa_id: editar.id, nome: dados.nome, participantes: [estado.usuario, ...dados.participantes] }
                : dados)
            if (!resposta.conversa?.id || (editar && resposta.conversa.id !== editar.id)) throw new Error('O servidor não retornou a conversa esperada.')
            if (!chatVivo(estado)) return
            const conversa = resposta.conversa
            estado.conversas = estado.conversas.filter(c => c.id !== conversa.id)
            estado.conversas.push(conversa)
            removerPopup(id)
            await chatAbrirConversa(conversa.id)
        } catch (erro) { if (modal.isConnected) erroLocal.textContent = erro.message }
        finally { ocupada = false }
    }
    modal.querySelector('.chat-busca-pessoas').addEventListener('input', () => {
        versao++
        clearTimeout(timer)
        pagina = 1
        timer = setTimeout(() => { if (modal.isConnected) pesquisar() }, 300)
    })
    modal.querySelectorAll('[data-pagina]').forEach(botao => botao.addEventListener('click', () => {
        clearTimeout(timer)
        pagina = Math.max(1, Math.min(paginas, pagina + Number(botao.dataset.pagina)))
        pesquisar()
    }))
    modal.querySelector('.chat-criar-grupo')?.addEventListener('click', () => {
        const nome = modal.querySelector('.chat-nome-grupo').value.trim()
        if (!nome || selecionados.size < 2) { erroLocal.textContent = 'Informe um nome e selecione ao menos duas pessoas.'; return }
        criar({ tipo: 'grupo', nome, participantes: [...selecionados.keys()] })
    })
    pesquisar()
    modal.querySelector('.chat-busca-pessoas').focus()
}

function chatParticipantes() {
    const conversa = chatAtual?.selecionada
    if (!conversa) return
    if (chatPodeEditarGrupo(conversa, chatAtual.usuario)) return chatEscolherPessoas(true, conversa)
    popup({ titulo: 'Participantes', elemento: `<div class="chat-pessoas">${(conversa.participantes || []).map(p => `<div class="chat-pessoa">${chatAvatar(p.nome_completo || p.usuario)}<span><strong>${chatHtml(p.nome_completo || p.usuario)}</strong><small>${chatHtml(p.usuario)}</small></span></div>`).join('')}</div>` })
}
