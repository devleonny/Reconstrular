const dt = data => {
    if (!data) return '-'

    const [ano, mes, dia] = data.split('-')

    return `${dia}/${mes}/${ano}`
}

const tiposDocs = [
    'em_analise',
    'orcamento_aceite',
    'orcamento_adjudicado',
    'orcamento_recusado'
]

const statusOrcamento = {
    '': '',
    'Em Análise': 'em_analise',
    'Orçamento Aceite': 'orcamento_aceite',
    'Orçamento Adjudicado': 'orcamento_adjudicado',
    'Orçamento Recusado': 'orcamento_recusado'
}

async function orcamentos() {
    try {
        overlayAguarde()

        document.querySelector('[name="titulo"]').textContent = 'Orçamentos'

        const tabela = await modTab({
            base: 'vw_dados_orcamentos',
            pag: 'orcamentos',
            detalhes: true,
            filtros: {},
            body: 'bodyOrcamentos',
            criarLinha: 'criarLinhaOrcamento',
            colunas: {
                'Editar': {},
                'Ambientes': {},
                'Orcamento': {},
                'Status': { chave: 'status', tipoPesquisa: 'select' },
                'Número': { chave: 'contrato' },
                'Cliente': { chave: 'nome_cliente' },
                'Distrito': { chave: 'distrito' },
                'Cidade': { chave: 'cidade' },
                'Data de Contato': { chave: 'data_contato', tipoPesquisa: 'data' },
                'Data de Visita': { chave: 'data_visita', tipoPesquisa: 'data' }
            }
        })

        tela.innerHTML = tabela

        await paginacao()

        removerOverlay()
    } catch (err) {
        console.log(err)
        popup({ mensagem: 'Falha ao abrir a tela de Orçamentos: Fale com o suporte.' })
    }
}

async function criarLinhaOrcamento(orcamento) {
    const {
        contrato,
        id: idOrcamento,
        status,
        data_contato,
        data_visita,
        nome_cliente,
        cidade,
        distrito,
        documentos,
        finalizado = 'N'
    } = orcamento || {}

    const tdsAnexos = tiposDocs
        .map(doc => {
            const idInput = `${doc}_${idOrcamento}`
            const { link } = documentos?.[doc] || {}

            if (link) {
                return `
                    <td>
                        <img
                            src="imagens/documento.svg" class="icone-tabela" alt="Abrir documento" title="Abrir documento"
                            onclick="window.open('${api}/uploads/${link}', '_blank')">
                    </td>
                `
            }

            return `
                <td>
                    <input
                        id="${idInput}"
                        type="file"
                        style="display:none"
                        onchange="importarDocumentoOrcamento('${doc}', '${idOrcamento}')">

                    <label for="${idInput}" style="cursor:pointer;">
                        <img src="imagens/upload.svg" class="icone-tabela" alt="Anexar documento" title="Anexar documento">
                    </label>
                </td>
            `
        })
        .join('')

    const tds = `

        <td>
            <img src="imagens/editar.svg" class="icone-editar" alt="Editar" title="Editar" onclick="formularioOrcamento('${idOrcamento}')">
        </td>

        <td>
            <img src="imagens/ambientes.svg" class="icone-tabela" alt="Ambientes e zonas" title="Ambientes e zonas" onclick="execucoes('${idOrcamento}', 0)">
        </td>

        <td>
            <img src="imagens/orcamento.svg" class="icone-tabela" alt="Ver orçamento" title="Ver orçamento" onclick="orcamentoFinal('${idOrcamento}')">
        </td>
        <td>
            <select
                class="orcamento-status ${statusOrcamento?.[status] || ''}"
                data-status="${escaparAtributo(status || '')}" data-finalizado="${finalizado}"
                onchange="alterarStatusOrcamento('${idOrcamento}', this.value, this.dataset.finalizado, this)">

                ${Object.keys(statusOrcamento)
            .map(s => `<option ${s == status ? 'selected' : ''}>${s}</option>`)
            .join('')}
            </select>
        </td>

        <td>
            <span class="tag-orcamento">${contrato}</span>
        </td>

        <td>${nome_cliente || ''}</td>
        <td>${distrito || ''}</td>
        <td>${cidade || ''}</td>
        <td>${dt(data_contato)}</td>
        <td>${dt(data_visita)}</td>



    `

    return {
        linha: `<tr>${tds}</tr>`,
        detalhes: `<section class="orcamento-documentos-detalhes">
            <h3>Documentos do orçamento</h3>
            <div class="orcamento-documentos-recorte"><table class="tabela">
                <thead><tr>
                    <th><span class="em_analise">Em Análise</span></th>
                    <th><span class="orcamento_aceite">Orçamento Aceite</span></th>
                    <th><span class="orcamento_adjudicado">Orçamento Adjudicado</span></th>
                    <th><span class="orcamento_recusado">Orçamento Recusado</span></th>
                </tr></thead>
                <tbody><tr>${tdsAnexos}</tr></tbody>
            </table></div>
        </section>`
    }
}

async function importarDocumentoOrcamento(doc, idOrcamento) {
    try {
        overlayAguarde()

        const input = document.getElementById(`${doc}_${idOrcamento}`)

        if (!input)
            return

        const anexo = await importarAnexos({ input })

        await enviar(`dados_orcamentos/${idOrcamento}/documentos/${doc}`, anexo[0])

        popup({
            imagem: 'imagens/concluido.png',
            mensagem: 'Documento anexado'
        })
    } catch (err) {
        popup({ mensagem: 'Falha ao processar o anexo, tente novamente' })
    }
}

async function alterarStatusOrcamento(idOrcamento, status, statusAtualFinalizado, select = null) {
    const statusAnterior = select?.dataset.status || ''
    if (select) {
        select.className = `orcamento-status ${statusOrcamento[status] || ''}`
        select.disabled = true
    }
    overlayAguarde()

    let finalizado = null

    if (status == 'Orçamento Recusado') {
        finalizado = 'R'
    } else if (status != 'Orçamento Recusado' && statusAtualFinalizado == 'R') {
        finalizado = 'N'
    } else {
        finalizado = statusAtualFinalizado
    }

    try {
    const resposta = await enviar(`dados_orcamentos/${idOrcamento}`, {
        status,
        finalizado
    })
    if (!resposta || resposta.success === false || resposta.erro) throw new Error('Não foi possível salvar o status do orçamento.')
    if (select) { select.dataset.status = status; select.dataset.finalizado = finalizado }
    } catch (erro) {
        if (select) {
            select.value = statusAnterior
            select.className = `orcamento-status ${statusOrcamento[statusAnterior] || ''}`
        }
        popup({ mensagem: escaparAtributo(erro.message) })
    } finally { if (select) select.disabled = false; removerOverlay() }
}
async function formularioOrcamento(idOrcamento) {
    try {
        overlayAguarde()

        const orcamento =
            await recuperarDado('dados_orcamentos', idOrcamento) || {}

        const cliente = orcamento?.snapshots?.cliente || 'Selecione'
        const ambientesSelecionados = new Set(
            Object.values(orcamento?.campos || {})
                .map(campo => String(campo.id_ambiente))
        )

        const botoes = [
            {
                texto: 'Salvar',
                img: 'concluido',
                funcao: idOrcamento
                    ? `salvarOrcamento('${idOrcamento}')`
                    : 'salvarOrcamento()'
            }
        ]

        if (idOrcamento) {
            botoes.push({
                texto: 'Excluir',
                img: 'cancel',
                funcao: `confirmarExcluirOrcamento('${idOrcamento}')`
            })
        }

        controlesCxOpcoes.cliente = {
            retornar: ['nome'],
            base: 'dados_clientes',
            colunas: {
                'Nome': { chave: 'nome' },
                'Morada Fiscal': { chave: 'morada_fiscal' },
                'Distrito': { chave: 'snapshots.cidade.distrito' },
                'Zona': { chave: 'snapshots.cidade.zona' },
                'Cidade': { chave: 'snapshots.cidade.nome' }
            }
        }

        const linhas = [
            {
                texto: 'Cliente',
                elemento: `
                    <span
                        ${orcamento?.cliente ? `id="${orcamento.cliente}"` : ''}
                        name="cliente"
                        class="opcoes"
                        onclick="cxOpcoes('cliente')">

                        ${cliente}
                    </span>
                `
            },
            {
                texto: 'Data de contato',
                elemento: `
                    <input
                        value="${orcamento?.data_contato || ''}"
                        name="data_contato"
                        type="date">
                `
            },
            {
                texto: 'Data de visita',
                elemento: `
                    <input
                        value="${orcamento?.data_visita || ''}"
                        name="data_visita"
                        type="date">
                `
            },
            {
                elemento: '<h2>Ambientes</h2>'
            }
        ]

        const { resultados } = await pesquisarDB({
            base: 'zonas',
            limite: 999
        })

        const porZonas = {}

        for (const item of resultados) {

            porZonas[item.zona] ??= []

            porZonas[item.zona].push(`
                    <option
                        value="${item.id}"
                        data-ambiente="${item.ambiente}"
                        data-zona="${item.zona}"
                        ${ambientesSelecionados.has(String(item.id))
                    ? 'selected'
                    : ''}>
                        ${item.ambiente}
                    </option>
                `)

        }

        Object.entries(porZonas)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([zona, opcoes]) => {
                linhas.push({
                    texto: zona,
                    elemento: `
                        <select name="ambientes">
                            <option value="">Selecione</option>
                            ${opcoes}
                        </select>
                    `
                })
            })

        popup({
            linhas,
            botoes,
            titulo: idOrcamento
                ? 'Editar orçamento'
                : 'Criar orçamento'
        })

    } catch (err) {
        console.error(err)
        popup({
            mensagem: 'Falha ao editar o orçamento: Fale com o suporte.'
        })
    }
}

function confirmarExcluirOrcamento(idOrcamento) {
    popup({
        mensagem: 'Tem certeza que deseja excluir este orçamento?',
        botoes: [
            {
                texto: 'Confirmar',
                img: 'concluido',
                funcao: `excluirOrcamento('${idOrcamento}')`
            }
        ]
    })
}

async function excluirOrcamento(idOrcamento) {
    try {
        overlayAguarde()

        await deletar(`dados_orcamentos/${idOrcamento}`)

        removerTodosPopups()

        popup({ mensagem: 'Exclusão realizada/enviada para aprovação!' })
    } catch (err) {
        popup({ mensagem: 'Falha ao excluir o orçamento: Fale com o suporte.' })
        console.error(err)
    }
}

async function salvarOrcamento(idOrcamento = crypto.randomUUID()) {
    try {
        overlayAguarde()

        const cliente = document.querySelector('[name="cliente"]')?.id

        if (!cliente) {
            removerOverlay()
            return popup({ mensagem: 'Campo Cliente obrigatório' })
        }

        const orcamento = await recuperarDado('dados_orcamentos', idOrcamento) || {}
        const camposAtuais = orcamento.campos || {}

        const selects = [...document.querySelectorAll('[name="ambientes"]')]
            .filter(select => select.value)

        const campos = Object.fromEntries(
            (
                await Promise.all(
                    selects.map(async select => {

                        const id_ambiente = select.value

                        const camposDoAmbiente = Object.values(camposAtuais)
                            .filter(campo => campo.id_ambiente == id_ambiente)
                            .map(campo => [
                                campo.id,
                                {
                                    ...campo,
                                    id_ambiente
                                }
                            ])

                        if (camposDoAmbiente.length)
                            return camposDoAmbiente

                        const { servicos } = await recuperarDado('zonas', id_ambiente) || {}

                        return Promise.all(
                            (servicos || []).map(async idCampo => {
                                const {
                                    id: id_campo,
                                    descricao,
                                    especialidade,
                                    medida,
                                    mao_obra,
                                    ferramentas,
                                    materiais,
                                    snapshots
                                } = await recuperarDado('campos', idCampo) || {}

                                const id = crypto.randomUUID()

                                return [
                                    id,
                                    {
                                        id,
                                        id_ambiente,
                                        id_campo,
                                        descricao,
                                        medida,
                                        ferramentas,
                                        materiais,
                                        mao_obra,
                                        especialidade,
                                        timestamp: Date.now(),
                                        unitario: snapshots?.totais?.total
                                    }
                                ]
                            })
                        )
                    })
                )
            ).flat()
        )

        // A rota genérica bloqueia os campos de gestão da obra e os preserva
        // sob lock no servidor. Não reenviá-los ao editar zonas e serviços.
        const dadosEditaveis = Object.fromEntries(Object.entries(orcamento)
            .filter(([chave]) => !['em_obra', 'colaboradores', 'dt_inicio'].includes(chave)))
        const orcamentoAtualizado = {
            ...dadosEditaveis,
            cliente,
            data_visita: obVal('data_visita'),
            data_contato: obVal('data_contato'),
            campos
        }

        const respostaSalvamento = await enviar(
            `dados_orcamentos/${idOrcamento}`,
            orcamentoAtualizado
        )
        if (!respostaSalvamento || respostaSalvamento.erro || respostaSalvamento.success === false) throw new Error('O servidor não confirmou o salvamento do orçamento.')

        removerPopup()

        await execucoes(idOrcamento)
    } catch (err) {
        console.error(err)
        popup({
            mensagem: 'Falha ao salvar o orçamento: Fale com o suporte.'
        })
    } finally {
        removerOverlay()
    }
}

async function carregarItensExecucoes(idOrcamento) {
    // A view pode omitir os novos campos de margem; recupera-os do registro salvo.
    const [view, registro] = await Promise.all([
        recuperarDado('vw_dados_orcamentos', idOrcamento),
        recuperarDado('dados_orcamentos', idOrcamento).catch(() => null)
    ])
    if (!view || view.campos == null) throw new Error('Não foi possível recuperar os serviços do orçamento.')
    return Object.entries(view.campos).map(([id, item]) => {
        const salvo = registro?.campos?.[item.id || id]
        const resultado = { ...item, id: item.id || id }
        for (const chave of ['unitario_original','margens_aplicadas','totais_categorias']) {
            if (resultado[chave] == null && salvo?.[chave] != null) resultado[chave] = salvo[chave]
        }
        if (salvo?.margens_aplicadas && Number.isFinite(Number(salvo.unitario)) && salvo.unitario != null) resultado.unitario = Number(salvo.unitario)
        return resultado
    })
}

async function execucoes(idOrcamento) {
    try {
        overlayAguarde()

        const base = await carregarItensExecucoes(idOrcamento)

        const opcoesZonas = [...new Set(base.map(i => i.nome_zona))]
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b))
            .map(zona => `<option value="${escaparAtributo(zona)}">${escaparAtributo(zona)}</option>`)
            .join('')

        controles.execucoes = { idOrcamento, base, atualizacaoManual: true, pagina: 1, limite: 25, filtros: {}, ordenar: {path:'timestamp', direcao:'desc'} }
        const colunas = [['Editar',''],['Ambiente','nome_ambiente'],['Descrição do Serviço','descricao'],['Descrição Extra (facultativo)','descricaoExtra'],['Unidade de Medida','medida'],['Quantidade','quantidade'],['Valor Unit','unitario'],['Valor Total','total']]
        const tabela = `<div class="topo-tabela"><div class="execucoes-paginacao"></div>
                <div class="seletor-zona">
                    <select aria-label="Filtrar serviços por zona" onchange="filtrarPorZona(this.value)">
                        <option value="">Todas as zonas</option>
                        ${opcoesZonas}
                    </select>
                </div>
                </div><div class="div-tabela execucoes-recorte"><table class="tabela"><thead><tr>${colunas.map(([nome,chave]) => `<th ${chave ? 'aria-sort="none"' : ''}>${chave ? `<button type="button" class="execucoes-ordenar" data-ordem-local="${chave}" onclick="ordenarExecucoesLocal('${chave}')">${nome}<span></span></button>` : nome}</th>`).join('')}</tr><tr class="tabela-linha-pesquisa">${colunas.map(([nome,chave]) => `<th>${chave ? `<input type="search" aria-label="Filtrar ${nome}" placeholder="Pesquisar…" oninput="filtrarExecucoesLocal('${chave}', this.value)">` : ''}</th>`).join('')}</tr></thead><tbody id="execucoes-local"></tbody></table></div>`

        tela.innerHTML = `
            <div class="execucoes">
                <div class="execucoes-tabela">${tabela}</div>

                <div class="execucoes-resumo" aria-live="polite"></div>
                <div class="execucoes-rodape">
                    <button type="button" onclick="editarDimensoes()">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                        Adicionar Linha
                    </button>

                    <div id="botaoFinalizacao">
                        <button type="button" onclick="orcamentoFinal('${idOrcamento}')">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H5v18h14V8ZM14 3v5h5M8 12h8M8 16h6"/></svg>
                            Ver Orçamento
                        </button>
                    </div>

                    <button type="button" class="execucoes-editar-orcamento" onclick="formularioOrcamento('${idOrcamento}')">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6ZM13 6l5 5"/></svg>
                        Editar orçamento
                    </button>
                </div>
            </div>
        `

        renderExecucoesLocal()
        const root = document.querySelector('.execucoes')
        const observador = new MutationObserver(() => {
            if (!root.isConnected) { observador.disconnect(); return }
            if (controles.execucoes?.pendente && !document.querySelector('.popup [name="servico"]')) atualizarExecucoesMemoria()
        })
        observador.observe(document.body, {childList:true})

    } catch (err) {
        console.error(err)
        popup({
            mensagem: 'Falha ao abrir as execuções: Fale com o suporte.'
        })
    } finally {
        removerOverlay()
    }
}

function consultarExecucoesLocal(estado) {
    const normalizar = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const valor = (item, chave) => chave === 'total' ? (Number(item.unitario) || 0) * (Number(item.quantidade) || 0) : item[chave]
    const numericas = ['quantidade','unitario','total','timestamp']
    return estado.base.filter(item => Object.entries(estado.filtros).every(([chave, termo]) => !termo || (chave === 'nome_zona' ? normalizar(item[chave]) === normalizar(termo) : normalizar(valor(item,chave)).includes(normalizar(termo)))))
        .sort((a,b) => {
            const chave = estado.ordenar.path
            const ordem = numericas.includes(chave) ? (Number(valor(a,chave)) || 0) - (Number(valor(b,chave)) || 0) : String(valor(a,chave) ?? '').localeCompare(String(valor(b,chave) ?? ''), 'pt-BR', {numeric:true})
            return (estado.ordenar.direcao === 'desc' ? -ordem : ordem) || String(a.id).localeCompare(String(b.id))
        })
}

function renderExecucoesLocal() {
    const body = document.getElementById('execucoes-local'), estado = controles.execucoes
    if (!body || !estado) return
    const itens = consultarExecucoesLocal(estado)
    body.innerHTML = itens.map(criarLinhaExecucoes).join('') || '<tr><td colspan="8" class="execucoes-vazio">Nenhum serviço encontrado.</td></tr>'
    document.querySelector('.execucoes-paginacao').textContent = `${itens.length} itens`
    document.querySelectorAll('[data-ordem-local]').forEach(botao => {
        const ativa = botao.dataset.ordemLocal === estado.ordenar.path
        botao.closest('th').setAttribute('aria-sort', ativa ? estado.ordenar.direcao === 'asc' ? 'ascending' : 'descending' : 'none')
        botao.querySelector('span').textContent = ativa ? estado.ordenar.direcao === 'asc' ? '↑' : '↓' : ''
    })
    const select = document.querySelector('.execucoes .seletor-zona select')
    const zonas = [...new Set(estado.base.map(item => item.nome_zona).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'))
    select.innerHTML = '<option value="">Todas as zonas</option>' + zonas.map(zona=>`<option value="${escaparAtributo(zona)}">${escaparAtributo(zona)}</option>`).join('')
    if (estado.filtros.nome_zona && !zonas.includes(estado.filtros.nome_zona)) { delete estado.filtros.nome_zona; estado.pagina = 1; renderExecucoesLocal(); return }
    select.value = estado.filtros.nome_zona || ''
    atualizarResumoExecucoes()
}

function filtrarExecucoesLocal(chave, valor) { controles.execucoes.filtros[chave] = valor.trim(); controles.execucoes.pagina = 1; renderExecucoesLocal() }
function ordenarExecucoesLocal(chave) { const estado = controles.execucoes; estado.ordenar = {path:chave, direcao:estado.ordenar.path === chave && estado.ordenar.direcao === 'asc' ? 'desc' : 'asc'}; renderExecucoesLocal() }

async function atualizarExecucoesMemoria() {
    const estado = controles.execucoes
    if (!document.getElementById('execucoes-local') || !estado) return
    if (document.querySelector('.popup [name="servico"]')) { estado.pendente = true; return }
    if (estado.sincronizando) { estado.pendente = true; return }
    estado.pendente = false; estado.sincronizando = true
    try {
        const itens = await carregarItensExecucoes(estado.idOrcamento)
        if (controles.execucoes !== estado || !document.getElementById('execucoes-local')) return
        if (document.querySelector('.popup [name="servico"]')) { estado.pendente = true; return }
        estado.base = itens
        renderExecucoesLocal()
    } catch (erro) { console.warn('Falha ao sincronizar ambientes:', erro.message) }
    finally { estado.sincronizando = false; if (estado.pendente && !document.querySelector('.popup [name="servico"]') && controles.execucoes === estado) { estado.pendente = false; atualizarExecucoesMemoria() } }
}

function calcularResumoExecucoes(itens) {
    let original = 0, total = 0, semOriginal = 0
    for (const item of itens) {
        const quantidade = Number(item.quantidade) || 0
        total += (Number(item.unitario) || 0) * quantidade
        let valorOriginal = item.unitario_original
        if (valorOriginal == null && item.totais_categorias) {
            const categorias = Object.keys(categoriasMargemOrcamento).map(tipo => item.totais_categorias[tipo])
            if (categorias.every(c => c && Number.isFinite(Number(c.subtotal)) && Number.isFinite(Number(c.max)))) {
                valorOriginal = categorias.reduce((soma,c) => soma + Number(c.subtotal) * (1 + Number(c.max)/100), 0)
            }
        }
        // Itens anteriores ao controle de margens não têm ajuste registrado.
        if (valorOriginal == null && !item.margens_aplicadas) valorOriginal = item.unitario
        if (quantidade && (valorOriginal == null || valorOriginal === '' || !Number.isFinite(Number(valorOriginal)))) semOriginal++
        else original += (Number(valorOriginal) || 0) * quantidade
    }
    const diferenca = total - original
    return { itens: itens.length, original, total, semOriginal, diferenca, percentual: original ? diferenca / original * 100 : 0 }
}

function atualizarResumoExecucoes() {
    const local = document.querySelector('.execucoes-resumo')
    if (!local) return
    const resumo = calcularResumoExecucoes(controles.execucoes?.base || [])
    const comparavel = resumo.semOriginal === 0
    local.innerHTML = `<div class="execucoes-resumo-titulo">Resumo do orçamento</div><div><small>Total de itens</small><strong>${resumo.itens}</strong></div><div><small>Valor original</small><span>${comparavel ? dinheiro(resumo.original) : '—'}</span></div><div><small>Diferença</small><span>${comparavel ? `${resumo.diferenca > 0 ? '+' : ''}${dinheiro(resumo.diferenca)} (${resumo.percentual > 0 ? '+' : ''}${resumo.percentual.toLocaleString('pt-BR', {maximumFractionDigits:2})}%)` : 'Sem histórico original'}</span></div><div class="execucoes-resumo-total"><small>Total geral</small><strong>${dinheiro(resumo.total)}</strong></div>${!comparavel ? `<small class="execucoes-resumo-aviso">${resumo.semOriginal} item(ns) sem valor original registrado para comparar diferenças.</small>` : ''}`
}

async function filtrarPorZona(zona) {

    controles.execucoes.filtros ??= {}
    controles.execucoes.pagina = 1
    controles.execucoes.filtros.nome_zona = zona
    if (!zona)
        delete controles.execucoes.filtros.nome_zona

    renderExecucoesLocal()

}

function criarLinhaExecucoes(dados) {

    const {
        id,
        nome_ambiente,
        descricao,
        unitario,
        quantidade,
        medida,
        descricaoExtra
    } = dados || {}

    const total = (quantidade || 0) * unitario

    const tds = `
        <td class="orcamento-celula-editar">
            <button type="button" class="orcamento-editar-servico" onclick="editarDimensoes('${id}')" title="Editar serviço" aria-label="Editar serviço"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6ZM13 6l5 5M3 21l5-1-4-4"/></svg></button>
        </td>

        <td>
            ${nome_ambiente || ''}
        </td>

        <td>${descricao || ''}</td>

        <td>
            <span class="descricao-extra">${descricaoExtra || '...'}</span>
        </td>

        <td>
            <span name="medida">${medida || ''}</span>
        </td>

        <td style="white-space: nowrap;" name="quantidade">${quantidade || 0}</td>
        <td style="white-space: nowrap;" name="unitario">${dinheiro(unitario)}</td>
        <td style="white-space: nowrap;" name="total">${total === 0 ? `<span class="orcamento-total-zerado" title="Valor total zerado">${dinheiro(total)}</span>` : dinheiro(total)}</td>
    `

    return `<tr data-campos="S" id="${id}">${tds}</tr>`
}

const categoriasMargemOrcamento = { ferramentas: 'Ferramentas', mao_obra: 'Mão de obra', materiais: 'Materiais' }

function valoresCategoriasOrcamento(campo, margens = {}) {
    const totais = totaisCampo(campo)
    let original = 0, alterado = 0
    const categorias = {}
    for (const tipo of Object.keys(categoriasMargemOrcamento)) {
        const max = Math.max(0, Number(campo[`margem_${tipo}`]) || 0)
        if (!Number.isFinite(max) || !Number.isFinite(totais[`subtotal_${tipo}`])) throw new Error(`Valores inválidos na composição de ${categoriasMargemOrcamento[tipo]}.`)
        const margem = margens[tipo] == null ? max : Number(margens[tipo])
        if (!Number.isFinite(margem) || margem < 0 || margem > max) throw new Error(`Margem de ${categoriasMargemOrcamento[tipo]} fora do limite de ${max}%.`)
        const subtotal = totais[`subtotal_${tipo}`]
        const valor = subtotal * (1 + margem / 100)
        categorias[tipo] = { subtotal, max, margem, total: valor }
        original += subtotal * (1 + max / 100)
        alterado += valor
    }
    return { original, alterado, categorias }
}

function preencherMargensOrcamento(modal, campo, margens = {}) {
    const calculo = valoresCategoriasOrcamento(campo, margens)
    modal._margensOrcamento = { campo }
    for (const [tipo, valores] of Object.entries(calculo.categorias)) {
        const input = modal.querySelector(`[name="margem_orcamento_${tipo}"]`)
        input.max = valores.max
        input.value = valores.margem
        input.disabled = valores.max === 0
        input.title = `Margem máxima da composição: ${valores.max.toLocaleString('pt-BR')}%`
        input.closest('label').querySelector('small').textContent = `Limite: ${valores.max.toLocaleString('pt-BR')}%`
    }
}

function limitarMargemOrcamento(input, idItem, concluir = false) {
    if (input.value === '' && !concluir) return
    const numero = Number(input.value)
    input.value = Math.min(Number(input.max), Math.max(0, Number.isFinite(numero) ? numero : 0))
    calcularDimensoes(idItem)
}

function lerMargensOrcamento(modal) {
    return Object.fromEntries(Object.keys(categoriasMargemOrcamento).map(tipo => [tipo, Number(modal.querySelector(`[name="margem_orcamento_${tipo}"]`).value)]))
}

function atualizarTotaisMargemOrcamento(modal, quantidade) {
    const resumo = modal?.querySelector('.orcamento-comparativo')
    if (!resumo || !modal._margensOrcamento) return
    const calculo = valoresCategoriasOrcamento(modal._margensOrcamento.campo, lerMargensOrcamento(modal))
    for (const [tipo, valores] of Object.entries(calculo.categorias)) {
        const label = modal.querySelector(`[name="margem_orcamento_${tipo}"]`).closest('label')
        let detalhes = label.querySelector('.orcamento-categoria-valores')
        if (!detalhes) {
            detalhes = document.createElement('div')
            detalhes.className = 'orcamento-categoria-valores'
            label.append(detalhes)
        }
        detalhes.innerHTML = `<div><span>Base / unidade</span><b>${dinheiro(valores.subtotal)}</b></div><div><span>Margem / unidade</span><b>${dinheiro(valores.total - valores.subtotal)}</b></div><div><span>Com margem / unidade</span><b>${dinheiro(valores.total)}</b></div><div class="orcamento-categoria-total"><span>Total da categoria</span><strong>${dinheiro(valores.total * quantidade)}</strong></div>`
    }
    const original = calculo.original * quantidade, alterado = calculo.alterado * quantidade
    const diferenca = alterado - original, percentual = original ? diferenca / original * 100 : 0
    resumo.innerHTML = `<div><small>Quantidade total</small><strong>${Number(quantidade).toLocaleString('pt-BR', {maximumFractionDigits:6})}</strong></div><div><small>Valor unitário</small><strong>${dinheiro(calculo.alterado)}</strong></div><div><small>Original</small><del>${dinheiro(original)}</del></div><div><small>Total alterado</small><strong>${dinheiro(alterado)}</strong></div><div><small>Diferença</small><span>${dinheiro(diferenca)} (${percentual.toLocaleString('pt-BR', {maximumFractionDigits:2})}%)</span></div>`
}

async function editarDimensoes(idItem = crypto.randomUUID()) {

    const base = (controles?.execucoes?.base || [])
    const {
        id_campo,
        id_ambiente,
        descricao,
        dimensoes,
        descricaoExtra
    } = base
        .filter(i => i.id == idItem)[0] || {}

    const {
        altura,
        largura,
        comprimento,
        metroLinear,
        unidades
    } = dimensoes || {}

    controlesCxOpcoes.servico = {
        base: 'campos',
        funcaoAdicional: [
            ['incluirServicoNoObjeto', idItem]
        ],
        retornar: ['descricao'],
        colunas: {
            'Especialidade': { chave: 'especialidade' },
            'Desccrição': { chave: 'descricao' }
        }
    }

    const ambientes = [...new Map(
        base
            .filter(item => item.id_ambiente)
            .map(item => [
                item.id_ambiente,
                item.nome_ambiente || item.id_ambiente
            ])
    ).entries()]
        .map(([id, nome]) => `
            <option value="${id}" ${id == id_ambiente ? 'selected' : ''}>
                ${nome}
            </option>
    `)
        .join('')

    const regras = `oninput="calcularDimensoes('${idItem}')"`

    const linhas = [
        {
            texto: 'Serviço',
            elemento: `<span 
                ${id_campo ? `id="${id_campo}"` : ''} 
                name="servico" 
                onclick="cxOpcoes('servico')" 
                class="opcoes">${descricao || 'Selecione'}</span>
                `
        },
        {
            texto: 'Ambiente',
            elemento: `
                <select name="id_ambiente">
                    <option value="">Selecione</option>
                    ${ambientes}
                </select>
            `
        },
        {
            texto: 'Descrição Extra',
            elemento: `<textarea name="descricao_extra" placeholder="Descrição opcional">${descricaoExtra || ''}</textarea>`
        },
        {
            texto: 'Margens por categoria',
            elemento: `<div class="orcamento-margens">${Object.entries(categoriasMargemOrcamento).map(([tipo, nome]) => `<label>${nome}<div class="orcamento-margem-input"><input type="number" min="0" max="0" step="any" inputmode="decimal" name="margem_orcamento_${tipo}" aria-label="Margem de ${nome} em porcentagem" disabled placeholder="0" oninput="limitarMargemOrcamento(this, '${idItem}')" onblur="limitarMargemOrcamento(this, '${idItem}', true)"><span>%</span></div><small>Selecione um serviço</small></label>`).join('')}</div>`
        },
        {
            texto: 'Unidades',
            elemento: `<input ${regras} type="number" name="unidades" value="${unidades || ''}">`
        },
        {
            texto: 'Metro Linear',
            elemento: `<input ${regras} type="number" name="metroLinear" value="${metroLinear || ''}">`
        },
        {
            texto: 'Comprimento',
            elemento: `<input ${regras} type="number" name="comprimento" value="${comprimento || ''}">`
        },
        {
            texto: 'Largura',
            elemento: `<input ${regras} type="number" name="largura" value="${largura || ''}">`
        },
        {
            texto: 'Altura',
            elemento: `<input ${regras} type="number" name="altura" value="${altura || ''}">`
        }
    ]

    const botoes = [
        {
            texto: 'Salvar',
            img: 'concluido',
            funcao: idItem
                ? `salvarDimensoes('${idItem}')`
                : `salvarDimensoes()`
        }
    ]

    if (idItem)
        botoes.push({
            texto: 'Excluir',
            img: 'cancel',
            funcao: `removerLinhaZona('${idItem}')`
        })

    const idModal = popup({
        titulo: 'Edição do Serviço',
        linhas,
        botoes
    })

    const modal = document.getElementById(idModal)
    const estadoEdicao = controles.execucoes
    const originalEdicao = structuredClone(estadoEdicao.base.find(item => item.id === idItem) || null)
    const observarEdicao = new MutationObserver(() => {
        if (modal.isConnected) return
        observarEdicao.disconnect()
        if (controles.execucoes !== estadoEdicao || modal.dataset.salvo === 'true') return
        estadoEdicao.base = estadoEdicao.base.filter(item => item.id !== idItem)
        if (originalEdicao) estadoEdicao.base.push(originalEdicao)
        renderExecucoesLocal()
    })
    observarEdicao.observe(document.body, {childList:true})
    const comparativo = document.createElement('div')
    comparativo.className = 'orcamento-comparativo'
    comparativo.setAttribute('aria-live', 'polite')
    comparativo.textContent = 'Selecione um serviço para comparar os totais.'
    modal.querySelector('.rodape-padrao').prepend(comparativo)
    calcularDimensoes(idItem)
    if (id_campo) {
        try {
            const campo = await recuperarDado('campos', id_campo)
            if (!modal.isConnected || modal.querySelector('[name="servico"]').id !== String(id_campo)) return
            if (!campo) throw new Error('Composição não encontrada.')
            preencherMargensOrcamento(modal, { ...campo, id: id_campo }, base.find(i => i.id === idItem)?.margens_aplicadas)
            calcularDimensoes(idItem)
        } catch (erro) { if (modal.isConnected) comparativo.textContent = `Não foi possível carregar as margens: ${erro.message}` }
    }

}

async function incluirServicoNoObjeto(idItem) {
    try {
        overlayAguarde()

        const id_campo = obVal('servico')
        const id_ambiente = obVal('id_ambiente')

        if (!id_ambiente) throw new Error('Selecione um ambiente.')

        const itemAmbiente = controles.execucoes.base
            .find(item => item.id_ambiente == id_ambiente)

        const painel = [...document.querySelectorAll('.painel-padrao')].at(-1)
        const selectAmbiente = painel?.querySelector('[name="id_ambiente"]')

        const nome_ambiente =
            itemAmbiente?.nome_ambiente ||
            selectAmbiente?.selectedOptions[0]?.textContent.trim()

        const nome_zona = itemAmbiente?.nome_zona

        const campo = await recuperarDado('campos', id_campo)
        if (!campo) throw new Error('Composição não encontrada.')
        const {
            mao_obra,
            ferramentas,
            materiais,
            descricao,
            medida,
            especialidade,
            snapshots
        } = campo
        const modal = painel.closest('.popup')
        const mesmaComposicao = String(modal._margensOrcamento?.campo?.id) === String(id_campo)
        const existente = controles.execucoes.base.find(item => item.id === idItem)
        const margens = mesmaComposicao ? lerMargensOrcamento(modal) : existente?.id_campo === id_campo ? existente.margens_aplicadas : {}
        preencherMargensOrcamento(modal, { ...campo, id: id_campo }, margens)
        const calculoMargens = valoresCategoriasOrcamento(campo, lerMargensOrcamento(modal))

        const indice = controles.execucoes.base
            .findIndex(item => item.id == idItem)

        const item = {
            ...(indice >= 0 ? controles.execucoes.base[indice] : {}),
            id: idItem,
            id_ambiente,
            nome_zona,
            nome_ambiente,
            id_campo,
            mao_obra,
            ferramentas,
            materiais,
            descricao,
            medida,
            especialidade,
            margens_aplicadas: lerMargensOrcamento(modal),
            totais_categorias: calculoMargens.categorias,
            unitario_original: calculoMargens.original,
            unitario: calculoMargens.alterado
        }

        if (indice >= 0)
            controles.execucoes.base[indice] = item
        else
            controles.execucoes.base.push(item)

        calcularDimensoes(idItem)
    } catch (err) {
        console.error(err)
        throw err
    } finally {
        removerOverlay()
    }
}

async function salvarDimensoes(id) {
    const id_ambiente = obVal('id_ambiente')

    if (!id_ambiente)
        return popup({ mensagem: 'Selecione um ambiente' })

    try {
        overlayAguarde()

        await incluirServicoNoObjeto(id)

        const { dimensoesCalculo: dimensoes, quantidade } =
            calcularDimensoes(id)

        const item = controles.execucoes.base.find(item => item.id == id)

        if (!item)
            return

        item.timestamp = Date.now()
        item.descricaoExtra = obVal('descricao_extra')
        item.dimensoes = dimensoes
        item.quantidade = quantidade

        const {
            nome_zona,
            nome_ambiente,
            ...itemParaSalvar
        } = item

        const resposta = await enviar(
            `dados_orcamentos/${controles.execucoes.idOrcamento}/campos/${id}`,
            itemParaSalvar
        )
        if (!resposta || resposta.erro || resposta.success === false) throw new Error('O servidor não confirmou o salvamento do serviço.')

        const modalSalvo = document.querySelector('.popup [name="servico"]')?.closest('.popup')
        if (modalSalvo) modalSalvo.dataset.salvo = 'true'
        renderExecucoesLocal()
        removerTodosPopups()
        await atualizarExecucoesMemoria()
    } catch (erro) {
        popup({ mensagem: escaparAtributo(erro.message || 'Não foi possível salvar o serviço.') })
    } finally {
        removerOverlay()
    }
}

function calcularDimensoes(idItem) {

    const { descricao, medida, unitario } = (controles?.execucoes?.base || [])
        .filter(i => i.id == idItem)[0] || {}

    function inv(el, remover) {
        el.style.backgroundColor = remover
            ? ''
            : '#f7c5c5'

        el.style.border = remover
            ? ''
            : 'solid 1px red'
    }

    const painel = [...document.querySelectorAll('.painel-padrao')].at(-1)

    const dimensoes = [
        'unidades',
        'metroLinear',
        'comprimento',
        'largura',
        'altura'
    ]

    // Verificação de item novo;
    dimensoes.map(dim => {
        const el = painel.querySelector(`[name="${dim}"]`)
        const linha = el.closest('.linha-padrao')

        linha.style.display = descricao
            ? 'flex'
            : 'none'
    })

    const esquema = {
        '': [],
        m2: ['comprimento', 'largura', 'altura'],
        m3: ['comprimento', 'largura', 'altura'],
        ml: ['metroLinear'],
        und: ['unidades']
    }

    const permitidos = esquema[medida] || []

    const valoresDimensoes = Object.fromEntries(
        dimensoes.map(dim => {
            const inp = painel.querySelector(`[name="${dim}"]`)

            return [dim, inp.value.trim() == '' ? null : Number(inp.value)]
        })
    )

    const dimensoesPreenchidas = Object.fromEntries(
        permitidos.map(dim => [dim, valoresDimensoes[dim] !== null])
    )

    for (const dim of dimensoes) {
        const inp = painel.querySelector(`[name="${dim}"]`)
        const liberado = permitidos.includes(dim)

        inp.readOnly = !liberado
        inv(inp, liberado)
    }

    const dimensoesCalculo = Object.fromEntries(
        permitidos.map(dim => [dim, valoresDimensoes[dim]])
    )

    const { quantidade } = calcularQuantidadeTotal(
        dimensoesCalculo,
        unitario
    )

    atualizarTotaisMargemOrcamento(painel.closest('.popup'), quantidade)

    if (medida != 'm2')
        return { dimensoesCalculo, quantidade }

    const quantidadePreenchida = Object.values(dimensoesPreenchidas)
        .filter(Boolean)
        .length

    if (quantidadePreenchida < 2)
        return { dimensoesCalculo, quantidade }

    for (const dim of permitidos) {
        const inp = painel.querySelector(`[name="${dim}"]`)

        if (!dimensoesPreenchidas[dim]) {
            inp.readOnly = true
            inv(inp)
        }
    }

    return {
        dimensoesCalculo,
        quantidade
    }

}

function calcularQuantidadeTotal(dimensoes, totalItem) {
    const valores = Object.values(dimensoes || {})
        .filter(valor => Number.isFinite(valor))

    const quantidade = valores.length
        ? valores.reduce((acumulado, valor) => acumulado * valor, 1)
        : 0

    const total = quantidade * (Number(totalItem) || 0)

    return {
        quantidade,
        total
    }
}

async function removerLinhaZona(idItem) {
    try {
        overlayAguarde()
        const modal = document.querySelector('.popup [name="servico"]')?.closest('.popup')
        const resposta = await deletar(`dados_orcamentos/${controles.execucoes.idOrcamento}/campos/${idItem}`)
        if (!resposta) throw new Error('O servidor não confirmou a exclusão do serviço.')
        if (modal) { modal.dataset.salvo = 'true'; removerPopup(modal.id) }
        await atualizarExecucoesMemoria()
    } catch (erro) {
        popup({mensagem: escaparAtributo(erro.message)})
    } finally {
        removerOverlay()
    }
}

async function orcamentoFinal(idOrcamento, emJanela) {
    overlayAguarde()

    try {

        const {
            campos,
            contrato,
            data_contato,
            data_visita,
            cliente
        } = await recuperarDado('vw_dados_orcamentos', idOrcamento) || {}

        const {
            nome,
            numero_contribuinte,
            email,
            telefone,
            morada_fiscal,
            morada_execucao
        } = await recuperarDado('dados_clientes', cliente) || {}

        let totalGeral = 0

        const dados = {
            'Orçamento': 'TOTAL (s/iva)',
            'Nome': nome || '',
            'Morada Fiscal': morada_fiscal || '',
            'Morada de Execução': morada_execucao || '',
            'Nif': numero_contribuinte || '',
            'E-mail': email || '',
            'Contacto': telefone || '',
            'Data contacto': dt(data_contato),
            'Data de visita': dt(data_visita),
            'Dias Úteis Estimados': ''
        }

        let linhas = ''
        let indice = 0

        for (const [titulo, dado] of Object.entries(dados)) {
            if (indice == 0) {
                linhas += `
                    <tr>
                        <td colspan="2" style="background-color: #5b707f;">
                            <div style="${horizontal}; gap: 1rem;">
                                <span class="tag-orcamento">${contrato}</span>

                                <div class="titulo-orcamento">
                                    <span>${titulo}</span>
                                </div>
                            </div>
                        </td>

                        <td class="total-orcamento">${dado}</td>
                    </tr>
                `
            } else {
                linhas += `
                    <tr>
                        <td style="background-color: #5b707f; color: white;">
                            ${titulo}
                        </td>

                        <td style="background-color: #DCE6F5;">
                            ${dado}
                        </td>

                        ${indice == 1
                        ? `
                                <td rowspan="9" style="background-color: white;">
                                    <div class="total-valor"></div>
                                </td>
                            `
                        : ''}
                    </tr>
                `
            }

            indice++
        }

        const colunas = [
            'Zona',
            'Ambiente',
            'Especialidade',
            'Descrição do Serviço',
            'Descrição Extra <br>(facultativo)',
            'Unidade de Medida',
            'Qtd',
            'Preço Final'
        ]
            .map(coluna => `<th>${coluna}</th>`)
            .join('')


        const itens = Object.values(campos || {}).map(campo => {
            const totalLinha =
                Number(campo.unitario || 0) * Number(campo.quantidade || 0)

            totalGeral += totalLinha
            const {
                nome_zona,
                nome_ambiente,
                especialidade,
                descricao,
                descricaoExtra,
                medida,
                quantidade
            } = campo || {}

            return `
                <tr>
                    <td>${nome_zona || ''}
                    <td>${nome_ambiente || ''}</td>
                    <td>${especialidade || ''}</td>
                    <td>${descricao || ''}</td>
                    <td>${descricaoExtra || ''}</td>
                    <td>${medida || ''}</td>
                    <td>${quantidade || ''}</td>
                    <td>${dinheiro(totalLinha)}</td>
                </tr>
            `
        })

        const elemento = `
            <div class="tela-orcamento">
                <div class="botao-flutuante">
                    <img
                        src="imagens/pdf2.png"
                        onclick="pdfOrcamento('${idOrcamento}')">
                </div>

                <div class="orcamento-documento">
                    <table class="tabela-orcamento">
                        <tbody>${linhas}</tbody>
                    </table>

                    <table class="tabela-orcamento-2">
                        <thead>${colunas}</thead>
                        <tbody>${itens.join('')}</tbody>
                    </table>
                </div>

                <span class="id-orcamento">${idOrcamento}</span>
            </div>
        `

        if (emJanela)
            popup({ elemento, titulo: 'Orçamento' })
        else
            tela.innerHTML = elemento

        document.querySelector('.total-valor').textContent =
            dinheiro(totalGeral)
    } catch (err) {
        console.error(err)
        popup({
            mensagem: 'Falha ao gerar o orçamento: Fale com o suporte.'
        })
    } finally {
        removerOverlay()
    }
}

function copiarEstilos(origem, destino) {
    const origemEls = origem.querySelectorAll('*')
    const destinoEls = destino.querySelectorAll('*')

    origemEls.forEach((elemento, indice) => {
        const estilo = getComputedStyle(elemento)
        const destinoEl = destinoEls[indice]

        for (const propriedade of estilo)
            destinoEl.style[propriedade] =
                estilo.getPropertyValue(propriedade)
    })
}

async function pdfOrcamento(idOrcamento) {
    try {
        overlayAguarde()

        const { contrato, snapshots } =
            await recuperarDado('dados_orcamentos', idOrcamento) || {}

        const nome = [
            contrato,
            snapshots?.cliente
        ]
            .filter(Boolean)
            .join('-')

        const html = document.querySelector('.orcamento-documento').outerHTML

        await pdf({
            html,
            estilos: ['orcamentos'],
            nome
        })
    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao gerar o PDF: Fale com o suporte.' })
    }
}

async function salvarDescricao(idOrcamento, idCampo, idAmbiente) {
    overlayAguarde()

    try {
        const descricaoExtra =
            document.getElementById('descricaoExtra')?.value || ''

        await enviar(
            `dados_orcamentos/${idOrcamento}/campos/${idCampo}/descricaoExtra`,
            descricaoExtra
        )

        await orcamentoFinal(idOrcamento)
        removerPopup()
    } finally {
        removerOverlay()
    }
}
