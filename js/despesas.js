
async function telaFerramentas() {

  await telaGenerica('ferramentas', 'Ferramentas')

}

async function telaMaoObra() {

  await telaGenerica('mao_obra', 'Mão de Obra')

}

async function telaMateriais() {

  await telaGenerica('materiais', 'Materiais')

}

async function verificarDespesas() {

  try {

    overlayAguarde()

    const tabela = await modTab({
      btnExtras: '<button onclick="formularioDespesa()">Adicionar Despesa</button>',
      pag: 'despesas',
      base: 'vw_despesas',
      body: 'bodyDespesas',
      criarLinha: 'criarLinhaDespesa',
      colunas: {
        'Fornecedor': { chave: 'nome_fornecedor' },
        'Distrito': { chave: 'distrito' },
        'Cidade': { chave: 'nome_cidade' },
        'Número do Contribuinte': { chave: 'nif' },
        'Valor': { chave: 'valor' },
        'IVA': { chave: 'iva' },
        'Ano': { chave: 'snapshots.ano', tipoPesquisa: 'select' },
        'Mês': { chave: 'snapshots.mes', tipoPesquisa: 'select' },
        'Data': { chave: 'data', tipoPesquisa: 'data' },
        'Fatura': {},
        'Quantidade': {},
        'Especialidade': { chave: 'especialidade' },
        'Material': { chave: 'material' },
        'Obra': {},
        'Detalhes': {}
      }
    })

    tela.innerHTML = montarPagina({ titulo: 'Despesas', imagem: 'contas', tabela })

    await paginacao()

    removerOverlay()

  } catch (err) {
    console.log(err)
    popup({ mensagem: 'Falha ao abrir a tela de Despesas: Fale com o suporte.' })
  }

}

function criarLinhaDespesa(dados) {

  const {
    nome_fornecedor,
    nome_cidade,
    distrito,
    nif,
    id,
    valor,
    iva,
    fatura,
    material,
    especialidade,
    quantidade,
    data,
    mes,
    ano,
    obra
  } = dados || {}

  const tagObra = obra
    ? `<span class="tag-usuario">${obra}</span>`
    : ''

  const ax = (link) => {
    if (!link) return ''
    return `
        <img onclick="abrirArquivo('${link}')" src="imagens/contas.png">
        <input name="link" style="display: none;" value="${link}">
        `
  }

  tds = `
        <td>${nome_fornecedor || ''}</td>
        <td>${nome_cidade || ''}
        <td>${distrito || ''}
        <td>${nif || ''}</td>
        <td style="white-space: nowrap;">${dinheiro(valor)}</td>
        <td style="white-space: nowrap;">${dinheiro(iva)}</td>
        <td>${ano || ''}</td>
        <td>${mes || ''}</td>
        <td>${data || ''}</td>
        <td>${ax(fatura)}</td>
        <td>${quantidade || ''}</td>
        <td>${especialidade || ''}</td>
        <td>${material || ''}</td>
        <td>${tagObra}</td>
        <td>
            <img data-controle="editar" src="imagens/pesquisar.png" onclick="formularioDespesa('${id}')">
        </td>
    `

  return `<tr>${tds}</td>`

}

async function formularioDespesa(idDespesa) {

  try {

    overlayAguarde()

    const {
      numero_contribuinte,
      data,
      especialidade,
      material,
      iva,
      valor,
      fornecedor,
      quantidade,
      obra
    } = await recuperarDado('dados_despesas', idDespesa) || {}

    const { resultados } = await pesquisarDB({ base: 'especialidades' }) || {}
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
      retornar: ['ordem'],
      colunas: {
        'Número': { chave: 'ordem' },
        'Cidade': { chave: 'snapshots.cidade.nome' },
        'Distrito': { chave: 'snapshots.cidade.distrito' }
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
        texto: 'Quantidade',
        elemento: `<input name="quantidade" placeholder="Quantidade" type="number" value="${quantidade || ''}">`
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
        texto: 'Especialidade',
        elemento: `
          <select name="especialidade">
            ${resultados.map(res => `<option ${especialidade == res.nome ? 'selected' : ''}>${res.nome}</option>`).join('')}
          </select>
          `
      },
      {
        texto: 'Material',
        elemento: `<textarea placeholder="Descrição do material" name="material">${material || ''}</textarea>`
      },
      {
        texto: 'Obra',
        elemento: `<span ${obra ? `id="${obra}"` : ''} name="obra" class="opcoes" onclick="cxOpcoes('obra')">${obra || 'Selecionar'}</span>`
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
            `
      }
    ]

    const botoes = [
      { texto: 'Salvar', funcao: idDespesa ? `salvarDespesa('${idDespesa}')` : 'salvarDespesa()', img: 'concluido' }
    ]

    if (idDespesa)
      botoes.push({ texto: 'Excluir', img: 'cancel', funcao: `confirmarExclusaoDespesa('${idDespesa}')` })

    popup({ linhas, botoes, titulo: 'Gerenciar Despesa' })

    alterarModal()

  } catch (err) {
    console.error(err)
    popup({ mensagem: 'Falha ao abrir o formulário: Fale com o suporte.' })
  }
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
    { texto: 'Confirmar', img: 'concluido', funcao: `excluirDespesa('${idDespesa}')`, fechar: true }
  ]
  popup({ mensagem: 'Tem cezesa?', botoes, titulo: 'Exclusão de Despesa', removerAnteriores: true })
}

async function excluirDespesa(idDespesa) {

  await deletar(`dados_despesas/${idDespesa}`)

}

async function salvarDespesa(idDespesa = crypto.randomUUID()) {

  try {

    overlayAguarde()

    const despesa = await recuperarDado('dados_despesas', idDespesa) || {}

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
      fornecedor: obVal('fornecedor'),
      obra: document.querySelector('[name="obra"]').textContent.trim(),
      especialidade: obVal('especialidade'),
      material: obVal('material'),
      quantidade: Number(obVal('quantidade') || 0),
      iva: Number(obVal('iva')),
      valor: Number(obVal('valor')),
      data: obVal('data')
    }

    if (!atualizado.fornecedor || !atualizado.valor || !atualizado.data)
      return popup({ mensagem: 'Não deixe esses campos em branco: <br>Fornecedor, Valor e/ou Data.' })

    await enviar(`dados_despesas/${idDespesa}`, atualizado)

    removerPopup()

  } catch (err) {
    console.error(err)
    popup({ mensagem: 'Falha ao salvar a despesa: Fale com o suporte.' })
  }
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

  try {

    overlayAguarde()

    const tabela = await modTab({
      btnExtras: '<button onclick="adicionarFornecedor()">Adicionar</button>',
      base: 'fornecedores',
      pag: 'fornecedores',
      body: 'bodyFornecedores',
      criarLinha: 'criarLinhaFornecedores',
      colunas: {
        'Data da Criação': {},
        'Nome': { chave: 'nome' },
        'Morada Fiscal': { chave: 'morada_fiscal' },
        'Zona': { chave: 'snapshots.cidade.zona', tipoPesquisa: 'select' },
        'Distrito': { chave: 'snapshots.cidade.distrito', tipoPesquisa: 'select' },
        'Cidade': { chave: 'snapshots.cidade.nome', tipoPesquisa: 'select' },
        'E-mail': { chave: 'email' },
        'Telefone': { chave: 'telefone' },
        'Detalhes': {}
      }
    })

    tela.innerHTML = montarPagina({ tabela, titulo: 'Fornecedores', imagem: 'fornecedor' })

    await paginacao()

    removerOverlay()

  } catch (err) {
    console.log(err)
    popup({ mensagem: 'Falha ao abrir a tela de Fornecedores: Fale com o suporte.' })
  }

}

async function criarLinhaFornecedores(dados) {

    const {
        timestamp,
        snapshots,
        id,
        email,
        telefone,
        nome,
        morada_fiscal,
    } = dados || {}

  const cidade = snapshots?.cidade || {}

  const linha = `
      <tr>
        <td>${new Date(timestamp).toLocaleString()}</td>
        <td>${nome || ''}</td>
        <td>${morada_fiscal || ''}</td>
        <td>${cidade?.zona || ''}
        <td>${cidade?.distrito || ''}
        <td>${cidade?.nome || ''}
        <td>${email || ''}</td>
        <td>${telefone || ''}</td>
        <td>
            <img onclick="adicionarFornecedor('${id}')" src="imagens/pesquisar.png">
        </td>
      </tr>
    `

  return linha

}

async function adicionarFornecedor(idFornecedor = crypto.randomUUID()) {

  try {

    overlayAguarde()

    const {
      nome,
      telefone,
      cidade,
      email,
      morada_fiscal,
      numero_contribuinte
    } = await recuperarDado('fornecedores', idFornecedor) || {}

    const { nome: nomeCidade } = await recuperarDado('cidades', cidade) || {}

    controlesCxOpcoes.cidade = {
      base: 'cidades',
      retornar: ['nome'],
      funcaoAdicional: ['verificarRegras'],
      colunas: {
        'Cidade': { chave: 'nome' },
        'Distrito': { chave: 'distrito' },
        'Zona': { chave: 'zona' },
        'Área': { chave: 'area' }
      }
    }

    const linhas = [
      {
        texto: 'Nome',
        elemento: `<textarea oninput="verificarRegras()" placeholder="Nome do Cliente" name="nome">${nome || ''}</textarea>`
      },
      {
        texto: 'Morada Fiscal',
        elemento: `<textarea placeholder="Morada Fiscal" name="morada_fiscal">${morada_fiscal || ''}</textarea>`
      },
      {
        texto: 'Número de Contribuinte',
        elemento: `<input oninput="verificarRegras()" placeholder="Limite 9 Dígitos" name="numero_contribuinte" value="${numero_contribuinte || ''}">`
      },
      {
        texto: 'Telefone',
        elemento: `<input oninput="verificarRegras()" placeholder="Limite 9 Dígitos" name="telefone" value="${telefone || ''}">`
      },
      {
        texto: 'E-mail',
        elemento: `<input oninput="verificarRegras()" placeholder="E-mail" name="email" value="${email || ''}">`
      },
      {
        texto: 'Cidade',
        elemento: `<span name="cidade" ${cidade ? `id="${cidade}"` : ''} class="opcoes" onclick="cxOpcoes('cidade')">${nomeCidade || 'Selecionar'}</span>`
      }
    ]

    const botoes = [
      { texto: 'Salvar', img: 'concluido', funcao: `salvarFornecedor('${idFornecedor}')` }
    ]

    popup({ linhas, botoes, titulo: 'Gerenciar Fornecedor' })

    verificarRegras()

  } catch (err) {
    console.error(err)
    popup({ mensagem: 'Falha ao abrir' })
  }

}

async function salvarFornecedor(id) {


  try {

    overlayAguarde()

    const { campos } = await verificarRegras()

    if (campos.length)
      return popup({
        imagem: 'gifs/interrogacao.gif',
        mensagem: `
              <div style="${vertical}; gap: 4px;">
                  <span>Verifique os campos inválidos:</span>
                  ${campos.map(c => `<span>• ${inicialMaiuscula(c)}</span>`).join('')}
              </div>
            `
      })

    const fornecedor = {
      nome: obVal('nome'),
      morada_fiscal: obVal('morada_fiscal'),
      numero_contribuinte: obVal('numero_contribuinte'),
      telefone: obVal('telefone'),
      email: obVal('email'),
      cidade: obVal('cidade')
    }

    await enviar(`fornecedores/${id}`, fornecedor)

    removerTodosPopups()

  } catch (err) {
    console.error(err)
    popup({ mensagem: 'Falha ao salvar o cliente: Fale com o suporte.' })
  }

}

async function telaGenerica(nomeBase, titulo) {

  try {

    overlayAguarde()

    const tabela = await modTab({
      pag: 'generico',
      btnExtras: `<button onclick="adicionarGenerico(undefined, '${nomeBase}')">Adicionar</button>`,
      base: nomeBase,
      body: `bodyGenerico`,
      criarLinha: 'criarLinhaGenerica',
      colunas: {
        'Nome': { chave: 'nome' },
        'Preço': {},
        ...(
          nomeBase !== 'mao_obra'
            ? { 'Link': { chave: 'link' } }
            : {}
        ),
        'Editar': {}
      }
    })

    tela.innerHTML = montarPagina({ tabela, titulo, imagem: 'pasta' })

    await paginacao()
    removerOverlay()

  } catch (err) {
    console.log(err)
    popup({ mensagem: `Falha ao abrir a tela de ${titulo}: Fale com o suporte.` })
  }


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

  try {
    overlayAguarde()

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

  } catch (err) {
    console.error(err)
    popup({ mensagem: 'Falha ao abrir o formulário: Fale com o suporte.' })
  }

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
    { texto: 'Confirmar', img: 'concluido', funcao: `excluirGenerico('${id}')`, fechar: true }
  ]

  popup({ botoes, mensagem: 'Tem certeza?', removerAnteriores: true })

}

async function excluirGenerico(id) {

  overlayAguarde()

  await deletar(`${base}/${id}`)

  removerOverlay()

}

async function confirmarBaixarExcel() {

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