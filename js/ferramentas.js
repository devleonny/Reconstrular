let controlesCxOpcoes = {}

// Service work para apps no dispositivo;
const emArquivoLocal = location.protocol === 'file:'

if (!emArquivoLocal && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI))
        .then(reg => console.log('SW registrado:', reg.scope))
        .catch(err => console.error('Erro ao registrar SW:', err))
}

async function cxOpcoes(name) {

    const controle = controlesCxOpcoes[name]
    if (!controle)
        return popup({ mensagem: `>>> cxOpcoes(null) <<<` })

    controlesCxOpcoes.ativo = name
    const { colunas, base, retornar, filtros = {} } = controle

    const pag = 'cxOpcoes'
    const tabela = await modTab({
        colunas,
        pag,
        base,
        ordenar: {
            path: retornar[0],
            direcao: 'ASC'
        },
        filtros,
        criarLinha: 'linCxOpcoes',
        body: 'cxOpcoes'
    })

    const elemento = `
        <div style="padding: 1rem;">

            ${tabela}

        </div>`

    popup({ elemento, titulo: 'Selecione o item' })

    await paginacao(pag)
}

function normalizarPesquisa(valor) {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}]/gu, '')
        .toLowerCase()
        .trim()
}

function getByPath(obj, path) {
    if (!path) return obj
    return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

function linCxOpcoes(dado) {

    const { ativo } = controlesCxOpcoes // Ativo é o mesmo que o [name]
    const controle = controlesCxOpcoes[ativo]
    const { colunas } = controle
    const cod = dado.id || dado.codigo || dado.usuario || null
    // usarLinha: a seleção usa a própria linha listada, sem nova consulta ao servidor.
    if (controle.usarLinha && cod != null)
        (controle.linhas ??= {})[cod] = dado
    const tds = []

    for (const coluna of Object.values(colunas)) {

        const d = getByPath(dado, coluna?.chave)

        tds.push(`
            <td>
                ${Array.isArray(d) ? d.join('<br>') : d || ''}
            </td>`)
    }

    return `
        <tr onclick="selecionar('${ativo}', '${cod}')">
            ${tds.join('')}
        </tr>`
}

async function selecionar(name, cod) {

    overlayAguarde()

    if (cod == 'null')
        return popup({ mensagem: 'O objeto "base" em controlesCx precisa contem o próprio "id" / "codigo" / "etc"' })

    const { funcaoAdicional, base, retornar, armazenarDataset = {}, linhas } = controlesCxOpcoes[name]

    if (!retornar)
        return popup({ mensagem: `campo retornar: ['exemplo'] → undefined` })

    // Painel quando for forms; do contrário qualquer outro elemento;
    const painel = Array.from(document.querySelectorAll('.painel-padrao')).at(-1)
    const elemento = painel?.querySelector(`[name='${name}']`) || document.querySelector(`[name='${name}']`)
    const termos = []

    const dado = linhas?.[cod]
        ? linhas[cod]
        : typeof base === 'string'
        ? await recuperarDado(base, cod)
        : base.find(item =>
            String(item.id ?? item.codigo ?? item.usuario) === String(cod)
        )

    for (const chave of retornar) {

        const d = getByPath(dado, chave)

        if (d ?? false) {
            if (Array.isArray(d))
                termos.push(...d)
            else
                termos.push(d)
        }
    }

    elemento.innerHTML = termos.join('<br>')
    elemento.id = cod
    for (const [atributo, caminho] of Object.entries(armazenarDataset))
        elemento.dataset[atributo] = String(getByPath(dado, caminho) ?? '')

    removerPopup()

    if (Array.isArray(funcaoAdicional)) {
        for (const item of funcaoAdicional) {

            if (typeof item === 'string') {
                await window[item]?.()
                continue
            }

            if (Array.isArray(item)) {
                const [nome, ...args] = item
                await window[nome]?.(...args)
            }
        }
    }
}

async function carregarControles() {

    cUsuario.style.display = ''
    const modelo = (imagem, funcao, idElemento) => {
        return `
        <div onclick="${funcao}" style="${horizontal}; gap: 5px;">
            <img src="imagens/${imagem}.png">
            <div id="${idElemento}" style="display: none;" class="labelQuantidade"></div>
        </div>
        `
    }

    const permitidosAprovacoes = ['adm', 'diretoria']

    const barraStatus = `
            <div id="divUsuarios"></div>
            <button type="button" class="tarefas-contador-controle" onclick="painelChat()" title="Conversas" aria-label="Abrir conversas"><img src="imagens/chat-colorido.svg" alt=""><span id="contadorMensagens" class="labelQuantidade" style="display: none;"></span></button>
            <button type="button" class="tarefas-contador-controle" onclick="telaTarefas()" title="Tarefas pendentes" aria-label="Ver tarefas pendentes"><img src="imagens/tarefas-colorido.svg" alt=""><span id="contadorTarefas" class="labelQuantidade" hidden></span></button>
            ${acesso?.funcao !== 'Trabalhador' ? '<button type="button" class="tarefas-contador-controle" onclick="telaEmails()" title="E-mails" aria-label="Abrir e-mails"><img src="imagens/email-colorido.svg" alt=""><span id="contadorEmails" class="labelQuantidade" hidden></span></button>' : ''}
            <button type="button" class="chat-push-controle" onclick="chatPushConfigurar()" title="Ativar ou desativar notificações de mensagens">Notificações</button>
            ${permitidosAprovacoes.includes(acesso.permissao) ? modelo('construcao', 'configs()', '') : ''}
        `
    const cabecalhoUsuario = document.querySelector('.cabecalho-usuario')
    if (cabecalhoUsuario)
        cabecalhoUsuario.innerHTML = barraStatus

    await usuariosToolbar()
    await verificarMensagens()
    await atualizarContadorTarefas()
    window.iniciarContadorEmails?.()
    chatPushSincronizar().catch(erro => console.warn('Notificações do chat:', erro.message))
    await chatPushAbrirDestino()

}

function atribuirVariaveis() {

    acesso = JSON.parse(localStorage.getItem('acesso')) || null
    nomeUsuario = document.querySelector('.nomeUsuario')
    cUsuario = document.querySelector('.cabecalho-usuario')
    toolbar = document.querySelector('.toolbar-top')
    titulo = toolbar.querySelector(`[name="titulo"]`)
    menus = document.querySelector('.side-menu')
    tela = document.querySelector('.tela')

    toolbar.style.display = 'flex'
}

let usuariosPresencaTimer = null
let usuariosPresencaVersao = 0

// Ícone do estado (online.png / offline.png; ausente é SVG).
const imagemStatus = status => status === 'ausente' ? 'imagens/ausente.svg' : `imagens/${status || 'alerta'}.png`

// Painel de pessoas (visual do GCS): o seu estado e busca no topo, resumo em chips e cartões por grupo.
// Online/ausente vêm da presença (usuariosToolbar, a cada 30 s e a cada aviso); os offline são as pessoas
// do diretório do chat (mesma regra de hierarquia) que não estão ligadas.
const painelPresenca = { online: [], todos: [], todosEm: 0, busca: '', offlineAberto: false }
const GRUPOS_PRESENCA = [
    { chave: 'online', titulo: 'Disponíveis' },
    { chave: 'ausente', titulo: 'Ausentes' },
    { chave: 'offline', titulo: 'Offline' }
]
const ROTULO_STATUS = { online: 'Disponível', ausente: 'Ausente (sem interação há mais de 10 min)', offline: 'Offline' }

function renderUsuariosPresenca(pessoas) {
    if (pessoas) painelPresenca.online = pessoas
    const painel = document.querySelector('.painel-usuarios')
    if (!painel) return

    const normalizar = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    const busca = normalizar(painelPresenca.busca).trim()

    // Todos (offline por padrão) + estado de quem está ligado; a própria pessoa não vem no diretório.
    const pessoasMap = new Map(painelPresenca.todos.map(p => [p.usuario, { ...p, status: 'offline' }]))
    for (const p of painelPresenca.online) pessoasMap.set(p.usuario, { ...pessoasMap.get(p.usuario), ...p, status: p.status || 'online' })
    const todas = [...pessoasMap.values()]
    const eu = todas.find(p => p.usuario === acesso?.usuario)
    const filtradas = todas.filter(p => !busca || [p.usuario, p.nome_completo, p.funcao].some(c => normalizar(c).includes(busca)))

    painel.querySelector('.painel-usuarios-meu-status').innerHTML = eu
        ? `<img src="${imagemStatus(eu.status)}" alt=""><span>O seu estado: <b>${eu.status === 'ausente' ? 'Ausente' : 'Disponível'}</b></span>`
        : ''

    const porGrupo = Object.fromEntries(GRUPOS_PRESENCA.map(g => [g.chave, []]))
    for (const p of filtradas) (porGrupo[p.status] || porGrupo.online).push(p)
    for (const lista of Object.values(porGrupo))
        lista.sort((a, b) => String(a.nome_completo || a.usuario).localeCompare(String(b.nome_completo || b.usuario), 'pt'))

    painel.querySelector('.painel-usuarios-resumo').innerHTML = GRUPOS_PRESENCA
        .map(g => `<span class="painel-usuarios-chip painel-usuarios-chip--${g.chave}"><b>${porGrupo[g.chave].length}</b> ${g.titulo.toLowerCase()}</span>`).join('')

    const cartao = p => {
        const nome = p.nome_completo || p.usuario
        const iniciais = String(nome || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase()
        const detalhe = [p.usuario !== nome ? p.usuario : '', p.funcao].filter(Boolean).join(' · ')
        return `
            <div class="painel-usuarios-item${p.usuario === acesso?.usuario ? ' painel-usuarios-item--eu' : ''}" title="${escaparAtributo(ROTULO_STATUS[p.status] || '')}">
                <span class="painel-usuarios-avatar" data-iniciais="${escaparAtributo(iniciais)}">
                    ${p.foto ? `<img src="${escaparAtributo(urlArquivo(p.foto))}" alt="" loading="lazy" onerror="this.remove()">` : ''}
                    <img class="painel-usuarios-status-icone" src="${imagemStatus(p.status)}" alt="${escaparAtributo(ROTULO_STATUS[p.status] || '')}">
                </span>
                <span class="painel-usuarios-texto">
                    <b>${escaparAtributo(nome)}</b>
                    ${detalhe ? `<small>${escaparAtributo(detalhe)}</small>` : ''}
                </span>
            </div>`
    }

    // Offline começa recolhido (costuma ser a maior lista); com busca, abre.
    const lista = GRUPOS_PRESENCA.filter(g => porGrupo[g.chave].length).map(g => {
        const cabecalho = `<span>${g.titulo}</span><b>${porGrupo[g.chave].length}</b>${g.chave === 'ausente' ? '<small>sem interação há mais de 10 min</small>' : ''}`
        const itens = porGrupo[g.chave].map(cartao).join('')
        if (g.chave !== 'offline')
            return `<section class="painel-usuarios-grupo painel-usuarios-grupo--${g.chave}"><h4>${cabecalho}</h4><div class="painel-usuarios-grade">${itens}</div></section>`
        return `<details class="painel-usuarios-grupo painel-usuarios-grupo--offline" ${painelPresenca.offlineAberto || busca ? 'open' : ''}
                ontoggle="if (!painelPresenca.busca) painelPresenca.offlineAberto = this.open">
                <summary><h4>${cabecalho}</h4></summary><div class="painel-usuarios-grade">${itens}</div></details>`
    }).join('')

    painel.querySelector('.painel-usuarios-lista').innerHTML = lista
        || `<p class="painel-usuarios-vazio">${busca ? 'Ninguém encontrado com essa pesquisa.' : 'Nenhum utilizador online.'}</p>`
}

// Pessoas do diretório do chat (todas as páginas), guardadas por 2 minutos.
async function carregarPessoasPresenca() {
    if (Date.now() - painelPresenca.todosEm < 2 * 60 * 1000) return
    const todos = []
    for (let pagina = 1, paginas = 1; pagina <= paginas && pagina <= 20; pagina++) {
        const r = await chatApi('pessoas/listar', { pagina, limite: 100 })
        todos.push(...(r.resultados || []))
        paginas = r.paginas || 1
    }
    painelPresenca.todos = todos
    painelPresenca.todosEm = Date.now()
}

async function usuariosToolbar() {

    if (!acesso)
        return

    clearTimeout(usuariosPresencaTimer)
    const versao = ++usuariosPresencaVersao
    const usuarioAtual = acesso.usuario
    try {
    const { token } = JSON.parse(localStorage.getItem('acesso')) || {}
    const resposta = await fetchAutenticado(`${api}/presenca/online`, {
        method: 'POST', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({})
    })
    if (!resposta) return
    const dados = await resposta.json().catch(() => null)
    if (!resposta.ok || dados?.success !== true || !Array.isArray(dados.resultados))
        throw new Error(dados?.mensagem || 'Não foi possível consultar os utilizadores online.')
    if (versao !== usuariosPresencaVersao || acesso?.usuario !== usuarioAtual) return
    const pessoas = [...new Map(dados.resultados.filter(p => p.usuario).map(p => [p.usuario, p])).values()]
    const eu = pessoas.find(p => p.usuario === usuarioAtual)
    const status = eu ? (eu.status || 'online') : 'offline'
    const ausentes = pessoas.filter(p => p.status === 'ausente').length

    const usuariosToolbarString = `
        <div class="botao-usuarios" title="${pessoas.length - ausentes} disponíveis${ausentes ? ` · ${ausentes} ausentes` : ''}">
            <img name="imgStatus" onclick="painelUsuarios()" src="${imagemStatus(status)}" alt="${status}">
            <label style="font-size: 1.2rem;">${pessoas.length}</label>
        </div>`

    if (nomeUsuario)
        nomeUsuario.innerHTML = `<span><b>${acesso.funcao}</b> ${acesso.usuario || ''}</span>`

    const divUsuarios = document.getElementById('divUsuarios')
    if (divUsuarios)
        divUsuarios.innerHTML = usuariosToolbarString
    renderUsuariosPresenca(pessoas)
    } catch (erro) {
        if (versao !== usuariosPresencaVersao || acesso?.usuario !== usuarioAtual) return
        const divUsuarios = document.getElementById('divUsuarios')
        if (divUsuarios) divUsuarios.innerHTML = '<button type="button" onclick="painelUsuarios()" title="Presença indisponível">Online: —</button>'
        const listaPainel = document.querySelector('.painel-usuarios-lista')
        if (listaPainel) listaPainel.innerHTML = '<p class="painel-usuarios-vazio">Presença indisponível. Tente atualizar.</p>'
        console.warn(erro.message)
    } finally {
        if (versao === usuariosPresencaVersao && acesso?.usuario === usuarioAtual)
            usuariosPresencaTimer = setTimeout(usuariosToolbar, 30000)
    }

}

async function painelUsuarios() {
    if (!document.querySelector('.painel-usuarios')) {
        painelPresenca.busca = ''
        popup({
            titulo: 'Utilizadores', elemento: `
            <div class="painel-usuarios">
                <div class="painel-usuarios-topo">
                    <div class="painel-usuarios-meu-status"></div>
                    <input type="search" class="painel-usuarios-busca" placeholder="Pesquisar nome, utilizador ou função"
                        aria-label="Pesquisar utilizador" oninput="painelPresenca.busca = this.value; renderUsuariosPresenca()">
                </div>
                <div class="painel-usuarios-resumo"></div>
                <div class="painel-usuarios-lista"><p class="painel-usuarios-vazio">A consultar a presença…</p></div>
            </div>`
        })
    }
    // Sem o diretório (erro de rede), o painel mostra pelo menos quem está ligado.
    await Promise.allSettled([carregarPessoasPresenca(), usuariosToolbar()])
    renderUsuariosPresenca()
}

function mostrarMenus() {

    const menu = document.querySelector('.side-menu').classList
    const tela = document.querySelector('.tela').classList

    menu.toggle('active')
    tela.toggle('active')

}
