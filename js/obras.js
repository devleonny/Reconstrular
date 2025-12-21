let idObraAtual = null

async function telaObras() {

    mostrarMenus(false)

    dados_clientes = await recuperarDados('dados_clientes')
    dados_despesas = await recuperarDados('dados_despesas')
    dados_distritos = await recuperarDados('dados_distritos')
    const nomeBase = 'dados_obras'
    titulo.textContent = 'Gerenciar Obras'
    const btnExtras = `
    <button onclick="adicionarObra()" data-obras="inserir">Adicionar</button>
    ${fPesq({ texto: 'Distrito', config: 'onclick="filtroCidadesCabecalho(this)" name="distrito"', objeto: dados_distritos, chave: 'nome' })}
    ${fPesq({ texto: 'Cidade', config: 'name="cidade"' })}    
    `

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
            'Cronograma',
            ''
        ],
        btnExtras
    })

    dados_orcamentos = await recuperarDados('dados_orcamentos')
    dados_obras = await recuperarDados(nomeBase)
    for (const [idObra, obra] of Object.entries(dados_obras).reverse()) {
        criarLinhaObras(idObra, obra)
    }
}

function calcularTotaisOrcamentos(idObra, obra) {

    const totais = {
        materialOrcado: 0,
        maoObraOrcado: 0,
        materialReal: 0
    }

    // Despesas vinculadas a esta Obra;
    for (const despesa of Object.values(dados_despesas)) {
        if (despesa?.obra !== idObra || !despesa.valor) continue
        totais.materialReal += despesa.valor
    }

    const vinculados = obra.orcamentos_vinculados || {}

    for (const idOrcamento of Object.keys(vinculados)) {

        const orc = dados_orcamentos?.[idOrcamento]
        if (!orc) continue

        const zonas = orc.zonas || {}

        for (const zona of Object.values(zonas)) {
            for (const campo of Object.values(zona)) {

                if (campo.materiais) {
                    for (const item of Object.values(campo.materiais)) {
                        totais.materialOrcado += (Number(item.qtde) || 0) * (Number(item.preco) || 0)
                    }
                }

                if (campo.maoObra) {
                    for (const item of Object.values(campo.maoObra)) {
                        totais.maoObraOrcado += (Number(item.qtde) || 0) * (Number(item.preco) || 0)
                    }
                }

            }
        }
    }

    return totais
}

async function criarLinhaObras(id, obra) {

    const distrito = dados_distritos?.[obra?.distrito] || {}
    const cidades = distrito?.cidades?.[obra?.cidade] || {}
    const resultado = obra?.resultado || {}
    const porcentagem = Number(resultado?.porcentagem || 0)
    const cliente = dados_clientes?.[obra?.cliente] || {}
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
        <td>${cliente?.nome || '--'}</td>
        <td name="distrito">${distrito?.nome || '--'}</td>
        <td name="cidade">${cidades?.nome || '--'}</td>
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
            ${porcentagemHtml(Number((materialReal / materialOrcado) * 100).toFixed(0))}
        </td>
        <td>${dinheiro(maoObraOrcado)}</td>
        <td></td>
        <td></td>
        <td class="detalhes">
            <img src="imagens/kanban.png" onclick="verAndamento('${id}')">
        </td>
        <td class="detalhes">
            <img src="imagens/relogio.png" onclick="telaCronograma('${id}')">
        </td>
        <td>
            <img src="imagens/pesquisar.png" data-obras="editar" onclick="adicionarObra('${id}')">
        </td>
    `

    const trExistente = document.getElementById(id)
    if (trExistente) return trExistente.innerHTML = tds

    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${id}">${tds}</tr>`)

}

async function adicionarObra(idObra) {

    const obra = await recuperarDado('dados_obras', idObra)
    clientes = await recuperarDados('dados_clientes')
    dados_orcamentos = await recuperarDados('dados_orcamentos')
    const opcoesClientes = Object.entries(clientes)
        .map(([idCliente, cliente]) => `<option id="${idCliente}" ${obra?.cliente == idCliente ? 'selected' : ''}>${cliente.nome}</option>`)
        .join('')

    const linhas = [
        { texto: 'Cliente', elemento: `<select name="cliente" onchange="buscarDados(this)"><option></option>${opcoesClientes}</select>` },
        { texto: 'Distrito', elemento: `<select name="distrito" onchange="carregarSelects({select: this})"></select>` },
        { texto: 'Cidade', elemento: `<select name="cidade"></select>` },
        { texto: 'Telefone', elemento: `<span name="telefone"></span>` },
        { texto: 'E-mail', elemento: `<span name="email"></span>` },
        { texto: 'Vincular Orçamento', elemento: `<img onclick="painelVincularOrcamentos('${idObra}')" src="imagens/link.png">` }
    ]

    const botoes = [
        { funcao: idObra ? `salvarObra('${idObra}')` : null, img: 'concluido', texto: 'Salvar' }
    ]

    if (idObra) botoes.push({ funcao: `confirmarExclusaoObra('${idObra}')`, img: 'cancel', texto: 'Excluir' })

    const form = new formulario({ linhas, botoes, titulo: 'Formulário de Obra' })
    form.abrirFormulario()

    await carregarSelects({ ...obra, painel: true })

    buscarDados()

}

async function salvarObra(idObra) {

    overlayAguarde()

    idObra = idObra || unicoID()
    let obra = await recuperarDado('dados_obras', idObra) || {}

    function obVal(name) {
        const el = document.querySelector(`[name="${name}"]`)
        if (el) return el.value
    }

    const camposFixos = ['distrito', 'cidade']

    for (const campo of camposFixos) obra[campo] = obVal(campo)

    const select = document.querySelector('[name="cliente"]')
    const idCliente = select.options[select.selectedIndex].id
    obra.cliente = idCliente

    await enviar(`dados_obras/${idObra}`, obra)
    await inserirDados({ [idObra]: obra }, 'dados_obras')
    await telaObras()

    removerPopup()

}

function confirmarExclusaoObra(idObra) {
    const acumulado = `
        <div style="${horizontal}; gap: 0.5rem; background-color: #d2d2d2; padding: 1rem;">
            <span>Tem certeza que deseja excluir?</span>
            <button onclick="excluirObra('${idObra}')">Confirmar</button>
        </div>
    `

    popup(acumulado, 'Tem certeza?', true)
}

async function excluirObra(idObra) {

    overlayAguarde()
    deletar(`dados_obras/${idObra}`)
    await deletarDB(`dados_obras`, idObra)
    await telaObras()

    removerPopup()
    removerPopup()

}

async function painelVincularOrcamentos(idObra) {

    overlayAguarde()
    const obra = await recuperarDado('dados_obras', idObra)

    let linhas = ''

    for (const [idOrcamento, orcamento] of Object.entries(dados_orcamentos)) {

        if (orcamento.idCliente !== obra?.cliente) continue
        const nome = clientes?.[orcamento?.idCliente]?.nome || 'N/A'

        console.log(orcamento);
        

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

    const acumulado = `
        <div style="${vertical}; padding: 0.5rem; background-color: #d2d2d2;">
        
            ${modeloTabela(params)}

        </div>
    `

    popup(acumulado, 'Orçamentos desta Obra', acumulado)

}

async function vincularOrcamento(input, idObra, idOrcamento) {

    const obra = await recuperarDado('dados_obras', idObra)

    obra.orcamentos_vinculados ??= {}

    if (input.checked) {
        obra.orcamentos_vinculados[idOrcamento] = true
    } else {
        delete obra.orcamentos_vinculados[idOrcamento]
    }

    await inserirDados({ [idObra]: obra }, 'dados_obras')

    enviar(`dados_obras/${idObra}/orcamentos_vinculados`, obra.orcamentos_vinculados)
}

async function verAndamento(id, resetar) {

    idObraAtual = id

    titulo.textContent = 'Lista de Tarefas'

    const acumulado = `
    <div id="pdf">
        <div class="painel-1-tarefas">
            <input placeholder="Pesquisa" oninput="pesquisarObras(this)">
            <select id="etapas" onchange="atualizarToolbar({nomeTarefa: this.value})"></select>
            <button style="background-color: red;" onclick="pdfObra('Checklist')">PDF</button>
            <button onclick="telaCronograma('${id}')">Cronograma</button>
            <button onclick="telaObras()">Voltar</button>
        </div>

        <div id="resumo" class="painel-1-tarefas"></div>

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

        <div class="tabTarefas"></div>
    </div>
    `

    const acompanhamento = document.querySelector('.acompanhamento')
    if (resetar || !acompanhamento) telaInterna.innerHTML = `<div class="acompanhamento">${acumulado}</div>`

    await carregarLinhasAndamento(id)
    await atualizarToolbar()

}

async function pdfObra(nome) {
    const htmlPdf = document.querySelector('#pdf')

    const html = `
        <html>
        <head>
            <meta charset="UTF-8">
            <link rel="stylesheet" href="https://devleonny.github.io/Reconstrular/css/obras.css">
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
    const campos = await recuperarDados('campos')
    const dados_orcamentos = await recuperarDados('dados_orcamentos')

    const tabTarefas = document.querySelector('.tabela-tarefas')
    if (!tabTarefas) return

    tabTarefas.innerHTML = ''

    for (const [idOrcamento, status] of Object.entries(obra?.orcamentos_vinculados || {})) {

        if (!status) continue

        const orcamento = dados_orcamentos[idOrcamento]
        if (!orcamento) continue

        const idCliente = orcamento.idCliente
        const cliente = dados_clientes[idCliente] || {}
        const blocoOrc = document.createElement('div')

        blocoOrc.className = 'orcamento-bloco'
        blocoOrc.innerHTML = `<h2>Orçamento: ${cliente.nome || idOrcamento} - ${dinheiro(orcamento?.total_geral)}</h2>`

        const grupos = {}

        // Agrupa por especialidade
        for (const [, dadosZona] of Object.entries(orcamento?.zonas || {})) {
            for (const dadosDescricao of Object.values(dadosZona)) {
                const idDescricao = dadosDescricao.campo
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
                const totalOrcado = item?.dados?.unidades || 0

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
    enviar(`dados_obras/${idObra}/andamento/${idOrcamento}/${idDescricao}/concluido`, input.checked)
    await inserirDados({ [idObra]: obra }, 'dados_obras')
    await verAndamento(idObra)

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
    const botoes = [{ texto: 'Salvar', img: 'concluido', funcao: `salvarFotos('${idObra}', '${idOrcamento}', '${idDescricao}')` }]

    const form = new formulario({ linhas, botoes, titulo: 'Painel de Fotos' })
    form.abrirFormulario()

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
            enviar(`dados_obras/${idObra}/andamento/${idOrcamento}/${idDescricao}/fotos/${idFoto}`, foto[0])
        }
    }

    const obra = await recuperarDado('dados_obras', idObra)

    obra.andamento[idOrcamento][idDescricao].fotos = {
        ...(obra.andamento[idOrcamento][idDescricao].fotos ?? {}),
        ...album
    }


    await inserirDados({ [idObra]: obra }, 'dados_obras')
    removerPopup()
}

async function gerenciar(idObra, idOrcamento, idDescricao) {

    const obra = await recuperarDado('dados_obras', idObra)
    const quantidade = obra?.andamento?.[idOrcamento]?.[idDescricao]?.realizado || 0
    const funcao = `salvarAndamento('${idObra}', '${idOrcamento}', '${idDescricao}')`
    const linhas = [{ texto: 'Quantidade', elemento: `<input type="number" id="qtdeRealizada" value="${quantidade}">` }]
    const botoes = [{ texto: 'Salvar', img: 'concluido', funcao }]

    const form = new formulario({ linhas, botoes, titulo: 'Gerenciar quantidade', funcao: `verAndamento('${idObra}')` })
    form.abrirFormulario()

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

    enviar(`dados_obras/${idObra}/andamento/${idOrcamento}/${idDescricao}/realizado`, realizado)

    await inserirDados({ [idObra]: obra }, 'dados_obras')

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

    await inserirDados({ [idObraAtual]: obra }, 'dados_obras')
    enviar(`dados_obras/${idObraAtual}/resultado`, resultado)

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
        popup(mensagem(err), 'Alerta', true)
    }

}

async function telaCronograma(idObra) {

    const obra = await recuperarDado('dados_obras', idObra)
    const cliente = await recuperarDado('dados_clientes', obra?.cliente)
    const campos = await recuperarDados('campos')

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

    telaInterna.innerHTML = `
        <div style="${horizontal}; gap: 2rem;">
            <button>Gravar</button>
            <button style="background-color: red;" onclick="pdfObra('Cronograma')">PDF</button>
            <button onclick="verAndamento('${idObra}', true)">Voltar</button>
        </div>
        <br>
        <div class="acompanhamento">
            <div id="pdf" style="${vertical}; gap: 1rem;">
                ${tabInfos}
                ${tabelas}
            </div>
        </div>
    `

    pintarTabelas()
}

function montarSemana(data) {
    const inicio = new Date(data)
    const ordem = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 }

    const tdsFixos = `<td></td>`.repeat(7)
    let tdsDias = Array(7).fill('<td></td>')

    let d = new Date(inicio)
    let pos = ordem[d.getDay()]

    for (let i = pos; i < 7; i++) {
        tdsDias[i] = `<td>${d.toLocaleDateString('pt-BR')}</td>`
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

    let cursorGlobal = 0

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

    const obra = await recuperarDado('dados_obras', idObra)
    obra.dtInicio = input.value
    enviar(`dados_obras/${idObra}/dtInicio`, input.value)
    await inserirDados({ [idObra]: obra }, 'dados_obras')

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
