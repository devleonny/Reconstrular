
async function telaPrecos(filtro = null) {

    const tMargem = (tabela) => `
        <div style="${vertical}">
            <span>Margem</span>
            <div style="${horizontal}; gap: 5px;">
                <img onclick="editarMargemEmMassa('${tabela}')" src="imagens/lapis.png" style="width: 1.5rem;">
                <input name="m_master_${tabela}" type="checkbox" onclick="marcarTodosMargem('${tabela}')">
            </div>
        </div>
    `

    const btnExtras = `
        <button onclick="telaConfiguracoes()">Voltar</button>
        <button onclick="edicaoItem()">Criar Campo</button>
        <button onclick="confirmarDesativacao()">${filtro ? 'Ativar' : 'Desativar'} Itens</button>
        <div style="${horizontal}; gap: 5px;">
            <input type="checkbox" onclick="marcarTodosDesativar(this)">
            <span style="color: white;">Marcar todos</span>
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
            'Marcar': {},
            'Especialidade': { chave: 'especialidade' },
            'Descrição': { chave: 'descricao' },
            'Unidade de Medida': { chave: 'medida' },
            'Composição': {},
            'Subtotal Materiais': {},
            [tMargem('materiais')]: {},
            'Total Materiais': {},
            'Subtotal Ferramentas': {},
            [tMargem('ferramentas')]: {},
            'Total Ferramentas': {},
            'Subtotal Mão Obra': {},
            [tMargem('mao_obra')]: {},
            'Total Mão Obra': {},
            'Sub-total': {},
            'Total': {}
        }
    })

    tela.innerHTML = tabela

    await paginacao(pag)

}

function confirmarDesativacao() {
    const botoes = [
        { texto: 'Confirmar', img: 'concluido', funcao: `desativarEmMassa()` }
    ]
    popup({ botoes, mensagem: 'Desativar itens?', nra: false })
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
        { texto: 'Salvar', img: 'concluido', funcao: `aplicarEmMassa('${tabela}')` }
    ]

    popup({ botoes, linhas, titulo: 'Aplicar margem em massa' })

}

async function aplicarEmMassa(tabela) {

    overlayAguarde()

    return popup({ mensagem: 'função precisa de revisão' })

    const margemMassa = document.querySelector(`[name="margemMassa_${tabela}"]`)
    if (!margemMassa)
        return popup({ mensagem: 'O campo margem não pode ficar vazio!' })

    const margemNum = Number(margemMassa.value)

    let codigos = []
    const chave = `margem_${tabela}`
    const inputs = document.querySelectorAll(`[name="${chave}"]`)
    for (const input of inputs) {
        const tr = input.closest('tr')
        if (tr.style.display !== 'none') codigos.push(tr.id)
    }

    for (const codigo of codigos) {
        campos[codigo][chave] = margemNum
        const subtotal = campos[codigo][`subtotal_${tabela}`]
        campos[codigo][`total_${tabela}`] = subtotal * (1 + (margemNum / 100))
    }

    const resposta = await enviarMargens({ codigos, margem: margemNum, tabela })

    if (resposta.mensagem)
        return popup({ mensagem: resposta.mensagem })

    removerPopup()

}

function marcarTodosMargem(tabela) {

    const master = document.querySelector(`[name="m_master_${tabela}"]`)
    const inputs = document.querySelectorAll(`[name="margem_${tabela}"]`)
    for (const input of inputs) {
        const tr = input.closest('tr')
        if (tr.style.display !== 'none') input.checked = master.checked
    }

}

function criarLinhasCampos(dados) {

    const { id } = dados || {}

    const modeloMargem = (chave) => `
        <td style="${bg(chave)}">
            <div style="${horizontal}; gap: 0.5rem;">
                <img data-controle="editar" src="imagens/lapis.png" style="width: 1.5rem;" onclick="painelMargem('${id}', '${chave}')">
                <span style="white-space: nowrap;">${dados?.[`margem_${chave}`] || 0} %</span>
                <input data-controle="editar" type="checkbox" name="margem_${chave}">
            </div>
        </td>
    `

    const bg = (c) => `white-space: nowrap; background-color: ${c == 'materiais'
        ? '#ffe9e9'
        : c == 'ferramentas'
            ? '#c7deff' : '#ceffc7'
        };`

    const tds = `
        <td>
            <input style="width: 1.5rem; height: 1.5rem;" data-codigo="${id}" name="desativar" type="checkbox">
        </td>
        <td>${dados.especialidade}</td>
        <td>
            <div style="${horizontal}; gap: 5px;">
                <img data-controle="editar" onclick="edicaoItem('${id}')" src="imagens/lapis.png" style="width: 1.5rem;">
                <span style="width: 200px; text-align: left;">${dados.descricao}</span>
            </div>
        </td>
        <td>${dados.medida}</td>
        <td>
            <div style="${horizontal};">
                <img data-controle="editar" src="imagens/caixa.png" style="width: 1.5rem;" onclick="composicoes('${id}', true)">
            </div>
        </td>

        <td style="${bg('materiais')}">${dinheiro(dados?.subtotal_materiais)}</td>
        ${modeloMargem('materiais')}
        <td style="${bg('materiais')}">${dinheiro(dados.total_materiais)}</td>

        <td style="${bg('ferramentas')}">${dinheiro(dados?.subtotal_ferramentas)}</td>
        ${modeloMargem('ferramentas')}
        <td style="${bg('ferramentas')}">${dinheiro(dados.total_ferramentas)}</td>

        <td style="${bg('mao_obra')}">${dinheiro(dados?.subtotal_mao_obra)}</td>
        ${modeloMargem('mao_obra')}
        <td style="${bg('mao_obra')}">${dinheiro(dados.total_mao_obra)}</td>

        <td style="white-space: nowrap;">${dinheiro(dados.subtotal)}</td>
        <td style="white-space: nowrap;">${dinheiro(dados.total)}</td>
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
        { texto: 'Salvar', img: 'concluido', funcao: idCampo ? `salvarCampo('${idCampo}')` : 'salvarCampo()' }
    ]

    const titulo = idCampo
        ? 'Editar Campo'
        : 'Criar Campo'

    popup({ linhas, botoes, titulo })

}

async function salvarCampo(idCampo = ID5digitos()) {

    let campo = {}
    const cmps = ['descricao', 'medida', 'especialidade']

    for (const cmp of cmps) {
        const el = document.querySelector(`[name="${cmp}"]`)
        if (el) campo[cmp] = el.value
    }

    await enviar(`campos/${idCampo}`, campo)

    removerPopup()

}

async function painelMargem(id, tabela) {

    const campo = await recuperarDado('campos', id) || {}

    const chave = `subtotal_${tabela}`

    const linhas = [
        {
            texto: `Defina uma margem (%):`,
            elemento: `<input id="margem_unidade" oninput="calcularValorFinal(${campo[chave] || 0}, this)" type="number" placeholder="0">`
        },
        {
            elemento: `
            <div style="${vertical}; gap: 2px;">
                <span>Sub total do Item: <b>${dinheiro(campo[chave])}</b></span>
                <span>Preço Final será: <b><span id="novoTotal"></span></b></span>
            </div>
            `
        }

    ]

    const botoes = [
        { texto: 'Salvar', img: 'concluido', funcao: `salvarMargem('${tabela}')` }
    ]

    popup({ linhas, botoes, titulo: 'Gerenciar Margem' })

}

function calcularValorFinal(subtotal, input) {

    subtotal = conversor(subtotal)

    const novoTotal = document.getElementById('novoTotal')
    margem = Number(input.value)
    const calculo = Number((subtotal * (1 + (margem / 100))).toFixed(2))
    novoTotal.textContent = dinheiro(calculo)

}

async function salvarMargem(tabela) {

    overlayAguarde()
    const margem = Number(document.getElementById('margem_unidade').value)
    const cMargem = `margem_${tabela}`
    const cTotal = `total_${tabela}`
    const campo = await recuperarDado('campos', idCampo) || {}
    const subtotal = campo[`subtotal_${tabela}`] || 0
    const total = subtotal * (1 + (margem / 100))

    campo[cMargem] = margem
    campo[cTotal] = total

    const subtotalGeral = (campo.subtotal_materiais || 0) + (campo.subtotal_ferramentas || 0) + (campo.subtotal_mao_obra || 0)
    const totalGeral = (campo.total_materiais || 0) + (campo.total_ferramentas || 0) + (campo.total_mao_obra || 0)
    campo.total = totalGeral
    campo.subtotal = subtotalGeral

    await enviar(`campos/${idCampo}`, campo)

    removerPopup()
}

async function composicoes(id) {

    const campo = await recuperarDado('campos', id) || {}

    const modeloTabela = (tipoTabela) => {

        const ths = ['Artigo', 'Qtde', 'Preço', 'Total', 'Remover']
            .map(col => `<th>${col}</th>`)
            .join('')

        return `
            <div id="${tipoTabela}" class="blocoTabela" style="display: none;">
                <div class="painelBotoes">
                    <span class="total-composicao" id="total-${tipoTabela}">${dinheiro(campo?.[`subtotal_${tipoTabela}`])}</span>
                </div>
                <div class="recorteTabela">
                    <table class="tabela">
                        <thead>${ths}</thead>
                        <tbody id="body_${tipoTabela}"></tbody>
                    </table>
                </div>
                <div class="rodapeTabela">
                    <button onclick="adicionarLinhaComposicoes({tabela: '${tipoTabela}', idCampo: '${id}'})">Adicionar Linha</button>
                    <button onclick="salvarComposicao('${id}')">Salvar</button>
                </div>
            </div>`
    }

    const elemento = `
        <div style="${vertical}; min-width: 500px; padding: 1rem; background-color: #d2d2d2; overflow: auto;">

            <div style="${vertical}; gap: 3px;">
                <span><b>Total Geral</b></span>
                <span name="totalComposicao">${dinheiro(campo?.totalComposicao)}</span>
            </div>

            <div class="toolbar-precos">
                <span id="toolbar_materiais" onclick="toogleTabela('materiais')">Materiais</span>
                <span id="toolbar_ferramentas" onclick="toogleTabela('ferramentas')">Ferramentas</span>
                <span id="toolbar_mao_obra" onclick="toogleTabela('mao_obra')">Mão de Obra</span>
                <span id="toolbar_duracao" onclick="toogleTabela('duracao')">Duração</span>
            </div>

            ${modeloTabela('materiais')}
            ${modeloTabela('ferramentas')}
            ${modeloTabela('mao_obra')}

            <div id="duracao" class="edicao-duracao">
                <div style="${vertical}; padding: 2rem;">
                    <span>Duração (Horas)</span>
                    <input type="time" oninput="salvarDuracao('${id}', this)" value="${campo?.duracao || ''}">
                </div>
            </div>

        </div>
    `

    popup({ elemento, titulo: 'Configuração da Tarefa' })

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
    }

    document.getElementById(idAtual).style.display = 'flex'
    document.getElementById(`toolbar_${idAtual}`).style.opacity = 1

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

    const tabelas = ['materiais', 'ferramentas', 'mao_obra']
    const campo = await recuperarDado('campos', idCampo) || {}

    let subtotalGeral = 0
    let totalGeral = 0

    for (const tabela of tabelas) {
        const trs = document.querySelectorAll(`#body_${tabela} tr`)

        const dados = {}

        let subtotal = 0

        for (const tr of trs) {

            const tds = tr.querySelectorAll('td')
            const item = tr.querySelector('.opcoes')
            if (!item.id)
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

        const chaveMargem = `margem_${tabela}`
        const chaveSubtotal = `subtotal_${tabela}`
        const chaveTotal = `total_${tabela}`
        const margem = campo?.[chaveMargem] || 0
        const total = subtotal * (1 + (margem / 100))

        campo[tabela] ??= {}
        campo[tabela] = dados
        campo[chaveSubtotal] = subtotal
        campo[chaveTotal] = total

        subtotalGeral += subtotal
        totalGeral += total
    }

    campo.total = totalGeral
    campo.subtotal = subtotalGeral

    await enviar(`campos/${idCampo}`, campo)

    removerPopup()
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
