const voltar = `<button onclick="telaDespesas()">Voltar</button>`
let filtros = {}

function telaDespesas() {

    const acumulado = `
        <div class="painel-despesas">
            <br>
            ${btn('todos', 'Verificar Despesas', 'verificarDespesas()')}
            ${btn('fornecedor', 'Fornecedores', 'telaFornecedores()')}
            ${btn('caixa', 'Materiais', `telaGenerica('materiais')`)}
            ${btn('ferramentas', 'Ferramentas', `telaGenerica('ferramentas')`)}
            ${btn('colaborador', 'Mão de Obra', `telaGenerica('mao_obra')`)}
        </div>
    `
    telaInterna.innerHTML = acumulado

    mostrarMenus(false)

}

async function atualizarDespesas() {
    await sincronizarDados('dados_despesas')
    await verificarDespesas()
}

async function verificarDespesas() {

    telaAtiva = 'despesas'

    mostrarMenus(false)

    const colunas = ['Fornecedor', 'Distrito', 'Cidade', 'Número do Contribuinte', 'Valor', 'IVA', 'Ano', 'Mês', 'Data', 'Fatura', 'Tipo de Material', 'Obra', '']
    let cabecalhos = {
        ths: '',
        pesq: ''
    }

    dados_distritos = await recuperarDados('dados_distritos')
    dados_clientes = await recuperarDados('dados_clientes')
    materiais = await recuperarDados('materiais')
    fornecedores = await recuperarDados('fornecedores')
    dados_obras = await recuperarDados('dados_obras')
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
        const cliente = dados_clientes?.[obra?.cliente] || {}
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
                    <button data-controle="inserir" onclick="formularioDespesa()">Adicionar</button>
                    <button onclick="telaDespesas()">Voltar</button>
                </div>
                <div style="margin-left: 5px; ${horizontal}; gap: 5px;">
                    ${modelo('Ano', `<select name="ano"><option></option>${optionsSelect(anos)}</select>`)}
                    ${modelo('Mês', `<select name="mes"><option></option>${optionsSelect(meses)}</select>`)}
                    <img onclick="htmlDespesas()" src="imagens/pdf.png">
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
    const tDespAtiva = document.querySelector('.cabecalho-despesas')
    if (!tDespAtiva) telaInterna.innerHTML = acumulado

    const dados_despesas = await recuperarDados('dados_despesas')

    for (const [idDespesa, dados] of Object.entries(dados_despesas)) {

        const fornecedor = fornecedores?.[dados?.fornecedor] || {}
        const d = dados_distritos?.[fornecedor?.distrito] || {}
        const c = d?.cidades?.[fornecedor?.cidade] || {}

        criarLinhaDespesa(idDespesa, { ...dados, fornecedor, nomeDistrito: d.nome || '-', nomeCidade: c.nome || '-' })
    }

    // Regras de validação;
    validarRegrasAcesso()

}

function htmlDespesas() {
    const sAno = document.querySelector('[name="ano"]')
    const sMes = document.querySelector('[name="mes"]')

    if (sMes.value == '' || sAno.value == '') return popup(mensagem('Preencha os filtros'), 'Alerta', true)

    const ano = sAno.value
    const mes = meses[sMes.value]
    const colunas = ['Fornecedor', 'NIF', 'Valor', 'IVA', 'Ano', 'Mês', 'Data', 'Link Fatura', 'Tipo de Material']
    const linhas = document.querySelectorAll('#body tr')

    let linhasFiltradas = ''
    const totais = {
        iva: 0,
        faturado: 0
    }

    for (const linha of linhas) {

        const tds = linha.querySelectorAll('td')
        const linAno = tds[6].textContent
        const linMes = tds[7].textContent

        if (linAno !== ano || linMes !== mes) continue

        totais.faturado += conversor(tds[2].textContent)
        totais.iva += conversor(tds[3].textContent)

        const link = tds[9].querySelector('[name="link"]')

        linhasFiltradas += `
            <tr>
                <td>${tds[0].textContent}</td>
                <td>${tds[3].textContent}</td>
                <td>${tds[4].textContent}</td>
                <td>${tds[5].textContent}</td>
                <td>${tds[6].textContent}</td>
                <td>${tds[7].textContent}</td>
                <td>${tds[8].querySelectorAll('span')[1].textContent}</td>
                <td>
                ${link ? `<a href="${api}/uploads/RECONST/${link.value}" target="_blank">${link.value}</a>` : ''}
                </td>
                <td>${tds[10].textContent}</td>
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
            <div style="${horizontal}; gap: 0.5rem; position: fixed; bottom: 1rem; left: 1rem;">
                <img onclick="gerarPdfDespesas()" src="imagens/pdf.png" style=" width: 3rem;">
                <img data-controle="excluir" onclick="emailDespesas()" src="imagens/carta.png" style=" width: 3rem;">
            </div>
            <div class="pdf-despesas">
                ${tabela1}
                <br>
                ${tabela2}
            </div>
        </div>
    `

    popup(acumulado, 'Listagem de Despesas por Mês/Ano', true)

    // Regras de validação;
    validarRegrasAcesso()
}

async function emailDespesas() {

    const pdfhtml = document.querySelector('.pdf-despesas')
    const html = `
        <html>
            <head>
                <meta charset="UTF-8">
                <link rel="stylesheet" href="https://devleonny.github.io/Reconstrular/css/despesas.css">
                <style>
                    @page {
                        size: A4 landscape;
                    }
                    body { font-family: 'Poppins', sans-serif; }
                </style>
            </head>
            <body>
                ${pdfhtml.outerHTML}
            </body>
        </html>
    `
    const emails = ['paulo.pires@reconstrular.com']

    const resposta = await pdfEmail({ html, emails, htmlContent: 'Documento em anexo', titulo: 'Listagem de Despesas - Anexo' })

    if (resposta.mensagem) return popup(mensagem(resposta.mensagem), 'Aviso', true)

    removerOverlay()

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
                <style>
                    @page {
                        size: A4 landscape;
                    }
                    body { font-family: 'Poppins', sans-serif; }
                </style>
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
        <td name="distrito" data-cod="${dados?.distrito}">${dados?.nomeDistrito || '-'}
        <td name="cidade" data-cod="${dados?.cidade}">${dados?.nomeCidade || '-'}
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
        <td>${infoObra(dados)}</td>
        <td>
            <img data-controle="editar" src="imagens/pesquisar.png" onclick="formularioDespesa('${id}')">
        </td>
    `

    const trExistente = document.getElementById(id)

    if (trExistente) return trExistente.innerHTML = tds
    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${id}">${tds}</td>`)

}

async function criarLinha(dados, id, nomeBase) {


    const linha = `
        <tr id="${id}">
            <td style="text-align: left;">${dados.nome || ''}</td>
            <td>${dinheiro(dados.preco)}</td>
            <td style="text-align: left;"><a href="${dados.link || ''}">${dados.link || ''}</a></td>
            <td class="detalhes">
                <img onclick="adicionarGenerico('${nomeBase}', '${id}')" src="imagens/pesquisar.png">
            </td>
        </tr>
    `

    const tr = document.getElementById(id)
    if (tr) return tr.innerHTML = linha
    const body = document.getElementById('body')
    body.insertAdjacentHTML('beforeend', linha)

}

async function formularioDespesa(idDespesa) {

    const despesa = await recuperarDado('dados_despesas', idDespesa)
    fornecedores = await recuperarDados('fornecedores')
    materiais = await recuperarDados('materiais')
    dados_obras = await recuperarDados('dados_obras')
    dados_clientes = await recuperarDados('dados_clientes')

    const opcoesFornecedores = Object.entries(fornecedores)
        .map(([idFornecedor, fornecedor]) => `<option id="${idFornecedor}" ${despesa?.fornecedor == idFornecedor ? 'selected' : ''}>${fornecedor.nome}</option>`)
        .join('')

    const opcoesMateriais = Object.entries(materiais)
        .map(([idMaterial, material]) => `<option id="${idMaterial}" ${despesa?.material?.id == idMaterial ? 'selected' : ''}>${material.nome}</option>`)
        .join('')

    const opcoesObras = Object.entries(dados_obras)
        .map(([idObra, obra]) => {
            const distrito = dados_distritos?.[obra.distrito] || {}
            const cidade = distrito?.cidades?.[obra.cidade] || {}
            const cliente = dados_clientes?.[obra?.cliente] || {}
            return `<option value="${idObra}" ${despesa?.obra == idObra ? 'selected' : ''}>${cliente?.nome || '--'} / ${distrito.nome || '--'} / ${cidade.nome || '--'}</option>`
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
    const idMaterial = document.querySelector('[name="material"]').selectedOptions[0].id
    const material = materiais[idMaterial] || {}

    let despesa = {
        fornecedor: fornecedor.selectedOptions[0].id,
        obra: obra.selectedOptions[0].value,
        material,
        iva: Number(obVal('iva')),
        valor: Number(obVal('valor')),
        data: obVal('data')
    };

    // Foto da Fatura
    const foto = document.querySelector('[name="foto"]')
    if (foto && foto.src && !foto.src.includes(api)) {
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

async function telaGenerica(nomeBase) {

    const btnExtras = `
        <button onclick="adicionarGenerico('${nomeBase}')">Adicionar</button>
        ${voltar}
    `
    telaInterna.innerHTML = modeloTabela({ colunas: ['Nome', 'Preço', 'Link', ''], nomeBase, btnExtras })

    const dados = await recuperarDados(nomeBase)
    for (const [id, dado] of Object.entries(dados)) {
        criarLinha(dado, id, nomeBase)
    }
}

async function adicionarGenerico(nomeBase, id) {

    const dados = await recuperarDado(nomeBase, id)

    const linhas = [
        {
            texto: 'Nome',
            elemento: `<textarea name="nome">${dados?.nome || ''}</textarea>`
        },
        {
            texto: 'Preço',
            elemento: `<input name="preco" type="number" value="${dados?.preco || ''}">`
        },
        {
            texto: 'Link',
            elemento: `<textarea name="link">${dados?.link || ''}</textarea>`
        }
    ]

    const botoes = [
        { texto: 'Salvar', img: 'concluido', funcao: id ? `salvarGenerico('${nomeBase}', '${id}')` : `salvarGenerico('${nomeBase}')` },
    ]

    if (id) botoes.push({ texto: 'Excluir', img: 'cancel', funcao: `confirmarExcluirGenerico('${nomeBase}', '${id}')` })

    const titulo = id ? 'Salvar Item' : 'Editar Item'
    const form = new formulario({ linhas, botoes, titulo })
    form.abrirFormulario()

}

async function salvarGenerico(nomeBase, id = ID5digitos()) {

    overlayAguarde()

    const obVal = (n) => {
        const el = document.querySelector(`[name="${n}"]`)
        return el ? el.value : ''
    }

    const dados = {
        nome: obVal('nome'),
        preco: Number(obVal('preco')),
        link: obVal('link')
    }

    enviar(`${nomeBase}/${id}`, dados)
    await inserirDados({ [id]: dados }, nomeBase)
    await telaGenerica(nomeBase)

    removerPopup()
}

function confirmarExcluirGenerico(nomeBase, id) {

    const acumulado = `
        <div style="${horizontal}; gap: 1rem; background-color: #d2d2d2; padding: 1rem;">
            <span>Tem certeza que deseja excluir?</span>
            <button onclick="excluirGenerico('${nomeBase}', '${id}')">Confirmar</button>
        </div>
        `

    popup(acumulado, 'Tem certeza?', true)

}

async function excluirGenerico(nomeBase, id) {

    removerPopup()
    removerPopup()

    overlayAguarde()

    await deletarDB(nomeBase, id)
    deletar(`${nomeBase}/${id}`)

    await telaGenerica(nomeBase)

    removerOverlay()

}

const eitens = [
  {
    "descricao": "Construir em Bloco betão vazado 50x20x10",
    "medida": "m2",
    "especialidade": "Alvenaria"
  },
  {
    "descricao": "Construir em Bloco betão vazado 50x20x15",
    "medida": "m2",
    "especialidade": "Alvenaria"
  },
  {
    "descricao": "Construir em Bloco betão vazado 50x20x20",
    "medida": "m2",
    "especialidade": "Alvenaria"
  },
  {
    "descricao": "Construir em Bloco betão vazado 50x20x25",
    "medida": "m2",
    "especialidade": "Alvenaria"
  },
  {
    "descricao": "Construir em Bloco betão térmico 50x20x20",
    "medida": "m2",
    "especialidade": "Alvenaria"
  },
  {
    "descricao": "Construir em Bloco betão térmico 50x20x25",
    "medida": "m2",
    "especialidade": "Alvenaria"
  },
  {
    "descricao": "Construir em Tijolo(Cerâmico) 30x20x7",
    "medida": "m2",
    "especialidade": "Alvenaria"
  },
  {
    "descricao": "Construir em Tijolo(Cerâmico) 30x20x9",
    "medida": "m2",
    "especialidade": "Alvenaria"
  },
  {
    "descricao": "Construir em Tijolo(Cerâmico) 30x20x11",
    "medida": "m2",
    "especialidade": "Alvenaria"
  },
  {
    "descricao": "Construir em Tijolo(Cerâmico) 30x20x15",
    "medida": "m2",
    "especialidade": "Alvenaria"
  },
  {
    "descricao": "Construir em Tijolo(Cerâmico) 30x20x22",
    "medida": "m2",
    "especialidade": "Alvenaria"
  },
  {
    "descricao": "Caixa de Pavimento",
    "medida": "m3",
    "especialidade": "Aterro"
  },
  {
    "descricao": "Pavimento",
    "medida": "m3",
    "especialidade": "Aterro"
  },
  {
    "descricao": "Piscina/Poço",
    "medida": "m3",
    "especialidade": "Aterro"
  },
  {
    "descricao": "Aplicação da Betonilha simples de regularização(mínimo 4cm de espessura)",
    "medida": "m2",
    "especialidade": "Betomilha"
  },
  {
    "descricao": "Alumínio Basculante superior",
    "medida": "m2",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Alumínio Basculante superior e de correr",
    "medida": "m2",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Alumínio De correr",
    "medida": "m2",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Alumínio Fixas",
    "medida": "m2",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Alumínio Oscilobatente",
    "medida": "m2",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Madeira Basculante superior",
    "medida": "m2",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Madeira Basculante superior e de correr",
    "medida": "m2",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Madeira De correr",
    "medida": "m2",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Madeira Fixas",
    "medida": "m2",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Madeira Oscilobatente",
    "medida": "m2",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Pvc Basculante superior",
    "medida": "m2",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Pvc Basculante superior e de correr",
    "medida": "m2",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Pvc De correr",
    "medida": "m2",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Pvc Fixas",
    "medida": "m2",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Pvc Oscilobatente",
    "medida": "m2",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Substituição/Colocação de estore completo manual",
    "medida": "und",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Substituição/Colocação de estore completo eletrico",
    "medida": "und",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Substituição de fita de estore e enrolador",
    "medida": "und",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Substituição de fita de estore",
    "medida": "und",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Substituição de enrolador",
    "medida": "und",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Substituição de ripas de estore tradicional",
    "medida": "und",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Substituição de ripas de estore térmica",
    "medida": "und",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Substituição de tubo oitavado de estore e suporte",
    "medida": "und",
    "especialidade": "Caixilharia"
  },
  {
    "descricao": "Canalização Geral Multicamada 16",
    "medida": "ml",
    "especialidade": "Canalização"
  },
  {
    "descricao": "Canalização Geral Multicamada 20",
    "medida": "ml",
    "especialidade": "Canalização"
  },
  {
    "descricao": "Canalização Geral Multicamada 25",
    "medida": "ml",
    "especialidade": "Canalização"
  },
  {
    "descricao": "Canalização Geral Multicamada 32",
    "medida": "ml",
    "especialidade": "Canalização"
  },
  {
    "descricao": "Substituição de torneira de segurança 1/2",
    "medida": "und",
    "especialidade": "Canalização"
  },
  {
    "descricao": "Substituição de torneira de segurança 3/4",
    "medida": "und",
    "especialidade": "Canalização"
  },
  {
    "descricao": "Substituição de torneira de segurança 3/8",
    "medida": "und",
    "especialidade": "Canalização"
  },
  {
    "descricao": "Alvenaria",
    "medida": "m2",
    "especialidade": "Demolições"
  },
  {
    "descricao": "Churrasqueira",
    "medida": "m2",
    "especialidade": "Demolições"
  },
  {
    "descricao": "Roços",
    "medida": "ml",
    "especialidade": "Demolições"
  },
  {
    "descricao": "Monos",
    "medida": "m2",
    "especialidade": "Demolições"
  },
  {
    "descricao": "Retirar Blocos de encaixe(Tipo pavê)",
    "medida": "m2",
    "especialidade": "Demolições"
  },
  {
    "descricao": "Retirar Desperdício de mármore",
    "medida": "m2",
    "especialidade": "Demolições"
  },
  {
    "descricao": "Retirar Pavimento Cerâmico",
    "medida": "m2",
    "especialidade": "Demolições"
  },
  {
    "descricao": "Retirar Relva sintética",
    "medida": "m2",
    "especialidade": "Demolições"
  },
  {
    "descricao": "Telheiro/Alpendre",
    "medida": "m2",
    "especialidade": "Demolições"
  },
  {
    "descricao": "Escavações/Roços (até 1m3)",
    "medida": "m3",
    "especialidade": "Desaterro"
  },
  {
    "descricao": "Gesso cartonado(pladur) Com isolamento térmico/acústico e placa de gesso cartonado hidrofoga",
    "medida": "m2",
    "especialidade": "Divisões_Pladur"
  },
  {
    "descricao": "Gesso cartonado(pladur) Com isolamento térmico/acústico e placa de gesso cartonado tradicional",
    "medida": "m2",
    "especialidade": "Divisões_Pladur"
  },
  {
    "descricao": "Gesso cartonado(pladur) Sem isolamento térmico/acústico e placa de gesso cartonado hidrofoga",
    "medida": "m2",
    "especialidade": "Divisões_Pladur"
  },
  {
    "descricao": "Gesso cartonado(pladur) Sem isolamento térmico/acústico e placa de gesso cartonado tradicional",
    "medida": "m2",
    "especialidade": "Divisões_Pladur"
  },
  {
    "descricao": "Gesso cartonado(pladur) Com isolamento térmico/acústico e placa de gesso cartonado hidrofoga",
    "medida": "m2",
    "especialidade": "Teto Falso"
  },
  {
    "descricao": "Gesso cartonado(pladur) Com isolamento térmico/acústico e placa de gesso cartonado tradicional",
    "medida": "m2",
    "especialidade": "Teto Falso"
  },
  {
    "descricao": "Gesso cartonado(pladur) Sem isolamento térmico/acústico e placa de gesso cartonado hidrofoga",
    "medida": "m2",
    "especialidade": "Teto Falso"
  },
  {
    "descricao": "Gesso cartonado(pladur) Sem isolamento térmico/acústico e placa de gesso cartonado tradicional",
    "medida": "m2",
    "especialidade": "Teto Falso"
  },
  {
    "descricao": "Gesso cartonado(pladur) hidrofoga",
    "medida": "m2",
    "especialidade": "Colagem Pladur Paredes"
  },
  {
    "descricao": "Gesso cartonado(pladur) tradicional",
    "medida": "m2",
    "especialidade": "Colagem Pladur Paredes"
  },
  {
    "descricao": "Adicionar ponto de luz",
    "medida": "ml",
    "especialidade": "Eletricidade"
  },
  {
    "descricao": "Substituir candeeiros",
    "medida": "und",
    "especialidade": "Eletricidade"
  },
  {
    "descricao": "Substituir fiação elétrica de iluminação simples(fio de 1.5)",
    "medida": "ml",
    "especialidade": "Eletricidade"
  },
  {
    "descricao": "Substituir fiação elétrica de tomadas com ligação a aparelhos de resistência",
    "medida": "ml",
    "especialidade": "Eletricidade"
  },
  {
    "descricao": "Substituir fiação elétrica de tomadas com ligação de fusível ao quadro elétrico",
    "medida": "ml",
    "especialidade": "Eletricidade"
  },
  {
    "descricao": "Substituir fiação elétrica de tomadas simples(fio de 2.5)",
    "medida": "ml",
    "especialidade": "Eletricidade"
  },
  {
    "descricao": "Substituir/ Adicionar diferencial 40A - 30MA",
    "medida": "und",
    "especialidade": "Eletricidade"
  },
  {
    "descricao": "Substituir/ Adicionar disjuntores 10A",
    "medida": "und",
    "especialidade": "Eletricidade"
  },
  {
    "descricao": "Substituir/ Adicionar disjuntores 16A",
    "medida": "und",
    "especialidade": "Eletricidade"
  },
  {
    "descricao": "Substituir/ Adicionar disjuntores 20A",
    "medida": "und",
    "especialidade": "Eletricidade"
  },
  {
    "descricao": "Substituir/Adicionar interruptor duplo",
    "medida": "und",
    "especialidade": "Eletricidade"
  },
  {
    "descricao": "Substituir/Adicionar Interruptores Simples",
    "medida": "und",
    "especialidade": "Eletricidade"
  },
  {
    "descricao": "Substituir/adicionar quadro elétrico",
    "medida": "und",
    "especialidade": "Eletricidade"
  },
  {
    "descricao": "Substituir/Adicionar Tomadas",
    "medida": "und",
    "especialidade": "Eletricidade"
  },
  {
    "descricao": "Construir nova escada de Betão ou Alvenaria - reta - 1 lance",
    "medida": "und",
    "especialidade": "Escada"
  },
  {
    "descricao": "Construir nova escada de Betão ou Alvenaria - Em \"U\" - 3 lances",
    "medida": "und",
    "especialidade": "Escada"
  },
  {
    "descricao": "Construir nova escada de Betão ou Alvenaria - Em \"L\" - 2 lances",
    "medida": "und",
    "especialidade": "Escada"
  },
  {
    "descricao": "Construir nova escada de Ferro - reta - 1 lance",
    "medida": "und",
    "especialidade": "Escada"
  },
  {
    "descricao": "Construir nova escada de Ferro - Em \"U\" - 3 lances",
    "medida": "und",
    "especialidade": "Escada"
  },
  {
    "descricao": "Construir nova escada de Ferro - Em \"L\" - 2 lances",
    "medida": "und",
    "especialidade": "Escada"
  },
  {
    "descricao": "Construir nova escada de Madeira - reta - 1 lance",
    "medida": "und",
    "especialidade": "Escada"
  },
  {
    "descricao": "Construir nova escada de Madeira - Em \"U\" - 3 lances",
    "medida": "und",
    "especialidade": "Escada"
  },
  {
    "descricao": "Construir nova escada de Madeira - Em \"L\" - 2 lances",
    "medida": "und",
    "especialidade": "Escada"
  },
  {
    "descricao": "Corrimão de escada Alumínio de 2metros",
    "medida": "und",
    "especialidade": "Escada"
  },
  {
    "descricao": "Corrimão de escada Inox 2metros",
    "medida": "und",
    "especialidade": "Escada"
  },
  {
    "descricao": "Corrimão de escada Madeira 2metros",
    "medida": "und",
    "especialidade": "Escada"
  },
  {
    "descricao": "Guarda corpo de escada em alvenaria",
    "medida": "m2",
    "especialidade": "Escada"
  },
  {
    "descricao": "Guarda corpo de escada em Kit balaustre 2m fixação chão de alumínio",
    "medida": "und",
    "especialidade": "Escada"
  },
  {
    "descricao": "Guarda corpo de escada em Kit balaustre 2m fixação chão de inox",
    "medida": "und",
    "especialidade": "Escada"
  },
  {
    "descricao": "Guarda corpo de escada Em vidro temperado",
    "medida": "und",
    "especialidade": "Escada"
  },
  {
    "descricao": "Criar circuto de esgoto wc",
    "medida": "und",
    "especialidade": "Esgoto"
  },
  {
    "descricao": "Criar circuto de esgoto cozinha",
    "medida": "und",
    "especialidade": "Esgoto"
  },
  {
    "descricao": "Aplicação de Estuque",
    "medida": "m2",
    "especialidade": "Estuque"
  },
  {
    "descricao": "Impermeabilizar Elementos",
    "medida": "m2",
    "especialidade": "Impermeabilização"
  },
  {
    "descricao": "Impermeabilizar Paredes",
    "medida": "m2",
    "especialidade": "Impermeabilização"
  },
  {
    "descricao": "Impermeabilizar Pavimentos",
    "medida": "m2",
    "especialidade": "Impermeabilização"
  },
  {
    "descricao": "Colocar pavimento cerâmico de exterior",
    "medida": "m2",
    "especialidade": "Pavimento"
  },
  {
    "descricao": "Colocar pavimento de borracha",
    "medida": "m2",
    "especialidade": "Pavimento"
  },
  {
    "descricao": "Colocar pavimento deck",
    "medida": "m2",
    "especialidade": "Pavimento"
  },
  {
    "descricao": "Colocar pavimento desperdício de mármore",
    "medida": "m2",
    "especialidade": "Pavimento"
  },
  {
    "descricao": "Colocar pavimento em blocos",
    "medida": "m2",
    "especialidade": "Pavimento"
  },
  {
    "descricao": "Colocar pavimento lajeta",
    "medida": "m2",
    "especialidade": "Pavimento"
  },
  {
    "descricao": "Colocar pavimento relva artificial em sobreposição de pavimento",
    "medida": "m2",
    "especialidade": "Pavimento"
  },
  {
    "descricao": "Colocar pavimento relva artificial em terreno areado",
    "medida": "m2",
    "especialidade": "Pavimento"
  },
  {
    "descricao": "Colocar pavimento relva natural",
    "medida": "m2",
    "especialidade": "Pavimento"
  },
  {
    "descricao": "Pavimento Cerâmico e Rodapé",
    "medida": "m2",
    "especialidade": "Pavimento"
  },
  {
    "descricao": "Pavimento Flutuante e Rodapé",
    "medida": "m2",
    "especialidade": "Pavimento"
  },
  {
    "descricao": "Pavimento Epoxi + Rodapé cerâmico/Mdf/Pvc",
    "medida": "m2",
    "especialidade": "Pavimento"
  },
  {
    "descricao": "Pavimento microcimento + Rodapé cerâmico/Mdf",
    "medida": "m2",
    "especialidade": "Pavimento"
  },
  {
    "descricao": "Tinta à base de água(Tradicional) branca",
    "medida": "m2",
    "especialidade": "Pintura"
  },
  {
    "descricao": "Tinta texturada(Tinta de areia)",
    "medida": "m2",
    "especialidade": "Pintura"
  },
  {
    "descricao": "Construir casa das maquinas",
    "medida": "m2",
    "especialidade": "Piscina"
  },
  {
    "descricao": "Construir Piscina",
    "medida": "m2",
    "especialidade": "Piscina"
  },
  {
    "descricao": "Substituir escada",
    "medida": "und",
    "especialidade": "Piscina"
  },
  {
    "descricao": "Substituir Sistema de Filtragem",
    "medida": "und",
    "especialidade": "Piscina"
  },
  {
    "descricao": "Substituir Injetores",
    "medida": "und",
    "especialidade": "Piscina"
  },
  {
    "descricao": "Substituir tela/liner",
    "medida": "m2",
    "especialidade": "Piscina"
  },
  {
    "descricao": "Substituir tubulação de circulação de água",
    "medida": "ml",
    "especialidade": "Piscina"
  },
  {
    "descricao": "Porta Exterior Blindada 70cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Porta Exterior Blindada 80cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Porta Exterior Blindada 90cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Porta Exterior de Alumínio 70cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Porta Exterior de Alumínio 80cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Porta Exterior de Alumínio 90cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Porta Exterior de Madeira 70cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Porta Exterior de Madeira 80cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Porta Exterior de Madeira 90cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Porta Interior de batente 70cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Porta Interior de batente 80cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Porta Interior de batente 90cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Porta Interior de correr externo 70cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Porta interior de corredor externo 80cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Porta Interior de corredor externo 90cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Porta Interior de corredor interno 70cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Porta Interior de corredor interno 80cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Interior de corredor interno 90cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Porta Interior de dupla de abertura em folha 70cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Porta Interior de dupla de abertura em folha 80cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Porta Interior de dupla de abertura em folha 90cm de largura",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Mudar Fechadura porta exterior",
    "medida": "und",
    "especialidade": "Portas_Exterior"
  },
  {
    "descricao": "Colocar portão de correr com automatismo",
    "medida": "und",
    "especialidade": "Portões"
  },
  {
    "descricao": "Colocar portão de correr sem automatismo",
    "medida": "und",
    "especialidade": "Portões"
  },
  {
    "descricao": "Colocar portão metálico de abrir em folha com automatismo",
    "medida": "und",
    "especialidade": "Portões"
  },
  {
    "descricao": "Colocar portão metálico de abrir em folha sem automatismo",
    "medida": "und",
    "especialidade": "Portões"
  },
  {
    "descricao": "Reboco Chapisco sem acabamento",
    "medida": "m2",
    "especialidade": "Reboco"
  },
  {
    "descricao": "Reboco de acabamento fino",
    "medida": "m2",
    "especialidade": "Reboco"
  },
  {
    "descricao": "Cerâmica",
    "medida": "m2",
    "especialidade": "Revestimento_Paredes"
  },
  {
    "descricao": "Em argamassa",
    "medida": "m2",
    "especialidade": "Revestimento_Paredes"
  },
  {
    "descricao": "Lambrim madeira",
    "medida": "m2",
    "especialidade": "Revestimento_Paredes"
  },
  {
    "descricao": "Lambrim pvc",
    "medida": "m2",
    "especialidade": "Revestimento_Paredes"
  },
  {
    "descricao": "Ripado madeira",
    "medida": "m2",
    "especialidade": "Revestimento_Paredes"
  },
  {
    "descricao": "Aquecedor de toalhas",
    "medida": "und",
    "especialidade": "Sanitários"
  },
  {
    "descricao": "Aquecedor de wc",
    "medida": "und",
    "especialidade": "Sanitários"
  },
  {
    "descricao": "Banheira",
    "medida": "und",
    "especialidade": "Sanitários"
  },
  {
    "descricao": "Base de ducha",
    "medida": "und",
    "especialidade": "Sanitários"
  },
  {
    "descricao": "Bidé",
    "medida": "und",
    "especialidade": "Sanitários"
  },
  {
    "descricao": "Cabine de Duche",
    "medida": "und",
    "especialidade": "Sanitários"
  },
  {
    "descricao": "Espelho",
    "medida": "und",
    "especialidade": "Sanitários"
  },
  {
    "descricao": "Extrator WC",
    "medida": "und",
    "especialidade": "Sanitários"
  },
  {
    "descricao": "Lavatório",
    "medida": "und",
    "especialidade": "Sanitários"
  },
  {
    "descricao": "Misturadora de Bidé",
    "medida": "und",
    "especialidade": "Sanitários"
  },
  {
    "descricao": "Misturadora de Duche",
    "medida": "und",
    "especialidade": "Sanitários"
  },
  {
    "descricao": "Misturadora de Lavatório",
    "medida": "und",
    "especialidade": "Sanitários"
  },
  {
    "descricao": "Sanita",
    "medida": "und",
    "especialidade": "Sanitários"
  },
  {
    "descricao": "Lavagem de telhado",
    "medida": "und",
    "especialidade": "Telhado"
  },
  {
    "descricao": "Lavagem e Impermeabilização de telhado",
    "medida": "m2",
    "especialidade": "Telhado"
  },
  {
    "descricao": "Pintura de telhas",
    "medida": "m2",
    "especialidade": "Telhado"
  },
  {
    "descricao": "Reparação de chaminé e impermeabilização",
    "medida": "und",
    "especialidade": "Telhado"
  },
  {
    "descricao": "Reparação de telhas(fissuras/rachas)",
    "medida": "m2",
    "especialidade": "Telhado"
  },
  {
    "descricao": "Substituição de estrutura de telhado Aço leve",
    "medida": "m2",
    "especialidade": "Telhado"
  },
  {
    "descricao": "Substituição de estrutura de telhado Madeira",
    "medida": "m2",
    "especialidade": "Telhado"
  },
  {
    "descricao": "Substituição de estrutura de telhado Vigota",
    "medida": "m2",
    "especialidade": "Telhado"
  },
  {
    "descricao": "Substituição de telhas Telha canudo",
    "medida": "m2",
    "especialidade": "Telhado"
  },
  {
    "descricao": "Substituição de telhas Telha lusa",
    "medida": "m2",
    "especialidade": "Telhado"
  },
  {
    "descricao": "Substituição de telhas Telha marselha",
    "medida": "m2",
    "especialidade": "Telhado"
  },
  {
    "descricao": "Porta Interior de batente(Tradicional) 70cm de largura",
    "medida": "und",
    "especialidade": "Portas Interior"
  },
  {
    "descricao": "Porta Interior de batente(Tradicional) 80cm de largura",
    "medida": "und",
    "especialidade": "Portas Interior"
  },
  {
    "descricao": "Porta Interior de batente(Tradicional) 90cm de largura",
    "medida": "und",
    "especialidade": "Portas Interior"
  },
  {
    "descricao": "Porta Interior de correr externo 70cm de largura",
    "medida": "und",
    "especialidade": "Portas Interior"
  },
  {
    "descricao": "Porta Interior de correr externo 80cm de largura",
    "medida": "und",
    "especialidade": "Portas Interior"
  },
  {
    "descricao": "Porta Interior de correr externo 90cm de largura",
    "medida": "und",
    "especialidade": "Portas Interior"
  },
  {
    "descricao": "Porta Interior de correr interno 70cm de largura",
    "medida": "und",
    "especialidade": "Portas Interior"
  },
  {
    "descricao": "Porta Interior de correr interno 80cm de largura",
    "medida": "und",
    "especialidade": "Portas Interior"
  },
  {
    "descricao": "Porta Interior de correr interno 90cm de largura",
    "medida": "und",
    "especialidade": "Portas Interior"
  },
  {
    "descricao": "Porta Interior de dupla abertura em folha(tipo salão) 70cm de largura",
    "medida": "und",
    "especialidade": "Portas Interior"
  },
  {
    "descricao": "Porta Interior de dupla abertura em folha(tipo salão) 80cm de largura",
    "medida": "und",
    "especialidade": "Portas Interior"
  },
  {
    "descricao": "Porta Interior de dupla abertura em folha(tipo salão) 90cm de largura",
    "medida": "und",
    "especialidade": "Portas Interior"
  },
  {
    "descricao": "Mudar Fechadura porta interior",
    "medida": "und",
    "especialidade": "Portas Interior"
  }
]

function replicar() {
    for (const m of eitens) {
        enviar(`campos/${ID5digitos()}`, m)
    }
}