const voltar = `<button onclick="telaDespesas()">Voltar</button>`

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
  tela.innerHTML = acumulado

}

async function verificarDespesas() {

  telaAtiva = 'despesas'

  const btnExtras = `
    <div style="display: flex; flex-wrap: wrap; gap: 3px;">
      <button onclick="cconfirmarBaixarExcel()">Excel</button>
      <button onclick="formularioDespesa()">Adicionar</button>
      <button onclick="telaDespesas()">Voltar</button>
    </div>
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
      'Número do Contribuinte': { chave: 'snapshots.fornecedor.numero_contribuinte' },
      'Valor': { chave: 'valor' },
      'IVA': { chave: 'iva' },
      'Ano': { chave: 'snapshots.ano', tipoPesquisa: 'select' },
      'Mês': { chave: 'snapshots.mes', tipoPesquisa: 'select' },
      'Data': { chave: 'data', tipoPesquisa: 'data' },
      'Fatura': {},
      'Tipo de Material': { chave: 'material.nome' },
      'Obra': {},
      'Detalhes': {},
    }
  })

  tela.innerHTML = `<div style="width: 90%;">${tabela}</div>`

  await paginacao()

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
        <td>${fornecedor?.numero_contribuinte || ''}</td>
        <td>${dinheiro(valor)}</td>
        <td>${dinheiro(iva)}</td>
        <td>${ano || ''}</td>
        <td>${meses[mes] || ''}</td>
        <td>
            <span>${data ? `${dia}/${mes}/${ano}` : ''}</span>
        </td>
        <td>${ax(fatura)}</td>
        <td>${material?.nome || ''}</td>
        <td></td>
        <td>
            <img data-controle="editar" src="imagens/pesquisar.png" onclick="formularioDespesa('${id}')">
        </td>
    `

  return `<tr>${tds}</td>`

}

async function formularioDespesa(idDespesa) {

  const { numero_contribuinte, material, data, iva, valor, despesa, fornecedor } = await recuperarDado('dados_despesas', idDespesa) || {}
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
    {
      texto: 'Distrito',
      elemento: `<input ${placeholder} value="${cidade?.distrito || ''}" name="distrito" readOnly>`
    },
    {
      texto: 'Cidade',
      elemento: `<input ${placeholder} value="${cidade?.nome || ''}" name="cidade" readOnly>`
    },
    {

      texto: 'Número do Contribuinte',
      elemento: `<input ${placeholder} value="${numero_contribuinte || ''}" name="numero_contribuinte" readOnly>`
    },
    {
      texto: 'Valor',
      elemento: `<input name="valor" placeholder="Valor" type="number" value="${valor || ''}">`
    },
    {
      texto: 'IVA',
      elemento: `<input name="iva" placeholder="IVA" type="number" value="${iva || ''}">`
    },
    {
      texto: 'Data',
      elemento: `<input name="data" type="date" value="${data || ''}">`
    },
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

  if (idDespesa)
    botoes.push({ texto: 'Excluir', img: 'cancel', funcao: `confirmarExclusaoDespesa('${idDespesa}')` })

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

  await deletar(`dados_despesas/${idDespesa}`)

}

async function salvarDespesa(idDespesa = crypto.randomUUID()) {
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

  await enviar(`dados_despesas/${idDespesa}`, atualizado)

  removerPopup()
}

async function buscarLocalidadeFornecedor() {

  const idFornecedor = document.querySelector('[name="fornecedor"]')?.id
  const fornecedor = await recuperarDado('fornecedores', idFornecedor)

  const cidade = fornecedor?.snapshots?.cidade || {}

  const painel = document.querySelector('.painel-padrao')
  painel.querySelector('[name="numero_contribuinte"]').value = fornecedor?.numero_contribuinte || '--'
  painel.querySelector('[name="cidade"]').value = cidade?.nome || '--'
  painel.querySelector('[name="distrito"]').value = cidade?.distrito || '--'

}

async function telaFornecedores() {

  const btnExtras = `
  <div style="${horizontal}; gap: 2px;">
    <button onclick="adicionarFornecedor()">Adicionar</button>
    ${voltar}
  </div>
  `

  const tabela = await modTab({
    btnExtras,
    base: 'fornecedores',
    pag: 'fornecedores',
    body: 'bodyFornecedores',
    criarLinha: 'criarLinhaFornecedores',
    colunas: {
      'Nome': { chave: 'nome' },
      'Número do Contribuinte': { chave: 'numero_contribuinte' },
      'Distrito': { chave: 'snapshots.cidade.distrito' },
      'Cidade': { chave: 'snapshots.cidade.nome' },
      'Editar': {}
    }
  })

  tela.innerHTML = tabela

  await paginacao()

}

async function criarLinhaFornecedores(fornecedor) {

  const { id } = fornecedor || {}

  const cidade = await recuperarDado('cidades', fornecedor?.cidade) || {}

  const linha = `
      <tr>
          <td style="text-align: left;">${fornecedor.nome || ''}</td>
          <td>${fornecedor?.numero_contribuinte || ''}</td>
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
    { texto: 'Número do Contribuinte', elemento: `<input name="numero_contribuinte" value="${fornecedor?.numero_contribuinte || ''}">` },
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
    numero_contribuinte: obVal('numero_contribuinte'),
    cidade: idCidade
  }

  await enviar(`fornecedores/${id}`, fornecedor)

  removerPopup()

}

async function telaGenerica(nomeBase) {

  const btnExtras = `
      <div style="${horizontal}; gap: 2px;">
        <button onclick="adicionarGenerico(undefined, '${nomeBase}')">Adicionar</button>
        ${voltar}
      </div>
    `

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

  tela.innerHTML = tabela

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

async function salvarGenerico(id = crypto.randomUUID()) {

  overlayAguarde()

  const { base } = controles?.generico || {}

  const dados = {
    id,
    nome: obVal('nome'),
    preco: Number(obVal('preco')),
    link: obVal('link')
  }

  await enviar(`${base}/${id}`, dados)

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

  await deletar(`${base}/${id}`)

  removerOverlay()

}

async function cconfirmarBaixarExcel() {

  controles.filtros

  popup({
    mensagem: 'Verifique os filtros antes de baixar o Excel, <br>do contrário será baixadado todos os <b>meses</b> e <b>anos</b> no arquivo, <br>continuar?',
    botoes: [
      {
        texto: 'Baixar',
        img: 'planilha',
        funcao: 'baixarExcelDespesas()'
      }
    ]
  })

}

async function baixarExcelDespesas() {

  overlayAguarde()

  try {

    const ano = controles?.despesas?.filtros?.['snapshots.ano']?.value
    const mes = controles?.despesas?.filtros?.['snapshots.mes']?.value
    const { token } = JSON.parse(localStorage.getItem('acesso')) || {}

    const response = await fetch(`${api}/exportar-despesas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ mes, ano })
    })

    if (!response.ok) {
      let erro = 'Erro ao baixar arquivo';
      try {
        const json = await response.json();
        erro = json.erro || json.detalhe || erro;
      } catch (_) { }
      throw new Error(erro);
    }

    const blob = await response.blob();

    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const fileName = match?.[1] || `despesas_${Date.now()}.xlsx`;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);

    removerTodosPopups()

  } catch (error) {

    console.error(error)
    popup({ mensagem: `Falha ao gerar o Excel: ${error}` })

  }


}