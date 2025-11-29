const voltar = `<button style="background-color: #3131ab;" onclick="telaDespesas()">Voltar</button>`
let filtros = {}

function telaDespesas() {

    const acumulado = `
        <div class="painel-despesas">
            <br>
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

    const colunas = ['Fornecedor', 'Número do Contribuinte', 'Valor', 'IVA', 'Ano', 'Mês', 'Data', 'Fatura', 'Tipo de Material', 'Obra', '']
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
        .map(([, anoNum]) => `<option id="${anoNum}">${anoNum}</option>`)
        .join('')

    let opcoesObras = ''
    const obras = { '': '', ...dados_obras }
    for (const [, obra] of Object.entries(obras)) {
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

    const modelo = (titulo, elemento) => `
        <div style="${vertical}; gap: 2px;">
            <span>${titulo}</span>
            ${elemento}
        </div>
    `

    const acumulado = `
        <div class="blocoTabela">
            <div class="painelBotoes">
                <div class="botoes">
                    <div class="pesquisa">
                        <input oninput="pesquisar(this, 'body')" placeholder="Pesquisar" style="width: 100%;">
                        <img src="imagens/pesquisar2.png">
                    </div>
                    <button onclick="formularioDespesa()">Adicionar</button>
                    <button onclick="telaDespesas()">Votar</button>
                </div>
                <div class="campos" style="flex-direction: row; gap: 5px;">
                    ${modelo('Ano', `<select name="ano"><option></option>${optionsSelect(anos)}</select>`)}
                    ${modelo('Mês', `<select name="mes"><option></option>${optionsSelect(meses)}</select>`)}
                    <img onclick="htmlDespesas()" src="imagens/pdf.png" style="width: 3rem;">
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

    const dados_despesas = await recuperarDados('dados_despesas')

    for (const [idDespesa, dados] of Object.entries(dados_despesas)) {

        const fornecedor = fornecedores?.[dados?.fornecedor] || {}
        const material = materiais?.[dados?.material] || {}

        criarLinhaDespesa(idDespesa, { ...dados, fornecedor, material })
    }

}

function htmlDespesas() {
    const ano = document.querySelector('[name="ano"]').value
    const mes = meses[document.querySelector('[name="mes"]').value]
    const colunas = ['Fornecedor', 'NIF', 'Valor', 'IVA', 'Ano', 'Mês', 'Data', 'Link Fatura', 'Tipo de Material']
    const linhas = document.querySelectorAll('#body tr')

    let linhasFiltradas = ''
    const totais = {
        iva: 0,
        faturado: 0
    }

    for (const linha of linhas) {

        const tds = linha.querySelectorAll('td')
        const linAno = tds[4].textContent
        const linMes = tds[5].textContent

        if (linAno !== ano && linMes !== linMes) continue

        totais.faturado += conversor(tds[2].textContent)
        totais.iva += conversor(tds[3].textContent)

        const link = tds[7].querySelector('[name="link"]')

        linhasFiltradas += `
            <tr>
                <td>${tds[0].textContent}</td>
                <td>${tds[1].textContent}</td>
                <td>${tds[2].textContent}</td>
                <td>${tds[3].textContent}</td>
                <td>${tds[4].textContent}</td>
                <td>${tds[5].textContent}</td>
                <td>${tds[6].querySelectorAll('span')[1].textContent}</td>
                <td>
                ${link ? `<a href="${api}/uploads/RECONST/${link.value}" target="_blank">${link.value}</a>` : ''}
                </td>
                <td>${tds[8].textContent}</td>
            </tr>
        `
    }

    const tabela1 = `
        <table class="tabela-pdf">
            <tbody>
                <tr>
                    <td colspan="2" class="escuro" style="text-align: center; font-size: 1.2rem; font-weight: bold;">Despesas</td>
                    <td class="vermelho">Ano</td>
                    <td class="ver-claro">${ano}</td>
                    <td class="vermelho">Mês</td>
                    <td class="ver-claro">${mes}</td>
                </tr>
                <tr>
                    <td class="escuro">Empresa</td>
                    <td class="claro">Enumeratributo Unipessoal Lda</td>
                    <td class="escuro" rowspan="4">Total <br>Faturado</td>
                    <td rowspan="4">${dinheiro(totais.faturado)}</td>
                    <td class="escuro" rowspan="4">Total IVA</td>
                    <td rowspan="4">${dinheiro(totais.iva)}</td>
                </tr>
                <tr>
                    <td class="escuro">Morada Fiscal</td>
                    <td class="claro">Rua Nuno Tristão 11-A, 2830-095 Barreiro</td>
                </tr>
                <tr>
                    <td class="escuro">Nif</td>
                    <td class="claro">517637480</td>
                </tr>
                <tr>
                    <td class="escuro">E-mail</td>
                    <td class="claro">info@reconstrular.com</td>
                </tr>
            </tbody>

        </table>
    `

    const tabela2 = `
        <table class="tabela-pdf">
            <thead>
                <tr>${colunas.map(col => `<th>${col}</th>`).join('')}</tr>
            </thead>
            <tbody>${linhasFiltradas}</tbody>
        </table>
    `
    const acumulado = `
        <div class="tela-pdf-despesas">
            <img onclick="gerarPdfDespesas()" src="imagens/pdf.png" style="width: 3rem;">
            <div class="pdf-despesas">
                ${tabela1}
                <br>
                ${tabela2}
            </div>
        </div>
    `

    popup(acumulado, 'Listagem de Despesas por Mês/Ano', true)
}

async function gerarPdfDespesas() {

    overlayAguarde()

    const pdfhtml = document.querySelector('.pdf-despesas')
    if (!pdfhtml) return

    const html = `
        <html>
            <head>
                <meta charset="UTF-8">
                <link rel="stylesheet" href="https://devleonny.github.io/Reconstrular/css/despesas.css">
            </head>
            <body>
                ${pdfhtml.outerHTML}
            </body>
        </html>
  `

    await pdf(html)

}

async function criarLinhaDespesa(id, dados) {

    const ax = (link) => {
        if (!link) return ''
        return `
            <img onclick="abrirArquivo('${link}')" src="imagens/contas.png">
            <input name="link" style="display: none;" value="${link}">
            `
    }

    let data = '--'
    let ano, mes, dia
    if (dados.data) {
        [ano, mes, dia] = dados.data.split('-')
        data = `${dia}/${mes}/${ano}`
    }

    tds = `
        <td>${dados.fornecedor?.nome || '--'}</td>
        <td>${dados.fornecedor?.numeroContribuinte || '--'}</td>
        <td>${dinheiro(dados?.valor)}</td>
        <td>${dados?.iva || '--'}</td>
        <td>${ano}</td>
        <td>${meses[mes]}</td>
        <td>
            <span style="display: none;">${dados?.data}</span>
            <span>${data}</span>
        </td>
        <td>${ax(dados?.fatura)}</td>
        <td>${dados.material?.nome || '--'}</td>
        <td>${await infoObra(dados)}</td>
        <td>
            <img src="imagens/pesquisar.png" onclick="formularioDespesa('${id}')">
        </td>
    `

    const trExistente = document.getElementById(id)

    if (trExistente) return trExistente.innerHTML = tds
    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${id}">${tds}</td>`)

}

async function formularioDespesa(idDespesa) {

    const despesa = await recuperarDado('dados_despesas', idDespesa)
    const fornecedores = await recuperarDados('fornecedores')
    const materiais = await recuperarDados('materiais')
    const dados_obras = await recuperarDados('dados_obras')
    const clientes = await recuperarDados('dados_clientes')

    const opcoesFornecedores = Object.entries(fornecedores)
        .map(([idFornecedor, fornecedor]) => `<option id="${idFornecedor}" ${despesa?.fornecedor == idFornecedor ? 'selected' : ''}>${fornecedor.nome}</option>`)
        .join('')

    const opcoesMateriais = Object.entries(materiais)
        .map(([idMaterial, material]) => `<option id="${idMaterial}" ${despesa?.material == idMaterial ? 'selected' : ''}>${material.nome}</option>`)
        .join('')

    const opcoesObras = Object.entries(dados_obras)
        .map(([idObra, obra]) => {
            const distrito = dados_distritos?.[obra.distrito] || {}
            const cidade = distrito?.cidades?.[obra.cidade] || {}
            const cliente = clientes?.[obra?.cliente] || {}
            return `<option value="${idObra}">${cliente?.nome || '--'} / ${distrito.nome || '--'} / ${cidade.nome || '--'}</option>`
        }).join('')

    const placeholder = `placeholder="Escolha o fornecedor"`

    const linhas = [
        { texto: 'Fornecedor', elemento: `<select name="fornecedor" onchange="buscarLocalidadeFornecedor()"><option></option>${opcoesFornecedores}</select>` },
        { texto: 'Distrito', elemento: `<input ${placeholder} name="distrito" readOnly>` },
        { texto: 'Cidade', elemento: `<input ${placeholder} name="cidade" readOnly>` },
        { texto: 'Número do Contribuinte', elemento: `<input ${placeholder} name="numeroContribuinte" readOnly>` },
        { texto: 'Valor', elemento: `<input name="valor" placeholder="Valor" type="number" value="${despesa?.valor || ''}">` },
        { texto: 'IVA', elemento: `<input name="iva" placeholder="IVA" type="number" value="${despesa?.iva || ''}">` },
        { texto: 'Data', elemento: `<input name="data" type="date" value="${despesa?.data || ''}">` },
        { texto: 'Tipo de Material', elemento: `<select name="material"><option></option>${opcoesMateriais}</select>` },
        { texto: 'Obra', elemento: `<select name="obra"><option></option>${opcoesObras}</select>` },
        {
            texto: 'Upload Fatura', elemento: `
            <div style="${horizontal}; gap: 1rem;">
                <select id="modal" onchange="alterarModal()">
                    <option>Upload</option>
                    <option>Foto</option>
                </select>
                <div id="upload"></div>
            </div>
            ` }
    ]

    const botoes = [
        { texto: 'Salvar', funcao: idDespesa ? `salvarDespesa('${idDespesa}')` : 'salvarDespesa()', img: 'concluido' }
    ]

    if (idDespesa) botoes.push({ texto: 'Excluir', img: 'cancel', funcao: `confirmarExclusaoDespesa('${idDespesa}')` })

    const form = new formulario({ linhas, botoes, titulo: 'Gerenciar Despesa' })
    form.abrirFormulario()

    buscarLocalidadeFornecedor()
    alterarModal()
}

function alterarModal() {

    const modal = document.getElementById('modal')
    const upload = `<input name="fatura" type="file">`

    const foto = `
        <div style="${vertical}; gap: 5px;">
            <img src="imagens/camera.png" class="cam" onclick="abrirCamera()">
            <div class="cameraDiv">
                <button onclick="tirarFoto()">Tirar Foto</button>
                <video autoplay playsinline></video>
                <canvas style="display: none;"></canvas>
            </div>
            <img name="foto">
        </div>
    `
    document.getElementById('upload').innerHTML = modal.value == 'Foto' ? foto : upload

}

function confirmarExclusaoDespesa(idDespesa) {
    const acumulado = `
        <div style="${horizontal}; gap: 1rem; background-color: #d2d2d2; padding: 1rem;">
            <span>Tem certeza?</span>
            <button onclick="excluirDespesa('${idDespesa}')">Confirmar</button>
        </div>
    `
    popup(acumulado, 'Exclusão de Despesa', true)
}

async function excluirDespesa(idDespesa) {

    overlayAguarde()

    deletar(`dados_despesas/${idDespesa}`)
    await deletarDB(`dados_despesas`, idDespesa)

    removerPopup()
    removerPopup()
    await verificarDespesas()

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
            despesa.fatura = resposta[0].link;
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
        ${modeloTabela({ colunas: ['Nome', 'Número do Contribuinte', 'Distrito', 'Cidade', ''], nomeBase, btnExtras: voltar })}
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
    telaInterna.innerHTML = modeloTabela({ colunas: ['Nome do Material', ''], nomeBase, btnExtras })

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
    telaInterna.innerHTML = modeloTabela({ colunas: ['Nome da Ferramenta', ''], nomeBase, btnExtras })

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
    telaInterna.innerHTML = modeloTabela({ colunas: ['Categoria da Mão de Obra', ''], nomeBase, btnExtras })

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