let idCampo = null
let margem = 0
let desativado = 'N'

async function telaPrecos() {

    materiais = await recuperarDados('materiais')
    ferramentas = await recuperarDados('ferramentas')
    mao_obra = await recuperarDados('mao_obra')
    campos = await recuperarDados('campos')

    const tMargem = `
        <div style="${horizontal}; gap: 5px;">
            <span>Margem</span>
            <input data-controle="editar" type="checkbox" onclick="marcarTodosMargem(this)">
            <img data-controle="editar" onclick="editarMargemEmMassa()" src="imagens/lapis.png" style="width: 1.5rem;">
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
        'Sub-Total',
        tMargem,
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

    const ativos = []
    for (const [idCampo, dados] of Object.entries(campos)) {
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
    const acumulado = `
        <div style="${horizontal}; background-color: #d2d2d2; padding: 1rem; gap: 1rem;">
            <span>Deseja desativar todos os itens marcados?</span>
            <button onclick="desativarEmMassa()">Confirmar</button>
        </div>
    `
    popup(acumulado, 'Desativar Itens', true)
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

    if (resposta.mensagem) return popup(mensagem(resposta.mensagem), 'Aviso', true)
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


function editarMargemEmMassa() {

    const acumulado = `
        <div style="${vertical}; background-color: #d2d2d2; padding: 1rem; gap: 0.5rem;">

            <span style="text-align: left;">A margem escolhida será replicada <br>para todos os itens marcados</span>

            <div style="${horizontal}; gap: 3px;">
                <input name="margemMassa" type="number"> 
                <span>%</span>
            </div>

            <hr style="width: 100%;">

            <button onclick="aplicarEmMassa()">Salvar</button>

        </div>
    `

    popup(acumulado, 'Aplicar margem em massa', true)
}

async function aplicarEmMassa() {

    overlayAguarde()

    const margemMassa = document.querySelector('[name="margemMassa"]')
    if (!margemMassa) return popup(mensagem('O campo margem não pode ficar vazio!'), 'Alerta', true)
    const margemNum = Number(margemMassa.value)

    campos = await recuperarDados('campos')
    let codigos = []
    const inputs = document.querySelectorAll('[name="margem"]')
    for (const input of inputs) {
        const tr = input.closest('tr')
        if (tr.style.display !== 'none') codigos.push(tr.id)
    }

    for (const codigo of codigos) {
        campos[codigo].margem = margemNum
    }

    const resposta = await enviarMargens({ codigos, margem: margemNum })

    if (resposta.mensagem) return popup(resposta.mensagem, 'Alerta', true)

    removerPopup()
    await inserirDados(campos, 'campos')
    await telaPrecos()

}

function marcarTodosMargem(inputTH) {

    const inputs = document.querySelectorAll('[name="margem"]')
    for (const input of inputs) {
        const tr = input.closest('tr')
        if (tr.style.display !== 'none') input.checked = inputTH.checked
    }

}

async function atualizarCampos() {

    await sincronizarDados('campos')
    await telaPrecos()

}

function criarLinhasCampos(idCampo, dados) {

    const total = dados.margem ? (1 + (dados.margem / 100)) * dados.totalComposicao : dados?.totalComposicao || 0

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
        <td style="white-space: nowrap;">${dinheiro(dados?.totalComposicao || 0)}</td>
        <td>
            <div style="${horizontal}; gap: 0.5rem;">
                <img data-controle="editar" src="imagens/lapis.png" style="width: 1.5rem;" onclick="painelMargem('${idCampo}')">
                <span>${dados?.margem || '0'} %</span>
                <input data-controle="editar" type="checkbox" name="margem">
            </div>
        </td>
        <td style="white-space: nowrap;">${dinheiro(total)}</td>
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

    const form = new formulario({ linhas, botoes, titulo })
    form.abrirFormulario()
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

async function painelMargem(id) {

    margem = 0

    idCampo = id

    let campo = await recuperarDado('campos', idCampo)

    const acumulado = `
        <div style="${vertical}; background-color: #d2d2d2; padding: 1rem; width: max-content;">
            <span>Defina uma margem (%):</span>
            <input oninput="calcularValorFinal('${campo.totalComposicao ? dinheiro(campo.totalComposicao) : ''}', this)" type="number" placeholder="0">
            <hr style="width: 100%;">

            <span>Sub total do Item: <b>${campo.totalComposicao ? dinheiro(campo.totalComposicao) : '--'}</b></span>
            <span>Preço Final será: <b><span id="novoTotal"></span></b></span>

            <hr style="width: 100%;">
            <button onclick="salvarMargem()">Salvar</button>
        </div>
    `
    popup(acumulado, 'Incluir margem', true)
}

function calcularValorFinal(subtotal, input) {

    subtotal = conversor(subtotal)

    const novoTotal = document.getElementById('novoTotal')
    margem = Number(input.value)
    const calculo = Number((subtotal * (1 + (margem / 100))).toFixed(2))
    novoTotal.textContent = dinheiro(calculo)

}

async function salvarMargem() {

    overlayAguarde()

    let campo = await recuperarDado('campos', idCampo)
    campo.margem = margem

    enviar(`campos/${idCampo}/margem`, margem)

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
                    <span class="total-composicao" id="total_${tipoTabela}"></span>
                </div>
                <div class="recorteTabela">
                    <table class="tabela">
                        <thead>${ths}</thead>
                        <tbody id="body_${tipoTabela}"></tbody>
                    </table>
                </div>
                <div class="rodapeTabela">
                    <button onclick="adicionarLinhaComposicoes({tabela: '${tipoTabela}', baseRef: ${tipoTabela}, idCampo: '${idCampo}'})">Adicionar Linha</button>
                    <button onclick="salvarComposicao('${tipoTabela}')">Salvar</button>
                </div>
            </div>`
    }

    const acumulado = `
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

    popup(acumulado, 'Configuração da Tarefa', true)

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

    await calcularTotal(campo?.totalComposicao)
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
            <span ${id ? `id="${id}"` : ''} class="opcoes" name="${codSpan}" onclick="cxOpcoes('${codSpan}', '${tabela}', ['nome', 'preco[dinheiro]', 'preencherItem()'])">${itemRef.nome || 'Selecionar'}</span>
        </td>
        <td><input oninput="preencherItem()" type="number" style="width: 5rem;" value="${dados?.qtde || ''}"></td>
        <td>${dinheiro(itemRef?.preco)}</td>
        <td>
            ${dinheiro(itemRef?.preco * dados?.qtde || 0)}
        </td>
        <td>
            <a href="${itemRef?.link}">${itemRef?.link || ''}</a>
        </td>
        <td>
            <img style="width: 2rem;" src="imagens/cancel.png" onclick="removerItem(this, '${id}', '${idCampo}', '${tabela}')">
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

async function removerItem(img, idMaterial, idCampo, tabela) {

    const tr = img.closest('tr')

    const campo = campos[idCampo]
    delete campo[tabela][idMaterial]

    deletar(`campos/${idCampo}/${tabela}/${idMaterial}`)

    await inserirDados({ [idCampo]: campo }, 'campos')
    await calcularTotal()
    tr.remove()

}

async function salvarComposicao(tabela) {

    overlayAguarde()

    const trs = document.querySelectorAll(`#body_${tabela} tr`)

    const dados = {}

    for (const tr of trs) {

        const tds = tr.querySelectorAll('td')
        const item = tr.querySelector('.opcoes')
        if (!item.id) continue

        const qtde = Number(tds[1]?.querySelector('input')?.value || 0)
        const descricao = item.textContent
        const preco = conversor(tds[2].textContent)

        if (!dados[item.id]) {
            dados[item.id] = { descricao, preco, qtde }
        } else {
            dados[item.id].qtde += qtde
        }

    }

    campos[idCampo][tabela] = dados
    enviar(`campos/${idCampo}/${tabela}`, dados)

    await calcularTotal()
    await inserirDados({ [idCampo]: campos[idCampo] }, 'campos')
    await telaPrecos()

    removerOverlay()
}


async function calcularTotal() {
    const tabelas = ['materiais', 'ferramentas', 'mao_obra']

    const totais = {
        geral: 0
    }

    for (const tabela of tabelas) {
        const body = document.getElementById(`body_${tabela}`)
        if (!body) continue

        if (!totais[tabela]) totais[tabela] = 0

        const trs = body.querySelectorAll('tr')
        for (const tr of trs) {
            const tds = tr.querySelectorAll('td')

            const qtde = Number(tds[1].querySelector('input').value)
            const preco = conversor(tds[2].textContent)
            const totalLinha = (qtde * preco)

            totais.geral += totalLinha
            totais[tabela] += totalLinha

        }

        document.getElementById(`total_${tabela}`).textContent = dinheiro(totais[tabela])
    }

    const campo = campos[idCampo]
    // Só atualiza se for diferente;
    if (campo.totalComposicao == totais.geral) return
    
    campo.totalComposicao = totais.geral

    document.querySelector('[name="totalComposicao"]').textContent = dinheiro(totais.geral)

    enviar(`campos/${idCampo}/totalComposicao`, totais.geral)

    await inserirDados({ [idCampo]: campo }, 'campos')
}