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
    const { colunas } = controlesCxOpcoes[ativo]
    const cod = dado.id || dado.codigo || dado.usuario || null
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

    const { funcaoAdicional, base, retornar, armazenarDataset = {} } = controlesCxOpcoes[name]

    if (!retornar)
        return popup({ mensagem: `campo retornar: ['exemplo'] → undefined` })

    // Painel quando for forms; do contrário qualquer outro elemento;
    const painel = Array.from(document.querySelectorAll('.painel-padrao')).at(-1)
    const elemento = (painel || document).querySelector(`[name='${name}']`)
    const termos = []

    const dado = typeof base === 'string'
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
            ${modelo('chat', 'painelChat()', 'contadorMensagens')}
            ${permitidosAprovacoes.includes(acesso.permissao) ? modelo('construcao', 'configs()', '') : ''}
        `
    const cabecalhoUsuario = document.querySelector('.cabecalho-usuario')
    if (cabecalhoUsuario)
        cabecalhoUsuario.innerHTML = barraStatus

    await usuariosToolbar()
    await verificarMensagens()

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

function renderUsuariosPresenca(pessoas) {
    const corpo = document.querySelector('[data-usuarios-online]')
    if (!corpo) return
    corpo.innerHTML = pessoas.length ? pessoas.map(p => `<tr>
        <td>${escaparAtributo(p.usuario)}</td>
        <td>${escaparAtributo(p.nome_completo || '')}</td>
        <td>${escaparAtributo(p.funcao || '')}</td>
    </tr>`).join('') : '<tr><td colspan="3">Nenhum usuário online.</td></tr>'
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
        throw new Error(dados?.mensagem || 'Não foi possível consultar os usuários online.')
    if (versao !== usuariosPresencaVersao || acesso?.usuario !== usuarioAtual) return
    const pessoas = [...new Map(dados.resultados.filter(p => p.usuario).map(p => [p.usuario, p])).values()]
    const status = pessoas.some(p => p.usuario === usuarioAtual) ? 'online' : 'offline'

    const usuariosToolbarString = `
        <div class="botao-usuarios">
            <img name="imgStatus" onclick="painelUsuarios()" src="imagens/${status || 'alerta'}.png">
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
        const corpo = document.querySelector('[data-usuarios-online]')
        if (corpo) corpo.innerHTML = '<tr><td colspan="3">Presença indisponível. Tente atualizar.</td></tr>'
        console.warn(erro.message)
    } finally {
        if (versao === usuariosPresencaVersao && acesso?.usuario === usuarioAtual)
            usuariosPresencaTimer = setTimeout(usuariosToolbar, 30000)
    }

}

async function painelUsuarios() {
    if (!document.querySelector('[data-usuarios-online]')) popup({
        titulo: 'Usuários online', elemento: `<div class="painel-usuarios-online">
            <table class="tabela"><thead><tr><th>Usuário</th><th>Nome</th><th>Função</th></tr></thead>
            <tbody data-usuarios-online><tr><td colspan="3">Consultando presença…</td></tr></tbody></table>
        </div>`
    })
    await usuariosToolbar()
}

function criarLinhaPainelUsuarios(dados) {

    const { usuario, status, funcao } = dados || {}

    return `
    <tr>
        <td>
            <div style="${horizontal}; justify-content: start; gap: 0.5rem;">
                <img src="imagens/${status || 'offline'}.png" style="width: 1.5rem;">
                <label>${status || 'offline'}</label>
            </div>
        </td>
        <td>${usuario || ''}</td>
        <td>${funcao || ''}</td>
    </tr>`
}

function mostrarMenus() {

    const menu = document.querySelector('.side-menu').classList
    const tela = document.querySelector('.tela').classList

    menu.toggle('active')
    tela.toggle('active')

}
