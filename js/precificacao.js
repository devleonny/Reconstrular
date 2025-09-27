let idCampo = null
let margem = 0
let precoFinal = 0

async function telaPrecos() {

    campos = await recuperarDados('campos')

    const ths = ['Especialidade', 'Descrição', 'Unidade de Medida', 'Composição', 'Sub-Total', 'Margem', 'Total']
        .map(col => `<th>${col}</th>`)
        .join('')

    const acumulado = `
        <div class="blocoTabela">
            <div class="painelBotoes">
                <div class="botoes">
                    <div class="pesquisa">
                        <input oninput="pesquisar(this, 'body')" placeholder="Pesquisar" style="width: 100%;">
                        <img src="imagens/pesquisar2.png">
                    </div>
                    <button onclick="edicaoItem()">Criar Item</button>
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
    if(!blocoTabela) telaInterna.innerHTML = acumulado

    for (const [idCampo, dados] of Object.entries(campos)) {
        criarLinhasCampos(idCampo, dados)
    }

}

async function atualizarCampos() {

    await sincronizarDados('campos')
    await telaPrecos()

}

function criarLinhasCampos(idCampo, dados) {

    const tds = `
        <td>${dados.especialidade}</td>
        <td>
            <div style="${horizontal}; gap: 5px;">
                <img onclick="edicaoItem('${idCampo}')" src="imagens/lapis.png" style="width: 1.5rem;">
                <span style="width: 200px; text-align: left;">${dados.descricao}</span>
            </div>
        </td>
        <td>${dados.medida}</td>
        <td>
            <div style="${horizontal};">
                <img src="imagens/caixa.png" style="width: 1.5rem;" onclick="composicoes('${idCampo}')">
            </div>
        </td>
        <td>${dados?.totalComposicao || '0'} €</td>
        <td>
            <div style="${horizontal}; gap: 0.5rem;">
                <img src="imagens/lapis.png" style="width: 1.5rem;" onclick="painelMargem('${idCampo}')">
                <span>${dados?.margem || '0'} %</span>
            </div>
        </td>
        <td>${dados.precoFinal ? dinheiro(dados.precoFinal) : ''}</td>
    `

    const trExistente = document.getElementById(idCampo)
    if (trExistente) return trExistente.innerHTML = tds

    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${idCampo}">${tds}</tr>`)
}

async function edicaoItem(idCampo) {

    idCampo = idCampo || ID5digitos()

    const campo = await recuperarDado('campos', idCampo)

    const opcoesMedidas = ['', 'und', 'ml', 'm2', 'm3']
        .map(op => `<option ${op == campo?.medida ? 'selected' : ''}>${op}</option>`)
        .join('')

    const modelo = (texto, elemento) => `
        <div style="${vertical}">
            <span>${texto}</span>
            <div>${elemento}</div>
        </div>
    `
    let especialidades = []
    for (const [idCampo, campo] of Object.entries(campos)) {
        if (!especialidades.includes(campo.especialidade)) especialidades.push(campo.especialidade)
    }

    const opcoesEspecialidade = especialidades
        .map(op => `<option>${op}</option>`)
        .join('')

    const acumulado = `
        <div style="${vertical}; background-color: #d2d2d2; padding: 0.5rem; gap: 0.5rem;">
            ${modelo('Descrição', `<textarea name="descricao">${campo?.descricao || ''}</textarea>`)}
            ${modelo('Medida', `<select name="medida">${opcoesMedidas}</select>`)}
            ${modelo('Especialidade', `
                <input name="especialidade" list="especialidade" value="${campo?.especialidade || ''}">
                <datalist id="especialidade">${opcoesEspecialidade}</datalist>`)}
            <hr style="width: 100%;">
            <button onclick="salvarCampo('${idCampo}')">Salvar</button>
        </div>
    `

    popup(acumulado, 'Edição de Campo', true)
}

async function salvarCampo(idCampo) {

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
    precoFinal = 0

    idCampo = id

    let campo = await recuperarDado('campos', idCampo)

    const acumulado = `
        <div style="${vertical}; background-color: #d2d2d2; padding: 1rem; width: max-content;">
            <span>Defina uma margem (%):</span>
            <input oninput="calcularValorFinal('${campo.totalComposicao ? dinheiro(campo.totalComposicao) : ''}', this)" type="number" placeholder="0">
            <hr style="width: 100%;">

            <span>Sub total do Item: <b>${campo.totalComposicao ? dinheiro(campo.totalComposicao) : '--'}</b></span>
            <span>Preço Final será: <b><span id="novoTotal">${campo.precoFinal ? dinheiro(campo.precoFinal) : '--'}</span></b></span>

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
    precoFinal = calculo
    novoTotal.textContent = dinheiro(calculo)

}

async function salvarMargem() {

    overlayAguarde()

    let campo = await recuperarDado('campos', idCampo)
    precoFinal = margem == 0 ? campo.totalComposicao : precoFinal
    campo.margem = margem
    campo.precoFinal = precoFinal

    enviar(`campos/${idCampo}/margem`, margem)
    enviar(`campos/${idCampo}/precoFinal`, precoFinal)

    await inserirDados({ [idCampo]: campo }, 'campos')

    await telaPrecos()

    removerPopup()
}

async function composicoes(id) {

    idCampo = id

    const modeloTabela = (tipoTabela) => {

        const ths = ['Artigo', 'Qtde', 'Preço', '']
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
                    <button onclick="adicionarLinhaComposicoes({tabela: '${tipoTabela}', idCampo: '${idCampo}'})">Adicionar Linha</button>
                </div>
            </div>`
    }

    const acumulado = `
        <div style="${vertical}; padding: 1rem; background-color: #d2d2d2; overflow: auto;">

            <div class="toolbar-precos">
                <span id="toolbar_materiais" onclick="toogleTabela('materiais')">Materiais</span>
                <span id="toolbar_ferramentas" onclick="toogleTabela('ferramentas')">Ferramentas</span>
                <span id="toolbar_maoObra" onclick="toogleTabela('maoObra')">Mão de Obra</span>
            </div>

            ${modeloTabela('materiais')}
            ${modeloTabela('ferramentas')}
            ${modeloTabela('maoObra')}

        </div>
    `

    popup(acumulado, 'Composição de Preço', true)

    toogleTabela('materiais')

    const campo = await recuperarDado('campos', idCampo)
    const tabelas = ['materiais', 'ferramentas', 'maoObra']

    for (const tabela of tabelas) {

        for (const [idMaterial, dados] of Object.entries(campo?.[tabela] || {})) {
            await adicionarLinhaComposicoes({ tabela, dados, idMaterial })
        }

    }

    calcularTotal()

}

function toogleTabela(idAtual) {

    const tabelas = ['materiais', 'ferramentas', 'maoObra']

    for (const tabela of tabelas) {
        const tabHtml = document.getElementById(tabela)
        const toolbar = document.getElementById(`toolbar_${tabela}`)
        tabHtml.style.display = 'none'
        toolbar.style.opacity = 0.5
    }

    document.getElementById(idAtual).style.display = 'flex'
    document.getElementById(`toolbar_${idAtual}`).style.opacity = 1

}

async function adicionarLinhaComposicoes({ tabela, dados, idMaterial }) {

    const baseRef = await recuperarDados(tabela) || {}

    new Promise((resolve, reject) => {
        const tbody = document.getElementById(`body_${tabela}`)
        if (!tbody) return

        let opcoes = `<option></option>`
        opcoes += Object.entries(baseRef)
            .map(([id, objeto]) => `<option value="${id}" ${idMaterial == id ? 'selected' : ''}>${objeto.nome}</option>`)
            .join('')

        const fnc = `salvarComposicao({ elemento: this, tabela: '${tabela}', idCampo: '${idCampo}' })`
        const tds = `
        <td>
            <select onchange="${fnc}">${opcoes}</select>
        </td>
        <td><input type="number" style="width: 100%;" value="${dados?.qtde || ''}" oninput="${fnc}"></td>
        <td><input type="number" style="width: 100%;" value="${dados?.preco || ''}" oninput="${fnc}"></td>
        <td><img style="width: 2rem;" src="imagens/cancel.png" onclick="removerItem(this, '${idCampo}', '${tabela}')"></td>`

        // procura a <tr> pelo idMaterial
        const trExistente = tbody.querySelector(`tr[id="${idMaterial}"]`)

        if (trExistente) {
            trExistente.innerHTML = tds
        } else {
            tbody.insertAdjacentHTML('beforeend', `<tr id="${idMaterial || ''}">${tds}</tr>`)
        }

        resolve()

    })
}

async function removerItem(img, tabela) {

    const tr = img.closest('tr')
    const idMaterial = tr.id
    let campo = await recuperarDado('campos', idCampo)

    delete campo[tabela][idMaterial]

    deletar(`campos/${idCampo}/${tabela}/${idMaterial}`)

    await inserirDados({ [idCampo]: campo }, 'campos')

    tr.remove()

}

async function salvarComposicao({ elemento, tabela }) {
    const tr = elemento.closest('tr')
    const tds = tr.querySelectorAll('td')
    const select = tr.querySelector('select')
    const codigo = select.value

    // se já existe outra <tr> com mesmo id, remove a atual
    const existente = tr.parentElement.querySelector(`tr[id="${codigo}"]`)
    if (existente && existente !== tr) {
        tr.remove()
        return popup(mensagem('Este item já existe nesta tabela'), 'Alerta', true)
    }

    tr.id = codigo

    let campo = await recuperarDado('campos', idCampo)
    if (!campo[tabela]) campo[tabela] = {}
    let categoriaCusto = campo[tabela]
    const qtde = Number(tds[1].querySelector('input').value)
    const preco = Number(tds[2].querySelector('input').value)

    categoriaCusto[codigo] = { qtde, preco }

    enviar(`campos/${idCampo}/${tabela}/${codigo}`, { qtde, preco })

    await calcularTotal()
    await inserirDados({ [idCampo]: campo }, 'campos')
}

async function calcularTotal() {
    const tabelas = ['materiais', 'ferramentas', 'maoObra']

    let totais = {
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
            const preco = Number(tds[2].querySelector('input').value)
            const totalLinha = (qtde * preco)

            totais.geral += totalLinha
            totais[tabela] += totalLinha

        }

        document.getElementById(`total_${tabela}`).textContent = `${totais[tabela]} €`
    }

    let campo = await recuperarDado('campos', idCampo)
    campo.totalComposicao = totais.geral
    precoFinal = campo.margem ? Number((totais.geral * (1 + (campo.margem / 100))).toFixed(2)) : totais.geral
    campo.precoFinal = precoFinal

    enviar(`campos/${idCampo}/totalComposicao`, totais.geral)
    enviar(`campos/${idCampo}/precoFinal`, precoFinal)

    await inserirDados({ [idCampo]: campo }, 'campos')
    await telaPrecos()
}