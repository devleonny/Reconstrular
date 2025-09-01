const voltar = `<button style="background-color: #3131ab;" onclick="telaDespesas()">Voltar</button>`

function telaDespesas() {

    esconderMenus()

    const acumulado = `
        <div class="painel-despesas">
            <br>
            ${btn('contas', 'Inserir Despesas', 'formularioDespesa()')}
            ${btn('todos', 'Verificar Despesas', 'verificarDespesas()')}
            ${btn('fornecedor', 'Fornecedores', 'telaFornecedores()')}
            ${btn('caixa', 'Materiais', 'telaMateriais()')}
            ${btn('ferramentas', 'Ferramentas', 'telaFerramentas()')}
        </div>
    `
    telaInterna.innerHTML = acumulado

}

async function verificarDespesas() {

    const colunas = ['Fornecedor', 'Número do Contribuinte', 'Valor', 'IVA', 'Data', 'Imagem da Fatura', 'Upload Fatura', 'Tipo de Material', 'Obra']
    let cabecalhos = {
        ths: '',
        pesq: ''
    }

    for (const coluna of colunas) {
        cabecalhos.ths += `<th>${coluna}</th>`
        cabecalhos.pesq += `<th style="background-color: white; text-align: left;" contentEditable="true"></th>`
    }

    const acumulado = `
        <div class="blocoTabela">
            <div class="painelBotoes">
                <div class="botoes">
                    <div class="pesquisa">
                        <input oninput="pesquisar(this, 'body')" placeholder="Pesquisar" style="width: 100%;">
                        <img src="imagens/pesquisar2.png">
                    </div>
                    ${voltar}
                </div>
                <img class="atualizar" src="imagens/atualizar.png" onclick="">
            </div>
            <div class="recorteTabela">
                <table class="tabela">
                    <thead>
                        <tr>${cabecalhos.ths}</tr>
                        <tr>${cabecalhos.pesq}</tr>
                    </thead>
                    <tbody id="body"></tbody>
                </table>
            </div>
            <div class="rodapeTabela"></div>
        </div>
    `

    telaInterna.innerHTML = acumulado

}

async function formularioDespesa(idDespesa) {

    esconderMenus()

    const despesa = await recuperarDado('despesas', idDespesa)
    const fornecedores = await recuperarDados('fornecedores')
    const dados_obras = await recuperarDados('dados_obras')
    const clientes = await recuperarDados('dados_clientes')

    const opcoesFornecedores = Object.entries(fornecedores)
        .map(([idFornecedor, fornecedor]) => `<option id="${idFornecedor}">${fornecedor.nome}</option>`)
        .join('')

    let opcoesObras = ''
    const obras = { '': { cliente: 'Sem Obra', cidade: '--', distrito: '--' }, ...dados_obras }
    for (const [idObra, obra] of Object.entries(obras)) {
        const distrito = dados_distritos?.[obra.distrito] || {}
        const cidade = distrito?.cidades?.[obra.cidade] || {}
        const cliente = clientes?.[obra?.cliente] || {}
        opcoesObras += `<option value="${idObra}">${cliente?.nome || '--'} / ${distrito.nome || '--'} / ${cidade.nome || '--'}</option>`
    }

    titulo.textContent = 'Inserir Despesa'
    const funcao = idDespesa ? `salvarCliente('${idDespesa}')` : 'salvarCliente()'
    const acumulado = `
    <div class="cabecalho-clientes">
        <button onclick="telaDespesas()" style="background-color: #3131ab;">Voltar</button>
        <button onclick="${funcao}">Salvar</button>
    </div>
    <div class="painel-clientes">
        ${modeloLivre('Fornecedor', `<select onchange="buscarLocalidadeFornecedor(this)">${opcoesFornecedores}</select>`)}
        ${modeloLivre('Distrito', `<input name="distrito" readOnly>`)}
        ${modeloLivre('Cidade', `<input name="cidade" readOnly>`)}
        ${modeloLivre('Número do Contribuinte', `<input name="numeroContribuinte" readOnly>`)}

        ${modelo('Valor', despesa?.valor || '')}
        ${modelo('IVA', despesa?.iva || '')}
        ${modelo('Data', despesa?.data || '')}
        ${modeloLivre('Obra', `<select>${opcoesObras}</select>`)}
    </div>
    `

    telaInterna.innerHTML = acumulado
}

async function buscarLocalidadeFornecedor(select) {

    const idFornecedor = select.selectedOptions[0].id
    const fornecedor = await recuperarDado('fornecedores', idFornecedor)

    const distrito = dados_distritos?.[fornecedor?.distrito] || '--'
    const cidade = distrito?.cidades?.[fornecedor?.cidade] || '--'
    
    document.querySelector('[name="numeroContribuinte"]').value = fornecedor?.numeroContribuinte || '--'
    document.querySelector('[name="cidade"]').value = cidade.nome
    document.querySelector('[name="distrito"]').value = distrito.nome

}

async function telaFornecedores() {

    const nomeBase = 'fornecedores'
    const acumulado = `
        ${btnRodape('Adicionar', 'adicionarFornecedor()')}
        ${modeloTabela(['Nome', 'Número do Contribuinte', 'Distrito', 'Cidade', ''], nomeBase, voltar)}
    `
    telaInterna.innerHTML = acumulado

    const dados = await recuperarDados(nomeBase)
    for (const [id, dado] of Object.entries(dados)) {
        criarLinha(dado, id, nomeBase)
    }
}

async function adicionarFornecedor(idFornecedor) {

    const fornecedor = await recuperarDado('fornecedores', idFornecedor)
    const acumulado = `
    <div class="painel-cadastro">
        ${modelo('Nome', fornecedor?.nome || '', 'nome')}
        ${modelo('Número do Contribuinte', fornecedor?.numeroContribuinte || '', 'numeroContribuinte')}
        ${modeloLivre('Distrito', `<select name="distrito" onchange="carregarSelects({select: this})"></select>`)}
        ${modeloLivre('Cidade', `<select name="cidade"></select>`)}
    </div>
    <div class="rodape-formulario">
        <button onclick="salvarFornecedor(${idFornecedor ? `'${idFornecedor}'` : ''})">Salvar</button>
    </div>
    `
    popup(acumulado, 'Cadastro de Fornecedor', true)

    carregarSelects({ ...fornecedor })
}

async function salvarFornecedor(idFornecedor) {

    overlayAguarde()
    idFornecedor = idFornecedor || ID5digitos()

    const fornecedor = {
        nome: obVal('nome'),
        numeroContribuinte: obVal('numeroContribuinte'),
        distrito: obVal('distrito'),
        cidade: obVal('cidade')
    }

    await enviar(`fornecedores/${idFornecedor}`, fornecedor)
    await inserirDados({ [idFornecedor]: fornecedor }, 'fornecedores')
    await telaFornecedores()

    removerPopup()
}

async function telaMateriais() {

    const nomeBase = 'materiais'
    const acumulado = `
        ${btnRodape('Adicionar', 'adicionarMateriais()')}
        ${modeloTabela(['Nome do Material', ''], nomeBase, voltar)}
    `
    telaInterna.innerHTML = acumulado

    const dados = await recuperarDados(nomeBase)
    for (const [id, dado] of Object.entries(dados)) {
        criarLinha(dado, id, nomeBase)
    }
}

async function adicionarMateriais(idMaterial) {

    const material = await recuperarDado('materiais', idMaterial)
    const acumulado = `
    <div class="painel-cadastro">
        ${modelo('Nome do Material', material?.nome || '', 'nome')}
    </div>
    <div class="rodape-formulario">
        <button onclick="salvarMaterial(${idMaterial ? `'${idMaterial}'` : ''})">Salvar</button>
    </div>
    `
    popup(acumulado, 'Cadastro de Material', true)

}

async function salvarMaterial(idMaterial) {

    overlayAguarde()
    idMaterial = idMaterial || ID5digitos()

    const material = {
        nome: obVal('nome'),
    }

    await enviar(`materiais/${idMaterial}`, material)
    await inserirDados({ [idMaterial]: material }, 'materiais')
    await telaMateriais()

    removerPopup()
}

async function telaFerramentas() {

    const nomeBase = 'ferramentas'
    const acumulado = `
        ${btnRodape('Adicionar', 'adicionarFerramentas()')}
        ${modeloTabela(['Nome da Ferramenta', ''], nomeBase, voltar)}
    `
    telaInterna.innerHTML = acumulado

    const dados = await recuperarDados(nomeBase)
    for (const [id, dado] of Object.entries(dados)) {
        criarLinha(dado, id, nomeBase)
    }
}

async function adicionarFerramentas(idFerramenta) {

    const ferramenta = await recuperarDado('materiais', idFerramenta)
    const acumulado = `
    <div class="painel-cadastro">
        ${modelo('Nome da Ferramenta', ferramenta?.nome || '', 'nome')}
    </div>
    <div class="rodape-formulario">
        <button onclick="salvarFerramenta(${idFerramenta ? `'${idFerramenta}'` : ''})">Salvar</button>
    </div>
    `
    popup(acumulado, 'Cadastro de Ferramenta', true)

}

async function salvarFerramenta(idFerramenta) {

    overlayAguarde()
    idFerramenta = idFerramenta || ID5digitos()

    const ferramenta = {
        nome: obVal('nome'),
    }

    await enviar(`ferramentas/${idFerramenta}`, ferramenta)
    await inserirDados({ [idFerramenta]: ferramenta }, 'ferramentas')
    await telaFerramentas()

    removerPopup()
}