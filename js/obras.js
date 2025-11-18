async function telaObras() {

    mostrarMenus()
    const nomeBase = 'dados_obras'
    titulo.textContent = 'Gerenciar Obras'
    const btnExtras = `<button onclick="adicionarObra()">Adicionar</button>`

    telaInterna.innerHTML = modeloTabela({
        colunas: [
            'Cliente',
            'Distrito',
            'Cidade',
            'Porcentagem',
            'Status',
            'Material Orçamentado',
            'Material Real',
            'Material Real vs Material Orçamentado',
            'Mão de Obra Orçamentado',
            'Mão de Obra Real',
            'Mão de Obra Real vs Mão de Obra Orçamentado',
            'Acompanhamento',
            ''
        ],
        btnExtras
    })

    const dados_obras = await recuperarDados(nomeBase)
    for (const [idObra, obra] of Object.entries(dados_obras).reverse()) {
        criarLinhaObras(idObra, obra)
    }
}

async function criarLinhaObras(id, obra) {

    const distrito = dados_distritos?.[obra?.distrito] || {}
    const cidades = distrito?.cidades?.[obra?.cidade] || {}
    const resultado = await atualizarToolbar(id, false, true)
    const porcentagem = Number(resultado.porcentagemAndamento)
    const cliente = await recuperarDado('dados_clientes', obra.cliente)
    const st = porcentagem == 100 ? 'Por Iniciar' : 'Em Andamento'

    tds = `
        <td>${cliente?.nome || '--'}</td>
        <td>${distrito?.nome || '--'}</td>
        <td>${cidades?.nome || '--'}</td>
        <td>
            ${divPorcentagem(porcentagem)}
        </td>
        <td style="text-align: left;">
            <span class="${st.replace(' ', '_')}">${st}</span>
            ${resultado.totais.excedente ? '<span class="excedente">Excedente</span>' : ''}
        </td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td class="detalhes">
            <img src="imagens/kanban.png" onclick="verAndamento('${id}')">
        </td>
        <td>
            <img src="imagens/pesquisar.png" onclick="adicionarObra('${id}')">
        </td>
    `

    const trExistente = document.getElementById(id)
    if (trExistente) return trExistente.innerHTML = tds

    document.getElementById('body').insertAdjacentHTML('beforebegin', `<tr id="${id}">${tds}</tr>`)

}

async function adicionarObra(idObra) {

    const obra = await recuperarDado('dados_obras', idObra)
    const clientes = await recuperarDados('dados_clientes')
    const opcoesClientes = Object.entries(clientes)
        .map(([idCliente, cliente]) => `<option id="${idCliente}" ${obra?.cliente == idCliente ? 'selected' : ''}>${cliente.nome}</option>`)
        .join('')

    const linhas = [
        { texto: 'Distrito', elemento: `<select name="distrito" onchange="carregarSelects({select: this})"></select>` },
        { texto: 'Cidade', elemento: `<select name="cidade"></select>` },
        { texto: 'Cliente', elemento: `<select name="cliente" onchange="buscarDados(this)"><option></option>${opcoesClientes}</select>` },
        { texto: 'Vincular Orçamento', elemento: `<img onclick="painelVincularOrcamentos('${idObra}')" src="imagens/link.png">` },
        { texto: 'Telefone', elemento: `<span name="telefone"></span>` },
        { texto: 'E-mail', elemento: `<span name="email"></span>` }
    ]

    const botoes = [
        { funcao: idObra ? `'${idObra}'` : null, img: 'concluido', texto: 'Salvar' }
    ]

    const form = new formulario({ linhas, botoes, titulo: 'Adicionar Obra' })
    form.abrirFormulario()

    await carregarSelects({ ...obra })

    buscarDados()

}

async function painelVincularOrcamentos(idObra) {

    overlayAguarde()

    const orcamentos = await recuperarDados('dados_orcamentos')
    const clientes = await recuperarDados('dados_clientes')
    const obra = await recuperarDado('dados_obras', idObra)

    let linhas = ''

    for (const [idOrcamento, orcamento] of Object.entries(orcamentos)) {

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
                <td>??</td>

            </tr>
        `
    }

    const acumulado = `
        <div style="${vertical}; padding: 0.5rem; background-color: #d2d2d2;">
        
            ${modeloTabela({
        colunas: ['Selecione', 'Cliente', 'Contato', 'Visita', 'Valor'],
        body: 'orcs',
        removerPesquisa: true,
        linhas
    })}

        </div>
    `

    popup(acumulado, 'Orçamentos desta Obra', acumulado)

}

async function vincularOrcamento(input, idObra, idOrcamento) {

    const obra = await recuperarDado('dados_obras', idObra)

    obra.orcamentos_vinculados ??= {}
    obra.orcamentos_vinculados[idOrcamento] = input.checked

    await inserirDados({ [idObra]: obra }, 'dados_obras')

    enviar(`dados_obras/${idObra}/orcamentos_vinculados/${idOrcamento}`, input.checked)
}

async function verAndamento(id) {

    titulo.textContent = 'Lista de Tarefas'

    const acumulado = `

        <div class="painel-1-tarefas">
            <input placeholder="Pesquisa" oninput="pesquisar(this, 'bodyTarefas')">
            <select id="etapas" onchange="atualizarToolbar('${id}', this.value); carregarLinhas('${id}', this.value)"></select>
            <button style="background-color: red;" onclick="pdfObra('${id}')">Exportar PDF</button>
            <button style="background-color: red;" onclick="pdfObra('${id}', 'email')">Enviar PDF</button>
            <input type="file" id="arquivoExcel" accept=".xls,.xlsx" style="display:none" onchange="enviarExcel('${id}')">
            <button style="background-color: #249f41;" onclick="document.getElementById('arquivoExcel').click()">Importar Excel</button>
            <button style="background-color: #222;" onclick="telaObras()">Voltar</button>
        </div>

        <div id="resumo" class="painel-1-tarefas"></div>

        <div style="${horizontal}; gap: 2vw;">
            <div style="${horizontal}; gap: 1vw;">
                <input type="checkbox" name="etapa" onchange="filtrar()">
                <span>Exibir somente as etapas</span>
            </div>
            <div style="${horizontal}; gap: 1vw;">
                <input type="checkbox" name="concluido" onchange="filtrar()">
                <span>Ocultar etapa concluídas</span>
            </div>
        </div>

        <div class="tabTarefas"></div>

    `

    const acompanhamento = document.querySelector('.acompanhamento')
    if (!acompanhamento) telaInterna.innerHTML = `<div class="acompanhamento">${acumulado}</div>`

    await atualizarToolbar(id)
    await carregarLinhasAndamento(id)

}

async function carregarLinhasAndamento(idObra) {

    const obra = await recuperarDado('dados_obras', idObra)
    const campos = await recuperarDados('campos')

    const tabTarefas = document.querySelector('.tabTarefas')
    tabTarefas.innerHTML = ''

    for (const [idOrcamento, status] of Object.entries(obra?.orcamentos_vinculados || {})) {

        if (!status) continue

        const orcamento = await recuperarDado('dados_orcamentos', idOrcamento)

        const blocoOrc = document.createElement('div')
        blocoOrc.className = 'orcamento-bloco'
        blocoOrc.innerHTML = `<h2>Orçamento: ${orcamento.nome || idOrcamento}</h2>`

        const grupos = {}

        // Agrupa por especialidade
        for (const [nomeZona, dadosZona] of Object.entries(orcamento?.zonas || {})) {
            for (const [idDescricao, dadosDescricao] of Object.entries(dadosZona)) {
                const campo = campos[idDescricao]
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
                const totalOrcado = item?.dados?.unidades || 0

                const porcent = qtdeRealizada == 0
                    ? 0
                    : ((qtdeRealizada / totalOrcado) * 100).toFixed(0)

                const riscado = !!obra?.andamento?.[idOrcamento]?.[item.idDescricao]?.removido
                const estilo = riscado ? 'style="text-decoration: line-through"' : ''

                tr.innerHTML = `
                    <td><input type="checkbox" style="width: 1.5rem; height: 1.5rem"></td>

                    <td ${estilo}>${ordem}</td>

                    <td>
                        <div style="${horizontal}; justify-content: space-between; width: 100%; gap: 1rem;">
                            <span ${estilo}>${item?.campo?.descricao || ''}</span>
                            <span>${item?.campo?.medida || ''}</span>
                        </div>
                    </td>

                    <td style="text-align: center;">${totalOrcado} / ${qtdeRealizada}</td>
                    <td>${porcentagemHtml(porcent)}</td>

                    <td>
                        <div class="gerenciar">
                            <img onclick="gerenciar('${idObra}', '${idOrcamento}', '${item.idDescricao}')" src="imagens/lapis.png">
                            <img onclick="painelFotos('${idObra}', '${idOrcamento}', '${item.idDescricao}')" src="imagens/cam.png">
                            <img onclick="riscarItem('${idObra}', '${idOrcamento}', '${item.idDescricao}')" src="imagens/fechar.png">
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

async function riscarItem(idObra, idOrcamento, idDescricao) {
    const obra = await recuperarDado('dados_obras', idObra)

    obra.andamento ??= {}
    obra.andamento[idOrcamento] ??= {}

    const item = obra.andamento[idOrcamento][idDescricao] ??= {}
    item.removido = !item.removido

    await inserirDados({ [idObra]: obra }, 'dados_obras')

    removerPopup()
    await verAndamento(idObra)
}

async function painelFotos(idObra, idOrcamento, idDescricao) {

    const obra = await recuperarDado('dados_obras', idObra)
    const fotos = obra.andamento[idOrcamento][idDescricao].fotos ??= {}
    const linhas = [{ elemento: await blocoAuxiliarFotos(fotos || {}) }]
    const botoes = [{ texto: 'Salvar', img: 'concluido', funcao: `salvarFotos('${idObra}', '${idOrcamento}', '${item.idDescricao}')` }]

    const form = new formulario({ linhas, botoes, titulo: 'Painel de Fotos' })
    form.abrirFormulario()

    visibilidadeFotos()

}

async function salvarFotos(idObra, idOrcamento, idDescricao) {

    overlayAguarde()

    const fotos = document.querySelector('.fotos')
    const imgs = fotos.querySelectorAll('img')
    let album = {}
    if (imgs.length > 0) {
        for (const img of imgs) {
            if (img.dataset && img.dataset.salvo == 'sim') continue
            const foto = await importarAnexos({ foto: img.src })
            album[foto[0].link] = foto[0]
        }
    }

    const obra = await recuperarDado('dados_obras', idObra)
    const albumExistente = obra.andamento[idOrcamento][idDescricao].fotos ??= {}

    albumExistente = {
        ...albumExistente,
        ...album
    }

    await inserirDados({ [idObra]: obra }, 'dados_obras')
    removerPopup()

}

async function gerenciar(idObra, idOrcamento, idDescricao) {

    const funcao = `salvarAndamento('${idObra}', '${idOrcamento}', '${idDescricao}')`
    const linhas = [{ texto: 'Quantidade', elemento: `<input type="number" id="qtdeRealizada">` }]
    const botoes = [{ texto: 'Salvar', img: 'concluido', funcao }]

    const form = new formulario({ linhas, botoes, titulo: 'Gerenciar quantidade', funcao: `verAndamento('${idObra}')` })
    form.abrirFormulario()

}

async function salvarAndamento(idObra, idOrcamento, idDescricao) {

    overlayAguarde()

    const qtdeRealizada = document.getElementById('qtdeRealizada')

    const obra = await recuperarDado('dados_obras', idObra)

    obra.andamento ??= {}
    obra.andamento[idOrcamento] ??= {}
    obra.andamento[idOrcamento][idDescricao] ??= {}
    obra.andamento[idOrcamento][idDescricao].realizado = Number(qtdeRealizada.value)

    await inserirDados({ [idObra]: obra }, 'dados_obras')

    removerPopup()
    await verAndamento(idObra)
}

async function atualizarToolbar(id, nomeEtapa, resumo) {

    const obra = await recuperarDado('dados_obras', id)
    if (!obra.etapas) obra.etapas = {}
    if (nomeEtapa && nomeEtapa.includes('Todas')) nomeEtapa = false

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

    const etapas = ['Todas as tarefas']

    etapasProvisorias = {} // Resetar esse objeto;
    for (let [idEtapa, dados] of Object.entries(obra.etapas)) {

        const etapaAtual = dados.descricao
        etapas.push(etapaAtual)
        etapasProvisorias[idEtapa] = dados.descricao

        if (nomeEtapa && nomeEtapa !== etapaAtual) continue

        const tarefas = Object.entries(dados?.tarefas || [])
        totais.tarefas += tarefas.length

        for (const [, tarefa] of tarefas) {

            if (tarefa.concluido) {
                totais.concluido++
            } else if (tarefa.porcentagem == 0) {
                totais.naoIniciado++
            } else if (tarefa.porcentagem !== 0 && tarefa.porcentagem < 100) {
                totais.emAndamento++
            } else if (tarefa.porcentagem >= 100) {
                totais.concluido++
            }

            if (tarefa.porcentagem > 100) {
                totais.excedente++
            }

            const progressoTarefa = Math.min(100, tarefa.porcentagem)
            totais.porcentagemConcluido += progressoTarefa
        }
    }

    const emPorcentagemConcluido = totais.porcentagemConcluido / 100
    const porcentagemAndamento = emPorcentagemConcluido == 0 ? 0 : ((emPorcentagemConcluido / totais.tarefas) * 100).toFixed(0)

    if (resumo) return { porcentagemAndamento, totais }

    const opcoes = etapas
        .map(op => `<option ${nomeEtapa == op ? 'selected' : ''}>${op}</option>`)
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