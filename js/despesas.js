const voltar = `<button style="background-color: #3131ab;" onclick="telaDespesas()">Voltar</button>`
let filtros = {}

function telaDespesas() {

    mostrarMenus()

    const acumulado = `
        <div class="painel-despesas">
            <br>
            ${btn('contas', 'Inserir Despesas', 'formularioDespesa()')}
            ${btn('todos', 'Verificar Despesas', 'verificarDespesas()')}
            ${btn('fornecedor', 'Fornecedores', 'telaFornecedores()')}
            ${btn('caixa', 'Materiais', 'telaMateriais()')}
            ${btn('ferramentas', 'Ferramentas', 'telaFerramentas()')}
            ${btn('colaborador', 'Mão de Obra', 'telaMaoObra()')}
        </div>
    `
    telaInterna.innerHTML = acumulado

}

async function atualizarDespesas() {
    await sincronizarDados('dados_despesas')
    await verificarDespesas()
}

async function verificarDespesas() {

    const colunas = ['Fornecedor', 'Número do Contribuinte', 'Valor', 'IVA', 'Ano', 'Mês', 'Data', 'Imagem da Fatura', 'Upload Fatura', 'Tipo de Material', 'Obra', '']
    let cabecalhos = {
        ths: '',
        pesq: ''
    }

    const clientes = await recuperarDados('dados_clientes')
    const materiais = await recuperarDados('materiais')
    const fornecedores = await recuperarDados('fornecedores')
    const dados_obras = await recuperarDados('dados_obras')
    const opcoesFornecedores = Object.entries({ '': { nome: '' }, ...fornecedores })
        .map(([idFornecedor, fornecedor]) => `<option id="${idFornecedor}">${fornecedor.nome}</option>`)
        .join('')
    const opcoesMateriais = Object.entries({ '': { nome: '' }, ...materiais })
        .map(([idMaterial, material]) => `<option id="${idMaterial}">${material.nome}</option>`)
        .join('')
    const opcoesMeses = Object.entries({ '': '', ...meses }).sort()
        .map(([numero, mes]) => `<option id="${numero}">${mes}</option>`)
        .join('')
    const opcoesAnos = Object.entries({ '': '', ...anos }).sort()
        .map(([anoSt, anoNum]) => `<option id="${anoNum}">${anoNum}</option>`)
        .join('')

    let opcoesObras = ''
    const obras = { '': '', ...dados_obras }
    for (const [idObra, obra] of Object.entries(obras)) {
        const distrito = dados_distritos?.[obra.distrito] || {}
        const cidade = distrito?.cidades?.[obra.cidade] || {}
        const cliente = clientes?.[obra?.cliente] || {}
        opcoesObras += cliente.nome 
        ? `<option>${cliente?.nome || '--'} / ${distrito.nome || '--'} / ${cidade.nome || '--'}</option>`
        : `<option></option>`
    }

    const funcPesq = (col) => `
        oninput="pesquisarGenerico('${col}', this.value, filtros, 'body')"
    `
    let i = 0
    for (const coluna of colunas) {
        cabecalhos.ths += `<th>${coluna}</th>`
        if (coluna == 'Tipo de Material') {
            cabecalhos.pesq += `<th><select ${funcPesq(i)}>${opcoesMateriais}</select></th>`
        } else if (coluna == 'Ano') {
            cabecalhos.pesq += `<th><select ${funcPesq(i)}>${opcoesAnos}</select></th>`
        } else if (coluna == 'Mês') {
            cabecalhos.pesq += `<th><select ${funcPesq(i)}>${opcoesMeses}</select></th>`
        } else if (coluna == 'Data') {
            cabecalhos.pesq += `<th><input type="date" ${funcPesq(i)}></th>`
        } else if (coluna == 'Fornecedor') {
            cabecalhos.pesq += `<th><select ${funcPesq(i)}>${opcoesFornecedores}</select></th>`
        } else if (coluna == 'Obra') {
            cabecalhos.pesq += `<th><select ${funcPesq(i)}>${opcoesObras}</select></th>`
        } else {
            cabecalhos.pesq += `<th><input ${funcPesq(i)}></th>`
        }
        i++
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
                <img class="atualizar" src="imagens/atualizar.png" onclick="atualizarDespesas()">
            </div>
            <div class="recorteTabela">
                <table class="tabela">
                    <thead class="cabecalho-despesas">
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

    const dados = await recuperarDados('dados_despesas')
    for (const [id, dado] of Object.entries(dados)) {
        criarLinha(dado, id, 'dados_despesas')
    }

}

async function formularioDespesa(idDespesa) {

    mostrarMenus()

    const despesa = await recuperarDado('dados_despesas', idDespesa)
    const fornecedores = await recuperarDados('fornecedores')
    const materiais = await recuperarDados('materiais')
    const dados_obras = await recuperarDados('dados_obras')
    const clientes = await recuperarDados('dados_clientes')

    const opcoesFornecedores = Object.entries({ '': { nome: '' }, ...fornecedores })
        .map(([idFornecedor, fornecedor]) => `<option id="${idFornecedor}" ${despesa?.fornecedor == idFornecedor ? 'selected' : ''}>${fornecedor.nome}</option>`)
        .join('')

    const opcoesMateriais = Object.entries({ '': { nome: '' }, ...materiais })
        .map(([idMaterial, material]) => `<option id="${idMaterial}" ${despesa?.material == idMaterial ? 'selected' : ''}>${material.nome}</option>`)
        .join('')

    let opcoesObras = ''
    const obras = { '': { cliente: 'Sem Obra', cidade: '--', distrito: '--' }, ...dados_obras }
    for (const [idObra, obra] of Object.entries(obras)) {
        const distrito = dados_distritos?.[obra.distrito] || {}
        const cidade = distrito?.cidades?.[obra.cidade] || {}
        const cliente = clientes?.[obra?.cliente] || {}
        opcoesObras += `<option id="${idObra}" value="${idObra}" ${despesa?.obra == idObra ? 'selected' : ''}>${cliente?.nome || '--'} / ${distrito.nome || '--'} / ${cidade.nome || '--'}</option>`
    }

    titulo.textContent = 'Inserir Despesa'
    const funcao = idDespesa ? `salvarDespesa('${idDespesa}')` : 'salvarDespesa()'
    const placeholder = `placeholder="Escolha o fornecedor"`
    const acumulado = `
    <div class="cabecalho-clientes">
        <button onclick="telaDespesas()" style="background-color: #3131ab;">Voltar</button>
        <button onclick="${funcao}">Salvar</button>
    </div>
    <div class="painel-clientes">
        ${modeloLivre('Fornecedor', `<select name="fornecedor" onchange="buscarLocalidadeFornecedor()">${opcoesFornecedores}</select>`)}
        ${modeloLivre('Distrito', `<input ${placeholder} name="distrito" readOnly>`)}
        ${modeloLivre('Cidade', `<input ${placeholder} name="cidade" readOnly>`)}
        ${modeloLivre('Número do Contribuinte', `<input ${placeholder} name="numeroContribuinte" readOnly>`)}
        ${modeloLivre('Valor', `<input name="valor" placeholder="Valor" type="number" value="${despesa?.valor || ''}">`)}
        ${modeloLivre('IVA', `<input name="iva" placeholder="IVA" type="number" value="${despesa?.iva || ''}">`)}
        ${modeloLivre('Data', `<input name="data" type="date" value="${despesa?.data || ''}">`)}
        ${modeloLivre('Tipo de Material', `<select name="material">${opcoesMateriais}</select>`)}
        ${modeloLivre('Obra', `<select name="obra">${opcoesObras}</select>`)}
        ${modeloLivre('Upload Fatura', '<input name="fatura" type="file">')}
        ${modeloLivre('Imagem da Fatura', `
        <div style="${vertical}; gap: 5px;">
            <img src="imagens/camera.png" class="cam" onclick="abrirCamera()">
            <div class="cameraDiv">
                <button onclick="tirarFoto()">Tirar Foto</button>
                <video autoplay playsinline></video>
                <canvas style="display: none;"></canvas>
            </div>
            <img name="foto" ${despesa?.foto ? `src="${api}/uploads/RECONST/${despesa.foto}"` : ''} class="foto">
        </div>`)}
    </div>
    `

    telaInterna.innerHTML = acumulado
    buscarLocalidadeFornecedor()
}

async function salvarDespesa(idDespesa) {
    overlayAguarde();

    idDespesa = idDespesa || ID5digitos();
    let despesaAtual = await recuperarDado('dados_despesas', idDespesa);

    const fornecedor = document.querySelector('[name="fornecedor"]');
    const obra = document.querySelector('[name="obra"]');
    const material = document.querySelector('[name="material"]');

    let despesa = {
        fornecedor: fornecedor.selectedOptions[0].id,
        obra: obra.selectedOptions[0].id,
        material: material.selectedOptions[0].id,
        iva: Number(obVal('iva')),
        valor: Number(obVal('valor')),
        data: obVal('data')
    };

    // Foto da Fatura
    const foto = document.querySelector('[name="foto"]');
    if (foto.src && !foto.src.includes(api)) {
        const resposta = await importarAnexos({ foto: foto.src });

        if (resposta[0].link) {
            despesa.foto = resposta[0].link;
        } else {
            removerOverlay();
            return popup(mensagem('Falha no envio da Foto: tente novamente.'), 'Alerta', true);
        }
    }

    // Arquivo da fatura (ex: pdf)
    const input = document.querySelector('[name="fatura"]');
    if (input?.files?.length === 1) {
        const anexos = await importarAnexos({ input });
        despesa.fatura = anexos[0].link;
    }

    despesa = {
        ...despesaAtual,
        ...despesa
    };

    await enviar(`dados_despesas/${idDespesa}`, despesa);
    await inserirDados({ [idDespesa]: despesa }, 'dados_despesas');
    await verificarDespesas();
    removerOverlay();
}


async function buscarLocalidadeFornecedor() {

    const select = document.querySelector('[name="fornecedor"]')
    const idFornecedor = select.selectedOptions[0].id
    const fornecedor = await recuperarDado('fornecedores', idFornecedor)

    const distrito = dados_distritos?.[fornecedor?.distrito] || '--'
    const cidade = distrito?.cidades?.[fornecedor?.cidade] || '--'

    document.querySelector('[name="numeroContribuinte"]').value = fornecedor?.numeroContribuinte || '--'
    document.querySelector('[name="cidade"]').value = cidade?.nome || '--'
    document.querySelector('[name="distrito"]').value = distrito?.nome || '--'

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
    const btnExtras = `<button onclick="adicionarMateriais()">Adicionar</button>${voltar}`
    telaInterna.innerHTML = modeloTabela(['Nome do Material', ''], nomeBase, btnExtras)

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

    enviar(`materiais/${idMaterial}`, material)
    await inserirDados({ [idMaterial]: material }, 'materiais')
    await telaMateriais()

    removerPopup()
}

async function telaFerramentas() {

    const nomeBase = 'ferramentas'
    const btnExtras = `<button onclick="adicionarFerramentas()">Adicionar</button>${voltar}`
    telaInterna.innerHTML = modeloTabela(['Nome da Ferramenta', ''], nomeBase, btnExtras)

    const dados = await recuperarDados(nomeBase)
    for (const [id, dado] of Object.entries(dados)) {
        criarLinha(dado, id, nomeBase)
    }
}

async function adicionarFerramentas(idFerramenta) {

    const ferramenta = await recuperarDado('ferramentas', idFerramenta)
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

    enviar(`ferramentas/${idFerramenta}`, ferramenta)
    await inserirDados({ [idFerramenta]: ferramenta }, 'ferramentas')
    await telaFerramentas()

    removerPopup()
}

async function telaMaoObra() {

    const nomeBase = 'maoObra'
    const btnExtras = `<button onclick="adicionarMaoObra()">Adicionar</button>${voltar}`
    telaInterna.innerHTML = modeloTabela(['Categoria da Mão de Obra', ''], nomeBase, btnExtras)

    const dados = await recuperarDados(nomeBase)
    for (const [id, dado] of Object.entries(dados)) {
        criarLinha(dado, id, nomeBase)
    }
}

async function adicionarMaoObra(idMaoObra) {

    const maoObra = await recuperarDado('maoObra', idMaoObra)
    const acumulado = `
    <div class="painel-cadastro">
        ${modelo('Nome da Categoria', maoObra?.nome || '', 'nome')}
    </div>
    <div class="rodape-formulario">
        <button onclick="salvarMaoObra(${idMaoObra ? `'${idMaoObra}'` : ''})">Salvar</button>
    </div>
    `
    popup(acumulado, 'Cadastro de Mão de Obra', true)

}

async function salvarMaoObra(idMaoObra) {

    overlayAguarde()
    idMaoObra = idMaoObra || ID5digitos()

    const maoObra = {
        nome: obVal('nome'),
    }

    enviar(`maoObra/${idMaoObra}`, maoObra)
    await inserirDados({ [idMaoObra]: maoObra }, 'maoObra')
    await telaMaoObra()

    removerPopup()
}