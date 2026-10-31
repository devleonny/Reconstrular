
async function telaPrecos(filtro = null) {

    try {
        overlayAguarde()
        const especialidades = await contarPorCampo({ base: 'campos', path: 'especialidade' })
        const opcoesEspecialidade = Object.keys(especialidades || {})
            .filter(nome => !['todos', 'EM BRANCO'].includes(nome) && nome.trim())
            .sort((a, b) => a.localeCompare(b, 'pt-BR'))
            .map(nome => `<option value="${escaparAtributo(nome)}">${escaparAtributo(nome)}</option>`).join('')
        const tMargem = (tabela) => `
        <div class="composicao-margem-cabecalho" onclick="event.stopPropagation()">
            <button type="button" class="composicao-margem-editar" title="Editar margem dos itens selecionados" onclick="editarMargemEmMassa('${tabela}')"><img src="imagens/editar.svg" alt="Editar margem"></button>
            <input name="m_master_${tabela}" type="checkbox" aria-label="Selecionar todas as margens desta página" onchange="marcarTodosMargem('${tabela}')">
        </div>
    `

        const btnExtras = `
        <div style="display: flex; flex-wrap: wrap; gap: 3px;">
            <label class="composicoes-filtro">
                <select aria-label="Filtrar composições por especialidade" onchange="confirmarPesquisa({event, chave: 'especialidade', op: '=', elemento: this, pag: 'campos'})">
                    <option value="">Todas as especialidades</option>${opcoesEspecialidade}
                </select>
            </label>
            <button onclick="edicaoItem()">Criar Composição</button>
        </div>
    `

        const pag = 'campos'
        const tabela = await modTab({
            pag,
            btnExtras,
            body: 'campos',
            base: 'campos',
            filtros: {
                'desativado': { op: '=', value: filtro || '' }
            },
            criarLinha: 'criarLinhasCampos',
            colunas: {
                [`<span class="composicao-marcar-acoes" onclick="event.stopPropagation()"><label class="composicao-marcar-todos"><span>Marcar</span><input type="checkbox" aria-label="Marcar todos os itens desta página" title="Marcar todos" onchange="marcarTodosDesativar(this)"></label><button type="button" class="composicao-desativar" onclick="confirmarDesativacao()">${filtro ? 'Ativar' : 'Desativar'} itens</button></span>`]: {},
                'Especialidade': {},
                'Descrição': { chave: 'descricao' },
                'Unidade de Medida': { chave: 'medida' },
                [`Materiais${tMargem('materiais')}`]: {},
                [`Ferramentas${tMargem('ferramentas')}`]: {},
                [`Mão de obra${tMargem('mao_obra')}`]: {},
                'Total geral': {}
            }
        })

        titulo.textContent = 'Composições'
        tela.innerHTML = tabela

        await paginacao(pag)

        removerOverlay()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao abrir o ecrã de Preços: Fale com o suporte.' })
    }

}

function confirmarDesativacao() {
    const botoes = [
        { texto: 'Confirmar', img: 'concluido', funcao: `desativarEmMassa()`, fechar: true }
    ]
    popup({ botoes, mensagem: 'Desativar itens?', removerAnteriores: true })
}

async function desativarEmMassa() {

    // Também reativa
    overlayAguarde()

    const filtro = controles.campos?.filtros?.desativado?.value || ''
    const valor = filtro == 'S'
        ? ''
        : 'S'

    const inpDes = document.querySelectorAll('[name="desativar"]:checked')
    const ids = [...inpDes]
        .map(i => i.dataset.codigo)

    const resposta = await apiDesativarCampos({ ids, valor })

    if (resposta.mensagem)
        return popup({ mensagem: resposta.mensagem })

    removerOverlay()
}

function marcarTodosDesativar(inpMaster) {
    const inpDes = document.querySelectorAll('[name="desativar"]')

    for (const inp of inpDes) {
        const tr = inp.closest('tr')
        if (!tr) continue

        const visivel = tr.offsetParent !== null
        inp.checked = visivel
            ? inpMaster.checked
            : false
    }
}

function editarMargemEmMassa(tabela) {
    const codigos = [...document.querySelectorAll(`#campos [name="margem_${tabela}"]:checked`)].map(input => input.dataset.codigo)
    if (!codigos.length) return popup({ mensagem: 'Selecione ao menos uma composição nesta categoria.' })

    const linhas = [
        {
            texto: 'A margem escolhida será replicada <br>para todos os itens marcados',
            elemento: `
                <div style="${horizontal}; gap: 3px;">
                    <input name="margemMassa_${tabela}" type="number"> 
                    <span>%</span>
                </div>
            `
        }
    ]

    const botoes = [
        { texto: 'Guardar', img: 'concluido', funcao: `aplicarEmMassa('${tabela}')` }
    ]

    const idModal = popup({ botoes, linhas, titulo: `Aplicar margem em ${codigos.length} composições` })
    document.getElementById(idModal).dataset.codigosMargem = JSON.stringify(codigos)

}

async function aplicarEmMassa(tabela) {

    overlayAguarde()

    try {
    const margemMassa = document.querySelector(`[name="margemMassa_${tabela}"]`)
    if (!margemMassa)
        throw new Error('O formulário de margem não está aberto.')

    const margemNum = Number(margemMassa.value)
    if (!margemMassa.value.trim() || !Number.isFinite(margemNum) || margemNum < 0) throw new Error('Informe uma margem válida, positiva ou zero.')

    const chave = `margem_${tabela}`
    const modal = margemMassa.closest('.popup')
    const codigos = JSON.parse(modal.dataset.codigosMargem || '[]')
    if (!codigos.length) throw new Error('Nenhuma composição selecionada.')

    const resposta = await enviarMargens({ codigos, margem: margemNum, tabela })

    if (!resposta || resposta.success === false || resposta.erro || (resposta.mensagem && resposta.success !== true))
        throw new Error(resposta?.mensagem || resposta?.erro || 'Não foi possível aplicar as margens.')

    removerPopup(modal.id)
    await paginacao('campos')
    const master = document.querySelector(`[name="m_master_${tabela}"]`)
    if (master) { master.checked = false; master.indeterminate = false }
    } catch (erro) { popup({ mensagem: escaparAtributo(erro.message) }) }
    finally { removerOverlay() }

}

function marcarTodosMargem(tabela) {

    const master = document.querySelector(`[name="m_master_${tabela}"]`)
    if (!master) return
    const inputs = document.querySelectorAll(`#campos [name="margem_${tabela}"]`)
    for (const input of inputs) {
        const tr = input.closest('tr')
        if (tr && !tr.hidden && tr.style.display !== 'none') input.checked = master.checked
    }

}

function sincronizarMasterMargem(tabela) {
    const master = document.querySelector(`[name="m_master_${tabela}"]`)
    if (!master) return
    const inputs = [...document.querySelectorAll(`#campos [name="margem_${tabela}"]`)]
        .filter(input => { const tr = input.closest('tr'); return tr && !tr.hidden && tr.style.display !== 'none' })
    const marcados = inputs.filter(input => input.checked).length
    master.checked = inputs.length > 0 && marcados === inputs.length
    master.indeterminate = marcados > 0 && marcados < inputs.length
}

function totaisCampo(campo) {
    const totais = { subtotal: 0, total: 0 }
    for (const tipo of ['materiais', 'ferramentas', 'mao_obra']) {
        const componentes = campo[tipo]
        const subtotal = componentes && typeof componentes === 'object'
            ? Object.values(componentes).reduce((soma, c) => soma + (Number(c?.qtde) || 0) * (Number(c?.preco) || 0), 0)
            : Number(campo[`subtotal_${tipo}`] ?? campo.snapshots?.totais?.[`subtotal_${tipo}`] ?? 0)
        const margem = Number(campo[`margem_${tipo}`]) || 0
        const total = subtotal * (1 + margem / 100)
        totais[`subtotal_${tipo}`] = subtotal
        totais[`total_${tipo}`] = total
        totais.subtotal += subtotal
        totais.total += total
    }
    return totais
}

function criarLinhasCampos(dados) {

    const { 
        id, 
        descricao,
        especialidade,
        medida
    } = dados || {}

    const {
        total_mao_obra,
        total_ferramentas,
        total_materiais,
        subtotal_mao_obra,
        subtotal_ferramentas,
        subtotal_materiais,
        subtotal,
        total
    } = totaisCampo(dados || {})

    const modeloSubtotal = (chave, valor, valorTotal) => `
        <td class="composicao-celula-subtotal" style="${bg(chave)}">
            <div class="composicao-subtotal">
                <div class="composicao-valor"><small>Subtotal</small><span>${dinheiro(valor)}</span></div>
                <div class="composicao-margem-controle">
                    <button type="button" class="composicao-margem-badge" title="Editar margem" aria-label="Editar margem de ${chave.replaceAll('_', ' ')}" onclick="painelMargem('${id}', '${chave}')">${escaparAtributo(dados?.[`margem_${chave}`] || 0)} % <span aria-hidden="true">✎</span></button>
                    <input data-codigo="${id}" type="checkbox" name="margem_${chave}" aria-label="Selecionar margem de ${chave.replaceAll('_', ' ')} para edição em lote" onchange="sincronizarMasterMargem('${chave}')">
                </div>
                <div class="composicao-valor composicao-valor-final"><small>Total</small><strong>${dinheiro(valorTotal)}</strong></div>
            </div>
        </td>
    `

    const modeloTotal = (valorSubtotal, valorTotal) => `
        <td class="composicao-celula-total">
            <div class="composicao-valor-total"><div class="composicao-valor"><small>Subtotal</small><span>${dinheiro(valorSubtotal)}</span></div><div class="composicao-valor composicao-valor-final"><small>Total</small><strong>${dinheiro(valorTotal)}</strong></div></div>
        </td>`

    const bg = (c) => `white-space: nowrap; background-color: ${c == 'materiais'
        ? '#fcf3ef'
        : c == 'ferramentas'
            ? '#eff4fb' : '#eef6f0'
        };`

    const tds = `
        <td>
            <input style="width: 1.5rem; height: 1.5rem;" data-codigo="${id}" name="desativar" type="checkbox">
        </td>
        <td class="composicao-especialidade">${escaparAtributo(especialidade || '')}</td>
        <td>
            <div class="composicao-descricao-linha">
                <div class="composicao-acoes" role="group" aria-label="Ações da composição">
                    <button type="button" data-controle="editar" onclick="edicaoItem('${id}')" title="Editar" aria-label="Editar composição"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6ZM13 6l5 5M3 21l5-1-4-4"/></svg></button>
                    <button type="button" data-controle="editar" onclick="composicoes('${id}', true)" title="Abrir composição" aria-label="Abrir itens da composição"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 9 5v9l-9 5-9-5V8ZM3 8l9 5 9-5M12 13v9M7.5 5.5l9 5"/></svg></button>
                </div>
                <div class="composicao-descricao"><span>${escaparAtributo(descricao || '')}</span></div>
            </div>
        </td>
        <td>${medida}</td>

        ${modeloSubtotal('materiais', subtotal_materiais, total_materiais)}

        ${modeloSubtotal('ferramentas', subtotal_ferramentas, total_ferramentas)}

        ${modeloSubtotal('mao_obra', subtotal_mao_obra, total_mao_obra)}

        ${modeloTotal(subtotal, total)}
    `
    return `<tr>${tds}</tr>`

}

async function edicaoItem(idCampo) {

    overlayAguarde()

    const campo = await recuperarDado('campos', idCampo) || {}

    const opcoesMedidas = ['', 'und', 'ml', 'm2', 'm3']
        .map(op => `<option ${op == campo?.medida ? 'selected' : ''}>${op}</option>`)
        .join('')

    const especialidades = await contarPorCampo({
        base: 'campos',
        path: 'especialidade'
    })

    const opcoesEspecialidade = Object.keys(especialidades)
        .map(op => `<option>${op}</option>`)
        .join('')

    const linhas = [
        {
            texto: 'Descrição',
            elemento: `<textarea name="descricao">${campo?.descricao || ''}</textarea>`
        },
        {
            texto: 'Medida',
            elemento: `<select name="medida">${opcoesMedidas}</select>`
        },
        {
            texto: 'Especialidade',
            elemento: `
                <input name="especialidade" list="especialidade" value="${campo?.especialidade || ''}">
                <datalist id="especialidade">${opcoesEspecialidade}</datalist>
            `
        }
    ]
    const botoes = [
        { texto: 'Guardar', img: 'concluido', funcao: idCampo ? `salvarCampo('${idCampo}')` : 'salvarCampo()' }
    ]

    const titulo = idCampo
        ? 'Editar Campo'
        : 'Criar Composição'

    const idPopup = popup({ linhas, botoes, titulo })
    document.getElementById(idPopup).dataset.campoId = idCampo || ''

}

async function salvarCampo(idCampo = crypto.randomUUID()) {
    const painel = [...document.querySelectorAll('.popup')].reverse().find(p => p.querySelector('[name="descricao"]') && p.querySelector('[name="medida"]'))
    if (!painel) return
    overlayAguarde()
    try {
    const campo = painel.dataset.campoId ? await recuperarDado('campos', idCampo) : { id: idCampo, desativado: '' }
    if (!campo) throw new Error('Não foi possível recuperar a composição para editar.')
    const cmps = ['descricao', 'medida', 'especialidade']

    for (const cmp of cmps) {
        const el = painel.querySelector(`[name="${cmp}"]`)
        if (!el?.value.trim()) throw new Error('Preencha descrição, medida e especialidade.')
        campo[cmp] = el.value.trim()
    }

    const resposta = await enviar(`campos/${idCampo}`, campo)
    if (!resposta || resposta.success === false || resposta.erro)
        throw new Error(resposta?.mensagem || resposta?.erro || 'O servidor não confirmou o salvamento da composição.')
    removerPopup(painel.id)
    await paginacao('campos')
    } catch (erro) { popup({ mensagem: escaparAtributo(erro.message) }) }
    finally { removerOverlay() }

}

async function painelMargem(id, tabela) {

    const campo = await recuperarDado('campos', id) || {}

    const chave = `subtotal_${tabela}`
    const totais = totaisCampo(campo)
    const margemAtual = Number(campo[`margem_${tabela}`]) || 0

    const linhas = [
        {
            texto: `Defina uma margem (%):`,
            elemento: `<input id="margem_unidade" oninput="calcularValorFinal(${totais[chave]}, this)" type="number" min="0" step="any" value="${margemAtual}">`
        },
        {
            elemento: `
            <div style="${vertical}; gap: 2px;">
                <span>Subtotal da categoria: <b>${dinheiro(totais[chave])}</b></span>
                <span>Preço final da categoria: <b><span id="novoTotal">${dinheiro(totais[`total_${tabela}`])}</span></b></span>
                <span>Subtotal da composição: <b>${dinheiro(totais.subtotal)}</b></span>
                <span>Total da composição: <b><span class="margem-total-composicao">${dinheiro(totais.total)}</span></b></span>
            </div>
            `
        }

    ]

    const botoes = [
        { texto: 'Guardar', img: 'concluido', funcao: `salvarMargem('${tabela}', '${id}')` }
    ]

    const idPopup = popup({ linhas, botoes, titulo: 'Gerir Margem' })
    document.getElementById(idPopup).dataset.totalOutrasCategorias = totais.total - totais[`total_${tabela}`]

}

function calcularValorFinal(subtotal, input) {

    subtotal = typeof subtotal === 'number' ? subtotal : conversor(subtotal)

    const novoTotal = document.getElementById('novoTotal')
    const margem = Number(input.value)
    const calculo = Number((subtotal * (1 + (margem / 100))).toFixed(2))
    novoTotal.textContent = dinheiro(calculo)
    const modal = input.closest('.popup')
    const totalComposicao = modal?.querySelector('.margem-total-composicao')
    if (totalComposicao) totalComposicao.textContent = dinheiro(calculo + Number(modal.dataset.totalOutrasCategorias || 0))

}

async function salvarMargem(tabela, idCampo) {

    overlayAguarde()

    const input = document.getElementById('margem_unidade')
    try {
        const margem = Number(input?.value)
        if (!idCampo || !Number.isFinite(margem) || margem < 0) throw new Error('Informe uma margem válida, positiva ou zero.')
        const resposta = await enviar(`campos/${idCampo}/margem_${tabela}`, margem)
        if (!resposta || resposta.success === false || resposta.erro) throw new Error(resposta?.mensagem || 'Não foi possível guardar a margem.')
        removerPopup(input.closest('.popup').id)
        await paginacao('campos')
    } catch (erro) { popup({ mensagem: escaparAtributo(erro.message) }) }
    finally { removerOverlay() }
}

async function composicoes(id) {

    overlayAguarde()

    const campo = await recuperarDado('campos', id) || {}

    const modeloTabela = (tipoTabela) => {

        const ths = ['Artigo', 'Qtde', 'Preço', 'Total', 'Remover']
            .map(col => `<th>${col}</th>`)
            .join('')

        return `
            <div id="${tipoTabela}" class="blocoTabela" style="display: none;">
                <div class="painelBotoes">
                    <span>Subtotal</span>
                    <span class="total-composicao" id="total-${tipoTabela}">${dinheiro(campo?.[`subtotal_${tipoTabela}`])}</span>
                </div>
                <div class="recorteTabela">
                    <table class="tabela">
                        <thead><tr>${ths}</tr></thead>
                        <tbody id="body_${tipoTabela}"></tbody>
                    </table>
                </div>
                <div class="rodapeTabela">
                    <button type="button" onclick="adicionarLinhaComposicoes({tabela: '${tipoTabela}', idCampo: '${id}'})">Adicionar Linha</button>
                    <button type="button" class="composicao-salvar" onclick="salvarComposicao('${id}')">Guardar</button>
                </div>
            </div>`
    }

    const elemento = `
        <div class="configuracao-tarefa">

            <div class="composicao-resumo">
                <span><b>Total Geral</b></span>
                <span name="totalComposicao">${dinheiro(campo?.total_composicao)}</span>
            </div>

            <div class="toolbar-precos" aria-label="Categorias da composição">
                <button type="button" id="toolbar_materiais" aria-controls="materiais" onclick="toogleTabela('materiais')">Materiais</button>
                <button type="button" id="toolbar_ferramentas" aria-controls="ferramentas" onclick="toogleTabela('ferramentas')">Ferramentas</button>
                <button type="button" id="toolbar_mao_obra" aria-controls="mao_obra" onclick="toogleTabela('mao_obra')">Mão de Obra</button>
                <button type="button" id="toolbar_duracao" aria-controls="duracao" onclick="toogleTabela('duracao')">Duração</button>
            </div>

            ${modeloTabela('materiais')}
            ${modeloTabela('ferramentas')}
            ${modeloTabela('mao_obra')}

            <div id="duracao" class="edicao-duracao">
                <div class="composicao-duracao-campo">
                    <span>Duração (Horas)</span>
                    <input type="time" oninput="salvarDuracao('${id}', this)" value="${campo?.duracao || ''}">
                </div>
            </div>

        </div>
    `

    const idPopup = popup({ elemento, titulo: 'Configuração da Tarefa' })
    document.getElementById(idPopup).classList.add('popup-composicoes')

    toogleTabela('materiais')

    const tabelas = [
        'materiais',
        'ferramentas',
        'mao_obra'
    ]

    tabelas.forEach(tabela => {
        const itens = Object.entries(campo?.[tabela] || {})
        for (const [id, dados] of itens)
            adicionarLinhaComposicoes({ tabela, dados, id })
    })

    calcularTotais()

}

async function salvarDuracao(idCampo, input) {

    const duracao = input.value
    const campo = await recuperarDado('campos', idCampo)
    campo.duracao = duracao

    await enviar(`campos/${idCampo}/duracao`, duracao)

}

function toogleTabela(idAtual) {

    const tabelas = ['materiais', 'ferramentas', 'mao_obra', 'duracao']

    for (const tabela of tabelas) {
        const tabHtml = document.getElementById(tabela)
        const toolbar = document.getElementById(`toolbar_${tabela}`)
        tabHtml.style.display = 'none'
        toolbar.style.opacity = 0.5
        toolbar.setAttribute('aria-pressed', 'false')
    }

    document.getElementById(idAtual).style.display = 'flex'
    document.getElementById(`toolbar_${idAtual}`).style.opacity = 1
    document.getElementById(`toolbar_${idAtual}`).setAttribute('aria-pressed', 'true')

}

async function adicionarLinhaComposicoes({ tabela, dados = {}, id }) {

    const tbody = document.getElementById(`body_${tabela}`)
    const { preco = 0, qtde, descricao } = dados || {}
    const total = (preco || 0) * (qtde || 0)
    const codSpan = crypto.randomUUID()

    controlesCxOpcoes[codSpan] = {
        base: tabela,
        retornar: ['nome'],
        funcaoAdicional: [
            ['preencherItem', codSpan, tabela]
        ],
        colunas: {
            'Nome': { chave: 'nome' },
            'Preço': { chave: 'preco' }
        }
    }

    const tds = `
        <td>
            <span ${id ? `id="${id}"` : ''} class="opcoes" name="${codSpan}" 
            onclick="cxOpcoes('${codSpan}')">${descricao || 'Selecionar'}</span>
        </td>
        <td>
            <input type="number" style="width: 5rem;" name="qtde" value="${qtde || 0}" oninput="preencherItem('${codSpan}')">
        </td>
        <td style="white-space: nowrap;" name="preco">${dinheiro(preco)}</td>
        <td style="white-space: nowrap;" name="total">${dinheiro(total)}</td>
        <td>
            <img src="imagens/cancel.png" onclick="this.closest('tr').remove()">
        </td>
        `

    // procura a <tr> pelo idMaterial
    const trExistente = tbody.querySelector(`tr[id="${id}"]`)

    if (trExistente) {
        trExistente.innerHTML = tds
    } else {
        tbody.insertAdjacentHTML('beforeend', `<tr data-tabela="${tabela}" id="${id || ''}">${tds}</tr>`)
    }

}

async function preencherItem(id, tabela) {

    const span = document.querySelector(`[name="${id}"]`)

    if (!span.id)
        return

    const tr = span.closest('tr')
    const qtde = tr.querySelector('[name="qtde"]').value || 0
    let preco = 0

    if (tabela) {
        const item = await recuperarDado(tabela, span.id) || {}
        preco = item?.preco || 0
        tr.querySelector('[name="preco"]').textContent = dinheiro(preco)
    } else {
        preco = conversor(tr.querySelector('[name="preco"]').textContent)
    }

    tr.querySelector('[name="total"]').textContent = dinheiro(preco * qtde)

    calcularTotais()

}

function calcularTotais() {

    const tabelas = {
        'materiais': 0,
        'ferramentas': 0,
        'mao_obra': 0
    }

    let totalGeral = 0

    Object.keys(tabelas).forEach(tabela => {

        [...document.querySelectorAll(`#body_${tabela} tr`)].forEach(tr => {
            const qtde = tr.querySelector('[name=qtde]').value || 0
            const preco = conversor(tr.querySelector('[name=preco]').textContent)

            tabelas[tabela] += qtde * preco
        })

        totalGeral += tabelas[tabela]
        document.getElementById(`total-${tabela}`).textContent = dinheiro(tabelas[tabela])

    })

    document.querySelector('[name="totalComposicao"]').textContent = dinheiro(totalGeral)

}

async function salvarComposicao(idCampo) {

    overlayAguarde()
    try {

    const tabelas = ['materiais', 'ferramentas', 'mao_obra']
    const campo = await recuperarDado('campos', idCampo) || {}

    let subtotalGeral = 0

    for (const tabela of tabelas) {
        const trs = document.querySelectorAll(`#body_${tabela} tr`)

        const dados = {}

        let subtotal = 0

        for (const tr of trs) {

            const tds = tr.querySelectorAll('td')
            const item = tr.querySelector('.opcoes')
            if (!item?.id)
                continue

            const qtde = Number(tr.querySelector('[name="qtde"]').value || 0)
            const descricao = item.textContent
            const preco = conversor(tr.querySelector('[name="preco"]').textContent)
            subtotal += qtde * preco

            if (!dados[item.id]) {
                dados[item.id] = { id: item.id, descricao, preco, qtde }
            } else {
                dados[item.id].qtde += qtde
            }

        }

        const chaveSubtotal = `subtotal_${tabela}`

        campo[tabela] ??= {}
        campo[tabela] = dados
        campo[chaveSubtotal] = subtotal
        subtotalGeral += subtotal
    }

    const resposta = await enviar(`campos/${idCampo}`, campo)
    if (!resposta || resposta.success === false || resposta.erro)
        throw new Error(resposta?.mensagem || 'O servidor não confirmou o salvamento da composição.')

    removerPopup()
    await paginacao('campos')
    } catch (erro) { popup({ mensagem: escaparAtributo(erro.message || 'Não foi possível guardar a composição.') }) }
    finally { removerOverlay() }
}


async function apiDesativarCampos(params) {

    try {

        const { token } = JSON.parse(localStorage.getItem('acesso')) || {}

        const response = await fetch(`${api}/alterar-desativado`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(params)
        })

        if (!response.ok) {
            const err = await response.json()
            throw err
        }

        const data = await response.json()

        return data

    } catch (err) {
        return { mensagem: err.message }
    }

}

async function enviarMargens(params) {

    try {

        const { token } = JSON.parse(localStorage.getItem('acesso')) || {}

        const response = await fetch(`${api}/margens`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(params)
        })

        if (!response.ok) {
            const err = await response.json()
            throw err
        }

        const data = await response.json()

        return data

    } catch (err) {
        return { mensagem: err.message }
    }

}
