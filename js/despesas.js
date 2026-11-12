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

    // Seleção para o Excel: começa vazia; o Excel é só para o CEO e o Diretor Programador.
    selecaoDespesas.todos = false
    selecaoDespesas.ids.clear()
    totaisObrasDespesas.clear()
    const podeExcel = podeExcelDespesas()

    const tabela = await modTab({
      btnExtras: `<div class="acoes-colaboradores">
        ${podeExcel ? `<label class="selecionar-todos"><input type="checkbox" data-selecionar-todas-despesas onchange="selecionarTodasDespesas(this.checked)"> Selecionar todas</label>
        <button type="button" onclick="baixarExcelDespesas()">Descarregar em Excel</button>` : ''}
        <button onclick="formularioDespesa()">Adicionar Despesa</button>
      </div>`,
      pag: 'despesas',
      detalhes: true,
      base: 'vw_despesas',
      body: 'bodyDespesas',
      criarLinha: 'criarLinhaDespesa',
      colunas: {
        ...(podeExcel ? { 'Selecionar': {} } : {}),
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
    popup({ mensagem: 'Falha ao abrir o ecrã de Despesas: Fale com o suporte.' })
  }

}

// ---------- Tipos de despesa e IVA ----------
// "Despesa" (registos antigos) é a atual "Despesa Extra de Obra". A Despesa Interna Empresa não tem obra
// e só o CEO e o Diretor Programador a podem lançar.
const TIPOS_DESPESA = ['Despesa Extra de Obra', 'Despesa Inicial de Obra', 'Despesa Interna Empresa', 'Nota de Crédito']
const TAXAS_IVA = [23, 6, 13]
const nomeTipoDespesa = tipo => tipo === 'Despesa' ? 'Despesa Extra de Obra' : tipo || ''
const podeExcelDespesas = () => ['CEO', 'Diretor Programador'].includes(acesso?.funcao)
const podeDespesaInterna = () => ['CEO', 'Diretor Programador'].includes(acesso?.funcao)
const ehDespesaExtra = tipo => ['Despesa', 'Despesa Extra de Obra'].includes(tipo)

// ---------- Seleção para o Excel ----------
const selecaoDespesas = { todos: false, ids: new Set() }

function selecionarTodasDespesas(marcado) {
  selecaoDespesas.todos = marcado
  selecaoDespesas.ids.clear()
  document.querySelectorAll('#bodyDespesas [data-selecionar-despesa]').forEach(caixa => {
    caixa.checked = marcado
    if (marcado) selecaoDespesas.ids.add(caixa.value)
  })
}

function selecionarDespesa(caixa) {
  if (caixa.checked) selecaoDespesas.ids.add(caixa.value)
  else selecaoDespesas.ids.delete(caixa.value)
  if (!caixa.checked && selecaoDespesas.todos) {
    selecaoDespesas.todos = false
    const todas = document.querySelector('[data-selecionar-todas-despesas]')
    if (todas) todas.checked = false
  }
}

// ---------- Totais da obra nos detalhes ----------
// Estimado: custos de material e de ferramentas do orçamento. Extra: despesas extra de obra (menos notas de crédito),
// por categoria de cada item. Diferença = Extra (o que se comprou além do orçamentado).
const totaisObrasDespesas = new Map()

function totaisObraDespesa(contrato) {
  if (!contrato) return Promise.resolve(null)
  if (!totaisObrasDespesas.has(contrato)) totaisObrasDespesas.set(contrato, (async () => {
    const [obra, despesas] = await Promise.all([
      pesquisarDB({ base: 'vw_dados_orcamentos', filtros: { contrato: { op: '=', value: contrato } }, pagina: 1, limite: 1 }),
      pesquisarDB({ base: 'vw_despesas', filtros: { obra: { op: '=', value: contrato } }, pagina: 1, limite: 1000 })
    ])
    const o = obra?.resultados?.[0] || {}
    const extra = { Material: 0, Ferramenta: 0 }
    for (const d of despesas?.resultados || []) {
      const sinal = ehDespesaExtra(d.tipo_despesa) ? 1 : d.tipo_despesa === 'Nota de Crédito' ? -1 : 0
      if (!sinal) continue
      const itens = Array.isArray(d.material) ? d.material : Object.values(d.material || {})
      for (const item of itens)
        extra[item.categoria === 'Ferramenta' ? 'Ferramenta' : 'Material'] += sinal * (Number(item.quantidade) || 0) * (Number(item.valor) || 0)
    }
    return { material: { estimado: Number(o.total_materiais) || 0, extra: extra.Material }, ferramentas: { estimado: Number(o.total_ferramentas) || 0, extra: extra.Ferramenta } }
  })().catch(erro => { totaisObrasDespesas.delete(contrato); throw erro }))
  return totaisObrasDespesas.get(contrato)
}

function htmlTotaisObra(contrato, t) {
  const linha = (rotulo, valor) => `<tr><td>${rotulo}</td><td class="despesa-numero">${dinheiro(valor)}</td></tr>`
  return `<section class="despesa-materiais-detalhes"><h3>Custos da obra ${escaparAtributo(contrato)} face ao orçamento</h3>
    <div class="despesa-totais-obra">
      <table class="tabela"><thead><tr><th>Material</th><th></th></tr></thead><tbody>
        ${linha('Total Material Estimado', t.material.estimado)}${linha('Total Material Extra', t.material.extra)}${linha('Total Material Diferença', t.material.extra)}
      </tbody></table>
      <table class="tabela"><thead><tr><th>Ferramentas</th><th></th></tr></thead><tbody>
        ${linha('Total Ferramentas Estimado', t.ferramentas.estimado)}${linha('Total Ferramentas Extra', t.ferramentas.extra)}${linha('Total Ferramentas Diferença', t.ferramentas.extra)}
      </tbody></table>
    </div>
  </section>`
}

async function criarLinhaDespesa(dados) {

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
    obra,
    iva,
    taxa_iva
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

  const etiquetaValor = tipo_despesa == 'Nota de Crédito'
    ? 'credito'
    : 'despesa'

  const tdSelecionar = podeExcelDespesas()
    ? `<td><input type="checkbox" data-selecionar-despesa value="${escaparAtributo(id)}" aria-label="Selecionar despesa"
        ${selecaoDespesas.todos || selecaoDespesas.ids.has(String(id)) ? 'checked' : ''} onchange="selecionarDespesa(this)"></td>`
    : ''

  const tds = `
        ${tdSelecionar}
        <td>
            <img data-controle="editar" src="imagens/editar.svg" class="icone-editar" alt="Editar" title="Editar" onclick="formularioDespesa('${id}')">
        </td>
        <td>${tagObra}</td>
        <td>${nome_fornecedor || ''}</td>
        <td>${distrito || ''}</td>
        <td>${nome_cidade || ''}</td>
        <td>${nif || ''}</td>
        <td>${escaparAtributo(nomeTipoDespesa(tipo_despesa))}</td>
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
      <td>${item.categoria === 'Ferramenta' ? 'Ferramenta' : 'Material'}</td>
      <td>${escaparAtributo(item.descricao || 'Sem descrição')}</td>
      <td>${escaparAtributo(item.especialidade || '—')}</td>
      <td>${escaparAtributo(item.motivo || 'Não informado')}</td>
      <td class="despesa-numero">${quantidade}</td>
      <td class="despesa-numero">${dinheiro(valorUnitario)}</td>
      <td class="despesa-numero">${dinheiro(quantidade * valorUnitario)}</td>
    </tr>`
  }).join('')
  const totalMateriais = materiais.reduce((total, item) => total + (Number(item.quantidade) || 0) * (Number(item.valor) || 0), 0)
  let totaisObra = ''
  try {
    const t = await totaisObraDespesa(obra)
    if (t) totaisObra = htmlTotaisObra(obra, t)
  } catch (erro) { console.error(erro) }
  return {
    linha: `<tr>${tds}</tr>`,
    detalhes: `<section class="despesa-materiais-detalhes"><h3>Materiais da despesa</h3>
      ${materiais.length ? `<div class="despesa-detalhes-recorte"><table class="tabela">
        <thead><tr><th>Categoria</th><th>Descrição</th><th>Especialidade</th><th>Motivo</th><th>Quantidade</th><th>Valor unitário</th><th>Total</th></tr></thead>
        <tbody>${linhasMateriais}</tbody>
        <tfoot><tr><td colspan="6">Total dos materiais</td><td class="despesa-numero">${dinheiro(totalMateriais)}</td></tr></tfoot>
      </table></div>` : '<p>Nenhum material listado nesta despesa.</p>'}
      ${Number(taxa_iva) ? `<p>IVA ${taxa_iva}%: ${dinheiro(iva)}</p>` : ''}
    </section>${totaisObra}`
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
      foto,
      taxa_iva
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
      base: 'vw_dados_orcamentos',
      filtros: { em_obra: { op: '=', value: true } },
      funcaoAdicional: ['verificarRegras'],
      retornar: ['contrato'],
      colunas: {
        'Número': { chave: 'contrato' },
        'Cidade': { chave: 'snapshots.cidade.nome' },
        'Distrito': { chave: 'snapshots.cidade.distrito' }
      }
    }

    // A Despesa Interna Empresa só aparece para o CEO e o Diretor Programador (ou se a despesa já for desse tipo).
    const tipoAtual = nomeTipoDespesa(tipo_despesa)
    const opcoesTipos = TIPOS_DESPESA
      .filter(t => t !== 'Despesa Interna Empresa' || podeDespesaInterna() || tipoAtual === t)
      .map(t => `
        <label class="despesa-radio">
          <input ${regras} ${tipoAtual == t ? 'checked' : ''} data-tipo="${t}" name="tipo_despesa" type="radio" onchange="alternarObraDespesa()">
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
        texto: 'IVA',
        elemento: `<select name="taxa_iva" ${regras}><option value="">Selecione o IVA</option>${TAXAS_IVA.map(t => `<option value="${t}" ${Number(taxa_iva) === t ? 'selected' : ''}>${t}%</option>`).join('')}</select>`
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
      { texto: 'Guardar', funcao: idDespesa ? `salvarDespesa('${idDespesa}')` : 'salvarDespesa()', img: 'concluido' }
    ]

    if (idDespesa)
      botoes.push({ texto: 'Eliminar', img: 'cancel', funcao: `confirmarExclusaoDespesa('${idDespesa}')` })

    const idPopup = popup({ linhas, botoes, titulo: 'Gerir Despesa' })
    const modalDespesa = document.getElementById(idPopup)
    modalDespesa.classList.add('popup-despesa')
    modalDespesa.querySelector('.rodape-padrao').insertAdjacentHTML('afterbegin', `
      <div class="despesa-total"><small>Total da despesa</small><span class="total-despesa">${dinheiro(valor)}</span></div>
    `)

    alterarModal()
    alternarObraDespesa()

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

    const nomeCategoria = `categoria_material_${crypto.randomUUID()}`
    const opcoesCategoria = ['Material', 'Ferramenta'].map(categoria => `
      <label class="despesa-radio">
        <input type="radio" name="${nomeCategoria}" data-campo="categoria" value="${categoria}" ${(dados.categoria || 'Material') === categoria ? 'checked' : ''}>
        <span>${categoria}</span>
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
        ${mod('Categoria', `<div class="despesa-motivos">${opcoesCategoria}</div>`)}
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

  // Fatura: só imagem ou PDF, para poder ser vista no app e no Excel.
  const upload = `<input onchange="validarFicheiroFatura(this); verificarRegras()" name="fatura" type="file" accept="image/*,application/pdf">`

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

function validarFicheiroFatura(input) {
  const ficheiro = input.files?.[0]
  if (!ficheiro) return
  const aceite = /^image\//.test(ficheiro.type) || ficheiro.type === 'application/pdf'
  if (!aceite || !ficheiro.size) {
    input.value = ''
    popup({ titulo: 'Fatura', mensagem: ficheiro.size ? 'Escolha uma imagem ou um PDF da fatura.' : 'O ficheiro escolhido está vazio.' })
  }
}

// Despesa Interna Empresa: sem obra (a linha da obra desaparece e não é exigida).
function alternarObraDespesa() {
  const painel = [...document.querySelectorAll('.painel-padrao')].at(-1)
  const tipo = painel?.querySelector('[name="tipo_despesa"]:checked')?.dataset.tipo
  const linhaObra = painel?.querySelector('[name="obra"]')?.closest('.linha-padrao')
  if (linhaObra) linhaObra.style.display = tipo === 'Despesa Interna Empresa' ? 'none' : ''
}

function confirmarExclusaoDespesa(idDespesa) {

  const botoes = [
    { texto: 'Confirmar', img: 'concluido', funcao: `excluirDespesa('${idDespesa}')`, fechar: true }
  ]
  popup({ mensagem: 'Tem a certeza de que quer eliminar esta despesa?', botoes, titulo: 'Eliminação de Despesa', removerAnteriores: true })
}

async function excluirDespesa(idDespesa) {

  await deletar(`dados_despesas/${idDespesa}`)

}

async function salvarDespesa(idExistente) {

  // Despesa nova: o id é criado aqui e não se pede ao servidor (um id que ainda não existe é recusado
  // pela proteção por região com "Registo não encontrado", o que impedia guardar qualquer despesa nova).
  const idDespesa = idExistente || crypto.randomUUID()

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

    const despesa = idExistente ? await recuperarDado('dados_despesas', idExistente) || {} : {}

    // Foto da Fatura
    const foto = document.querySelector('[name="foto"]')
    if (foto && foto.src && foto.src.startsWith('data:')) {
      const resposta = await importarAnexos({ foto: foto.src })
      if (!resposta?.[0]?.link) {
        removerOverlay()
        return popup({ mensagem: 'Falha no envio da foto da fatura: tente novamente.' })
      }
      despesa.fatura = resposta[0].link
    }

    // Arquivo da fatura (imagem ou PDF)
    const input = document.querySelector('[name="fatura"]');
    if (input?.files?.length === 1) {
      const anexos = await importarAnexos({ input })
      if (!anexos?.[0]?.link) {
        removerOverlay()
        return popup({ mensagem: 'Falha no envio da fatura: tente novamente.' })
      }
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
          motivo: div.querySelector('[data-campo="motivo"]:checked')?.value || 'Necessidade',
          categoria: div.querySelector('[data-campo="categoria"]:checked')?.value || 'Material'
        }

      })

    // IVA: o valor da despesa inclui o IVA; guarda-se a taxa e o valor do IVA contido nele.
    const valor = conversor(document.querySelector('.total-despesa').textContent)
    const taxa = Number(obVal('taxa_iva')) || 0
    const interna = tipo_despesa === 'Despesa Interna Empresa'
    const obraEl = document.querySelector('[name="obra"]')

    const atualizado = {
      ...despesa,
      tipo_despesa,
      material,
      fornecedor: obVal('fornecedor'),
      obra: interna ? '' : (obraEl?.textContent.trim() || ''),
      data: obVal('data'),
      valor,
      taxa_iva: taxa || null,
      iva: taxa ? Math.round(valor * taxa / (100 + taxa) * 100) / 100 : null
    }

    await enviar(`dados_despesas/${idDespesa}`, atualizado)

    removerPopup()

  } catch (err) {
    console.error(err)
    popup({ mensagem: 'Falha ao guardar a despesa: Fale com o suporte.' })
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
    popup({ mensagem: 'Falha ao abrir o ecrã de Fornecedores: Fale com o suporte.' })
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

async function adicionarFornecedor(idFornecedor) {

  try {

    overlayAguarde()

    const dadosFornecedor = idFornecedor ? await recuperarDado('fornecedores', idFornecedor) : {}
    idFornecedor ||= crypto.randomUUID()
    const {
      nome,
      telefone,
      cidade,
      email,
      morada_fiscal,
      numero_contribuinte
    } = dadosFornecedor || {}

    const { nome: nomeCidade } = await recuperarDado('cidades', cidade) || {}

    controlesCxOpcoes.cidade = {
      base: 'cidades',
      semPaginacao: true,
      retornar: ['nome'],
      funcaoAdicional: ['verificarRegras'],
      colunas: {
        'Distrito': { chave: 'distrito' },
        'Cidade': { chave: 'nome' },
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
      { texto: 'Guardar', img: 'concluido', funcao: `salvarFornecedor('${idFornecedor}')` }
    ]

    popup({ linhas, botoes, titulo: 'Gerir Fornecedor' })

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

    // Se o servidor recusar, enviar() já mostra o motivo e o formulário continua aberto.
    if (!await enviar(`fornecedores/${id}`, fornecedor))
      return

    removerTodosPopups()

  } catch (err) {
    console.error(err)
    popup({ mensagem: 'Falha ao guardar o cliente: Fale com o suporte.' })
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
    popup({ mensagem: `Falha ao abrir o ecrã de ${titulo}: Fale com o suporte.` })
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
      { texto: 'Guardar', img: 'concluido', funcao: id ? `salvarGenerico('${id}')` : `salvarGenerico()` },
    ]

    if (id)
      botoes.push({ texto: 'Eliminar', img: 'cancel', funcao: `confirmarExcluirGenerico('${id}')` })

    const titulo = id ? 'Guardar Item' : 'Editar Item'
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

  popup({
    mensagem: 'O Excel incluirá todos os registos permitidos pela sua hierarquia que correspondem aos filtros atuais, em todas as páginas. Continuar?',
    botoes: [
      {
        texto: 'Descarregar',
        img: 'planilha',
        funcao: 'baixarExcelDespesas()'
      }
    ]
  })

}

// Filtros da tela (incluindo mês e ano) e, sem "Selecionar todas", só as linhas marcadas.
function filtrosExcelDespesas() {
  const filtrosTela = controles.despesas?.filtros || {}
  if (selecaoDespesas.todos) return filtrosTela
  return { modo: 'AND', regras: [filtrosTela, { modo: 'OR', regras: [...selecaoDespesas.ids].map(id => ({ path: 'id', op: '=', value: id })) }] }
}

async function baixarExcelDespesas() {

  if (!selecaoDespesas.todos && !selecaoDespesas.ids.size)
    return popup({ titulo: 'Descarregar em Excel', mensagem: 'Selecione as despesas a exportar (ou marque "Selecionar todas").' })

  overlayAguarde()

  try {

    const { token } = JSON.parse(localStorage.getItem('acesso')) || {}

    const response = await fetch(`${api}/exportar-despesas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ filtros: filtrosExcelDespesas(), ordenar: controles.despesas?.ordenar || null })
    })

    if (!response.ok) {
      let erro = 'Erro ao descarregar ficheiro';
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
    popup({ mensagem: escaparAtributo(`Falha ao gerar o Excel: ${error.message}`) })

  } finally { removerOverlay() }

}
