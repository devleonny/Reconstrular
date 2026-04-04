let idObraAtual = null

async function telaObras() {

    telaAtiva = 'obras'

    titulo.textContent = 'Obras'

    const tabela = await modTab({
        btnExtras: `<button onclick="adicionarObra()">Adicionar</button>`,
        pag: 'obras',
        body: 'bodyObras',
        base: 'dados_obras',
        criarLinha: 'criarLinhaObras',
        substituicoes: [
            {
                path: 'cliente',
                tabela: 'dados_clientes',
                campoBusca: 'id',
                retorno: 'nome',
                destino: 'nomeCliente'
            }
        ],
        colunas: {
            'Cliente': { chave: 'snapshots.cliente' },
            'Distrito': { chave: 'snapshots.cidade.distrito' },
            'Cidade': { chave: 'snapshots.cidade.nome' },
            'Porcentagem': {},
            'Status': {},
            'Material Orçamentado': {},
            'Material Real': {},
            'Material Real vs Material Orçamentado': {},
            'Mão de Obra Orçamentado': {},
            'Acompanhamento': {},
            'Cronograma': {},
            '': {}
        }
    })

    tela.innerHTML = tabela

    await paginacao()

}

async function criarLinhaObras(obra) {

    const { id, snapshots, nomeCliente } = obra || {}
    const { cidade } = snapshots || {}

    const resultado = obra?.resultado || {}
    const porcentagem = Number(resultado?.porcentagem || 0)

    const st = porcentagem == 0
        ? 'Por Iniciar'
        : porcentagem > 0
            ? 'Em Andamento'
            : 'Finalizado'

    const {
        materialOrcado,
        maoObraOrcado,
        materialReal
    } = calcularTotaisOrcamentos(id, obra)

    tds = `
        <td>${nomeCliente || ''}</td>
        <td>${cidade?.distrito || ''}</td>
        <td>${cidade?.nome || ''}</td>
        <td>
            ${divPorcentagem(porcentagem)}
        </td>
        <td style="text-align: left;">
            <span class="${st.replace(' ', '_')}">${st}</span>
            ${resultado?.excedente ? '<span class="excedente">Excedente</span>' : ''}
        </td>

        <td>${dinheiro(materialOrcado)}</td>
        <td>${dinheiro(materialReal)}</td>
        <td>
            ${porcentagemHtml(materialOrcado ? Number((materialReal / materialOrcado) * 100).toFixed(0) : 0)}
        </td>
        <td>${dinheiro(maoObraOrcado)}</td>
        <td>
            <img src="imagens/kanban.png" onclick="verAndamento('${id}')">
        </td>
        <td>
            <img src="imagens/relogio.png" onclick="telaCronograma('${id}')">
        </td>
        <td>
            <img src="imagens/pesquisar.png" data-controle="editar" onclick="adicionarObra('${id}')">
        </td>
    `
    return `<tr>${tds}</tr>`

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

    const vinculados = obra.orcamentos_vinculados || {}

    for (const idOrcamento of Object.keys(vinculados)) {

        const orc = await recuperarDado('dados_orcamentos', idOrcamento)
        if (!orc)
            continue

        const zonas = orc.zonas || {}

        for (const zona of Object.values(zonas)) {
            for (const campo of Object.values(zona)) {

                if (campo.materiais) {
                    for (const item of Object.values(campo.materiais)) {
                        totais.materialOrcado += (Number(item.qtde) || 0) * (Number(item.preco) || 0)
                    }
                }

                if (campo.mao_obra) {
                    for (const item of Object.values(campo.mao_obra)) {
                        totais.maoObraOrcado += (Number(item.qtde) || 0) * (Number(item.preco) || 0)
                    }
                }

            }
        }
    }

    return totais
}

async function adicionarObra(idObra) {

    const { snapshots, orcamentos_vinculados } = await recuperarDado('dados_obras', idObra) || {}

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

    const linhas = [
        {
            texto: 'Cliente',
            elemento: `<span class="opcoes" name="cliente" onclick="cxOpcoes('cliente')">${snapshots?.cliente || 'Selecionar'}</span>`
        },
        {
            texto: 'Vincular Orçamento',
            elemento: `
                <img src="imagens/baixar.png" onclick="maisOrcamento()">
                <div id="orcs-vinculados" style="${vertical}; gap: 2px;"></div>            
            `
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


    for (const id of (orcamentos_vinculados || []))
        await maisOrcamento(id)


}

async function maisOrcamento(idOrcamento) {

    const id = crypto.randomUUID()

    const { snapshots } = await recuperarDado('dados_orcamentos', idOrcamento) || {}
    const cliente = snapshots?.cliente || 'Selecione'

    controlesCxOpcoes[id] = {
        base: 'dados_orcamentos',
        retornar: ['snapshots.cliente'],
        colunas: {
            'Cliente': { chave: 'snapshots.cliente' },
            'Data Contato': { chave: 'dataContato' },
            'Data Visita': { chave: 'dataVisita' }
        }
    }

    const span = `
        <div style="${horizontal}; gap: 5px;">
            <img src="imagens/cancel.png" style="width: 1.5rem;" onclick="this.parentElement.remove()">
            <span ${idOrcamento ? `id="${idOrcamento}"` : ''} name="${id}" class="opcoes" onclick="cxOpcoes('${id}')">${cliente}</span>
        </div>
        `

    document.getElementById('orcs-vinculados').insertAdjacentHTML('beforeend', span)

}

async function salvarObra(idObra = crypto.randomUUID()) {

    overlayAguarde()

    const painel = document.querySelector('.painel-padrao')
    const spanCliente = painel.querySelector('[name="cliente"]')

    if (!spanCliente.id)
        removerPopup()

    const orcamentosVinculados = [...new Set(
        [...document.querySelectorAll('#orcs-vinculados span')]
            .map(span => span.id)
            .filter(Boolean)
    )]

    await enviar(`dados_obras/${idObra}/orcamentos_vinculados`, orcamentosVinculados)
    await enviar(`dados_obras/${idObra}/cliente`, spanCliente.id)

    removerPopup()

}

function confirmarExclusaoObra(idObra) {

    const botoes = [
        { texto: 'Confirmar', img: 'concluido', funcao: `excluirObra('${idObra}')` }
    ]
    popup({ mensagem: 'Tem certeza?', botoes, nra: false })
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
                <td>${dtFormatada(orcamento?.dataContato)}</td>
                <td>${dtFormatada(orcamento?.dataVisita)}</td>
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

    idObraAtual = id

    titulo.textContent = 'Lista de Tarefas'

    const acumulado = `
        <div style="${vertical}; gap: 1rem;">
            <div class="painel-1-tarefas">
                <input placeholder="Pesquisa" oninput="pesquisarObras(this)">
                <select id="etapas" onchange="atualizarToolbar({nomeTarefa: this.value})"></select>
                <button style="background-color: red;" onclick="pdfObra('Checklist')">PDF</button>
                <button onclick="telaCronograma('${id}')">Cronograma</button>
                <button onclick="telaObras()">Voltar</button>
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

    const estilos = [
        'estilo',
        'obras'
    ]

    const mapEstilos = estilos
        .map(e => `<link rel="stylesheet" href="https://devleonny.github.io/Reconstrular/css/${e}.css">`)
        .join('')

    const html = `
        <html>
        <head>
            <meta charset="UTF-8">
            ${mapEstilos}
            <style>

                @page {
                    size: 440mm 210mm;
                    margin: 5mm;
                }

                body {
                    font-family: 'Poppins', sans-serif;
                    background: white;
                }

            </style>
        </head>
        <body>
            ${htmlPdf.outerHTML}
        </body>
        </html>
  `

    await pdf(html, nome)
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

    const obra = await recuperarDado('dados_obras', idObra)
    const tabTarefas = document.querySelector('.tabTarefas')
    if (!tabTarefas) return

    tabTarefas.innerHTML = ''

    for (const [idOrcamento, status] of Object.entries(obra?.orcamentos_vinculados || {})) {

        if (!status)
            continue

        const orcamento = await recuperarDado('dados_orcamentos', idOrcamento) || {}
        if (!orcamento)
            continue

        const cliente = await recuperarDado('dados_clientes', orcamento?.cliente) || {}
        const blocoOrc = document.createElement('div')

        blocoOrc.className = 'orcamento-bloco'
        blocoOrc.innerHTML = `<h2>Orçamento: ${cliente.nome || idOrcamento} - ${dinheiro(orcamento?.total_geral)}</h2>`

        const grupos = {}

        // Agrupa por especialidade
        for (const [, dadosZona] of Object.entries(orcamento?.zonas || {})) {
            for (const dadosDescricao of Object.values(dadosZona)) {
                const idDescricao = dadosDescricao.campo
                const campo = await recuperarDado('campos', idDescricao) || {}
                const esp = campo?.especialidade || "SEM ESPECIALIDADE"

                if (!grupos[esp]) grupos[esp] = []
                grupos[esp].push({ idDescricao, campo, dados: dadosDescricao })
            }
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

                const idItem = `desc-${item.idDescricao}`
                let tr = tbody.querySelector(`#${idItem}`)

                if (!tr) {
                    tr = document.createElement('tr')
                    tr.id = idItem
                    tbody.appendChild(tr)
                }

                const ordem = `1.${index}`
                const qtdeRealizada = obra?.andamento?.[idOrcamento]?.[item.idDescricao]?.realizado || 0
                const totalOrcado = item?.dados?.quantidade || 0

                const riscado = !!obra?.andamento?.[idOrcamento]?.[item.idDescricao]?.removido
                const estilo = riscado ? 'style="text-decoration: line-through"' : ''
                const fotos = !!obra?.andamento?.[idOrcamento]?.[item.idDescricao]?.fotos
                const icoCam = fotos ? 'concluido' : 'cam'
                const concluido = !!obra?.andamento?.[idOrcamento]?.[item.idDescricao]?.concluido

                const porcent = concluido
                    ? 100
                    : qtdeRealizada == 0
                        ? 0
                        : ((qtdeRealizada / totalOrcado) * 100).toFixed(0)

                tr.dataset.concluido = porcent >= 100 ? 'S' : 'N'
                tr.dataset.etapa = 'S'
                tr.dataset.especialidade = especialidade

                const params = `'${idObra}', '${idOrcamento}', '${item.idDescricao}'`

                tr.innerHTML = `
                    <td><input onchange="marcarConclusao(this, ${params})" ${concluido ? 'checked' : ''} type="checkbox" style="width: 1.5rem; height: 1.5rem"></td>

                    <td ${estilo}>${ordem}</td>

                    <td>
                        <div style="${horizontal}; justify-content: space-between; width: 100%; gap: 1rem;">
                            <span ${estilo}>${item?.campo?.descricao || ''}</span>
                            <span>${item?.campo?.medida || ''}</span>
                        </div>
                    </td>

                    <td style="text-align: center;">${totalOrcado} / ${qtdeRealizada}</td>
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

    const obra = await recuperarDado('dados_obras', idObra)
    const fotos = obra.andamento[idOrcamento][idDescricao].fotos ??= {}
    const linhas = [{ elemento: await blocoAuxiliarFotos(fotos || {}) }]
    const botoes = [{ texto: 'Salvar', img: 'concluido', funcao: `salvarFotos('${idObra}', '${idOrcamento}', '${idDescricao}')` }]

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

    removerPopup()
}

async function gerenciar(idObra, idOrcamento, idDescricao) {

    const obra = await recuperarDado('dados_obras', idObra)
    const quantidade = obra?.andamento?.[idOrcamento]?.[idDescricao]?.realizado || 0
    const funcao = `salvarAndamento('${idObra}', '${idOrcamento}', '${idDescricao}')`
    const linhas = [{ texto: 'Quantidade', elemento: `<input type="number" id="qtdeRealizada" value="${quantidade}">` }]
    const botoes = [{ texto: 'Salvar', img: 'concluido', funcao }]

    popup({ linhas, botoes, titulo: 'Gerenciar quantidade' })

}

async function salvarAndamento(idObra, idOrcamento, idDescricao) {

    overlayAguarde()

    const qtdeRealizada = document.getElementById('qtdeRealizada')

    const obra = await recuperarDado('dados_obras', idObra)

    const realizado = Number(qtdeRealizada.value)

    obra.andamento ??= {}
    obra.andamento[idOrcamento] ??= {}
    obra.andamento[idOrcamento][idDescricao] ??= {}
    obra.andamento[idOrcamento][idDescricao].realizado = realizado

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
    const porcentagemAndamento = emPorcentagemConcluido == 0 ? 0 : (emPorcentagemConcluido / totais.tarefas).toFixed(0)

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

async function pdf(html, nome = 'documento') {

    if (!html) return

    overlayAguarde()

    try {

        const response = await fetch(`${api}/pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ html })
        })

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = url
        a.download = `${nome}.pdf`
        a.click()

        URL.revokeObjectURL(url)

        removerOverlay()
    } catch (err) {
        popup({ mensagem: err.message })
    }

}

async function telaCronograma(idObra) {

    const obra = await recuperarDado('dados_obras', idObra)
    const cliente = await recuperarDado('dados_clientes', obra?.cliente)

    titulo.textContent = 'Cronograma'

    function pMin(hhmm) {
        if (!hhmm) return 0
        const [h, m] = hhmm.split(':').map(Number)
        return (h * 60) + (m || 0)
    }

    function avancarDiasUteis(data, dias) {
        const d = new Date(data)
        while (dias > 0) {
            d.setDate(d.getDate() + 1)
            const dia = d.getDay()
            if (dia !== 0 && dia !== 6) dias--
        }
        return d
    }

    const colunas = [
        'Ação', 'Zonas', 'Especialidades', 'Descrição do Serviço', 'Medida',
        'Quantidade', 'Tempo (hh:mm)',
        'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'
    ]

    let duracaoTotal = 0
    let linhasBase = []

    for (const [idOrcamento, status] of Object.entries(obra?.orcamentos_vinculados || {})) {

        if (!status) continue

        const orcamento = await recuperarDado('dados_orcamentos', idOrcamento)

        for (const [zona, itens] of Object.entries(orcamento?.zonas || {})) {
            for (const dados of Object.values(itens)) {
                const campoRef = campos[dados.campo] || {}
                const minutos = pMin(campoRef?.duracao) * (dados?.quantidade || 0)
                duracaoTotal += minutos

                linhasBase.push({
                    zona,
                    especialidade: dados?.especialidade || '',
                    descricao: dados?.descricao || '',
                    medida: dados?.medida || '',
                    quantidade: dados?.quantidade || 0,
                    duracao: calcularDuracao(dados?.quantidade, campoRef?.duracao)
                })
            }
        }
    }

    const MINUTOS_DIA = 8 * 60
    const DIAS_SEMANA = 5

    const diasUteis = Math.ceil(duracaoTotal / MINUTOS_DIA)
    const semanas = Math.ceil(diasUteis / DIAS_SEMANA)

    const dataInicial = obra?.dtInicio
        ? new Date(obra.dtInicio + 'T00:00')
        : new Date()

    const dataFinal = avancarDiasUteis(dataInicial, diasUteis - 1)
    const dataFinalConvertida = dataFinal ? new Date(dataFinal).toLocaleDateString() : '-'

    const tabInfos = `
        <table class="tabela-obras">
            <tbody>
                <tr>
                    <td colspan="2" style="background: #5b707f; color: #fff; font-size: 1.2rem;">CRONOGRAMA DE OBRA</td>
                    <td colspan="2" style="background: red; color: #fff;">Dias Úteis Estimados</td>
                </tr>
                <tr>
                    <td style="background: #5b707f; color:#fff;">Cliente</td>
                    <td style="background:#fff">${cliente?.nome || '--'}</td>
                    <td rowspan="4" class="dias-uteis">${diasUteis || 0}</td>
                </tr>
                <tr>
                    <td style="background: #5b707f; color: #fff;">Morada de Execução</td>
                    <td>${cliente?.moradaExecucao || '--'}</td>
                </tr>
                <tr>
                    <td style="background: #5b707f; color: #fff;">Data de Início</td>
                    <td>
                        <input type="date" id="dtInicio"
                            value="${obra?.dtInicio || ''}"
                            onchange="salvarDtInicio(this, '${idObra}')">
                    </td>
                </tr>
                <tr>
                    <td style="background: #5b707f; color: #fff;">Data de Fim Previsto</td>
                    <td>${dataFinalConvertida}</td>
                </tr>
            </tbody>
        </table>
    `

    let tabelas = ''
    let cursor = new Date(dataInicial)

    for (let s = 0; s < semanas; s++) {

        let linhas = montarSemana(cursor)
        for (const l of linhasBase) {
            linhas += `
                <tr>
                    <td></td>
                    <td>${l.zona}</td>
                    <td>${l.especialidade}</td>
                    <td>${l.descricao}</td>
                    <td>${l.medida}</td>
                    <td>${l.quantidade}</td>
                    <td name="duracao">${l.duracao}</td>
                    ${['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']
                    .map(d => `<td name="${d}"></td>`).join('')}
                </tr>
            `
        }

        tabelas += `
            <h3>Semana de ${cursor.toLocaleDateString()}</h3>
            <table class="tabela-obras">
                <thead>
                    <tr style="background: #5b707f;">
                        ${colunas.map(c => `<th>${c}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>${linhas}</tbody>
            </table>
        `

        cursor = avancarDiasUteis(cursor, 5)
    }

    tela.innerHTML = `
        <div style="${horizontal}; gap: 2rem;">
            <button>Gravar</button>
            <button style="background-color: red;" onclick="pdfObra('Cronograma')">PDF</button>
            <button onclick="verAndamento('${idObra}', true)">Voltar</button>
        </div>
        <br>
        <div class="acompanhamento">
            <div id="pdf" style="${vertical}; gap: 1rem; width: 100%;">
                ${tabInfos}
                ${tabelas}
            </div>
        </div>
    `

    pintarTabelas()
}

function montarSemana(data) {
    const inicio = new Date(data)
    const tdsFixos = `<td></td>`.repeat(7) // colunas fixas
    let tdsDias = []

    let d = new Date(inicio)
    for (let i = 0; i < 7; i++) {
        tdsDias.push(`<td>${d.toLocaleDateString('pt-BR')}</td>`)
        d.setDate(d.getDate() + 1)
    }

    return `<tr class="linha-semana">${tdsFixos}${tdsDias.join('')}</tr>`
}

function pintarTabelas() {

    const MIN_DIA = 8 * 60
    const diasValidos = ['seg', 'ter', 'qua', 'qui', 'sex']

    const tabelas = [...document.querySelectorAll('.tabela-obras:not(:first-of-type)')]
    if (!tabelas.length) return

    const linhasBase = [...tabelas[0].querySelectorAll('tbody tr')]
        .filter(tr => !tr.classList.contains('linha-semana'))

    let cursorGlobal = 0 // cursor geral entre tabelas

    linhasBase.forEach((linhaBase, indexLinha) => {

        const duracaoEl = linhaBase.querySelector('[name="duracao"]')
        if (!duracaoEl) return

        const [h, m] = duracaoEl.textContent.split(':').map(Number)
        let diasNecessarios = Math.ceil(((h * 60) + m) / MIN_DIA)

        while (diasNecessarios > 0) {

            const tabelaIndex = Math.floor(cursorGlobal / diasValidos.length)
            const diaIndex = cursorGlobal % diasValidos.length

            const tabela = tabelas[tabelaIndex]
            if (!tabela) break

            const linhas = [...tabela.querySelectorAll('tbody tr')]
                .filter(tr => !tr.classList.contains('linha-semana'))

            const linha = linhas[indexLinha]
            if (!linha) break

            const td = linha.querySelector(`[name="${diasValidos[diaIndex]}"]`)
            if (td) td.style.background = '#00ffff'

            cursorGlobal++
            diasNecessarios--
        }
    })
}


async function salvarDtInicio(input, idObra) {

    await enviar(`dados_obras/${idObra}/dtInicio`, input.value)

}

function calcularDuracao(q = 0, d = '00:00') {
    if (!d) return '00:00'
    const [h, m] = d.split(':').map(Number)
    const total = (h * 60 + m) * q
    return [
        String(Math.floor(total / 60)).padStart(2, '0'),
        String(total % 60).padStart(2, '0')
    ].join(':')
}
