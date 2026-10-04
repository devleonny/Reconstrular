let filtroFinalizado = null

async function orcamentosEmAberto() {
    await orcamentos('N')
}

async function orcamentosFinalizados() {
    await orcamentos('S')
}

async function orcamentosRecusados() {
    await orcamentos('R')
}

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

async function orcamentos(finalizado = filtroFinalizado) {
    try {
        overlayAguarde()

        if (finalizado)
            filtroFinalizado = finalizado

        const titulo = filtroFinalizado == 'S'
            ? 'Orçamentos Finalizados'
            : filtroFinalizado == 'R'
                ? 'Orçamentos Recusados'
                : 'Orçamentos Em Aberto'

        const imagem = filtroFinalizado == 'S'
            ? 'doublecheck'
            : filtroFinalizado == 'R'
                ? 'cancel'
                : 'alerta'

        const tabela = await modTab({
            base: 'vw_dados_orcamentos',
            pag: 'orcamentos',
            filtros: {
                finalizado: { op: '=', value: finalizado }
            },
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
                'Data de Visita': { chave: 'data_visita', tipoPesquisa: 'data' },
                '<span class="em_analise">Em Análise</span>': {},
                '<span class="orcamento_aceite">Orçamento Aceite</span>': {},
                '<span class="orcamento_adjudicado">Orçamento Adjudicado</span>': {},
                '<span class="orcamento_recusado">Orçamento Recusado</span>': {}
            }
        })

        tela.innerHTML = montarPagina({ titulo, imagem, tabela })

        await paginacao()

        removerOverlay()
    } catch (err) {
        console.log(err)
        popup({ mensagem: 'Falha ao abrir a tela de Orçamentos: Fale com o suporte.' })
    }
}

function montarPagina({ titulo, imagem, tabela }) {
    return `
        <div style="${vertical}; width: 100%;">
            <div class="titulo-tabelas">
                <img src="imagens/${imagem}.png">
                <span>${titulo}</span>
            </div>
            ${tabela}
        </div>
    `
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
                            src="imagens/pdf.png"
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
                        <img src="imagens/upload.png">
                    </label>
                </td>
            `
        })
        .join('')

    const tds = `

        <td>
            <img src="imagens/pesquisar.png" onclick="formularioOrcamento('${idOrcamento}')">
        </td>

        <td>
            <img src="imagens/planta.png" onclick="execucoes('${idOrcamento}', 0)">
        </td>

        <td>
            <img src="imagens/orcamentos.png" onclick="orcamentoFinal('${idOrcamento}')">
        </td>
        <td>
            <select
                class="${statusOrcamento?.[status]}"
                onchange="alterarStatusOrcamento('${idOrcamento}', this.value, '${finalizado}')">

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

        ${tdsAnexos}


    `

    return `<tr>${tds}</tr>`
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

async function alterarStatusOrcamento(idOrcamento, status, statusAtualFinalizado) {
    overlayAguarde()

    let finalizado = null

    if (status == 'Orçamento Recusado') {
        finalizado = 'R'
    } else if (status != 'Orçamento Recusado' && statusAtualFinalizado == 'R') {
        finalizado = 'N'
    } else {
        finalizado = statusAtualFinalizado
    }

    await enviar(`dados_orcamentos/${idOrcamento}`, {
        status,
        finalizado
    })

    removerOverlay()
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

        const orcamentoAtualizado = {
            ...orcamento,
            cliente,
            finalizado: 'N',
            data_visita: obVal('data_visita'),
            data_contato: obVal('data_contato'),
            campos
        }

        await enviar(
            `dados_orcamentos/${idOrcamento}`,
            orcamentoAtualizado
        )

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

async function execucoes(idOrcamento) {
    try {
        overlayAguarde()

        const { campos } = await recuperarDado('vw_dados_orcamentos', idOrcamento) || {}

        const base = Object.values(campos)

        const opcoesZonas = [...new Set(base.map(i => i.nome_zona))]
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b))
            .map(zona => `<option>${zona}</option>`)
            .join('')

        const tabela = await modTab({
            btnExtras: `
                <div class="seletor-zona">
                    <span>Zona atual</span>
                    <select onchange="filtrarPorZona(this.value)">
                        <option>Todas</option>
                        ${opcoesZonas}
                    </select>
                </div>
                `,
            idOrcamento,
            ordenar: {
                path: 'timestamp',
                direcao: 'desc',
            },
            colunas: {
                'Editar': {},
                'Ambiente': { chave: 'nome_ambiente' },
                'Descrição do Serviço': { chave: 'descricao' },
                'Descrição Extra <br>(facultativo)': {
                    chave: 'descricaoExtra'
                },
                'Unidade de <br> Medida': { chave: 'medida' },
                'Quantidade': {},
                'Valor Unit': {},
                'Valor Total': {}
            },
            pag: 'execucoes',
            body: 'execucoes',
            base,
            criarLinha: 'criarLinhaExecucoes'
        })

        tela.innerHTML = `
            <div class="execucoes">
                <div style="width: max-content;">${tabela}</div>

                <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
                    <button onclick="editarDimensoes()">
                        <img src="imagens/baixar.png">
                        Adicionar Linha
                    </button>

                    <div id="botaoFinalizacao">
                        <button onclick="orcamentoFinal('${idOrcamento}')">
                            Ver Orçamento
                            <img src="imagens/orcamentos.png">
                        </button>
                    </div>

                    <button onclick="alterarFinalizacao('${idOrcamento}', 'S')">
                        Concluir Orçamento
                        <img src="imagens/concluido.png">
                    </button>
                </div>
            </div>
        `

        await paginacao('execucoes')

    } catch (err) {
        console.error(err)
        popup({
            mensagem: 'Falha ao abrir as execuções: Fale com o suporte.'
        })
    } finally {
        removerOverlay()
    }
}

async function filtrarPorZona(zona) {

    controles.execucoes.filtros ??= {}
    controles.execucoes.filtros.nome_zona = { op: '=', value: zona }
    if (zona == 'Todas')
        delete controles.execucoes.filtros.nome_zona

    await paginacao('execucoes')

}

async function alterarFinalizacao(id, status) {
    overlayAguarde()

    await enviar(`dados_orcamentos/${id}/finalizado`, status)

    await orcamentos()

    removerOverlay()
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
        <td>
            <div style="${horizontal}"><img onclick="editarDimensoes('${id}')" src="imagens/lapis.png"></div>
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
        <td style="white-space: nowrap;" name="total">${dinheiro(total)}</td>
    `

    return `<tr data-campos="S" id="${id}">${tds}</tr>`
}

function editarDimensoes(idItem = crypto.randomUUID()) {

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
        },
        {
            elemento: `
                <div style="${horizontal}; gap: 1rem; width: 100%;">
                    <span>Quantidade Final</span>
                    <span class="etiquetas" id="totalQuantidade">0</span>
                </div>
                `
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

    popup({
        titulo: 'Edição do Serviço',
        linhas,
        botoes
    })

    calcularDimensoes(idItem)

}

async function incluirServicoNoObjeto(idItem) {
    try {
        overlayAguarde()

        const id_campo = obVal('servico')
        const id_ambiente = obVal('id_ambiente')

        if (!id_ambiente)
            return popup({ mensagem: 'Selecione um ambiente' })

        const itemAmbiente = controles.execucoes.base
            .find(item => item.id_ambiente == id_ambiente)

        const painel = [...document.querySelectorAll('.painel-padrao')].at(-1)
        const selectAmbiente = painel?.querySelector('[name="id_ambiente"]')

        const nome_ambiente =
            itemAmbiente?.nome_ambiente ||
            selectAmbiente?.selectedOptions[0]?.textContent.trim()

        const nome_zona = itemAmbiente?.nome_zona

        const {
            mao_obra,
            ferramentas,
            materiais,
            descricao,
            medida,
            especialidade,
            snapshots
        } = await recuperarDado('campos', id_campo) || {}

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
            unitario: snapshots?.totais?.total || 0
        }

        if (indice >= 0)
            controles.execucoes.base[indice] = item
        else
            controles.execucoes.base.push(item)

        calcularDimensoes(idItem)
    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao incluir o serviço: Fale com o suporte.' })
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

        await enviar(
            `dados_orcamentos/${controles.execucoes.idOrcamento}/campos/${id}`,
            itemParaSalvar
        )

        await paginacao('execucoes')
        removerTodosPopups()
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

    const localResultado = painel.querySelector('#totalQuantidade')
    localResultado.textContent = quantidade

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

        controles.execucoes.base = controles.execucoes.base
            .filter(campo => campo.id != idItem)

        await paginacao('execucoes')

        deletar(`dados_orcamentos/${controles.execucoes.idOrcamento}/campos/${idItem}`)

    } finally {
        removerTodosPopups()
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
