let idCampo = null
let margem = 0
let desativado = 'N'

async function telaPrecos() {

    materiais = await recuperarDados('materiais')
    ferramentas = await recuperarDados('ferramentas')
    mao_obra = await recuperarDados('mao_obra')
    campos = await recuperarDados('campos')

    const tMargem = (tabela) => `
        <div style="${vertical}">
            <span>Margem</span>
            <div style="${horizontal}; gap: 5px;">
                <img data-controle="editar" onclick="editarMargemEmMassa('${tabela}')" src="imagens/lapis.png" style="width: 1.5rem;">
                <input data-controle="editar" name="m_master_${tabela}" type="checkbox" onclick="marcarTodosMargem('${tabela}')">
            </div>
        </div>
    `
    const ths = [
        `<div style="${horizontal}; gap: 2px;">
            <input data-controle="editar" type="checkbox" onchange="marcarTodosDesativar(this)">
            <span data-controle="editar">Todos</span>
        </div>`,
        'Especialidade',
        'Descrição',
        'Unidade de Medida',
        'Composição',
        'Subtotal Materiais',
        tMargem('materiais'),
        'Total Materiais',
        'Subtotal Ferramentas',
        tMargem('ferramentas'),
        'Total Ferramentas',
        'Subtotal Mão Obra',
        tMargem('mao_obra'),
        'Total Mão Obra',
        'Sub-total',
        'Total'
    ].map(col => `<th>${col}</th>`).join('')

    const acumulado = `
        <div class="blocoTabela">
            <div class="painelBotoes">
                <div class="botoes">
                    <div class="pesquisa">
                        <input oninput="pesquisar(this, 'body')" placeholder="Pesquisar" style="width: 100%;">
                        <img src="imagens/pesquisar2.png">
                    </div>
                    <button onclick="telaConfiguracoes()">Voltar</button>
                    <button data-controle="inserir" onclick="edicaoItem()">Criar Campo</button>
                    <button data-controle="editar" onclick="confirmarDesativacao()">Desativar Itens</button>
                </div>
                <img class="atualizar" src="imagens/atualizar.png" onclick="atualizarCampos()">
            </div>
            <div class="recorteTabela">
                <table class="tabela">
                    <thead>
                        <tr>${ths}</tr>
                    </thead>
                    <tbody id="body"></tbody>
                </table>
            </div>
            <div class="rodapeTabela"></div>
        </div>
    `
    const blocoTabela = document.querySelector('.blocoTabela')
    const telaInterna = document.querySelector('.telaInterna')
    if (!blocoTabela) telaInterna.innerHTML = acumulado

    const camposOrdenados =
        Object.entries(campos)
            .sort(([, a], [, b]) =>
                (a.especialidade || '')
                    .localeCompare(b.especialidade || '', 'pt-BR')
            )


    const ativos = []
    for (const [idCampo, dados] of camposOrdenados) {
        if (desativado !== (dados?.desativado || 'N')) continue
        ativos.push(idCampo)
        criarLinhasCampos(idCampo, dados)
    }

    // Remoção de linhas;
    const trs = document.querySelectorAll(`#body tr`)
    for (const tr of trs) if (!ativos.includes(tr.id)) tr.remove()

    // Regras de validação;
    validarRegrasAcesso()

}

function confirmarDesativacao() {
    const botoes = [
        { texto: 'Confirmar', img: 'concluido', funcao: `desativarEmMassa()` }
    ]
    popup({ botoes, mensagem: 'Desativar itens?', nra: false })
}

async function desativarEmMassa() {

    removerPopup()
    overlayAguarde()
    const inpDes = document.querySelectorAll('[name="desativar"]')
    const desativar = []
    for (const inp of inpDes) {
        const tr = inp.closest('tr')
        if (inp.checked) desativar.push(tr.id)
    }

    const resposta = await desativarCampos(desativar)

    if (resposta.mensagem)
        return popup({ mensagem: resposta.mensagem })

    await sincronizarDados('campos')
    await telaPrecos()
    removerOverlay()
}

function marcarTodosDesativar(inpMaster) {
    const inpDes = document.querySelectorAll('[name="desativar"]')

    for (const inp of inpDes) {
        const tr = inp.closest('tr')
        if (!tr) continue

        const visivel = tr.offsetParent !== null
        inp.checked = visivel ? inpMaster.checked : false
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

    const margemMassa = document.querySelector(`[name="margemMassa_${tabela}"]`)
    if (!margemMassa)
        return popup({ mensagem: 'O campo margem não pode ficar vazio!' })

    const margemNum = Number(margemMassa.value)

    campos = await recuperarDados('campos')
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
    await inserirDados(campos, 'campos')
    await telaPrecos()

}

function marcarTodosMargem(tabela) {

    const master = document.querySelector(`[name="m_master_${tabela}"]`)
    const inputs = document.querySelectorAll(`[name="margem_${tabela}"]`)
    for (const input of inputs) {
        const tr = input.closest('tr')
        if (tr.style.display !== 'none') input.checked = master.checked
    }

}

async function atualizarCampos() {

    await sincronizarDados('campos')
    await telaPrecos()

}

function criarLinhasCampos(idCampo, dados) {

    const modeloMargem = (chave) => `
        <td style="${bg(chave)}">
            <div style="${horizontal}; gap: 0.5rem;">
                <img data-controle="editar" src="imagens/lapis.png" style="width: 1.5rem;" onclick="painelMargem('${idCampo}', '${chave}')">
                <span style="white-space: nowrap;">${dados?.[`margem_${chave}`] || 0} %</span>
                <input data-controle="editar" type="checkbox" name="margem_${chave}">
            </div>
        </td>
    `
    const total = dados.margem ? (1 + (dados.margem / 100)) * dados.totalComposicao : dados?.totalComposicao || 0

    const bg = (c) => `white-space: nowrap; background-color: ${c == 'materiais'
        ? '#ffe9e9'
        : c == 'ferramentas'
            ? '#c7deff' : '#ceffc7'
        };`

    const tds = `
        <td><input data-controle="editar" name="desativar" type="checkbox"></td>
        <td>${dados.especialidade}</td>
        <td>
            <div style="${horizontal}; gap: 5px;">
                <img data-controle="editar" onclick="edicaoItem('${idCampo}')" src="imagens/lapis.png" style="width: 1.5rem;">
                <span style="width: 200px; text-align: left;">${dados.descricao}</span>
            </div>
        </td>
        <td>${dados.medida}</td>
        <td>
            <div style="${horizontal};">
                <img data-controle="editar" src="imagens/caixa.png" style="width: 1.5rem;" onclick="composicoes('${idCampo}', true)">
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

    const trExistente = document.getElementById(idCampo)
    if (trExistente) return trExistente.innerHTML = tds

    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${idCampo}">${tds}</tr>`)
}

async function edicaoItem(idCampo) {

    const campo = campos[idCampo] || {}

    const opcoesMedidas = ['', 'und', 'ml', 'm2', 'm3']
        .map(op => `<option ${op == campo?.medida ? 'selected' : ''}>${op}</option>`)
        .join('')

    const especialidades = []
    for (const campo of Object.values(campos)) {
        if (!especialidades.includes(campo.especialidade)) especialidades.push(campo.especialidade)
    }

    const opcoesEspecialidade = especialidades
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

    const titulo = idCampo ? 'Editar Campo' : 'Criar Campo'

    popup({ linhas, botoes, titulo })

}

async function salvarCampo(idCampo = ID5digitos()) {

    let campo = {}
    const cmps = ['descricao', 'medida', 'especialidade']

    for (const cmp of cmps) {
        const el = document.querySelector(`[name="${cmp}"]`)
        if (el) campo[cmp] = el.value
    }

    enviar(`campos/${idCampo}`, campo)
    await inserirDados({ [idCampo]: campo }, 'campos')
    removerPopup()
    await telaPrecos()
}

async function painelMargem(id, tabela) {

    margem = 0

    idCampo = id

    const campo = campos[id]

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
    const campo = campos[idCampo]
    const subtotal = campo[`subtotal_${tabela}`] || 0
    const total = subtotal * (1 + (margem / 100))

    campo[cMargem] = margem
    campo[cTotal] = total

    const subtotalGeral = (campo.subtotal_materiais || 0) + (campo.subtotal_ferramentas || 0) + (campo.subtotal_mao_obra || 0)
    const totalGeral = (campo.total_materiais || 0) + (campo.total_ferramentas || 0) + (campo.total_mao_obra || 0)
    campo.total = totalGeral
    campo.subtotal = subtotalGeral

    enviar(`campos/${idCampo}`, campo)

    await inserirDados({ [idCampo]: campo }, 'campos')

    await telaPrecos()

    removerPopup()
}

async function composicoes(id, tP) {

    idCampo = id
    const campo = campos[id]

    const modeloTabela = (tipoTabela) => {

        const ths = ['Artigo', 'Qtde', 'Preço', 'Total', 'Link', '']
            .map(col => `<th>${col}</th>`)
            .join('')

        return `
            <div id="${tipoTabela}" class="blocoTabela" style="display: none;">
                <div class="painelBotoes">
                    <span class="total-composicao">${dinheiro(campo[`subtotal_${tipoTabela}`])}</span>
                </div>
                <div class="recorteTabela">
                    <table class="tabela">
                        <thead>${ths}</thead>
                        <tbody id="body_${tipoTabela}"></tbody>
                    </table>
                </div>
                <div class="rodapeTabela">
                    <button onclick="adicionarLinhaComposicoes({tabela: '${tipoTabela}', baseRef: ${tipoTabela}, idCampo: '${idCampo}'})">Adicionar Linha</button>
                    <button onclick="salvarComposicao()">Salvar</button>
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

    popup({ elemento, titulo: 'Configuração da Tarefa'})

    toogleTabela('materiais')

    const tabelas = {
        'materiais': materiais,
        'ferramentas': ferramentas,
        'mao_obra': mao_obra
    }

    for (const [tabela, baseRef] of Object.entries(tabelas)) {

        for (const [id, dados] of Object.entries(campo?.[tabela] || {})) {
            adicionarLinhaComposicoes({ baseRef, tabela, dados, id })
        }

    }
    0
    if (tP) await telaPrecos()
}

async function salvarDuracao(idCampo, input) {

    const duracao = input.value
    const campo = await recuperarDado('campos', idCampo)
    campo.duracao = duracao

    enviar(`campos/${idCampo}/duracao`, duracao)
    await inserirDados({ [idCampo]: campo }, 'campos')

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

async function adicionarLinhaComposicoes({ baseRef = {}, tabela, dados, id }) {

    const tbody = document.getElementById(`body_${tabela}`)
    if (!tbody) return

    const itemRef = baseRef?.[id] || {}
    const codSpan = ID5digitos()

    const tds = `
        <td>
            <span ${id ? `id="${id}"` : ''} class="opcoes" name="${codSpan}" 
            onclick="cxOpcoes('${codSpan}', '${tabela}', ['nome', 'preco[dinheiro]'], 'preencherItem()')">${itemRef.nome || 'Selecionar'}</span>
        </td>
        <td><input oninput="preencherItem()" type="number" style="width: 5rem;" value="${dados?.qtde || ''}"></td>
        <td style="white-space: nowrap;">${dinheiro(itemRef?.preco)}</td>
        <td style="white-space: nowrap;">
            ${dinheiro(itemRef?.preco * dados?.qtde || 0)}
        </td>
        <td>
            <a href="${itemRef?.link}">${itemRef?.link || ''}</a>
        </td>
        <td>
            <img style="width: 2rem;" src="imagens/cancel.png" onclick="removerItem(this)">
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

function visitarSite(img) {

    const link = img.previousElementSibling.value
    if (!link) return

    const url = link.startsWith('http') ? link : `https://${link}`
    window.open(url, '_blank')
}

async function preencherItem() {

    const tabelas = ['materiais', 'ferramentas', 'mao_obra']

    for (const tabela of tabelas) {

        const trs = document.querySelectorAll(`#body_${tabela} tr`)

        for (const tr of trs) {

            const idItem = tr.querySelector('.opcoes').id
            const dTabela = await recuperarDados(tabela)
            const item = dTabela[idItem] || {}
            const tds = tr.querySelectorAll('td')
            const qtde = Number(tds[1].querySelector('input').value)
            const total = item?.preco * qtde

            tds[2].textContent = dinheiro(item?.preco)
            tds[3].textContent = dinheiro(total)
            tds[4].querySelector('a').textContent = item?.link || ''
            tds[4].querySelector('a').href = item?.link || ''

        }
    }
}

async function removerItem(img) {

    const tr = img.closest('tr')
    tr.remove()

}

async function salvarComposicao() {

    overlayAguarde()

    const tabelas = ['materiais', 'ferramentas', 'mao_obra']

    let subtotalGeral = 0
    let totalGeral = 0

    for (const tabela of tabelas) {
        const trs = document.querySelectorAll(`#body_${tabela} tr`)

        const dados = {}

        let subtotal = 0

        for (const tr of trs) {

            const tds = tr.querySelectorAll('td')
            const item = tr.querySelector('.opcoes')
            if (!item.id) continue

            const qtde = Number(tds[1]?.querySelector('input')?.value || 0)
            const descricao = item.textContent
            const preco = conversor(tds[2].textContent)
            subtotal += qtde * preco

            if (!dados[item.id]) {
                dados[item.id] = { descricao, preco, qtde }
            } else {
                dados[item.id].qtde += qtde
            }

        }

        const chaveMargem = `margem_${tabela}`
        const chaveSubtotal = `subtotal_${tabela}`
        const chaveTotal = `total_${tabela}`
        const margem = campos[idCampo][chaveMargem] || 0
        const total = subtotal * (1 + (margem / 100))
        campos[idCampo][tabela] = dados
        campos[idCampo][chaveSubtotal] = subtotal
        campos[idCampo][chaveTotal] = total

        subtotalGeral += subtotal
        totalGeral += total
    }

    campos[idCampo].total = totalGeral
    campos[idCampo].subtotal = subtotalGeral

    enviar(`campos/${idCampo}`, campos[idCampo])
    await inserirDados({ [idCampo]: campos[idCampo] }, 'campos')
    await telaPrecos()

    removerPopup()
}
