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
        ...(podeExcel ? { 'Selecionar': { icone: true } } : {}),
        'Edição': { icone: true },
        'Obra': {},
        'Fornecedor': { chave: 'nome_fornecedor' },
        'Distrito': { chave: 'distrito' },
        'Cidade': { chave: 'nome_cidade' },
        'NIF': { chave: 'nif', titulo: 'Número do Contribuinte' },
        'Tipo': { chave: 'tipo_despesa', titulo: 'Tipo da Despesa' },
        'Valor': { chave: 'valor' },
        'Ano': { chave: 'snapshots.ano', tipoPesquisa: 'select' },
        'Mês': { chave: 'snapshots.mes', tipoPesquisa: 'select' },
        'Data': { chave: 'data', tipoPesquisa: 'data' },
        'Fatura': { icone: true }
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

  // Fatura: ícone pelo tipo do ficheiro (PDF, imagem, …) que a abre.
  const ax = (link) => {
    if (!link) return ''
    return `${iconeFicheiro(link, { titulo: 'Ver fatura' })}<input name="link" style="display: none;" value="${escaparAtributo(link)}">`
  }

  const etiquetaValor = tipo_despesa == 'Nota de Crédito'
    ? 'credito'
    : 'despesa'

  const tdSelecionar = podeExcelDespesas()
    ? `<td class="tabela-coluna-icone"><input type="checkbox" data-selecionar-despesa value="${escaparAtributo(id)}" aria-label="Selecionar despesa"
        ${selecaoDespesas.todos || selecaoDespesas.ids.has(String(id)) ? 'checked' : ''} onchange="selecionarDespesa(this)"></td>`
    : ''

  const tds = `
        ${tdSelecionar}
        <td class="tabela-coluna-icone">
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
        <td style="white-space: nowrap;">${data || ''}</td>
        <td class="tabela-coluna-icone">${ax(fatura)}</td>
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
      // A obra define os materiais do orçamento (lista e saldos da Despesa Inicial de Obra).
      funcaoAdicional: ['atualizarDescricoesDespesa'],
      retornar: ['contrato'],
      // vw_dados_orcamentos traz cidade, distrito e morada (do cliente) em colunas próprias, não nos snapshots.
      colunas: {
        'Número': { chave: 'contrato' },
        'Cliente': { chave: 'nome_cliente' },
        'Morada': { chave: 'morada' },
        'Cidade': { chave: 'cidade' },
        'Distrito': { chave: 'distrito' }
      }
    }

    // A Despesa Interna Empresa só aparece para o CEO e o Diretor Programador (ou se a despesa já for desse tipo).
    const tipoAtual = nomeTipoDespesa(tipo_despesa)
    const opcoesTipos = TIPOS_DESPESA
      .filter(t => t !== 'Despesa Interna Empresa' || podeDespesaInterna() || tipoAtual === t)
      .map(t => `
        <label class="despesa-radio">
          <input ${regras} ${tipoAtual == t ? 'checked' : ''} data-tipo="${t}" name="tipo_despesa" type="radio" onchange="alternarObraDespesa(); atualizarDescricoesDespesa()">
          <span>${t}</span>
        </label>
      `).join('')

    // Fatura já anexada: ver (imagem ou PDF) ou substituir por outra; sem fatura: enviar ficheiro ou tirar foto.
    const linkFatura = fatura || foto
    const linhaAnexo = !linkFatura
      ? { texto: 'Upload Fatura', elemento: `<div class="despesa-fatura">${escolhaFatura()}</div>` }
      : {
        texto: 'Fatura',
        elemento: `
          <div class="despesa-fatura">
            <div class="despesa-fatura-acoes">
              ${iconeFicheiro(linkFatura, { titulo: 'Ver fatura' })}
              <span class="despesa-fatura-ok">Fatura anexada</span>
              <button type="button" onclick="abrirArquivo('${escaparAtributo(linkFatura)}')">Ver fatura</button>
              <button type="button" onclick="substituirFatura(this)">Substituir fatura</button>
            </div>
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
    modalDespesa.dataset.idDespesa = idDespesa || ''
    // Dados novos a cada abertura (saldos e catálogo podem ter mudado entretanto).
    cacheItensDespesa.catalogo = null
    cacheItensDespesa.orcamentos.clear()
    cacheItensDespesa.lancadas.clear()
    // Resumo em tempo real: totais de Materiais e de Ferramentas (pela categoria de cada bloco) e o total.
    modalDespesa.querySelector('.rodape-padrao').insertAdjacentHTML('afterbegin', `
      <div class="despesa-total">
        <div class="despesa-total-partes">
          <span><small>Materiais</small><b class="total-despesa-materiais">${dinheiro(0)}</b></span>
          <span><small>Ferramentas</small><b class="total-despesa-ferramentas">${dinheiro(0)}</b></span>
        </div>
        <small>Total da despesa</small><span class="total-despesa">${dinheiro(valor)}</span>
      </div>
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

// ---------- Itens da despesa (materiais e ferramentas) ----------
// Despesa Inicial de Obra: a descrição escolhe-se da lista dos materiais/ferramentas do orçamento da obra, com o
// saldo (orçado − já lançado noutras despesas iniciais e nesta) e aviso de excedente. Restantes tipos: lista do
// catálogo (Materiais e Ferramentas) com texto livre; o que não estiver no catálogo aparece em "Despesas Extras"
// para os gestores decidirem incluí-lo no sistema. A especialidade filtra as opções.
const ESPECIALIDADE_OUTROS = 'Outros'
const TIPO_DESPESA_INICIAL = 'Despesa Inicial de Obra'
const cacheItensDespesa = { catalogo: null, orcamentos: new Map(), lancadas: new Map() }
const chaveItemDespesa = (categoria, descricao) => `${categoria === 'Ferramenta' ? 'Ferramenta' : 'Material'}|${String(descricao || '').trim().toLocaleLowerCase()}`
const numeroDespesa = valor => Number(String(valor ?? '').replace(',', '.')) || 0

// Todas as páginas de uma pesquisa (a pesquisa devolve no máximo 100 registos por página).
async function pesquisarTodasPaginas(params) {
  const todos = []
  let pagina = 1, paginas = 1
  do {
    const resposta = await pesquisarDB({ ...params, pagina, limite: 100 })
    todos.push(...(resposta?.resultados || []))
    paginas = resposta?.paginas || 1
    pagina++
  } while (pagina <= paginas)
  return todos
}

// Catálogo do sistema: nomes de Materiais e de Ferramentas.
async function catalogoItensDespesa() {
  if (!cacheItensDespesa.catalogo) cacheItensDespesa.catalogo = (async () => {
    const [materiais, ferramentas] = await Promise.all([
      pesquisarTodasPaginas({ base: 'materiais' }), pesquisarTodasPaginas({ base: 'ferramentas' })])
    const nomes = lista => [...new Set(lista.map(i => String(i.nome || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
    return { Material: nomes(materiais), Ferramenta: nomes(ferramentas) }
  })().catch(erro => { cacheItensDespesa.catalogo = null; throw erro })
  return cacheItensDespesa.catalogo
}

// Materiais e ferramentas orçados na obra: quantidade = quantidade do serviço × quantidade na composição.
async function itensOrcamentoObra(contrato) {
  if (!contrato) return []
  if (!cacheItensDespesa.orcamentos.has(contrato)) cacheItensDespesa.orcamentos.set(contrato, (async () => {
    const resposta = await pesquisarDB({ base: 'vw_dados_orcamentos', filtros: { contrato: { op: '=', value: contrato } }, pagina: 1, limite: 1 })
    const orcamento = resposta?.resultados?.[0]
    const itens = new Map()
    for (const campo of Object.values(orcamento?.campos || {})) {
      if (!campo || typeof campo !== 'object' || campo.andamento?.removido) continue
      const qtdServico = typeof quantidadeCampoChecklist === 'function' ? quantidadeCampoChecklist(campo) : numeroDespesa(campo.quantidade)
      for (const [grupo, categoria] of [['materiais', 'Material'], ['ferramentas', 'Ferramenta']]) {
        for (const comp of Object.values(campo[grupo] || {})) {
          const descricao = String(comp?.descricao || '').trim()
          if (!descricao) continue
          const chave = chaveItemDespesa(categoria, descricao)
          const item = itens.get(chave) || { descricao, categoria, especialidades: new Set(), quantidade: 0, preco: numeroDespesa(comp.preco) }
          item.especialidades.add(campo.especialidade || ESPECIALIDADE_OUTROS)
          item.quantidade += qtdServico * numeroDespesa(comp.qtde)
          itens.set(chave, item)
        }
      }
    }
    return [...itens.values()].sort((a, b) => a.descricao.localeCompare(b.descricao))
  })().catch(erro => { cacheItensDespesa.orcamentos.delete(contrato); throw erro }))
  return cacheItensDespesa.orcamentos.get(contrato)
}

// Quantidades já lançadas em despesas iniciais da obra (sem a despesa em edição), por categoria + descrição.
async function quantidadesLancadasObra(contrato, idDespesa) {
  if (!contrato) return new Map()
  const cacheChave = `${contrato}|${idDespesa || ''}`
  if (!cacheItensDespesa.lancadas.has(cacheChave)) cacheItensDespesa.lancadas.set(cacheChave, (async () => {
    const despesas = await pesquisarTodasPaginas({ base: 'vw_despesas', filtros: { obra: { op: '=', value: contrato } } })
    const totais = new Map()
    for (const d of despesas) {
      if (d.tipo_despesa !== TIPO_DESPESA_INICIAL || String(d.id) === String(idDespesa || '')) continue
      for (const item of Array.isArray(d.material) ? d.material : Object.values(d.material || {})) {
        const chave = chaveItemDespesa(item.categoria, item.descricao)
        totais.set(chave, (totais.get(chave) || 0) + numeroDespesa(item.quantidade))
      }
    }
    return totais
  })().catch(erro => { cacheItensDespesa.lancadas.delete(cacheChave); throw erro }))
  return cacheItensDespesa.lancadas.get(cacheChave)
}

function painelDespesa() {
  return [...document.querySelectorAll('.popup-despesa .painel-padrao')].at(-1)
}

function contextoDespesa() {
  const painel = painelDespesa()
  const tipo = painel?.querySelector('[name="tipo_despesa"]:checked')?.dataset.tipo || ''
  const obraEl = painel?.querySelector('[name="obra"]')
  const contrato = obraEl?.id && obraEl.closest('.linha-padrao')?.style.display !== 'none' ? obraEl.textContent.trim() : ''
  return { painel, tipo, contrato, idDespesa: painel?.closest('.popup-despesa')?.dataset.idDespesa || '' }
}

async function adicionarMaterial(dados = {}) {

  try {

    overlayAguarde()

    if (!especialidades) {
      const { resultados } = await pesquisarDB({ base: 'especialidades' }) || {}
      especialidades = resultados
    }

    const painel = painelDespesa()
    const local = painel.querySelector('.campo-materiais')

    // "Outros": para quando a especialidade não existe no sistema.
    const nomesEspecialidades = [...new Set((especialidades || []).map(e => e.nome).filter(Boolean))]
      .filter(n => n !== ESPECIALIDADE_OUTROS).sort((a, b) => a.localeCompare(b))
    const especialidadeAtual = dados.especialidade || ''
    if (especialidadeAtual && especialidadeAtual !== ESPECIALIDADE_OUTROS && !nomesEspecialidades.includes(especialidadeAtual)) nomesEspecialidades.push(especialidadeAtual)
    const opcoes = `<option value="">Selecione</option>`
      + [...nomesEspecialidades, ESPECIALIDADE_OUTROS]
        .map(nome => `<option ${especialidadeAtual === nome ? 'selected' : ''}>${escaparAtributo(nome)}</option>`)
        .join('')

    const mod = (titulo, elemento) => `
      <div class="despesa-campo">
        <span>${titulo}</span>
        ${elemento}
      </div>
    `

    const nomeMotivo = `motivo_material_${crypto.randomUUID()}`
    const opcoesMotivo = ['Má execução', 'Necessidade'].map(motivo => `
      <label class="despesa-radio">
        <input type="radio" name="${nomeMotivo}" data-campo="motivo" value="${motivo}" ${(dados.motivo || 'Necessidade') === motivo ? 'checked' : ''} onchange="verificarRegras()">
        <span>${motivo}</span>
      </label>
    `).join('')

    const nomeCategoria = `categoria_material_${crypto.randomUUID()}`
    const opcoesCategoria = ['Material', 'Ferramenta'].map(categoria => `
      <label class="despesa-radio">
        <input type="radio" name="${nomeCategoria}" data-campo="categoria" value="${categoria}" ${(dados.categoria || 'Material') === categoria ? 'checked' : ''}
          onchange="atualizarDescricaoItem(this.closest('.item-material')); calcularTotalDespesa()">
        <span>${categoria}</span>
      </label>
    `).join('')

    const div = document.createElement('div')
    div.className = 'item-material'
    div.dataset.descricao = dados.descricao || ''
    div.innerHTML = `
        <div class="despesa-material-topo"><strong>Material</strong>
          <button type="button" class="despesa-remover" aria-label="Remover material" onclick="removerItemDespesa(this)">&times;</button>
        </div>

        <div class="despesa-material-campos">
          ${mod('Quantidade', `<input oninput="calcularTotalDespesa(); verificarRegras()" type="number" min="0" step="any" name="quantidade" placeholder="Quantidade" value="${escaparAtributo(dados.quantidade ?? '')}">`)}
          ${mod('Valor', `<input oninput="calcularTotalDespesa(); verificarRegras()" type="number" min="0" step="any" name="valor" placeholder="Valor" value="${escaparAtributo(dados.valor ?? '')}">`)}
          ${mod('Especialidade', `<select name="especialidade" onchange="atualizarDescricaoItem(this.closest('.item-material')); verificarRegras()">${opcoes}</select>`)}
        </div>

        ${mod('Categoria', `<div class="despesa-motivos">${opcoesCategoria}</div>`)}
        ${mod('Descrição do Material', `<div class="despesa-descricao"></div><div class="despesa-saldo"></div>`)}
        ${mod('Motivo do material', `<div class="despesa-motivos">${opcoesMotivo}</div>`)}
    `
    local.appendChild(div)
    await atualizarDescricaoItem(div)
    calcularTotalDespesa()
    verificarRegras()

  } catch (err) {
    console.error(err)
    popup({ mensagem: 'Falha ao adicionar um campo: Fale com o suporte.' })
  } finally {
    removerOverlay()
  }

}

function removerItemDespesa(botao) {
  const lista = botao.closest('.campo-materiais')
  botao.closest('.item-material')?.remove()
  const primeiro = lista?.querySelector('.item-material')
  if (primeiro) atualizarSaldoItem(primeiro)
  calcularTotalDespesa()
  verificarRegras()
}

// Tipo de despesa ou obra mudou: refaz a descrição de todos os itens (lista do orçamento ou do catálogo).
async function atualizarDescricoesDespesa() {
  const { painel } = contextoDespesa()
  for (const item of painel?.querySelectorAll('.item-material') || []) await atualizarDescricaoItem(item)
  calcularTotalDespesa()
  verificarRegras()
}

async function atualizarDescricaoItem(item) {
  if (!item) return
  const local = item.querySelector('.despesa-descricao')
  const campoAtual = item.querySelector('[name="descricao"]')
  const atual = (campoAtual ? campoAtual.value : item.dataset.descricao) || ''
  const categoria = item.querySelector('[data-campo="categoria"]:checked')?.value || 'Material'
  const especialidade = item.querySelector('[name="especialidade"]')?.value || ''
  const { tipo, contrato, idDespesa } = contextoDespesa()
  const opcao = (valor, selecionado) => `<option value="${escaparAtributo(valor)}" ${selecionado ? 'selected' : ''}>${escaparAtributo(valor)}</option>`
  const nomeCategoria = categoria === 'Ferramenta' ? 'ferramentas' : 'materiais'

  try {
    if (tipo === TIPO_DESPESA_INICIAL) {
      item.dataset.modo = 'orcamento'
      item.catalogo = null
      if (!contrato) {
        item.orcamento = null
        local.innerHTML = `<select name="descricao" disabled><option value="">Selecione primeiro a obra</option></select>`
      } else {
        const [orcados, lancadas] = await Promise.all([itensOrcamentoObra(contrato), quantidadesLancadasObra(contrato, idDespesa)])
        item.orcamento = { orcados, lancadas }
        const daCategoria = orcados.filter(o => o.categoria === categoria)
        const filtrados = especialidade && especialidade !== ESPECIALIDADE_OUTROS
          ? daCategoria.filter(o => o.especialidades.has(especialidade)) : daCategoria
        const nomes = filtrados.map(o => o.descricao)
        // Um item já guardado que entretanto saiu da lista continua visível para não se perder.
        if (atual && !nomes.includes(atual)) nomes.unshift(atual)
        local.innerHTML = `<select name="descricao" onchange="atualizarSaldoItem(this.closest('.item-material')); verificarRegras()">
          <option value="">${nomes.length ? `Selecione (${nomeCategoria} do orçamento)` : `Sem ${nomeCategoria} no orçamento para esta especialidade`}</option>
          ${nomes.map(n => opcao(n, n === atual)).join('')}
        </select>`
      }
    } else {
      item.dataset.modo = 'livre'
      item.orcamento = null
      const catalogo = await catalogoItensDespesa()
      const doCatalogo = catalogo[categoria] || []
      // Também sugere os itens orçados na obra para a especialidade escolhida.
      const orcados = contrato ? (await itensOrcamentoObra(contrato))
        .filter(o => o.categoria === categoria && (!especialidade || especialidade === ESPECIALIDADE_OUTROS || o.especialidades.has(especialidade)))
        .map(o => o.descricao) : []
      const sugestoes = [...new Set([...orcados, ...doCatalogo])]
      const idLista = `lista_${crypto.randomUUID()}`
      local.innerHTML = `
        <input name="descricao" list="${idLista}" autocomplete="off" placeholder="Escolha da lista ou escreva a descrição" value="${escaparAtributo(atual)}"
          oninput="atualizarSaldoItem(this.closest('.item-material')); verificarRegras()">
        <datalist id="${idLista}">${sugestoes.map(n => `<option value="${escaparAtributo(n)}"></option>`).join('')}</datalist>`
      item.catalogo = new Set([...doCatalogo, ...orcados].map(n => n.toLocaleLowerCase()))
    }
  } catch (erro) {
    console.error(erro)
    item.dataset.modo = 'livre'
    item.orcamento = null
    item.catalogo = null
    local.innerHTML = `<input name="descricao" placeholder="Descrição do material" value="${escaparAtributo(atual)}" oninput="verificarRegras()">`
  }
  item.dataset.descricao = item.querySelector('[name="descricao"]')?.value || ''
  atualizarSaldoItem(item)
}

// Saldo de um item orçado: orçado − (lançado noutras despesas iniciais + nesta despesa, em todos os blocos do mesmo item).
function saldoItemDespesa(item) {
  if (item?.dataset.modo !== 'orcamento' || !item.orcamento) return null
  const descricao = item.querySelector('[name="descricao"]')?.value || ''
  if (!descricao) return null
  const categoria = item.querySelector('[data-campo="categoria"]:checked')?.value || 'Material'
  const chave = chaveItemDespesa(categoria, descricao)
  const orcado = item.orcamento.orcados.find(o => chaveItemDespesa(o.categoria, o.descricao) === chave)?.quantidade || 0
  const outras = item.orcamento.lancadas.get(chave) || 0
  const nesta = [...(item.closest('.campo-materiais')?.querySelectorAll('.item-material') || [])]
    .filter(i => chaveItemDespesa(i.querySelector('[data-campo="categoria"]:checked')?.value, i.querySelector('[name="descricao"]')?.value) === chave)
    .reduce((s, i) => s + numeroDespesa(i.querySelector('[name="quantidade"]')?.value), 0)
  return { descricao, orcado, outras, nesta, saldo: orcado - outras - nesta }
}

// Atualiza a linha de saldo (ou de "fora do catálogo") de todos os blocos: os do mesmo item partilham o saldo.
function atualizarSaldoItem(item) {
  if (!item) return
  const fmt = n => Number(n.toFixed(2)).toLocaleString('pt-PT')
  for (const bloco of item.closest('.campo-materiais')?.querySelectorAll('.item-material') || [item]) {
    const local = bloco.querySelector('.despesa-saldo')
    if (!local) continue
    if (bloco.dataset.modo === 'livre') {
      const descricao = (bloco.querySelector('[name="descricao"]')?.value || '').trim()
      const fora = !!(descricao && bloco.catalogo && !bloco.catalogo.has(descricao.toLocaleLowerCase()))
      local.className = `despesa-saldo${fora ? ' despesa-saldo-info' : ''}`
      local.textContent = fora ? 'Fora do catálogo: fica em "Despesas Extras" para os gestores decidirem incluí-lo no sistema.' : ''
      continue
    }
    const s = saldoItemDespesa(bloco)
    if (!s) { local.className = 'despesa-saldo'; local.textContent = ''; continue }
    const excede = s.saldo < -1e-9
    local.className = `despesa-saldo ${excede ? 'despesa-saldo-excede' : 'despesa-saldo-ok'}`
    local.textContent = `Orçado ${fmt(s.orcado)} · já lançado ${fmt(s.outras)} · nesta despesa ${fmt(s.nesta)} · `
      + (excede ? `excede o orçado em ${fmt(-s.saldo)}` : `saldo ${fmt(s.saldo)}`)
  }
}

// Itens desta despesa que ultrapassam o orçado (um por item, mesmo que repartido por vários blocos).
function excedentesDespesa() {
  const excedentes = new Map()
  for (const item of painelDespesa()?.querySelectorAll('.item-material') || []) {
    const s = saldoItemDespesa(item)
    if (s && s.saldo < -1e-9) excedentes.set(s.descricao, -s.saldo)
  }
  return [...excedentes]
}

// Total da despesa e a separação Materiais / Ferramentas, em tempo real (conforme a categoria de cada bloco).
function calcularTotalDespesa() {

  const totais = { Material: 0, Ferramenta: 0 }
  const itens = [...(painelDespesa()?.querySelectorAll('.item-material') || [])]

  for (const item of itens) {
    const quantidade = numeroDespesa(item.querySelector('[name="quantidade"]')?.value)
    const valor = numeroDespesa(item.querySelector('[name="valor"]')?.value)
    const categoria = item.querySelector('[data-campo="categoria"]:checked')?.value === 'Ferramenta' ? 'Ferramenta' : 'Material'
    totais[categoria] += quantidade * valor
  }

  const rodape = painelDespesa()?.closest('.popup-despesa')
  const escrever = (seletor, valor) => { const el = rodape?.querySelector(seletor); if (el) el.textContent = dinheiro(valor) }
  escrever('.total-despesa', totais.Material + totais.Ferramenta)
  escrever('.total-despesa-materiais', totais.Material)
  escrever('.total-despesa-ferramentas', totais.Ferramenta)

  if (itens.length) atualizarSaldoItem(itens[0])

}

// Escolha do envio da fatura: ficheiro (imagem ou PDF) ou foto pela câmara.
function escolhaFatura() {
  return `
    <div style="${horizontal}; gap: 1rem;">
      <select id="modal" onchange="alterarModal(); verificarRegras()">
        <option>Upload</option>
        <option>Foto</option>
      </select>
      <div id="upload"></div>
    </div>`
}

// Troca a fatura anexada: mostra a escolha de envio; a nova só substitui a antiga ao guardar.
function substituirFatura(botao) {
  const caixa = botao.closest('.despesa-fatura')
  if (!caixa) return
  caixa.dataset.original = caixa.innerHTML
  caixa.innerHTML = `${escolhaFatura()}
    <div class="despesa-fatura-acoes">
      <small class="despesa-fatura-nota">A fatura atual só é substituída ao guardar.</small>
      <button type="button" onclick="manterFatura(this)">Manter a fatura atual</button>
    </div>`
  alterarModal()
  verificarRegras()
}

function manterFatura(botao) {
  const caixa = botao.closest('.despesa-fatura')
  if (!caixa?.dataset.original) return
  caixa.innerHTML = caixa.dataset.original
  delete caixa.dataset.original
  verificarRegras()
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

async function salvarDespesa(idExistente, confirmouExcedente = false) {

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

    // Despesa inicial acima do orçado (somando as outras despesas iniciais da obra): avisa e só guarda se confirmado.
    const excedentes = excedentesDespesa()
    if (excedentes.length && !confirmouExcedente) {
      removerOverlay()
      const fmt = n => Number(n.toFixed(2)).toLocaleString('pt-PT')
      return popup({
        titulo: 'Acima do orçado',
        imagem: 'gifs/interrogacao.gif',
        mensagem: `
              <div style="${vertical}; gap: 4px;">
                  <span>Estes itens ultrapassam a quantidade orçada para a obra:</span>
                  ${excedentes.map(([descricao, mais]) => `<span>• ${escaparAtributo(descricao)}: mais ${fmt(mais)}</span>`).join('')}
                  <span>Quer guardar mesmo assim?</span>
              </div>
          `,
        // Fecha primeiro este aviso: o guardar lê o formulário da despesa (o último aberto).
        botoes: [{ texto: 'Guardar mesmo assim', img: 'concluido',
          funcao: `removerPopup(); ${idExistente ? `salvarDespesa('${idExistente}', true)` : 'salvarDespesa(null, true)'}` }]
      })
    }

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
    const material = [...painelDespesa().querySelectorAll('.item-material')]
      .map(div => {

        const descricao = div.querySelector('[name="descricao"]').value.trim()
        const item = {
          quantidade: numeroDespesa(div.querySelector('[name="quantidade"]').value),
          especialidade: div.querySelector('[name="especialidade"]').value,
          descricao,
          valor: numeroDespesa(div.querySelector('[name="valor"]').value),
          motivo: div.querySelector('[data-campo="motivo"]:checked')?.value || 'Necessidade',
          categoria: div.querySelector('[data-campo="categoria"]:checked')?.value || 'Material'
        }
        // Escrito à mão e fora do catálogo: aparece em "Despesas Extras" para os gestores decidirem incluí-lo no sistema.
        if (div.dataset.modo === 'livre' && div.catalogo && !div.catalogo.has(descricao.toLocaleLowerCase())) item.fora_catalogo = true
        return item

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
  return filtrosComSelecao(filtrosTela, selecaoDespesas.ids)
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

// ---------- Despesas Extras (menu Despesas) ----------
// Recolhe todos os itens lançados em despesas extras de obra, para os gestores acompanharem. Os que estão fora do
// catálogo (escritos à mão) podem ser incluídos em Materiais ou Ferramentas por quem gere as composições.
const podeIncluirCatalogo = () => ['CEO', 'Diretor Operativo', 'Diretor Programador'].includes(acesso?.funcao)
const estadoDespesasExtras = { itens: [], filtro: 'fora', termo: '' }

async function telaDespesasExtras() {

  try {

    overlayAguarde()
    document.querySelector('[name="titulo"]').textContent = 'Despesas Extras'

    cacheItensDespesa.catalogo = null
    const [despesas, catalogo] = await Promise.all([
      pesquisarTodasPaginas({
        base: 'vw_despesas',
        filtros: { tipo_despesa: { modo: 'OR', regras: [{ op: '=', value: 'Despesa' }, { op: '=', value: 'Despesa Extra de Obra' }] } }
      }),
      catalogoItensDespesa()
    ])

    const noCatalogo = {
      Material: new Set(catalogo.Material.map(n => n.toLocaleLowerCase())),
      Ferramenta: new Set(catalogo.Ferramenta.map(n => n.toLocaleLowerCase()))
    }

    estadoDespesasExtras.itens = despesas
      .filter(d => ehDespesaExtra(d.tipo_despesa))
      .flatMap(d => (Array.isArray(d.material) ? d.material : Object.values(d.material || {})).map(item => {
        const categoria = item.categoria === 'Ferramenta' ? 'Ferramenta' : 'Material'
        const descricao = String(item.descricao || '').trim()
        return {
          data: d.data || '', obra: d.obra || '', fornecedor: d.nome_fornecedor || '', categoria, descricao,
          especialidade: item.especialidade || '', motivo: item.motivo || '',
          quantidade: Number(item.quantidade) || 0, valor: Number(item.valor) || 0,
          noCatalogo: !!descricao && noCatalogo[categoria].has(descricao.toLocaleLowerCase())
        }
      }))
      .sort((a, b) => String(b.data).localeCompare(String(a.data)))

    tela.innerHTML = `
      <div class="despesas-extras">
        <p class="despesas-extras-ajuda">Todos os itens lançados em <b>despesas extras de obra</b>. Os que estão <b>fora do catálogo</b>
          foram escritos à mão: ${podeIncluirCatalogo() ? 'pode incluí-los em Materiais ou Ferramentas para passarem a aparecer na lista.' : 'a direção decide se os inclui no sistema.'}</p>
        <div class="despesas-extras-filtros">
          <input type="search" placeholder="Pesquisar (obra, fornecedor, descrição…)" value="${escaparAtributo(estadoDespesasExtras.termo)}"
            oninput="estadoDespesasExtras.termo = this.value; renderDespesasExtras()">
          <select onchange="estadoDespesasExtras.filtro = this.value; renderDespesasExtras()">
            <option value="fora" ${estadoDespesasExtras.filtro === 'fora' ? 'selected' : ''}>Só fora do catálogo</option>
            <option value="todos" ${estadoDespesasExtras.filtro === 'todos' ? 'selected' : ''}>Todos os itens</option>
            <option value="dentro" ${estadoDespesasExtras.filtro === 'dentro' ? 'selected' : ''}>Só no catálogo</option>
          </select>
          <span class="despesas-extras-contagem"></span>
        </div>
        <div class="despesas-extras-recorte"></div>
      </div>`

    renderDespesasExtras()

  } catch (err) {
    console.error(err)
    popup({ mensagem: 'Falha ao abrir o ecrã de Despesas Extras: Fale com o suporte.' })
  } finally {
    removerOverlay()
  }

}

function renderDespesasExtras() {
  const local = document.querySelector('.despesas-extras-recorte')
  if (!local) return
  const termo = estadoDespesasExtras.termo.trim().toLocaleLowerCase()
  const itens = estadoDespesasExtras.itens.filter(i =>
    (estadoDespesasExtras.filtro === 'todos' || (estadoDespesasExtras.filtro === 'fora') !== i.noCatalogo)
    && (!termo || [i.obra, i.fornecedor, i.descricao, i.especialidade, i.categoria].join(' ').toLocaleLowerCase().includes(termo)))

  const contagem = document.querySelector('.despesas-extras-contagem')
  if (contagem) contagem.textContent = `${itens.length} ${itens.length === 1 ? 'item' : 'itens'} · ${dinheiro(itens.reduce((s, i) => s + i.quantidade * i.valor, 0))}`

  if (!itens.length) {
    local.innerHTML = '<p class="despesas-extras-vazio">Nenhum item com estes filtros.</p>'
    return
  }

  const acao = i => {
    if (i.noCatalogo) return '<span class="despesas-extras-etiqueta dentro">No catálogo</span>'
    if (!podeIncluirCatalogo() || !i.descricao) return '<span class="despesas-extras-etiqueta fora">Fora do catálogo</span>'
    const args = [i.categoria, i.descricao, i.valor].map(v => escaparAtributo(JSON.stringify(v))).join(', ')
    return `<button type="button" class="despesas-extras-incluir" onclick="incluirItemCatalogo(${args})">Incluir em ${i.categoria === 'Ferramenta' ? 'Ferramentas' : 'Materiais'}</button>`
  }

  local.innerHTML = `
    <table class="tabela">
      <thead><tr><th>Data</th><th>Obra</th><th>Fornecedor</th><th>Categoria</th><th>Especialidade</th><th>Descrição</th><th>Motivo</th>
        <th>Qtd</th><th>Valor unit.</th><th>Total</th><th>Sistema</th></tr></thead>
      <tbody>${itens.map(i => `<tr>
        <td style="white-space: nowrap;">${escaparAtributo(i.data)}</td>
        <td>${i.obra ? `<span class="etiquetas">${escaparAtributo(i.obra)}</span>` : ''}</td>
        <td>${escaparAtributo(i.fornecedor)}</td>
        <td>${i.categoria}</td>
        <td>${escaparAtributo(i.especialidade)}</td>
        <td>${escaparAtributo(i.descricao || 'Sem descrição')}</td>
        <td>${escaparAtributo(i.motivo)}</td>
        <td class="despesa-numero">${i.quantidade}</td>
        <td class="despesa-numero">${dinheiro(i.valor)}</td>
        <td class="despesa-numero">${dinheiro(i.quantidade * i.valor)}</td>
        <td>${acao(i)}</td>
      </tr>`).join('')}</tbody>
    </table>`
}

// Inclui um item escrito à mão no catálogo (Materiais ou Ferramentas), com o nome e o preço revistos.
function incluirItemCatalogo(categoria, descricao, valor) {
  popup({
    titulo: 'Incluir no sistema',
    linhas: [
      { texto: 'Catálogo', elemento: `<select name="catalogo_destino"><option value="materiais" ${categoria !== 'Ferramenta' ? 'selected' : ''}>Materiais</option><option value="ferramentas" ${categoria === 'Ferramenta' ? 'selected' : ''}>Ferramentas</option></select>` },
      { texto: 'Nome', elemento: `<textarea name="catalogo_nome">${escaparAtributo(descricao)}</textarea>` },
      { texto: 'Preço', elemento: `<input name="catalogo_preco" type="number" min="0" step="any" value="${escaparAtributo(valor || '')}">` },
      { texto: 'Link', elemento: `<textarea name="catalogo_link" placeholder="Opcional"></textarea>` }
    ],
    botoes: [{ texto: 'Incluir', img: 'concluido', funcao: 'salvarItemCatalogo()' }]
  })
}

async function salvarItemCatalogo() {
  try {
    const painel = [...document.querySelectorAll('.painel-padrao')].at(-1)
    const base = painel.querySelector('[name="catalogo_destino"]').value
    const nome = painel.querySelector('[name="catalogo_nome"]').value.trim()
    const preco = Number(String(painel.querySelector('[name="catalogo_preco"]').value).replace(',', '.'))
    if (!nome || !Number.isFinite(preco) || preco < 0) return popup({ mensagem: 'Indique o nome e um preço válido.' })
    overlayAguarde()
    const id = crypto.randomUUID()
    await enviar(`${base}/${id}`, { id, nome, preco, link: painel.querySelector('[name="catalogo_link"]').value.trim() })
    removerPopup()
    await telaDespesasExtras()
  } catch (err) {
    console.error(err)
    popup({ mensagem: 'Falha ao incluir o item no sistema: Fale com o suporte.' })
  } finally {
    removerOverlay()
  }
}
