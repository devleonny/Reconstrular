const el = (name) => {
    return (
        document.querySelector(`.painel-padrao [name="${name}"]`) ||
        document.querySelector(`.filtro-tabela [name="${name}"]`) ||
        document.querySelector(`[name="${name}"]`) ||
        null
    )
}

function escapeHtml(texto = '') {
    return String(texto)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}

async function telaNiveis() {
    titulo.textContent = 'Níveis de acesso'

    const acumulado = `
        <div class="painel-despesas">
            <br>
            ${btn('concluido', 'Autorizações de acesso', '')}
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
        'Nome Completo': { chave: 'nome_completo' },
        'Telefone': { chave: 'telefone' },
        'Email': { chave: 'email' },
        'Função': { chave: 'snapshots.funcao' },
        'Zona': { chave: 'zona', tipoPesquisa: 'select' },
        'Distrito': { chave: 'distrito', tipoPesquisa: 'select' },
        'Area': { chave: 'area', tipoPesquisa: 'select' },
        'Edição': {}
    }

    const tabela = await modTab({
        colunas,
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
        zona,
        area,
        distrito
    } = dados || {}


    const tds = `
        <td>${nome_completo || ''}</td>
        <td>${telefone || ''}</td>
        <td>${email || ''}</td>
        <td>${funcao || ''}</td>
        <td>${zona ? zona.join('<br>') : ''}</td>
        <td>${distrito ? distrito.join('<br>') : ''}</td>
        <td>${area ? area.join('<br>') : ''}</td>
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
        nome_completo = '',
        funcao = '',
        email = '',
        data_nascimento = '',
        telefone = '',
        zona = [],
        distrito = [],
        area = [],
        obra = []
    } = parceiro

    const linhas = [
        { texto: 'Usuário', elemento: `<input ${usuario ? 'readOnly="true"' : ''} name="usuario" placeholder="Usuário" value="${escapeHtml(usuario || '')}">` },
        { texto: 'Nome', elemento: `<input name="nome_completo" placeholder="Nome Completo" value="${escapeHtml(nome_completo)}">` },
        { texto: 'E-mail', elemento: `<input name="email" type="email" placeholder="E-mail" value="${escapeHtml(email)}">` },
        { texto: 'Telefone', elemento: `<input name="telefone" placeholder="Telefone" value="${escapeHtml(telefone)}">` },
        { texto: 'Data de Nascimento', elemento: `<input type="date" name="data_nascimento" placeholder="Data de Nascimento" value="${escapeHtml(data_nascimento)}">` },
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
        valores: {
            zona: Array.isArray(zona) ? zona : [],
            distrito: Array.isArray(distrito) ? distrito : [],
            area: Array.isArray(area) ? area : [],
            obra: Array.isArray(obra) ? obra : []
        }
    })

    removerOverlay()
}

async function carregarTabelaFuncoes(config = {}) {
    const esquema = [
        { titulo: 'CEO' },
        { titulo: 'Diretor Operativo' },
        { titulo: 'Coordenador Operativo', campos: ['zona'] },
        { titulo: 'Encarregado de Obra', campos: ['zona', 'distrito', 'area', 'obra'] },
        { titulo: 'Trabalhador', campos: ['zona', 'distrito', 'area', 'obra'] }
    ]

    const dependentes = ['zona', 'distrito', 'area']
    const todosCampos = ['zona', 'distrito', 'area', 'obra']

    const labels = {
        zona: 'Zona',
        distrito: 'Distrito',
        area: 'Área',
        obra: 'Obra'
    }

    const campoFuncoes = document.querySelector('.campo-funcoes')
    if (!campoFuncoes) return

    const estado = {
        funcaoIndex: null,
        valores: {
            zona: Array.isArray(config?.valores?.zona) ? [...config.valores.zona] : [],
            distrito: Array.isArray(config?.valores?.distrito) ? [...config.valores.distrito] : [],
            area: Array.isArray(config?.valores?.area) ? [...config.valores.area] : [],
            obra: Array.isArray(config?.valores?.obra) ? [...config.valores.obra] : []
        },
        ultimoCampoDependente: null
    }

    window.__parceiroEstadoCampos = estado

    function normalizarArray(valor) {
        if (!valor) return []
        return Array.isArray(valor) ? valor.filter(Boolean) : [valor].filter(Boolean)
    }

    function criarRegraOR(valores = []) {
        return {
            modo: 'OR',
            regras: valores.map(value => ({ op: '=', value }))
        }
    }

    function criarMultiSelect(campo) {
        const label = labels[campo] || campo

        return `
            <div class="multi-select-wrap">
                <label class="multi-select-trigger" data-trigger="${campo}">
                    <span>${label}</span>
                    <span>⌵</span>
                </label>
                <div class="multi-select-dropdown" data-campo="${campo}"></div>
            </div>
        `
    }

    function atualizarTextoTriggers(campos, container) {
        campos.forEach(campo => {
            const btn = container.querySelector(`[data-trigger="${campo}"]`)
            if (!btn) return

            const selecionados = normalizarArray(estado.valores[campo])
            const label = labels[campo] || campo

            btn.innerHTML = selecionados.length
                ? `<span>${label}: ${selecionados.join(', ')}</span><span>⌵</span>`
                : `<span>${label}</span><span>⌵</span>`
        })
    }

    function limparOutrosDependentes(campoBase) {
        for (const campo of dependentes) {
            if (campo !== campoBase) {
                estado.valores[campo] = []
            }
        }
    }

    function montarFiltrosParaCampo(campoAlvo) {
        const campoBase = estado.ultimoCampoDependente

        if (!campoBase || !dependentes.includes(campoBase)) {
            return {}
        }

        if (campoAlvo === campoBase) {
            return {}
        }

        const valores = normalizarArray(estado.valores[campoBase])
        if (!valores.length) {
            return {}
        }

        return {
            [campoBase]: criarRegraOR(valores)
        }
    }

    async function obterOpcoes(campo) {
        if (campo === 'obra') {
            const resultado = await contarPorCampo({
                base: 'cidades',
                path: campo,
                filtros: {}
            })

            return Object.keys(resultado || {}).filter(item => item && item !== 'todos')
        }

        const filtros = montarFiltrosParaCampo(campo)

        const resultado = await contarPorCampo({
            base: 'cidades',
            path: campo,
            filtros
        })

        return Object.keys(resultado || {}).filter(item => item && item !== 'todos')
    }

    async function preencherDropdown(campo, container) {
        const dropdown = container.querySelector(`[data-campo="${campo}"]`)
        if (!dropdown) return

        const opcoesBase = await obterOpcoes(campo)
        const selecionados = normalizarArray(estado.valores[campo])

        const opcoes = [...new Set([...opcoesBase, ...selecionados])]

        dropdown.innerHTML = opcoes.map(opcao => `
            <label class="multi-option">
                <input
                    type="checkbox"
                    value="${escapeHtml(opcao)}"
                    ${selecionados.includes(opcao) ? 'checked' : ''}
                >
                <span>${escapeHtml(opcao)}</span>
            </label>
        `).join('')
    }

    async function atualizarCampos(campos, container) {
        for (const campo of campos) {
            await preencherDropdown(campo, container)
        }

        atualizarTextoTriggers(campos, container)
    }

    async function aoMudarCampo(campo, container, campos) {
        const dropdown = container.querySelector(`[data-campo="${campo}"]`)
        if (!dropdown) return

        const marcados = [...dropdown.querySelectorAll('input:checked')]
            .map(input => input.value)
            .filter(Boolean)

        estado.valores[campo] = marcados

        if (dependentes.includes(campo)) {
            estado.ultimoCampoDependente = marcados.length ? campo : null

            if (estado.ultimoCampoDependente) {
                limparOutrosDependentes(campo)
                estado.valores[campo] = marcados
            }
        }

        await atualizarCampos(campos, container)
    }

    async function renderizarCamposExtras(index, preservarValores = false) {
        const item = esquema[index]
        const campos = (item.campos || []).map(c => String(c).toLowerCase())
        const linha = campoFuncoes.querySelector(`[data-linha="${index}"]`)
        const extras = linha?.querySelector('.extras-funcao')

        if (!extras) return

        if (!preservarValores) {
            estado.valores = {
                zona: [],
                distrito: [],
                area: [],
                obra: []
            }
            estado.ultimoCampoDependente = null
        } else {
            const novosValores = {
                zona: [],
                distrito: [],
                area: [],
                obra: []
            }

            for (const campo of todosCampos) {
                novosValores[campo] = normalizarArray(estado.valores[campo])
            }

            estado.valores = novosValores

            estado.ultimoCampoDependente =
                [...dependentes].reverse().find(campo => normalizarArray(estado.valores[campo]).length) || null
        }

        extras.innerHTML = campos.map(criarMultiSelect).join('')

        extras.querySelectorAll('.multi-select-trigger').forEach(trigger => {
            trigger.addEventListener('click', () => {
                const campo = trigger.dataset.trigger
                const dropdown = extras.querySelector(`[data-campo="${campo}"]`)
                if (dropdown) dropdown.classList.toggle('aberto')
            })
        })

        await atualizarCampos(campos, extras)

        for (const campo of campos) {
            const dropdown = extras.querySelector(`[data-campo="${campo}"]`)
            if (!dropdown) continue

            dropdown.addEventListener('change', async (e) => {
                if (e.target?.type !== 'checkbox') return
                await aoMudarCampo(campo, extras, campos)
            })
        }
    }

    function atualizarInputFuncao(index) {
        const inputFuncao = campoFuncoes.querySelector('[name="funcao"]')
        if (!inputFuncao) return
        inputFuncao.value = esquema[index]?.titulo || ''
    }

    const elementos = esquema.map(({ titulo }, index) => `
        <div class="linha-funcao" data-linha="${index}" style="${horizontal}; gap: 1rem;">
            <input type="radio" name="funcao_radio" value="${index}" style="width: 1.5rem; height: 1.5rem;">
            <span>${titulo}</span>
            <div class="extras-funcao"></div>
        </div>
    `).join('')

    campoFuncoes.innerHTML = `
        <input type="hidden" name="funcao" value="${escapeHtml(config?.funcao || '')}">
        ${elementos}
    `

    campoFuncoes.querySelectorAll('input[type="radio"][name="funcao_radio"]').forEach(radio => {
        radio.addEventListener('change', async (e) => {
            const novoIndex = Number(e.target.value)

            campoFuncoes.querySelectorAll('.extras-funcao').forEach(item => item.innerHTML = '')

            estado.funcaoIndex = novoIndex
            atualizarInputFuncao(novoIndex)

            await renderizarCamposExtras(novoIndex, false)
        })
    })

    const indexInicial = esquema.findIndex(item => item.titulo === config?.funcao)

    if (indexInicial >= 0) {
        const radio = campoFuncoes.querySelector(`input[name="funcao_radio"][value="${indexInicial}"]`)
        if (radio) {
            radio.checked = true
            estado.funcaoIndex = indexInicial
            atualizarInputFuncao(indexInicial)
            await renderizarCamposExtras(indexInicial, true)
        }
    }
}

async function salvarParceiro(usuario = el('usuario')?.value) {
    try {
        overlayAguarde()

        const nome_completo = el('nome_completo')?.value?.trim()
        const email = el('email')?.value?.trim()
        const telefone = el('telefone')?.value?.trim()
        const data_nascimento = el('data_nascimento')?.value || ''
        const funcao = el('funcao')?.value?.trim() || ''

        const campoFuncoes = document.querySelector('.campo-funcoes')

        const coletarMarcados = (campo) => {
            return [...(campoFuncoes?.querySelectorAll(`[data-campo="${campo}"] input[type="checkbox"]:checked`) || [])]
                .map(input => input.value)
                .filter(Boolean)
        }

        const zona = coletarMarcados('zona')
        const distrito = coletarMarcados('distrito')
        const area = coletarMarcados('area')
        const obra = coletarMarcados('obra')

        if (!usuario || !nome_completo || !email)
            return popup({ mensagem: 'Não deixe Usuário/Nome ou E-mail em branco' })

        const campoBase = window.__parceiroEstadoCampos?.ultimoCampoDependente || null

        const user = {
            usuario,
            nome_completo,
            email,
            telefone,
            data_nascimento,
            funcao,
            zona: campoBase === 'zona' ? zona : null,
            distrito: campoBase === 'distrito' ? distrito : null,
            area: campoBase === 'area' ? area : null,
            obra: obra.length ? obra : null
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
        { texto: 'Confirmar', img: 'concluido', funcao: `deletarUsuario('${usuario}')` }
    ]
    popup({ botoes, mensagem: 'Tem certeza?', nra: false })
}

async function deletarUsuario(usuario) {
    overlayAguarde()

    await deletar(`dados_setores/${usuario}`)

    removerOverlay()
}