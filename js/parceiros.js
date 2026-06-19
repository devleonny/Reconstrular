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
        { titulo: 'Encarregado de Obra', campos: ['zona', 'distrito', 'area'] },
        { titulo: 'Trabalhador', campos: ['zona', 'distrito', 'area', 'obra'] }
    ]

    const estado = {
        funcaoIndex: null,
        valores: {
            zona: Array.isArray(config?.valores?.zona) ? [...config.valores.zona] : [],
            distrito: Array.isArray(config?.valores?.distrito) ? [...config.valores.distrito] : [],
            area: Array.isArray(config?.valores?.area) ? [...config.valores.area] : [],
            obra: Array.isArray(config?.valores?.obra) ? [...config.valores.obra] : []
        }
    }

    const campoFuncoes = document.querySelector('.campo-funcoes')
    if (!campoFuncoes) return

    function normalizarCampo(campo) {
        return String(campo).toLowerCase()
    }

    function montarFiltrosAte(campoAtual) {
        const ordem = ['zona', 'distrito', 'area', 'obra']
        const filtros = {}
        const idxAtual = ordem.indexOf(campoAtual)

        for (let i = 0; i < idxAtual; i++) {
            const campo = ordem[i]
            const valor = estado.valores[campo]

            if (Array.isArray(valor) && valor.length === 1) {
                filtros[campo] = { op: '=', value: valor[0] }
            }
        }

        return filtros
    }

    async function obterOpcoes(campo) {
        const filtros = montarFiltrosAte(campo)

        const resultado = await contarPorCampo({
            base: 'cidades',
            path: campo,
            filtros
        })

        return Object.keys(resultado || {}).filter(r => r !== 'todos')
    }

    function limparCamposPosteriores(campos, campoAlterado) {
        const idx = campos.indexOf(campoAlterado)
        for (let i = idx + 1; i < campos.length; i++) {
            delete estado.valores[campos[i]]
        }
    }

    async function atualizarOpcoesCampos(campos, container) {
        for (const campo of campos) {
            const select = container.querySelector(`[data-campo="${campo}"]`)
            if (!select) continue

            const opcoes = await obterOpcoes(campo)
            const selecionados = estado.valores[campo] || []

            select.innerHTML = opcoes.map(op => `
                <label class="multi-option">
                    <input 
                        type="checkbox" 
                        value="${escapeHtml(op)}"
                        ${selecionados.includes(op) ? 'checked' : ''}
                    >
                    <span>${escapeHtml(op)}</span>
                </label>
            `).join('')
        }
    }

    const labels = {
        zona: 'Zona',
        distrito: 'Distrito',
        area: 'Área',
        obra: 'Obra'
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

    async function renderizarCamposExtras(index, preservarValores = false) {
        const item = esquema[index]
        const campos = (item.campos || []).map(normalizarCampo)
        const linha = campoFuncoes.querySelector(`[data-linha="${index}"]`)
        const extras = linha.querySelector('.extras-funcao')

        if (!preservarValores) {
            estado.valores = {}
        } else {
            const filtrados = {}
            for (const campo of campos) {
                filtrados[campo] = Array.isArray(estado.valores[campo]) ? estado.valores[campo] : []
            }
            estado.valores = filtrados
        }

        extras.innerHTML = campos.map(criarMultiSelect).join('')

        await atualizarOpcoesCampos(campos, extras)

        extras.querySelectorAll('.multi-select-trigger').forEach(btn => {
            btn.addEventListener('click', () => {
                const campo = btn.dataset.trigger
                const dropdown = extras.querySelector(`[data-campo="${campo}"]`)
                dropdown.classList.toggle('aberto')
            })
        })

        campos.forEach(campo => {
            const dropdown = extras.querySelector(`[data-campo="${campo}"]`)

            dropdown.addEventListener('change', async e => {
                if (e.target.type !== 'checkbox') return

                const marcados = [...dropdown.querySelectorAll('input:checked')].map(i => i.value)
                estado.valores[campo] = marcados

                limparCamposPosteriores(campos, campo)

                await atualizarOpcoesCampos(campos, extras)
                atualizarTextoTriggers(campos, extras)
            })
        })

        atualizarTextoTriggers(campos, extras)
    }

    function atualizarTextoTriggers(campos, container) {
        campos.forEach(campo => {
            const btn = container.querySelector(`[data-trigger="${campo}"]`)
            if (!btn) return

            const selecionados = estado.valores[campo] || []
            const label = labels[campo] || campo

            btn.innerHTML = selecionados.length
                ? `<span>${label}: ${selecionados.join(', ')}</span><span>⌵</span>`
                : `<span>${label}</span><span>⌵</span>`
        })
    }

    const elementos = esquema.map(({ titulo, campos = [] }, index) => `
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

    function atualizarInputFuncao(index) {
        const inputFuncao = campoFuncoes.querySelector('[name="funcao"]')
        if (!inputFuncao) return
        inputFuncao.value = esquema[index]?.titulo || ''
    }

    campoFuncoes.querySelectorAll('input[type="radio"][name="funcao_radio"]').forEach(radio => {
        radio.addEventListener('change', async e => {
            const novoIndex = Number(e.target.value)

            campoFuncoes.querySelectorAll('.extras-funcao').forEach(el => el.innerHTML = '')

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

        const user = {
            usuario,
            nome_completo,
            email,
            telefone,
            data_nascimento,
            funcao,
            ...(zona.length ? { zona } : {}),
            ...(distrito.length ? { distrito } : {}),
            ...(area.length ? { area } : {}),
            ...(obra.length ? { obra } : {})
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