let especialidades = null


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
      detalhes: true,
      base: 'vw_despesas',
      body: 'bodyDespesas',
      criarLinha: 'criarLinhaDespesa',
      colunas: {
        'Edição': {},
        'Obra': {},
        'Fornecedor': { chave: 'nome_fornecedor' },
        'Distrito': { chave: 'distrito' },
        'Cidade': { chave: 'nome_cidade' },
        'Número do Contribuinte': { chave: 'nif' },
        'Tipo da Despesa': { chave: 'tipo_despesa' },
        'Valor': { chave: 'valor' },
        'Ano': { chave: 'snapshots.ano', tipoPesquisa: 'select' },
        'Mês': { chave: 'snapshots.mes', tipoPesquisa: 'select' },
        'Data': { chave: 'data', tipoPesquisa: 'data' },
        'Fatura': {}
      }
    })

    document.querySelector('[name="titulo"]').textContent = 'Despesas'
    tela.innerHTML = tabela

    await paginacao()

    removerOverlay()

  } catch (err) {
    console.log(err)
    popup({ mensagem: 'Falha ao abrir a tela de Despesas: Fale com o suporte.' })
  }

}

function criarLinhaDespesa(dados) {

  const {
    tipo_despesa,
    nome_fornecedor,
    nome_cidade,
    distrito,
    nif,
    id,
    valor,
    fatura,
    material,
    data,
    mes,
    ano,
    obra
  } = dados || {}

  const tagObra = obra
    ? `<span class="etiquetas">${obra}</span>`
    : ''

  const ax = (link) => {
    if (!link) return ''
    return `
        <img onclick="abrirArquivo('${link}')" src="imagens/contas.png">
        <input name="link" style="display: none;" value="${link}">
        `
  }

  const etiquetaValor = tipo_despesa == 'Despesa'
    ? 'despesa'
    : 'credito'

  const tds = `
        <td>
            <img data-controle="editar" src="imagens/editar.svg" class="icone-editar" alt="Editar" title="Editar" onclick="formularioDespesa('${id}')">
        </td>
        <td>${tagObra}</td>
        <td>${nome_fornecedor || ''}</td>
        <td>${distrito || ''}</td>
        <td>${nome_cidade || ''}</td>
        <td>${nif || ''}</td>
        <td>${tipo_despesa}</td>
        <td style="white-space: nowrap;">
            <span class="${etiquetaValor}">${dinheiro(valor)}</span>
        </td>
        <td>${ano || ''}</td>
        <td>${mes || ''}</td>
        <td>${data || ''}</td>
        <td>${ax(fatura)}</td>
    `

  const materiais = Array.isArray(material) ? material : Object.values(material || {})
  const linhasMateriais = materiais.map(item => {
    const quantidade = Number(item.quantidade) || 0
    const valorUnitario = Number(item.valor) || 0
    return `<tr>
      <td>${escaparAtributo(item.descricao || 'Sem descrição')}</td>
      <td>${escaparAtributo(item.especialidade || '—')}</td>
      <td>${escaparAtributo(item.motivo || 'Não informado')}</td>
      <td class="despesa-numero">${quantidade}</td>
      <td class="despesa-numero">${dinheiro(valorUnitario)}</td>
      <td class="despesa-numero">${dinheiro(quantidade * valorUnitario)}</td>
    </tr>`
  }).join('')
  const totalMateriais = materiais.reduce((total, item) => total + (Number(item.quantidade) || 0) * (Number(item.valor) || 0), 0)
  return {
    linha: `<tr>${tds}</tr>`,
    detalhes: `<section class="despesa-materiais-detalhes"><h3>Materiais da despesa</h3>
      ${materiais.length ? `<div class="despesa-detalhes-recorte"><table class="tabela">
        <thead><tr><th>Descrição</th><th>Especialidade</th><th>Motivo</th><th>Quantidade</th><th>Valor unitário</th><th>Total</th></tr></thead>
        <tbody>${linhasMateriais}</tbody>
        <tfoot><tr><td colspan="5">Total dos materiais</td><td class="despesa-numero">${dinheiro(totalMateriais)}</td></tr></tfoot>
      </table></div>` : '<p>Nenhum material listado nesta despesa.</p>'}
    </section>`
  }

}

async function formularioDespesa(idDespesa) {

  try {

    overlayAguarde()

    const regras = `oninput="verificarRegras()"`
    const {
      tipo_despesa,
      data,
      material,
      valor,
      fornecedor,
      obra,
      fatura,
      foto
    } = await recuperarDado('dados_despesas', idDespesa) || {}

    const { nome } = await recuperarDado('fornecedores', fornecedor) || {}

    controlesCxOpcoes.fornecedor = {
      base: 'fornecedores',
      funcaoAdicional: ['verificarRegras'],
      retornar: ['nome'],
      colunas: {
        'Nome': { chave: 'nome' },
        'Cidade': { chave: 'snapshots.cidade.nome' },
        'Distrito': { chave: 'snapshots.cidade.distrito' }
      }
    }

    controlesCxOpcoes.obra = {
      base: 'dados_obras',
      funcaoAdicional: ['verificarRegras'],
      retornar: ['ordem'],
      colunas: {
        'Número': { chave: 'ordem' },
        'Cidade': { chave: 'snapshots.cidade.nome' },
        'Distrito': { chave: 'snapshots.cidade.distrito' }
      }
    }

    const opcoesTipos = ['Despesa', 'Nota de Crédito'].map(t => `
        <label class="despesa-radio">
          <input ${regras} ${tipo_despesa == t ? 'checked' : ''} data-tipo="${t}" name="tipo_despesa" type="radio">
          <span>${t}</span>
        </label>
      `).join('')

    const linhaAnexo = !foto && !fatura
      ? {
        texto: 'Upload Fatura', elemento: `
            <div style="${horizontal}; gap: 1rem;">
                <select id="modal" onchange="alterarModal(); verificarRegras()">
                    <option>Upload</option>
                    <option>Foto</option>
                </select>
                <div id="upload"></div>
            </div>
            `
      }
      : {
        elemento: `
          <div style="${horizontal}; gap: 1rem;">
            <img src="imagens/concluido.png">
            <span>Fatura já anexada</span>
          </div>
        `

      }

    const linhas = [
      linhaAnexo,
      {
        texto: 'Tipo de Despesa',
        elemento: `<div class="tipo-despesa" ${regras}>${opcoesTipos}</div>`
      },
      {
        texto: 'Fornecedor',
        elemento: `
          <span
            ${fornecedor ? `id="${fornecedor}"` : ''} 
            name="fornecedor" 
            class="opcoes" 
            onclick="cxOpcoes('fornecedor')">${nome || 'Selecionar'}</span>
          `
      },
      {
        texto: 'Data',
        elemento: `<input ${regras} name="data" type="date" value="${data || ''}">`
      },
      {
        texto: 'Obra',
        elemento: `<span ${obra ? `id="${obra}"` : ''} name="obra" class="opcoes" onclick="cxOpcoes('obra')">${obra || 'Selecionar'}</span>`
      },
      {
        texto: 'Materiais',
        elemento: `
          <div class="despesa-materiais">
            <div class="despesa-materiais-topo">
              <button type="button" class="despesa-adicionar" onclick="adicionarMaterial()">+ Adicionar material</button>
            </div>
            <div class="campo-materiais"></div>
          </div>
          `
      }
    ]

    const botoes = [
      { texto: 'Salvar', funcao: idDespesa ? `salvarDespesa('${idDespesa}')` : 'salvarDespesa()', img: 'concluido' }
    ]

    if (idDespesa)
      botoes.push({ texto: 'Excluir', img: 'cancel', funcao: `confirmarExclusaoDespesa('${idDespesa}')` })

    const idPopup = popup({ linhas, botoes, titulo: 'Gerenciar Despesa' })
    const modalDespesa = document.getElementById(idPopup)
    modalDespesa.classList.add('popup-despesa')
    modalDespesa.querySelector('.rodape-padrao').insertAdjacentHTML('afterbegin', `
      <div class="despesa-total"><small>Total da despesa</small><span class="total-despesa">${dinheiro(valor)}</span></div>
    `)

    alterarModal()

    for (const item of Array.isArray(material) ? material : Object.values(material || {}))
      await adicionarMaterial(item)

    calcularTotalDespesa()

    verificarRegras()

  } catch (err) {
    console.error(err)
    popup({ mensagem: 'Falha ao abrir o formulário: Fale com o suporte.' })
  }
}

async function adicionarMaterial(dados = {}) {

  try {

    overlayAguarde()

    if (!especialidades) {
      const { resultados } = await pesquisarDB({ base: 'especialidades' }) || {}
      especialidades = resultados
    }

    const painel = [...document.querySelectorAll('.painel-padrao')].at(-1)
    const local = painel.querySelector('.campo-materiais')

    const opcoes = especialidades
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map(res => {
        return `<option ${dados.especialidade === res.nome ? 'selected' : ''}>${escaparAtributo(res.nome)}</option>`
      })
      .join('')

    const mod = (titulo, elemento) => {

      return `
      <div class="despesa-campo">
        <span>${titulo}</span>
        ${elemento}
      </div>
    `
    }

    const nomeMotivo = `motivo_material_${crypto.randomUUID()}`
    const opcoesMotivo = ['Má execução', 'Necessidade'].map(motivo => `
      <label class="despesa-radio">
        <input type="radio" name="${nomeMotivo}" data-campo="motivo" value="${motivo}" ${(dados.motivo || 'Necessidade') === motivo ? 'checked' : ''}>
        <span>${motivo}</span>
      </label>
    `).join('')

    const item = `
      <div class="item-material">

        <div class="despesa-material-topo"><strong>Material</strong>
          <button type="button" class="despesa-remover" aria-label="Remover material" onclick="this.closest('.item-material').remove(); calcularTotalDespesa();">&times;</button>
        </div>

        <div class="despesa-material-campos">

          ${mod('Quantidade', `<input oninput="calcularTotalDespesa()" type="number" name="quantidade" placeholder="Quantidade" value="${escaparAtributo(dados.quantidade ?? '')}">`)}
          ${mod('Valor', `<input oninput="calcularTotalDespesa()" type="number" name="valor" placeholder="Valor" value="${escaparAtributo(dados.valor ?? '')}">`)}
          ${mod('Especialidade', `
            <select name="especialidade">
              ${opcoes}
            </select>
          `)}

        </div>

        ${mod('Descrição do Material', `<textarea name="descricao" placeholder="Descrição do material">${escaparAtributo(dados.descricao || '')}</textarea>`)}
        ${mod('Motivo do material', `<div class="despesa-motivos">${opcoesMotivo}</div>`)}
        
      </div>
    `
    local.insertAdjacentHTML('beforeend', item)

    removerOverlay()

  } catch (err) {
    console.error(err)
    popup({ mensagem: 'Falha ao adicionar um campo: Fale com o suporte.' })
  }

}

function calcularTotalDespesa() {

  let total = 0

  for (const item of [...document.querySelectorAll('.item-material')]) {

    const quantidade = (item.querySelector('[name="quantidade"]').value || 0)
    const valor = (item.querySelector('[name="valor"]').value || 0)

    total += quantidade * valor

  }

  const local = document.querySelector('.total-despesa')
  if (local)
    local.textContent = dinheiro(total)

}

function alterarModal() {

  const modal = document.getElementById('modal')
  if (!modal)
    return

  const upload = `<input onchange="verificarRegras()" name="fatura" type="file">`

  const foto = `
      <div style="${vertical}; gap: 5px;">
          <img src="imagens/camera.png" class="cam" onclick="abrirCamera()">
          <div class="cameraDiv">
              <button onclick="tirarFoto()">Tirar Foto</button>
              <video autoplay playsinline></video>
              <canvas style="display: none;"></canvas>
          </div>
          <img onchange="verificarRegras()" name="foto">
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

    const despesa = await recuperarDado('dados_despesas', idDespesa) || {}

    // Foto da Fatura
    const foto = document.querySelector('[name="foto"]')
    if (foto && foto.src && !foto.src.includes(api)) {
      const resposta = await importarAnexos({ foto: foto.src });

      if (resposta[0].link) {
        despesa.fatura = resposta[0].link;
      } else {
        removerOverlay()
        return popup({ mensagem: 'Falha no envio da Foto: tente novamente.' })
      }
    }

    // Arquivo da fatura (ex: pdf)
    const input = document.querySelector('[name="fatura"]');
    if (input?.files?.length === 1) {
      const anexos = await importarAnexos({ input })
      despesa.fatura = anexos[0].link
    }

    // Tipo despesa
    const tipo_despesa = [...document.querySelectorAll('[name="tipo_despesa"]:checked')][0].dataset.tipo

    // Materiais
    const material = [...document.querySelectorAll('.item-material')]
      .map(div => {

        return {
          quantidade: Number(div.querySelector('[name="quantidade"]').value || 0),
          especialidade: div.querySelector('[name="especialidade"]').value,
          descricao: div.querySelector('[name="descricao"]').value,
          valor: Number(div.querySelector('[name="valor"]').value || 0),
          motivo: div.querySelector('[data-campo="motivo"]:checked')?.value || 'Necessidade'
        }

      })

    const atualizado = {
      ...despesa,
      tipo_despesa,
      material,
      fornecedor: obVal('fornecedor'),
      obra: document.querySelector('[name="obra"]').textContent.trim(),
      data: obVal('data'),
      valor: conversor(document.querySelector('.total-despesa').textContent)
    }

    await enviar(`dados_despesas/${idDespesa}`, atualizado)

    removerPopup()

  } catch (err) {
    console.error(err)
    popup({ mensagem: 'Falha ao salvar a despesa: Fale com o suporte.' })
  }
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

    document.querySelector('[name="titulo"]').textContent = 'Fornecedores'
    tela.innerHTML = tabela

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
    morada_fiscal
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
            <img onclick="adicionarFornecedor('${id}')" src="imagens/editar.svg" class="icone-editar" alt="Editar" title="Editar">
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
        elemento: `<textarea oninput="verificarRegras()" placeholder="Morada Fiscal" name="morada_fiscal">${morada_fiscal || ''}</textarea>`
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

    document.querySelector('[name="titulo"]').textContent = titulo
    tela.innerHTML = tabela

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
        <img src="imagens/editar.svg" class="icone-editar" alt="Editar" title="Editar" onclick="adicionarGenerico('${id}')">
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
