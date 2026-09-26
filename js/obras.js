async function telaObras() {

    try {

        titulo.textContent = 'Obras'

        const tabela = await modTab({
            btnExtras: `<button onclick="adicionarObra()">Adicionar Obra</button>`,
            pag: 'obras',
            body: 'bodyObras',
            base: 'mvw_dados_obras',
            criarLinha: 'criarLinhaObras',
            colunas: {
                'Ordem': { chave: 'ordem' },
                'Cliente': { chave: 'snapshots.cliente' },
                'Distrito': { chave: 'snapshots.cidade.distrito' },
                'Cidade': { chave: 'snapshots.cidade.nome' },
                'Porcentagem': {},
                'Status': {},
                'Ferramentas': {},
                'Mão de Obra': {},
                'Material': {},
                'Material Extra': {},
                '% Material Extra': {},
                'Acompanhamento': {},
                'Cronograma': {},
                'Histórico de Edições': {},
                'Edição': {}
            }
        })

        tela.innerHTML = montarPagina({ tabela, imagem: 'obras', titulo: 'Obras' })

        await paginacao()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao abrir a tela de parceiros: Fale com o suporte.' })
    }

}

function criarLinhaObras(obra) {

    const {
        id,
        ordem,
        nome_cliente,
        cidade,
        distrito,
        total_materiais,
        total_ferramentas,
        total_mao_obra,
        resultado,
        total_extra,
        porcentagem_extra
    } = obra || {}

    const { porcentagem, excedente } = resultado || {}

    const st = porcentagem == 0 || !porcentagem
        ? 'Por Iniciar'
        : porcentagem < 100
            ? 'Em Andamento'
            : 'Finalizado'

    tds = `
        <td>
            <span class="tag-usuario">${ordem}</span>
        </td>
        <td>${nome_cliente || ''}</td>
        <td>${cidade || ''}</td>
        <td>${distrito || ''}</td>
        <td>
            ${divPorcentagem(porcentagem)}
        </td>
        <td>
            <div style="${vertical}; gap: 2px;">
                <span class="${st.replace(' ', '_')}">${st}</span>
                ${excedente ? '<span class="excedente">Excedente</span>' : ''}
            </div>
        </td>
        <td>
            <span onclick="mostrarMateriaisOrcamento('${id}', 'ferramentas')" style="cursor: pointer;">${dinheiro(total_ferramentas)}</span>
        </td>
        <td>
            <span onclick="mostrarMateriaisOrcamento('${id}', 'mao_obra')" style="cursor: pointer;">${dinheiro(total_mao_obra)}</span>
        </td>
        <td>
            <span onclick="mostrarMateriaisOrcamento('${id}', 'materiais')" style="cursor: pointer;">${dinheiro(total_materiais)}</span>
        </td>
        <td>
            <span onclick="mostrarMateriaisExtras('${ordem}')" style="cursor: pointer;">${dinheiro(total_extra)}</span>
        </td>
        <td>
            ${porcentagemHtml(porcentagem_extra || 0)}
        </td>
        <td>
            <img src="imagens/kanban.png" onclick="verAndamento('${id}')">
        </td>
        <td>
            <img src="imagens/doubleCheck.png" onclick="telaCronograma('${id}')">
        </td>
        <td>
            <img src="imagens/relogio.png" onclick="historicoObras('${ordem}')">
        </td>
        <td>
            <img src="imagens/pesquisar.png" onclick="adicionarObra('${id}')">
        </td>
    `
    return `<tr>${tds}</tr>`

}

async function mostrarMateriaisOrcamento(id_obra, tipo) {

    overlayAguarde()

    const { orcamentos_vinculados } = await recuperarDado('dados_obras', id_obra) || {}

    const pag = 'popup_materiais'

    const tabela = await modTab({
        pag,
        base: 'vw_materiais_orcamentos',
        body: pag,
        criarLinha: 'criarLinhaMateriais',
        colunas: {
            'Orçamento': { chave: 'contrato' },
            'Ambiente': { chave: 'ambiente' },
            'Zona': { chave: 'zona' },
            'Tipo': { chave: 'tipo' },
            'Descrição': { chave: 'descricao' },
            'Quantidade': {},
            'Preço': {},
            'Total': {}
        },
        filtros: {
            'tipo': { op: '=', value: tipo },
            'id_orcamento': {
                modo: 'OR',
                regras: (orcamentos_vinculados || []).map(o => ({ op: '=', value: o }))
            }
        }
    })

    popup({
        titulo: 'Detalhamento de Itens Orçamentados',
        elemento: `<div style="padding: 0.5rem;">${tabela}</div>`
    })

    await paginacao(pag)

}

function criarLinhaMateriais(mat) {

    const {
        contrato,
        ambiente,
        zona,
        tipo,
        descricao,
        qtde,
        preco,
        total
    } = mat || {}

    return `
        <tr>
            <td>${contrato || ''}</td>
            <td>${ambiente}</td>
            <td>${zona}</td>
            <td>${inicialMaiuscula(tipo)}</td>
            <td>${descricao}</td>
            <td>${Number(qtde || 0).toLocaleString()}</td>
            <td>${dinheiro(preco)}</td>
            <td>${dinheiro(total)}</td>
        </tr>
    `

}

async function mostrarMateriaisExtras(ordem) {

    overlayAguarde()

    const pag = 'popup_despesas'

    const tabela = await modTab({
        pag,
        base: 'vw_despesas',
        body: 'popup_despesas',
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
        },
        filtros: {
            'obra': { op: '=', value: ordem }
        }
    })

    popup({
        titulo: 'Detalhamento de Despesas',
        elemento: `<div style="padding: 0.5rem;">${tabela}</div>`
    })

    await paginacao(pag)

}

async function calcularTotaisOrcamentos(idObra, obra) {

    const totais = {
        materialOrcado: 0,
        maoObraOrcado: 0,
        materialReal: 0
    }

    // Despesas vinculadas a esta Obra;
    const despesasVinculadas = await pesquisarDB({
        base: 'dados_despesas',
        filtros: {
            'valor': { op: 'NOT_EMPTY' },
            'obra': { op: '=', value: idObra }
        }
    })

    for (const despesa of (despesasVinculadas?.resultados || [])) {
        totais.materialReal += (despesa?.valor || 0)
    }

    for (const idOrcamento of (obra?.orcamentos_vinculados || [])) {

        const { custos } = await recuperarDado('dados_orcamentos', idOrcamento)
        if (!custos)
            continue

        const { materiais, ferramentas, mao_obra } = custos || {}

        totais.materialOrcado += materiais || 0
        totais.ferramentas += ferramentas || 0
        totais.maoObraOrcado += mao_obra || 0

    }

    return totais
}

async function adicionarObra(idObra) {

    try {

        overlayAguarde()

        const {
            snapshots,
            ordem,
            cliente,
            orcamentos_vinculados
        } = await recuperarDado('dados_obras', idObra) || {}

        controlesCxOpcoes.cliente = {
            base: 'dados_clientes',
            retornar: ['nome'],
            colunas: {
                'Cliente': { chave: 'nome' },
                'Cidade': { chave: 'snapshots.cidade.nome' },
                'Distrito': { chave: 'snapshots.cidade.distrito' },
                'Zona': { chave: 'snapshots.cidade.zona' },
                'Área': { chave: 'snapshots.cidade.area' }
            }
        }

        const tabela = await modTab({
            base: 'dados_colaboradores',
            ordem, // Será usado depois;
            colunas: {
                'Presente': {},
                'Nome': { chave: 'nome' },
                'Cidade': { chave: 'snapshots.cidade.nome' },
                'Distrito': { chave: 'snapshots.cidade.distrito' },
                'Obras': { chave: 'filtros.obra.*' }
            },
            pag: 'colabs',
            body: 'colabs',
            criarLinha: 'linhaColabs'
        })

        const linhas = [
            {
                texto: 'Cliente',
                elemento: `
                <span ${cliente ? `id="${cliente}"` : ''} 
                    class="opcoes" 
                    name="cliente" 
                    onclick="cxOpcoes('cliente')">${snapshots?.cliente || 'Selecionar'}</span>
            `
            },
            {
                texto: `
                <div style="${horizontal}; gap: 1rem;">
                    <img src="imagens/baixar.png" onclick="maisCampo('orcs-vinculados', 'dados_orcamentos')">
                    <span>Orçamentos</span>
                </div>
            `,
                elemento: `<div id="orcs-vinculados" style="${vertical}; gap: 2px;"></div>`
            },
            {
                elemento: idObra
                    ? montarPagina({ tabela, titulo: 'Colaboradores', imagem: 'colaborador' })
                    : 'Salve primeiro a Obra, depois volte para selecionar Colaboradores.'
            }
        ]

        const botoes = [
            {
                funcao: idObra
                    ? `salvarObra('${idObra}')`
                    : 'salvarObra()',
                img: 'concluido',
                texto: 'Salvar'
            }
        ]

        if (idObra)
            botoes.push({ funcao: `confirmarExclusaoObra('${idObra}')`, img: 'cancel', texto: 'Excluir' })

        popup({ linhas, botoes, titulo: 'Formulário de Obra' })

        paginacao('colabs')

        await Promise.all(
            (orcamentos_vinculados || [])
                .map(async (id) => {
                    await maisCampo('orcs-vinculados', 'dados_orcamentos', id)
                })
        )

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao abrir os detalhes da Obra: Fale com o suporte.' })
    }

}

function linhaColabs(colabs) {

    const {
        id,
        nome,
        filtros,
        snapshots
    } = colabs || {}


    const { ordem } = controles.colabs || {}
    const { obra } = filtros || {}
    const listagemObras = (obra || []).map(o => `<span class="tag-obra">${o}</span>`).join('')
    const { nome: cidade, distrito } = snapshots?.cidade || {}

    return `
        <tr>
            <td>
                <input onclick="gerenciarObraColaborador(this, '${id}', '${ordem}')" ${(obra || []).includes(ordem) ? 'checked' : ''} type="checkbox" style="width: 2rem; height: 2rem;">
            </td>
            <td>${nome}</td>
            <td>${cidade}</td>
            <td>${distrito}</td>
            <td>
                <div style="display: flex; flex-wrap: wrap; gap: 2px;">${listagemObras || ''}</div>
            </td>
        </tr>
    `
}

async function gerenciarObraColaborador(input, id, ordem) {

    try {

        const incluir = input.checked
        const { filtros } = await recuperarDado('dados_colaboradores', id) || {}
        const { obra } = filtros || {}
        let novoObra = (obra || [])

        if (incluir) {
            if (!novoObra.includes(ordem))
                novoObra.push(ordem)

        } else {
            novoObra = obra.filter(o => o !== ordem)

        }

        await enviar(`dados_colaboradores/${id}/filtros/obra`, novoObra)

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao selecionar a obra: Fale com o suporte.' })
    }

}

async function maisCampo(local, tabela, id = null) {

    let termo = 'Selecione'
    const idFinal = id || crypto.randomUUID()

    if (tabela == 'dados_orcamentos') {

        const { snapshots } = id ? await recuperarDado('dados_orcamentos', id) || {} : {}
        termo = snapshots?.cliente || 'Selecione'

        controlesCxOpcoes[idFinal] = {
            base: tabela,
            retornar: ['snapshots.cliente'],
            colunas: {
                'Número Orçamento': { chave: 'contrato' },
                'Cliente': { chave: 'snapshots.cliente' },
                'Data Contato': { chave: 'data_contato' },
                'Data Visita': { chave: 'data_visita' }
            }
        }

    } else if (tabela == 'dados_colaboradores') {

        const { nome } = id ? await recuperarDado('dados_colaboradores', id) || {} : {}
        termo = nome || 'Selecione'

        controlesCxOpcoes[idFinal] = {
            base: tabela,
            retornar: ['nome'],
            colunas: {
                'Nome': { chave: 'nome' },
                'Status': { chave: 'status' },
                'Especialidade': { chave: 'especialidade' },
                'Cidade': { chave: 'snapshots.cidade.nome' },
                'Distrito': { chave: 'snapshots.cidade.distrito' },
                'Area': { chave: 'snapshots.cidade.area' }
            }
        }

    }

    const span = `
        <div style="${horizontal}; gap: 5px;">
            <img src="imagens/fechar.png" style="width: 1.5rem;" onclick="this.parentElement.remove()">
            <span ${id ? `id="${id}"` : ''} name="${idFinal}" class="opcoes" onclick="cxOpcoes('${idFinal}')">${termo}</span>
        </div>
        `

    const elemento = document.getElementById(local)

    if (elemento)
        elemento.insertAdjacentHTML('beforeend', span)

}

async function salvarObra(idObra = crypto.randomUUID()) {

    try {

        overlayAguarde()

        const painel = document.querySelector('.painel-padrao')
        const spanCliente = painel.querySelector('[name="cliente"]')

        if (!spanCliente.id)
            removerPopup()

        const orcamentos_vinculados = [...new Set(
            [...document.querySelectorAll('#orcs-vinculados span')]
                .map(span => span.id)
                .filter(Boolean)
        )]

        console.log(orcamentos_vinculados);
        
        if (orcamentos_vinculados.length) {

            const { resultados } = await pesquisarDB({
                base: 'dados_obras',
                filtros: {
                    'orcamentos_vinculados': {
                        modo: 'OR',
                        regras: orcamentos_vinculados.map(o => ({ op: 'includes', value: o }))
                    }
                }
            })

            console.log(resultados);
            

            if (resultados.length) {
                const obras = resultados.map(o => o.ordem).join(', ')
                return popup({ mensagem: `Essa(s) obra(s) ${obras} já estão com algum destes orçamentos: Por favor verifique e remova.` })
            }

        }

        const obraAtualizada = {
            orcamentos_vinculados,
            cliente: spanCliente.id
        }

        await enviar(`dados_obras/${idObra}`, obraAtualizada)

        removerPopup()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao salvar a Obra: Fale com o suporte' })
    }

}

function confirmarExclusaoObra(idObra) {

    const botoes = [
        { texto: 'Confirmar', img: 'concluido', funcao: `excluirObra('${idObra}')`, fechar: true }
    ]
    popup({ mensagem: 'Tem certeza?', botoes, removerAnteriores: true })
}

async function excluirObra(idObra) {

    overlayAguarde()

    await deletar(`dados_obras/${idObra}`)

    removerOverlay()

}

async function painelVincularOrcamentos(idObra) {

    overlayAguarde()
    const obra = await recuperarDado('dados_obras', idObra)

    let linhas = ''

    for (const [idOrcamento, orcamento] of Object.entries(dados_orcamentos)) {

        if (orcamento.idCliente !== obra?.cliente) continue
        const nome = clientes?.[orcamento?.idCliente]?.nome || 'N/A'

        linhas += `
            <tr>
                <td>
                    <input onclick="vincularOrcamento(this, '${idObra}', '${idOrcamento}')" ${obra?.orcamentos_vinculados?.[idOrcamento] ? 'checked' : ''} type="checkbox" style="width: 1.5rem; height: 1.5rem;">
                </td>
                <td>${nome}</td>
                <td>${dtFormatada(orcamento?.data_contato)}</td>
                <td>${dtFormatada(orcamento?.data_visita)}</td>
                <td>${dinheiro(orcamento?.total_geral)}</td>
                <td><img src="imagens/obras.png" onclick="orcamentoFinal('${idOrcamento}', true)"></td>
            </tr>
        `
    }

    const params = {
        colunas: ['Selecione', 'Cliente', 'Contato', 'Visita', 'Valor', 'Orçamento'],
        body: 'orcs',
        removerPesquisa: true,
        linhas
    }

    const elemento = `
        <div style="${vertical}; padding: 0.5rem; background-color: #d2d2d2;">
        
            ${modeloTabela(params)}

        </div>
    `

    popup({ elemento, titulo: 'Orçamentos desta Obra' })

}

async function vincularOrcamento(input, idObra, idOrcamento) {

    const obra = await recuperarDado('dados_obras', idObra)

    obra.orcamentos_vinculados ??= {}

    if (input.checked) {
        obra.orcamentos_vinculados[idOrcamento] = true
    } else {
        delete obra.orcamentos_vinculados[idOrcamento]
    }

    await enviar(`dados_obras/${idObra}/orcamentos_vinculados`, obra.orcamentos_vinculados)

}

async function verAndamento(id, resetar) {

    titulo.textContent = 'Lista de Tarefas'

    controles.andamento ??= {}
    controles.andamento.idObraAtual = id

    const acumulado = `
        <div style="${vertical}; gap: 1rem; padding: 1rem;">
            <div class="painel-1-tarefas">
                <button style="background-color: red;" onclick="pdfObra('Checklist')">PDF</button>
                <button onclick="telaCronograma('${id}')">Cronograma</button>

                <input placeholder="Pesquisa" oninput="pesquisarObras(this)">
                <select id="etapas" onchange="atualizarToolbar({nomeTarefa: this.value})"></select>
            </div>

            <div style="${horizontal}; gap: 1rem;">
                <div style="${horizontal}; gap: 1rem;">
                    <input type="checkbox" name="etapa" onchange="filtrar()">
                    <span>Exibir somente as etapas</span>
                </div>
                <div style="${horizontal}; gap: 1rem;">
                    <input type="checkbox" name="concluido" onchange="filtrar()">
                    <span>Ocultar etapa concluídas</span>
                </div>
            </div>
            
            <div id="pdf">
                <div id="resumo" class="painel-1-tarefas"></div>
                <div class="tabTarefas"></div>
            </div>
        <div>
    `

    const acompanhamento = document.querySelector('.acompanhamento')
    if (resetar || !acompanhamento)
        tela.innerHTML = `<div class="acompanhamento">${acumulado}</div>`

    await carregarLinhasAndamento(id)
    await atualizarToolbar()

}

async function pdfObra(nome) {

    const htmlPdf = document.querySelector('#pdf')

    await pdf({
        html: htmlPdf.outerHTML,
        estilos: ['estilo', 'obras'],
        nome
    })

}

function filtrar() {
    const inputEtapa = document.querySelector('[name="etapa"]')
    const inputConcluido = document.querySelector('[name="concluido"]')
    const etapaChecked = !!inputEtapa?.checked
    const concluidoChecked = !!inputConcluido?.checked

    const linhas = document.querySelectorAll('tr')

    linhas.forEach(tr => {
        const etapaAttr = tr.dataset.etapa || ''
        const concluidoAttr = tr.dataset.concluido || ''

        let mostrar = true

        if (etapaChecked && etapaAttr !== 'S') mostrar = false

        if (concluidoChecked && concluidoAttr == 'S') mostrar = false

        tr.style.display = mostrar ? '' : 'none'
    })
}

async function carregarLinhasAndamento(idObra) {

    const obra = await recuperarDado('dados_obras', idObra) || {}
    const tabTarefas = document.querySelector('.tabTarefas')
    if (!tabTarefas) return

    tabTarefas.innerHTML = ''

    for (const idOrcamento of (obra?.orcamentos_vinculados || {})) {

        const orcamento = await recuperarDado('dados_orcamentos', idOrcamento) || {}
        if (!orcamento)
            continue

        const blocoOrc = document.createElement('div')

        blocoOrc.className = 'orcamento-bloco'
        blocoOrc.innerHTML = `
            <div style="${horizontal}; gap: 5px;">
                <h2> Orçamento: </h2>
                <span class="tag-orcamento">${orcamento?.contrato}</span>  
                <span>${dinheiro(orcamento?.snapshots?.total_geral)}</span>
            </div>
            `

        const grupos = {}

        const camposMesclados = Object.values(orcamento?.ambientes || {})
            .flatMap(z =>
                (z.campos || []).map(campo => ({
                    ...campo?.campo || {},
                    dimensoes: campo.dimensoes,
                    idCampo: campo.id,
                    descricaoExtra: campo.descricaoExtra,
                    ambiente: z.ambiente,
                    zona: z.zona
                }))
            )

        // Agrupa por especialidade
        for (const campo of camposMesclados) {

            const { especialidade } = campo || {}
            const idDescricao = campo?.id

            grupos[especialidade] ??= []
            grupos[especialidade].push({ idDescricao, campo, dados: {} })

        }

        // Renderiza especialidades
        for (const [especialidade, itens] of Object.entries(grupos)) {

            const tabela = document.createElement('table')
            tabela.className = 'tabela-especialidade'
            tabela.innerHTML = `<thead></thead><tbody></tbody>`

            const tbody = tabela.querySelector('tbody')

            // ====== Linha da ESPECIALIDADE ======
            const idEsp = `esp-${especialidade.replace(/\s+/g, '_')}`
            let trEsp = tbody.querySelector(`#${idEsp}`)

            if (!trEsp) {
                trEsp = document.createElement('tr')
                trEsp.id = idEsp
                tbody.appendChild(trEsp)
            }

            trEsp.dataset.descricao = especialidade
            trEsp.dataset.especialidade = especialidade
            trEsp.dataset.etapa = 'N'
            trEsp.style.backgroundColor = '#efefef'

            trEsp.innerHTML = `
                <td></td>
                <td>1.0</td>
                <td><b>${especialidade}</b></td>
                <td>Qtde Orçada / Qtde Realizada</td>
                <td>Andamento</td>
                <td>Gerenciar</td>
            `

            // ====== Itens ======
            let index = 1

            for (const item of itens) {

                const { dimensoes } = item?.campo || {}
                const { quantidade } = calcularQuantidadeTotal(dimensoes)

                const idItem = `desc-${item.idDescricao}`
                let tr = tbody.querySelector(`#${idItem}`)

                if (!tr) {
                    tr = document.createElement('tr')
                    tr.id = idItem
                    tbody.appendChild(tr)
                }

                const ordem = `1.${index}`
                const qtdeRealizada = obra?.andamento?.[idOrcamento]?.[item.idDescricao]?.realizado || 0


                const riscado = !!obra?.andamento?.[idOrcamento]?.[item.idDescricao]?.removido
                const estilo = riscado ? 'style="text-decoration: line-through"' : ''
                const fotos = !!obra?.andamento?.[idOrcamento]?.[item.idDescricao]?.fotos
                const icoCam = fotos ? 'concluido' : 'cam'
                const concluido = !!obra?.andamento?.[idOrcamento]?.[item.idDescricao]?.concluido

                const porcent = concluido
                    ? 100
                    : qtdeRealizada == 0
                        ? 0
                        : ((qtdeRealizada / quantidade) * 100).toFixed(0)

                tr.dataset.concluido = porcent >= 100 ? 'S' : 'N'
                tr.dataset.etapa = 'S'
                tr.dataset.especialidade = especialidade

                const params = `'${idObra}', '${idOrcamento}', '${item.idDescricao}'`

                tr.innerHTML = `
                    <td>
                        <input onchange="marcarConclusao(this, ${params})" ${concluido ? 'checked' : ''} type="checkbox" style="width: 1.5rem; height: 1.5rem">
                    </td>

                    <td ${estilo}>${ordem}</td>

                    <td>
                        <div style="${horizontal}; justify-content: space-between; width: 100%; gap: 1rem;">
                            <span ${estilo}>${item?.campo?.descricao || ''}</span>
                            <span>${item?.campo?.medida || ''}</span>
                        </div>
                    </td>

                    <td style="text-align: center;">${quantidade} / ${qtdeRealizada}</td>
                    <td>
                        <input name="porcentagem" style="display: none;" type="number" value="${porcent}">
                        ${porcentagemHtml(porcent)}
                    </td>

                    <td>
                        <div class="gerenciar">
                            <img onclick="gerenciar(${params})" src="imagens/lapis.png">
                            <img onclick="painelFotos(${params})" src="imagens/${icoCam}.png">
                            <img onclick="riscarItem(${params})" src="imagens/fechar.png">
                        </div>
                    </td>
                `

                index++
            }

            blocoOrc.appendChild(tabela)
        }

        tabTarefas.appendChild(blocoOrc)
    }
}

async function marcarConclusao(input, idObra, idOrcamento, idDescricao) {
    const obra = await recuperarDado('dados_obras', idObra)

    obra.andamento ??= {}
    obra.andamento[idOrcamento] ??= {}

    const item = obra.andamento[idOrcamento][idDescricao] ??= {}
    item.concluido = input.checked
    await enviar(`dados_obras/${idObra}/andamento/${idOrcamento}/${idDescricao}/concluido`, input.checked)
    await verAndamento(idObra)

}

async function riscarItem(idObra, idOrcamento, idDescricao) {
    const obra = await recuperarDado('dados_obras', idObra)

    obra.andamento ??= {}
    obra.andamento[idOrcamento] ??= {}

    const item = obra.andamento[idOrcamento][idDescricao] ??= {}

    await enviar(`dados_obras/${idObra}/andamento/${idOrcamento}/${idDescricao}`, !item.removido)

    removerPopup()
    await verAndamento(idObra)
}

async function painelFotos(idObra, idOrcamento, idDescricao) {

    const obra = await recuperarDado('dados_obras', idObra) || {}
    const fotos = obra?.andamento?.[idOrcamento]?.[idDescricao]?.fotos || {}
    const linhas = [
        { elemento: await blocoAuxiliarFotos(fotos || {}) }
    ]
    const botoes = [
        { texto: 'Salvar', img: 'concluido', funcao: `salvarFotos('${idObra}', '${idOrcamento}', '${idDescricao}')` }
    ]

    popup({ linhas, botoes, titulo: 'Painel de Fotos' })

    visibilidadeFotos()

}

async function salvarFotos(idObra, idOrcamento, idDescricao) {

    overlayAguarde()

    const fotos = document.querySelector('.fotos')
    const imgs = fotos.querySelectorAll('img')

    const album = {}

    if (imgs.length > 0) {
        for (const img of imgs) {
            if (img.dataset?.salvo === 'sim') continue

            const foto = await importarAnexos({ foto: img.src })
            const idFoto = foto[0].link
            album[idFoto] = foto[0]
            await enviar(`dados_obras/${idObra}/andamento/${idOrcamento}/${idDescricao}/fotos/${idFoto}`, foto[0])
        }
    }

    await verAndamento(idObra)
    removerPopup()
}

async function gerenciar(idObra, idOrcamento, idDescricao) {

    const obra = await recuperarDado('dados_obras', idObra) || {}
    const quantidade = obra?.andamento?.[idOrcamento]?.[idDescricao]?.realizado || 0
    const linhas = [
        {
            texto: 'Quantidade',
            elemento: `<input type="number" id="qtdeRealizada" value="${quantidade}">`
        }
    ]
    const botoes = [
        {
            texto: 'Salvar',
            img: 'concluido',
            funcao: `salvarAndamento('${idObra}', '${idOrcamento}', '${idDescricao}')`
        }
    ]

    popup({ linhas, botoes, titulo: 'Gerenciar quantidade' })

}

async function salvarAndamento(idObra, idOrcamento, idDescricao) {

    overlayAguarde()

    const qtdeRealizada = document.getElementById('qtdeRealizada')
    const realizado = Number(qtdeRealizada.value)

    await enviar(`dados_obras/${idObra}/andamento/${idOrcamento}/${idDescricao}/realizado`, realizado)

    removerPopup()

    await verAndamento(idObra)
}

function pesquisarObras(input) {
    const termo = input.value.trim().toLowerCase()
    const trs = document.querySelectorAll('tr')

    trs.forEach(tr => {
        const tds = tr.querySelectorAll('td')
        let encontrou = false

        tds.forEach(td => {
            let texto = td.textContent.trim().toLowerCase()

            const inputInterno = td.querySelector('input, textarea, select')
            if (inputInterno) {
                texto += ' ' + inputInterno.value.trim().toLowerCase()
            }

            if (termo && texto.includes(termo)) {
                encontrou = true;
            }
        });

        tr.style.display = (!termo || encontrou) ? '' : 'none' // mostra

    })
}

async function atualizarToolbar({ nomeTarefa } = {}) {

    if (nomeTarefa && nomeTarefa.includes('Todas')) nomeTarefa = false
    const linhas = document.querySelectorAll('tr')

    const bloco = (texto, valor) => `
        <div class="bloco">
            <span>${valor}</span>
            <label>${texto}</label>
        </div>
    `

    const totais = {
        excedente: 0,
        tarefas: 0,
        naoIniciado: 0,
        emAndamento: 0,
        concluido: 0,
        porcentagemConcluido: 0
    }

    const tarefas = ['Todas as tarefas']
    let excedente = false

    for (let linha of linhas) {

        const descricao = linha.dataset.descricao
        const especialidade = linha.dataset.especialidade

        linha.style.display = (nomeTarefa && nomeTarefa !== especialidade) ? 'none' : ''

        const tipo = linha.dataset.etapa == 'S' ? 'etapa' : 'especialidade'

        if (tipo !== 'etapa') {
            tarefas.push(descricao)
            continue
        }

        //Salvar os stats e usar eles na tabela principal;
        const porcentagem = Number(linha.querySelector('[name="porcentagem"]').value)

        totais.porcentagemConcluido += porcentagem > 100 ? 100 : porcentagem
        totais.tarefas++

        if (porcentagem >= 100) {
            totais.concluido++
        } else if (porcentagem == 0) {
            totais.naoIniciado++
        } else if (porcentagem !== 0 && porcentagem < 100) {
            totais.emAndamento++
        } else if (porcentagem >= 100) {
            totais.concluido++
        }

        if (porcentagem > 100) {
            excedente = true
            totais.excedente++
        }

    }

    const emPorcentagemConcluido = totais.porcentagemConcluido
    const porcentagemAndamento = emPorcentagemConcluido == 0
        ? 0
        : Number((emPorcentagemConcluido / totais.tarefas).toFixed(0))

    const idObraAtual = controles.andamento.idObraAtual
    const obra = await recuperarDado('dados_obras', idObraAtual)
    obra.resultado ??= {}
    const resultado = {
        porcentagem: porcentagemAndamento,
        excedente
    }

    obra.resultado = resultado

    await enviar(`dados_obras/${idObraAtual}/resultado`, resultado)

    const opcoes = [... new Set(tarefas)]
        .map(op => `<option ${nomeTarefa == op ? 'selected' : ''}>${op}</option>`)
        .join('')

    document.getElementById('etapas').innerHTML = opcoes
    document.getElementById('resumo').innerHTML = `
        ${bloco('Total', totais.tarefas)}
        ${bloco('Não iniciado', totais.naoIniciado)}
        ${bloco('Em andamento', totais.emAndamento)}
        ${bloco('Excedente', totais.excedente)}
        ${bloco('Concluída', totais.concluido)}
        ${bloco('Realizado', `${porcentagemAndamento}%`)}
    `
}

function porcentagemHtml(percentual) {
    let cor
    if (percentual < 50) cor = 'red'
    else if (percentual < 100) cor = 'orange'
    else if (percentual > 100) cor = 'blue'
    else cor = 'green'

    return `
    <div style="display:flex; align-items:center; gap:4px;">
        <span style="color:#888; font-size:14px;">${percentual}%</span>
        <div class="barra" style="flex:1; height:8px; background:#ddd;">
            <div style="width:${percentual}%; height:100%; background:${cor};"></div>
        </div>
    </div>
  `
}

async function historicoObras(ordem) {

    try {

        overlayAguarde()

        const pag = 'hisObras'
        const tabela = await modTab({
            base: 'vw_historico_obras',
            pag,
            body: 'hisObras',
            filtros: {
                'ordem_obra': { op: '=', value: ordem }
            },
            colunas: {
                'Nome Colaborador': { chave: 'nome_colaborador' },
                'Alterações': {},
                'Tabela': {},
                'Data': { chave: 'data', tipoPesquisa: 'data' },
                'Alterado por': { chave: 'usuario' }
            },
            criarLinha: 'linhaHisObras'
        })

        popup({
            elemento: `<div style="padding: 0.5rem;">${montarPagina({ tabela, titulo: 'Histórico de Edições', imagem: 'colaborador' })}</div>`
        })

        await paginacao(pag)

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao gerar o histórico: Fale com o suporte.' })
    }


}

function linhaHisObras(his) {

    const {
        data,
        usuario,
        caminho,
        nome_colaborador,
        alteracoes
    } = his || {}

    const [tabela] = caminho.split('/')

    const labelAlteracoes = (alteracoes || [])
        .map(({ mensagem }) => {
            return `<span class="tag-alteracao">${mensagem}</span>`
        })
        .join('')

    const labelNomeColaborador = nome_colaborador
        ? `<span class="tag-alteracao">${nome_colaborador}</span>`
        : ''

    return `
        <tr>
            <td>${labelNomeColaborador}</td>
            <td>
                <div class="janela-alteracoes">${labelAlteracoes || 'Sem informações'}</div>
            </td>
            <td>${inicialMaiuscula(tabela)}</td>
            <td>${data}</td>
            <td>${usuario}</td>
        </tr>
    `

}