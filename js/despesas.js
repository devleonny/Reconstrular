const voltar = `<button onclick="telaDespesas()">Voltar</button>`

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

async function verificarDespesas() {

  telaAtiva = 'despesas'

  mostrarMenus(false)

  const btnExtras = `
      <img onclick="htmlDespesas()" src="imagens/pdf.png">
      <button data-controle="inserir" onclick="formularioDespesa()">Adicionar</button>
      <button onclick="telaDespesas()">Voltar</button>
  `

  const tabela = await modTab({
    btnExtras,
    pag: 'despesas',
    base: 'dados_despesas',
    body: 'bodyDespesas',
    criarLinha: 'criarLinhaDespesa',
    colunas: {
      'Fornecedor': { chave: 'snapshots.fornecedor.nome' },
      'Distrito': { chave: 'snapshots.fornecedor.snapshots.cidade.distrito' },
      'Cidade': { chave: 'snapshots.fornecedor.snapshots.cidade.nome' },
      'Número do Contribuinte': { chave: 'snapshots.fornecedor.numeroContribuinte' },
      'Valor': { chave: 'valor' },
      'IVA': { chave: 'iva' },
      'Ano': { chave: 'snapshots.ano' },
      'Mês': { chave: 'snapshots.mes' },
      'Data': { chave: 'data', tipoPesquisa: 'data' },
      'Fatura': {},
      'Tipo de Material': { chave: 'material.nome' },
      'Obra': {},
      'Detalhes': {},
    }
  })

  telaInterna.innerHTML = tabela

  await paginacao()

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

async function criarLinhaDespesa(dados) {

  const { id, valor, iva, fatura, material, data } = dados || {}

  const fornecedor = await recuperarDado('fornecedores', dados?.fornecedor) || {}
  const cidade = await recuperarDado('cidades', fornecedor?.cidade) || {}

  const ax = (link) => {
    if (!link) return ''
    return `
        <img onclick="abrirArquivo('${link}')" src="imagens/contas.png">
        <input name="link" style="display: none;" value="${link}">
        `
  }

  const [ano, mes, dia] = data
    ? data.split('-')
    : ''

  tds = `
        <td>${fornecedor?.nome || ''}</td>
        <td>${cidade?.distrito || ''}
        <td>${cidade?.nome || ''}
        <td>${fornecedor?.numeroContribuinte || ''}</td>
        <td>${dinheiro(valor)}</td>
        <td>${dinheiro(iva)}</td>
        <td>${ano || ''}</td>
        <td>${meses[mes] || ''}</td>
        <td>
            <span>${data ? `${dia}/${mes}/${ano}` : ''}</span>
        </td>
        <td>${ax(fatura)}</td>
        <td>${material?.nome || ''}</td>
        <td>${infoObra(dados)}</td>
        <td>
            <img data-controle="editar" src="imagens/pesquisar.png" onclick="formularioDespesa('${id}')">
        </td>
    `

  return `<tr>${tds}</td>`

}

async function formularioDespesa(idDespesa) {

  const { numeroContribuinte, material, data, iva, valor, despesa, fornecedor } = await recuperarDado('dados_despesas', idDespesa) || {}
  const obra = await recuperarDado('dados_obras', despesa?.obra) || {}
  const dMaterial = material || {}
  const { nome, snapshots } = await recuperarDado('fornecedores', fornecedor) || {}
  const cidade = snapshots?.cidade || {}

  const placeholder = `placeholder="Escolha o fornecedor"`

  controlesCxOpcoes.fornecedor = {
    base: 'fornecedores',
    retornar: ['nome'],
    funcaoAdicional: ['buscarLocalidadeFornecedor'],
    colunas: {
      'Nome': { chave: 'nome' },
      'Cidade': { chave: 'snapshots.cidade.nome' },
      'Distrito': { chave: 'snapshots.cidade.distrito' }
    }
  }

  controlesCxOpcoes.obra = {
    base: 'dados_obras',
    retornar: ['nome'],
    colunas: {
      'Nome': { chave: 'nome' }
    }
  }

  controlesCxOpcoes.material = {
    base: 'materiais',
    retornar: ['nome'],
    colunas: {
      'Nome': { chave: 'nome' }
    }
  }

  const linhas = [
    {
      texto: 'Fornecedor',
      elemento: `<span ${fornecedor ? `id="${fornecedor}"` : ''} name="fornecedor" class="opcoes" onclick="cxOpcoes('fornecedor')">${nome || 'Selecionar'}</span>`
    },
    { texto: 'Distrito', elemento: `<input ${placeholder} value="${cidade?.distrito || ''}" name="distrito" readOnly>` },
    { texto: 'Cidade', elemento: `<input ${placeholder} value="${cidade?.nome || ''}" name="cidade" readOnly>` },
    {
      texto: 'Número do Contribuinte',
      elemento: `<input ${placeholder} value="${numeroContribuinte || ''}" name="numeroContribuinte" readOnly>`
    },
    { texto: 'Valor', elemento: `<input name="valor" placeholder="Valor" type="number" value="${valor || ''}">` },
    { texto: 'IVA', elemento: `<input name="iva" placeholder="IVA" type="number" value="${iva || ''}">` },
    { texto: 'Data', elemento: `<input name="data" type="date" value="${data || ''}">` },
    {
      texto: 'Tipo de Material',
      elemento: `<span ${material ? `id="${material.id}"` : ''} name="material" class="opcoes" onclick="cxOpcoes('material')">${dMaterial?.nome || 'Selecionar'}</span>`
    },
    {
      texto: 'Obra',
      elemento: `<span name="obra" class="opcoes" onclick="cxOpcoes('obra')">${obra?.nome || 'Selecionar'}</span>`
    },
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

  deletar(`dados_despesas/${idDespesa}`)
  await deletarDB(`dados_despesas`, idDespesa)

}

async function salvarDespesa(idDespesa = ID5digitos()) {
  overlayAguarde()

  const despesa = await recuperarDado('dados_despesas', idDespesa) || {}

  const idMaterial = document.querySelector('[name="material"]')?.id
  const material = await recuperarDado('materiais', idMaterial) || {}

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
    const anexos = await importarAnexos({ input })
    despesa.fatura = anexos[0].link
  }

  const atualizado = {
    ...despesa,
    fornecedor: document.querySelector('[name="fornecedor"]')?.id,
    obra: document.querySelector('[name="obra"]')?.id,
    material,
    iva: Number(obVal('iva')),
    valor: Number(obVal('valor')),
    data: obVal('data')
  }

  enviar(`dados_despesas/${idDespesa}`, atualizado)
  await inserirDados({ [idDespesa]: atualizado }, 'dados_despesas')

  removerPopup()
}

async function buscarLocalidadeFornecedor() {

  const idFornecedor = document.querySelector('[name="fornecedor"]')?.id
  const fornecedor = await recuperarDado('fornecedores', idFornecedor)

  const cidade = fornecedor?.snapshots?.cidade || {}

  const painel = document.querySelector('.painel-padrao')
  painel.querySelector('[name="numeroContribuinte"]').value = fornecedor?.numeroContribuinte || '--'
  painel.querySelector('[name="cidade"]').value = cidade?.nome || '--'
  painel.querySelector('[name="distrito"]').value = cidade?.distrito || '--'

}

async function telaFornecedores() {

  const btnExtras = `
    <button onclick="adicionarFornecedor()">Adicionar</button>
    ${voltar}
  `

  const tabela = await modTab({
    btnExtras,
    base: 'fornecedores',
    pag: 'fornecedores',
    body: 'bodyFornecedores',
    criarLinha: 'criarLinhaFornecedores',
    colunas: {
      'Nome': { chave: 'nome' },
      'Número do Contribuinte': { chave: 'numeroContribuinte' },
      'Distrito': { chave: 'snapshots.cidade.distrito' },
      'Cidade': { chave: 'snapshots.cidade.nome' },
      'Editar': {}
    }
  })

  telaInterna.innerHTML = tabela

  await paginacao()

}

async function criarLinhaFornecedores(fornecedor) {

  const { id } = fornecedor || {}

  const cidade = await recuperarDado('cidades', fornecedor?.cidade) || {}

  const linha = `
      <tr>
          <td style="text-align: left;">${fornecedor.nome || ''}</td>
          <td>${fornecedor?.numeroContribuinte || ''}</td>
          <td>${cidade?.distrito || ''}</td>
          <td>${cidade?.nome || ''}</td>
          <td>
              <img onclick="adicionarFornecedor('${id}')" src="imagens/pesquisar.png">
          </td>
      </tr>
    `

  return linha

}

async function adicionarFornecedor(idFornecedor) {

  const fornecedor = await recuperarDado('fornecedores', idFornecedor)
  const { nome, distrito } = await recuperarDado('cidades', fornecedor?.cidade) || {}

  controlesCxOpcoes.cidade = {
    base: 'cidades',
    retornar: ['nome', 'distrito'],
    colunas: {
      'Cidade': { chave: 'nome' },
      'Distrito': { chave: 'distrito' },
      'Zona': { chave: 'zona' },
      'Área': { chave: 'area' }
    }
  }

  const dCidade = [nome, distrito]
    .filter(d => d)
    .join('\n')

  const linhas = [
    { texto: 'Nome', elemento: `<textarea name="nome">${fornecedor?.nome || ''}</textarea>` },
    { texto: 'Número do Contribuinte', elemento: `<input name="numeroContribuinte" value="${fornecedor?.numeroContribuinte || ''}">` },
    {
      texto: 'Cidade',
      elemento: `<span name="cidade" class="opcoes" onclick="cxOpcoes('cidade')">${dCidade || 'Selecionar'}</span>`
    }
  ]

  const botoes = [
    { texto: 'Salvar', img: 'concluido', funcao: idFornecedor ? `salvarFornecedor('${idFornecedor}')` : 'salvarFornecedor()' }
  ]

  if (idFornecedor)
    botoes.push({ texto: 'Excluir', img: 'cancel', funcao: '' })

  popup({ linhas, botoes, titulo: 'Formulário de Obra' })

}

async function salvarFornecedor(id = unicoID()) {

  overlayAguarde()

  const idCidade = document.querySelector('[name="cidade"]')?.id

  if (!idCidade)
    return popup({ mensagem: 'Selecione uma cidade' })

  const fornecedor = {
    id,
    nome: obVal('nome'),
    numeroContribuinte: obVal('numeroContribuinte'),
    cidade: idCidade
  }

  enviar(`fornecedores/${id}`, fornecedor)
  await inserirDados({ [id]: fornecedor }, 'fornecedores')

  removerPopup()
}

async function telaGenerica(nomeBase) {

  const btnExtras = `
        <button onclick="adicionarGenerico(undefined, '${nomeBase}')">Adicionar</button>
        ${voltar}
    `

  titulo.textContent = inicialMaiuscula(nomeBase)

  const tabela = await modTab({
    pag: 'generico',
    btnExtras,
    base: nomeBase,
    body: `bodyGenerico`,
    criarLinha: 'criarLinhaGenerica',
    colunas: {
      'Nome': { chave: 'nome' },
      'Preço': {},
      'Link': { chave: 'link' },
      'Editar': {}
    }
  })

  telaInterna.innerHTML = tabela

  await paginacao()

}

async function criarLinhaGenerica(dados) {

  const { id, nome, preco, link } = dados || {}

  const linha = `
    <tr>
      <td>${nome || ''}</td>
      <td>${dinheiro(preco) || ''}</td>
      <td>
        <a href="${link || '#'}" target="_blank" rel="noopener">
          ${link || ''}
        </a>
      </td>
      <td>
        <img src="imagens/pesquisar.png" onclick="adicionarGenerico('${id}')">
      </td>
    </tr>
  `

  return linha
}

async function adicionarGenerico(id) {

  const { base } = controles?.generico || {}

  const dados = await recuperarDado(base, id) || {}

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
    { texto: 'Salvar', img: 'concluido', funcao: id ? `salvarGenerico('${id}')` : `salvarGenerico()` },
  ]

  if (id)
    botoes.push({ texto: 'Excluir', img: 'cancel', funcao: `confirmarExcluirGenerico('${id}')` })

  const titulo = id ? 'Salvar Item' : 'Editar Item'
  popup({ linhas, botoes, titulo })

}

async function salvarGenerico(id = ID5digitos()) {

  overlayAguarde()

  const { base } = controles?.generico || {}

  const dados = {
    id,
    nome: obVal('nome'),
    preco: Number(obVal('preco')),
    link: obVal('link')
  }

  enviar(`${base}/${id}`, dados)
  await inserirDados({ [id]: dados }, base)

  removerPopup()

}

function confirmarExcluirGenerico(id) {

  const botoes = [
    { texto: 'Confirmar', img: 'concluido', funcao: `excluirGenerico('${id}')` }
  ]

  popup({ botoes, mensagem: 'Tem certeza?', nra: false })

}

async function excluirGenerico(id) {

  overlayAguarde()

  const { base } = controles?.generico || {}

  await deletarDB(base, id)
  deletar(`${base}/${id}`)

  removerOverlay()

}
