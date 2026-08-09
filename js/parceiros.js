let cidades = null

const el = (name) => {
    return (
        document.querySelector(`.painel-padrao [name="${name}"]`) ||
        document.querySelector(`.filtro-tabela [name="${name}"]`) ||
        document.querySelector(`[name="${name}"]`) ||
        null
    )
}

const esquema = [
    { titulo: 'CEO' },
    { titulo: 'Diretor Operativo' },
    { titulo: 'Coordenador Operativo', campos: ['zona'] },
    { titulo: 'Encarregado de Obra', campos: ['zona', 'distrito', 'area', 'obra'] },
    { titulo: 'Trabalhador', campos: ['zona', 'distrito', 'area', 'obra'] }
]

async function telaNiveis() {
    titulo.textContent = 'Níveis de acesso'

    const acumulado = `
        <div class="painel-despesas">
            <br>
            ${btn('colaborador', 'Adicionar Parceiro', 'editarParceiros()')}
            ${btn('todos', 'Parceiros', 'telaUsuarios()')}
        </div>
    `
    tela.innerHTML = acumulado
}

async function telaUsuarios() {

    overlayAguarde()

    telaAtiva = 'parceiros'
    titulo.textContent = 'Parceiros'

    const colunas = {
        'Usuario': { chave: 'usuario' },
        'Nome Completo': { chave: 'nome_completo' },
        'Telefone': { chave: 'telefone' },
        'Email': { chave: 'email' },
        'Função': { chave: 'snapshots.funcao' },
        'Zona': { chave: 'snapshots.cidade.zona', tipoPesquisa: 'select' },
        'Distrito': { chave: 'snapshots.cidade.distrito', tipoPesquisa: 'select' },
        'Area': { chave: 'snapshots.cidade.area', tipoPesquisa: 'select' },
        'Filtros Aplicados': {},
        'Edição': {}
    }

    const tabela = await modTab({
        colunas,
        btnExtras: `<button onclick="editarParceiros()">Adicionar Parceiro</button>`,
        pag: 'parceiros',
        base: 'dados_setores',
        criarLinha: 'criarLinhaUsuarios',
        body: 'bodyParceiros'
    })

    tela.innerHTML = tabela

    await paginacao()

    removerOverlay()
}

async function criarLinhaUsuarios(dados) {

    const {
        usuario,
        nome_completo,
        telefone,
        email,
        snapshots = {},
        cidade,
        funcao,
        filtros
    } = dados || {}

    const {
        zona,
        area,
        distrito
    } = snapshots?.cidade || {}

    const relacaoFiltros = Object.entries(filtros || {})
        .map(([filtro, lista]) => {

            if (!lista || !lista.length)
                return ''

            return `
            <div style="${vertical}; gap: 3px;">
                <span><b>${inicialMaiuscula(filtro)}</b></span>
                <div style="display: flex; flex-wrap: wrap; gap: 3px;">${lista.map(i => `<span class="tag-usuario">${i}</span>`).join('')}</div>
            </div>
            `
        })
        .join('')

    const tds = `
        <td>
            <span class="tag-usuario">${usuario}</span>
        </td>
        <td>${nome_completo || ''}</td>
        <td>${telefone || ''}</td>
        <td>${email || ''}</td>
        <td>${funcao || ''}</td>
        <td>${zona || ''}</td>
        <td>${distrito || ''}</td>
        <td>${area || ''}</td>
        <td>
            <div style="${vertical}; gap: 0.5rem;">
                ${relacaoFiltros}
            </div>
        </td>
        <td>
            <img onclick="editarParceiros('${usuario}')" src="imagens/pesquisar.png">
        </td>`

    return `<tr>${tds}</tr>`
}

async function editarParceiros(usuario) {

    overlayAguarde()

    const parceiro = usuario
        ? await recuperarDado('dados_setores', usuario) || {}
        : {}

    const {
        nome_completo,
        funcao,
        email,
        cidade,
        data_nascimento,
        telefone,
        filtros
    } = parceiro || {}

    const {
        zona = [],
        distrito = [],
        area = [],
        obra = []
    } = filtros || {}

    controlesCxOpcoes.cidade = {
        base: 'cidades',
        retornar: ['nome'],
        funcaoAdicional: ['notificarPessoas'],
        colunas: {
            'Cidade': { chave: 'nome' },
            'Distrito': { chave: 'distrito' },
            'Zona': { chave: 'zona' },
            'Área': { chave: 'area' }
        }
    }

    const { nome } = await recuperarDado('cidades', cidade) || {}

    const linhas = [
        {
            texto: 'Usuário',
            elemento: `
                <div style="${vertical}; gap: 5px;">
                    <input name="usuario" placeholder="Usuário" oninput="verificarDisponibilidade(this)" value="${usuario || ''}" ${usuario ? 'readOnly="true"' : ''}>
                    <div data-valido="${usuario ? 'S' : 'N'}" id="status_usuario"></div>
                </div>
            `
        },
        {
            texto: 'Nome',
            elemento: `<input name="nome_completo" placeholder="Nome Completo" value="${nome_completo || ''}">`
        },
        {
            texto: 'E-mail',
            elemento: `<input name="email" type="email" placeholder="E-mail" value="${email || ''}">`
        },
        {
            texto: 'Telefone',
            elemento: `<input name="telefone" placeholder="Telefone" value="${telefone || ''}">`
        },
        {
            texto: 'Data de Nascimento',
            elemento: `<input type="date" name="data_nascimento" placeholder="Data de Nascimento" value="${data_nascimento || ''}">`
        },
        {
            texto: 'Cidade',
            elemento: `<span name="cidade" ${cidade ? `id="${cidade}"` : ''} class="opcoes" onclick="cxOpcoes('cidade')">${nome || 'Selecionar'}</span>`
        },
        {
            elemento: `<div class="campo-funcoes"></div>`
        }
    ]

    const botoes = [
        { texto: 'Salvar', img: 'concluido', funcao: `salvarParceiro('${usuario || ''}')` }
    ]

    if (usuario)
        botoes.push({ texto: 'Excluir', img: 'cancel', funcao: `confirmarDesativarUsuario('${usuario}')` })

    popup({ linhas, botoes, titulo: 'Adicionar Parceiro' })

    await carregarTabelaFuncoes({
        funcao,
        filtros
    })

    removerOverlay()
}

async function verificarDisponibilidade(input) {

    const usuario = input.value.trim('')

    const statusUsuario = document.getElementById('status_usuario')

    let pesquisa = null

    if (usuario.length > 5) {

        pesquisa = await pesquisarDB({
            base: 'dados_setores',
            filtros: {
                usuario: { op: '=', value: usuario }
            }
        })

    }

    const modelo = (texto, img) => `
        <div style="${horizontal}; gap: 0.5rem;">
            <img src="imagens/${img}.png" style="width: 1.5rem;">
            <span>${texto}</span>
        </div>
    `

    // Validador;
    statusUsuario.dataset.valido = (!pesquisa || pesquisa.resultados.length)
        ? 'N'
        : 'S'

    statusUsuario.innerHTML = (!pesquisa || pesquisa.resultados.length)
        ? modelo('Não disponível', 'cancel')
        : modelo('Usuário válido', 'concluido')


}

async function carregarTabelaFuncoes({ funcao, filtros } = {}) {

    const pesquisa = await pesquisarDB({
        base: 'cidades',
        limite: 9999,
    })

    if (!pesquisa.resultados)
        return popup({ mensagem: 'Não foi possível baixar os dados das cidades: Fale com o suporte.' })

    cidades = pesquisa.resultados

    const opcoesHTML = Object.values(esquema)
        .map(({ titulo }) => {

            return `
            <div style="${horizontal}; justify-content: start; gap: 1rem;">
                <input ${funcao == titulo ? 'checked' : ''} onclick="mostrarFiltros('${titulo}')" data-valor="${titulo}" style="width: 1.5rem; height: 1.5rem;" type="radio" name="funcao">
                <span>${titulo}</span>
            </div>
            `
        })
        .join('')

    const campoFuncoes = document.querySelector('.campo-funcoes')

    campoFuncoes.innerHTML = `
        ${opcoesHTML}
        <br>
        <span class="titulo-filtro">Filtros</span>
        <div class="campo-filtros"></div>
    `

    mostrarFiltros(funcao, filtros)

}

function mostrarFiltros(titulo, filtros) {

    const campoFiltros = document.querySelector('.campo-filtros')

    const modelo = (campo, opcoes) => {

        const ehCampoNumerico = ['zona', 'area'].includes(campo)

        const lista = opcoes
            .sort((a, b) =>
                ehCampoNumerico
                    ? a - b
                    : a.localeCompare(b)
            )
            .map(o => {

                const marcado = (filtros?.[campo] || []).includes(o)

                return `
                    <div class="caixa-opcao">
                        <input ${marcado ? 'checked' : ''} name="${campo}" data-valor="${o}" onclick="filtrarCidades()" type="checkbox">
                        <span>${o}</span>
                    </div>
                `
            })
            .join('')


        return `
            <div class="caixa-filtros">
                <span style="font-size: 1.1rem;">${inicialMaiuscula(campo)}</span>
                <div class="caixa-opcoes">
                    ${lista}
                </div>
            </div>
        `
    }

    const esqFuncao = esquema
        .filter(c => c.titulo == titulo)

    const caixas = (esqFuncao?.[0]?.campos || [])
        .map(campo => {

            const opcoes = [...
                new Set(cidades.map(c => c[campo]))
            ]

            return modelo(campo, opcoes)
        })
        .join('')

    campoFiltros.innerHTML = caixas || '<span>Nenhum filtro disponível</span>'

    filtrarCidades(filtros)

}

async function filtrarCidades(filtros = null) {

    // Zona
    if (filtros) {

        for (const input of [...document.querySelectorAll('[name="zona"]')]) {
            const zona = Number(input.dataset.valor)
            input.checked = (filtros?.zona || []).includes(zona)
        }

    }

    const zonasMarcadas = [...document.querySelectorAll('[name="zona"]:checked')]
        .map(input => Number(input.dataset.valor))

    // Distritos
    const distritos = cidades
        .filter(c => zonasMarcadas.includes(c.zona))
        .map(c => c.distrito)

    for (const input of [...document.querySelectorAll('[name="distrito"]')]) {

        const div = input.parentElement

        const distrito = input.dataset.valor

        if (distritos.includes(distrito)) {

            if (filtros)
                input.checked = (filtros?.distrito || []).includes(distrito)

            div.style.display = 'flex'
        } else {
            input.checked = false
            div.style.display = 'none'
        }

    }

    // Areas
    const distritosMarcados = [...document.querySelectorAll('[name="distrito"]:checked')]
        .map(input => input.dataset.valor)

    const areas = cidades
        .filter(c => distritosMarcados.includes(c.distrito))
        .map(c => c.area)

    for (const input of [...document.querySelectorAll('[name="area"]')]) {

        const div = input.parentElement

        const area = Number(input.dataset.valor)

        if (areas.includes(area)) {

            if (filtros)
                input.checked = (filtros?.area || []).includes(area)

            div.style.display = 'flex'

        } else {
            input.checked = false
            div.style.display = 'none'
        }

    }

}


async function salvarParceiro(usuario) {

    try {
        overlayAguarde()

        const inputUsuario = el('usuario')

        const valido = document.getElementById('status_usuario').dataset.valido == 'S'

        if (!valido)
            return popup({ mensagem: 'Já existe um usuário com este nome, tente outro.' })

        usuario = usuario || inputUsuario?.value
        const nome_completo = el('nome_completo')?.value?.trim()
        const email = el('email')?.value?.trim()
        const telefone = el('telefone')?.value?.trim()
        const data_nascimento = el('data_nascimento')?.value || ''
        const cidade = el('cidade')?.id || null

        // Radio
        const funcao = [...document.querySelectorAll('[name="funcao"]:checked')]?.[0]?.dataset?.valor

        const coletarMarcados = (campo) => {
            return [...(document.querySelectorAll(`[name="${campo}"]:checked`) || [])]
                .map(input => {
                    return ['zona', 'area'].includes(campo)
                        ? Number(input.dataset.valor)
                        : input.dataset.valor
                })
                .filter(Boolean)
        }

        const zona = coletarMarcados('zona')
        const distrito = coletarMarcados('distrito')
        const area = coletarMarcados('area')
        const obra = coletarMarcados('obra')

        if (!usuario || !nome_completo || !email)
            return popup({ mensagem: 'Não deixe Usuário/Nome ou E-mail em branco' })

        const user = {
            cidade,
            usuario,
            nome_completo,
            email,
            telefone,
            data_nascimento,
            funcao,
            filtros: {
                zona,
                distrito,
                area,
                obra
            }
        }

        await enviar(`dados_setores/${usuario}`, user)

        removerPopup()
    } catch (err) {
        console.log(err)
        popup({ mensagem: 'Falha ao salvar o cadastro' })
    }
}

function confirmarDesativarUsuario(usuario) {
    const botoes = [
        { fechar: true, texto: 'Confirmar', img: 'concluido', funcao: `deletarUsuario('${usuario}')` }
    ]
    popup({ botoes, mensagem: 'Tem certeza?', removerAnteriores: true })
}

async function deletarUsuario(usuario) {
    overlayAguarde()

    await deletar(`dados_setores/${usuario}`)

    removerOverlay()
}