let controlesCxOpcoes = {}

// Service work para apps no dispositivo;
const emArquivoLocal = location.protocol === 'file:'

if (!emArquivoLocal && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
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
        <tr class="opcoes-v2" 
            onclick="selecionar('${ativo}', '${cod}')">
            ${tds.join('')}
        </tr>`
}

async function selecionar(name, cod) {

    if (cod == 'null')
        return popup({ mensagem: 'O objeto "base" em controlesCx precisa contem o próprio "id" / "codigo" / "etc"' })

    const { funcaoAdicional, base, retornar } = controlesCxOpcoes[name]

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

    removerPopup()

    if (funcaoAdicional)
        await window[funcaoAdicional]()
}

async function carregarControles() {

    cUsuario.style.display = ''
    const modelo = (imagem, funcao, idElemento) => {
        return `
        <div onclick="${funcao}" style="${vertical};">
            <img src="imagens/${imagem}.png">
            <div id="${idElemento}" style="display: none;" class="labelQuantidade"></div>
        </div>
        `
    }

    const permitidosAprovacoes = ['adm', 'diretoria']

    const barraStatus = `
            <div id="divUsuarios"></div>
            ${modelo('chat', 'painelChat()', 'msg')}
            ${permitidosAprovacoes.includes(acesso.permissao) ? modelo('construcao', 'configs()', '') : ''}
        `
    const cabecalhoUsuario = document.querySelector('.cabecalho-usuario')
    if (cabecalhoUsuario)
        cabecalhoUsuario.innerHTML = barraStatus

    await usuariosToolbar()

}

function atribuirVariaveis() {

    nomeUsuario = document.querySelector('.nomeUsuario')
    cUsuario = document.querySelector('.cabecalho-usuario')
    toolbar = document.querySelector('.toolbar-top')
    titulo = toolbar.querySelector(`[name="titulo"]`)
    menus = document.querySelector('.side-menu')
    tela = document.querySelector('.tela')

    toolbar.style.display = 'flex'
}

async function usuariosToolbar() {

    if (!acesso)
        return

    acesso = JSON.parse(localStorage.getItem('acesso')) || null

    const uOnline = await contarPorCampo({ base: 'dados_setores', path: 'status' })

    const { status, funcao } = await recuperarDado('dados_setores', acesso.usuario) || {}
    const { nome } = await recuperarDado('funcoes', funcao) || {}

    const indicadorStatus = status || 'offline'

    const usuariosToolbarString = `
        <div class="botaoUsuarios">
            <img name="imgStatus" onclick="painelUsuarios()" src="imagens/${indicadorStatus}.png">
            <label style="font-size: 1.2rem;">${uOnline?.online || 0}</label>
        </div>`

    if (nomeUsuario)
        nomeUsuario.innerHTML = `<span><b>${inicialMaiuscula(nome|| '')}</b> ${acesso.usuario || ''}</span>`

    const divUsuarios = document.getElementById('divUsuarios')
    if (divUsuarios)
        divUsuarios.innerHTML = usuariosToolbarString

}

async function painelUsuarios() {

    const colunas = {
        'Status': { chave: 'status' },
        'Usuários': { chave: 'usuario' },
        'Enviar mensagem': {}
    }

    const pag = 'usuariosOnline'
    const tOnline = await modTab({
        pag,
        colunas,
        body: 'bodyUsuariosOnline',
        base: 'dados_setores',
        criarLinha: 'criarLinhaPainelUsuarios',
        ordenar: {
            path: 'status',
            direcao: 'desc'
        }
    })

    const elemento = `
        <div style="padding: 1rem;">

            ${tOnline}

        </div>`

    const divOnline = document.querySelector('.divOnline')
    if (divOnline)
        return

    popup({ elemento, titulo: 'Painel de Usuários', nra: true })

    await paginacao(pag)
}

function criarLinhaPainelUsuarios(dados) {

    const { usuario, status } = dados || {}

    let gerenciarStatus = `<label>${status || 'offline'}</label>`

    if (usuario == acesso.usuario) {

        const statusOpcoes = ['online', 'Em almoço', 'Não perturbe', 'Em reunião', 'Apenas Whatsapp']
        if (acesso?.permissao == 'adm')
            statusOpcoes.push('Invisível')

        gerenciarStatus = `
            <select class="opcoesSelect" onchange="mudarStatus(this)">
                ${statusOpcoes.map(op => `<option ${acesso?.status == op ? 'selected' : ''}>${op}</option>`).join('')}
            </select>`
    }

    return `
    <tr>
        <td>
            <div style="${horizontal}; justify-content: start; gap: 0.5rem;">
                <img src="imagens/${status || 'offline'}.png" style="width: 1.5rem;">
                ${gerenciarStatus}
            </div>
        </td>
        <td>
            ${usuario}
        </td>
        <td>
            <img src="imagens/carta.png" onclick="balaoMensagem('${usuario}')">
        </td>
    </tr>`
}

function mostrarMenus() {

    const menu = document.querySelector('.side-menu').classList
    const tela = document.querySelector('.tela').classList

    menu.toggle('active')
    tela.toggle('active')

}