const voltar = `<button onclick="telaDespesas()">Voltar</button>`
let filtros = {}

function telaDespesas() {

  titulo.textContent = 'Despesas'

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

  cidades = await recuperarDados('cidades')
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

    const cidade = cidades?.[obra?.cidade] || {}

    const cliente = dados_clientes?.[obra?.cliente] || {}
    opcoesObras += cliente.nome
      ? `<option>${cliente?.nome || '--'} / ${cidade?.distrito || '--'} / ${cidade?.nome || '--'}</option>`
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
    criarLinhaDespesa(idDespesa, dados)
  }

  // Regras de validação;
  validarRegrasAcesso()

}

function htmlDespesas() {
  const sAno = document.querySelector('[name="ano"]')
  const sMes = document.querySelector('[name="mes"]')

  if (sMes.value == '' || sAno.value == '')
    return popup({ mensagem: 'Preencha os filtros' })

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

    totais.faturado += conversor(tds[4].textContent)
    totais.iva += conversor(tds[5].textContent)

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
  const elemento = `
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

  popup({ elemento, titulo: 'Listagem de Despesas por Mês/Ano' })

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
  const emails = ['fellipe.leonny@outlook.com']//, 'paulo.pires@reconstrular.com']

  const resposta = await pdfEmail({ html, emails, htmlContent: 'Documento em anexo', titulo: 'Listagem de Despesas - Anexo' })

  if (resposta.mensagem)
    return popup({ mensagem: resposta.mensagem })

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

  const fornecedor = fornecedores?.[dados?.fornecedor] || {}
  const cidade = cidades?.[fornecedor?.cidade] || {}

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
        <td>${fornecedor?.nome || '--'}</td>
        <td name="distrito">${cidade?.distrito || '-'}
        <td name="cidade" data-cod="${dados?.cidade}">${cidade?.nome || '-'}
        <td>${fornecedor?.numeroContribuinte || '--'}</td>
        <td>${dinheiro(dados?.valor)}</td>
        <td>${dinheiro(dados?.iva)}</td>
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
            <td>
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

      const cidade = cidades?.[obra?.cidade] || {}
      const cliente = dados_clientes?.[obra?.cliente] || {}
      return `<option value="${idObra}" ${despesa?.obra == idObra ? 'selected' : ''}>${cliente?.nome || '--'} / ${cidade?.distrito || '--'} / ${cidade?.nome || '--'}</option>`
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

  popup({ linhas, botoes, titulo: 'Gerenciar Despesa' })

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

  const botoes = [
    { texto: 'Confirmar', img: 'concluido', funcao: `excluirDespesa('${idDespesa}')` }
  ]
  popup({ mensagem: 'Tem cezesa?', botoes, titulo: 'Exclusão de Despesa', nra: false })
}

async function excluirDespesa(idDespesa) {

  overlayAguarde()

  deletar(`dados_despesas/${idDespesa}`)
  await deletarDB(`dados_despesas`, idDespesa)

  await verificarDespesas()

}

async function salvarDespesa(idDespesa = ID5digitos()) {
  overlayAguarde()

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
      return popup({ mensagem: 'Falha no envio da Foto: tente novamente.' })
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
  removerPopup();
}

async function buscarLocalidadeFornecedor() {

  const select = document.querySelector('[name="fornecedor"]')
  const idFornecedor = select.selectedOptions[0].id
  const fornecedor = await recuperarDado('fornecedores', idFornecedor)

  const cidade = cidades?.[fornecedor?.cidade] || '--'

  const painel = document.querySelector('.painel-padrao')
  painel.querySelector('[name="numeroContribuinte"]').value = fornecedor?.numeroContribuinte || '--'
  painel.querySelector('[name="cidade"]').value = cidade?.nome || '--'
  painel.querySelector('[name="distrito"]').value = cidade?.distrito || '--'

}

async function telaFornecedores() {

  cidades = await recuperarDados('cidades')
  const nomeBase = 'fornecedores'

  const btnExtras = `
    <button onclick="adicionarFornecedor()">Adicionar</button>
    ${voltar}
  `
  const acumulado = `
        ${modeloTabela({ colunas: ['Nome', 'Número do Contribuinte', 'Distrito', 'Cidade', ''], nomeBase, btnExtras })}
    `
  telaInterna.innerHTML = acumulado

  fornecedores = await recuperarDados(nomeBase)
  for (const [id, dados] of Object.entries(fornecedores)) {
    criarLinhaFornecedores(id, dados)
  }
}

function criarLinhaFornecedores(idFornecedor, fornecedor) {

  const cidade = cidades?.[fornecedor?.cidade] || {}

  const linha = `
      <tr id="${idFornecedor}">
          <td style="text-align: left;">${fornecedor.nome || ''}</td>
          <td>${fornecedor?.numeroContribuinte || ''}</td>
          <td>${cidade?.distrito || ''}</td>
          <td>${cidade?.nome || ''}</td>
          <td>
              <img onclick="adicionarFornecedor('${idFornecedor}')" src="imagens/pesquisar.png">
          </td>
      </tr>
    `

  const tr = document.getElementById(idFornecedor)
  if (tr) return tr.innerHTML = linha
  const body = document.getElementById('body')
  body.insertAdjacentHTML('beforeend', linha)

}

async function adicionarFornecedor(idFornecedor) {

  const fornecedor = await recuperarDado('fornecedores', idFornecedor)
  const cidade = cidades?.[fornecedor?.cidade] || {}
  const distritos = Object
    .values(cidades)
    .map(c => c.distrito)
  const opcoesDistrito = [...new Set(distritos)]
    .sort((a, b) => a.localeCompare(b))
    .map(d => `<option ${cidade?.distrito == d ? 'selected' : ''}>${d}</option>`)
    .join('')
  const linhas = [
    { texto: 'Nome', elemento: `<textarea name="nome">${fornecedor?.nome || ''}</textarea>` },
    { texto: 'Número do Contribuinte', elemento: `<input name="numeroContribuinte" value="${fornecedor?.numeroContribuinte || ''}">` },
    {
      texto: 'Distrito',
      elemento: `
                <select name="distrito" onchange="filtroCidadesCabecalho(this)">
                    <option></option>
                    ${opcoesDistrito}
                </select>
            `},
    { texto: 'Cidade', elemento: `<select name="cidade"></select>` },
  ]

  const botoes = [
    { texto: 'Salvar', img: 'concluido', funcao: idFornecedor ? `salvarFornecedor('${idFornecedor}')` : 'salvarFornecedor()' }
  ]

  if (idFornecedor) botoes.push({ texto: 'Excluir', img: 'cancel', funcao: '' })

  popup({ linhas, botoes, titulo: 'Formulário de Obra' })

  if (cidade) {
    const lista = resolverCidadesPorDistrito(cidade.distrito)
    const selectCidade = el('cidade')
    aplicarCidadesNoSelect(lista, selectCidade, fornecedor?.cidade)
  }

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
  const body = document.getElementById('body')
  if (!body) telaInterna.innerHTML = modeloTabela({ colunas: ['Nome', 'Preço', 'Link', ''], nomeBase, btnExtras })

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
  popup({ linhas, botoes, titulo })

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

  const botoes = [
    { texto: 'Confirmar', img: 'concluido', funcao: `excluirGenerico('${nomeBase}', '${id}')` }
  ]

  popup({ botoes, mensagem: 'Tem certeza?', nra: false })

}

async function excluirGenerico(nomeBase, id) {

  overlayAguarde()

  await deletarDB(nomeBase, id)
  deletar(`${nomeBase}/${id}`)

  await telaGenerica(nomeBase)

  removerOverlay()

}
