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
            'Acompanhamento',
            'Material Orçamentado',
            'Material Real',
            'Material Real vs Material Orçamentado',
            'Mão de Obra Orçamentado',
            'Mão de Obra Real',
            'Mão de Obra Real vs Mão de Obra Orçamentado',
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
        <td class="detalhes">
            <img src="imagens/kanban.png" onclick="verAndamento('${id}')">
        </td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
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

        <div class="acompanhamento">

            <div style="${horizontal}; align-items: start; gap: 1rem;">
                <div style="${vertical}; gap: 2px;">
                    <button style="background-color: #247EFF;" onclick="caixa()">+ Adicionar</button>
                    <div class="caixa">
                        <button onclick="editarTarefa('${id}', 'novo')">• Especialidade</button>
                        <button onclick="editarTarefa('${id}', 'novo', 'novo')">• Tarefa</button>
                    </div>
                </div>

                <div class="painel-1-tarefas">
                    <input placeholder="Pesquisa" oninput="pesquisar(this, 'bodyTarefas')">
                    <select id="etapas" onchange="atualizarToolbar('${id}', this.value); carregarLinhas('${id}', this.value)"></select>
                    <button style="background-color: red;" onclick="pdfObra('${id}')">Exportar PDF</button>
                    <button style="background-color: red;" onclick="pdfObra('${id}', 'email')">Enviar PDF</button>
                    <input type="file" id="arquivoExcel" accept=".xls,.xlsx" style="display:none" onchange="enviarExcel('${id}')">
                    <button style="background-color: #249f41;" onclick="document.getElementById('arquivoExcel').click()">Importar Excel</button>
                    <button style="background-color: #222;" onclick="telaObras()">Voltar</button>
                </div>
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

        </div>
    `
    telaInterna.innerHTML = acumulado

    await atualizarToolbar(id)
    await carregarLinhasAndamento(id)

    //ordenacaoAutomatica()

}

async function carregarLinhasAndamento(idObra) {
    const obra = await recuperarDado('dados_obras', idObra)
    const campos = await recuperarDados('campos')

    const tabTarefas = document.querySelector('.tabTarefas')
    tabTarefas.innerHTML = ''

    for (const [idOrcamento, status] of Object.entries(obra?.orcamentos_vinculados || {})) {

        const orcamento = await recuperarDado('dados_orcamentos', idOrcamento)

        const blocoOrc = document.createElement('div')
        blocoOrc.className = 'orcamento-bloco'
        blocoOrc.innerHTML = `<h2>Orçamento: ${orcamento.nome || idOrcamento}</h2>`
        
        const grupos = {}

        for (const [nomeZona, dadosZona] of Object.entries(orcamento?.zonas || {})) {
            for (const [idDescricao, dadosDescricao] of Object.entries(dadosZona)) {
                const campo = campos[idDescricao]
                const esp = campo?.especialidade || "SEM ESPECIALIDADE"

                if (!grupos[esp]) grupos[esp] = []
                grupos[esp].push({
                    idDescricao,
                    campo,
                    dados: dadosDescricao
                })
            }
        }

        for (const [especialidade, itens] of Object.entries(grupos)) {

            const tabela = document.createElement('table')
            tabela.className = 'tabela-especialidade'
            
            tabela.innerHTML = `
                <thead></thead>
                <tbody></tbody>
            `

            const tbody = tabela.querySelector('tbody')

            // ★ Linha da ESPECIALIDADE: 1.0
            const trEsp = document.createElement('tr')
            trEsp.style.backgroundColor = '#efefef'
            trEsp.innerHTML = `
                <td></td>
                <td>1.0</td>
                <td>${especialidade}</td>
                <td></td>
                <td></td>
            `
            tbody.appendChild(trEsp)

            // ★ Itens da especialidade
            let index = 1
            for (const item of itens) {
                const tr = document.createElement('tr')

                const ordem = `1.${index}`

                tr.innerHTML = `
                    <td><input type="checkbox" style="width: 1.5rem; height: 1.5rem"></td>
                    <td>${ordem}</td>
                    <td>
                        <div style="${horizontal}; justify-content: space-between; width: 100%; gap: 1rem;">
                            <span>${item?.campo?.descricao || ''}</span>
                            <span>${item.campo?.medida || ''}</span>
                        </div>
                    </td>
                    <td></td>
                    <td></td>
                `

                tbody.appendChild(tr)
                index++
            }

            blocoOrc.appendChild(tabela)
        }

        tabTarefas.appendChild(blocoOrc)
    }
}


async function carregarLinhas(id, nomeEtapa) {
    let obra = await recuperarDado('dados_obras', id)
    const etapas = obra.etapas || {}

    if (nomeEtapa && nomeEtapa.includes('Todas')) nomeEtapa = false

    const tbody = document.getElementById('bodyTarefas')
    if (nomeEtapa) tbody.innerHTML = ''

    for (const [idEtapa, dados] of Object.entries(etapas)) {

        const etapaAtual = dados.descricao

        if (nomeEtapa && nomeEtapa !== etapaAtual) continue

        const tarefas = Object.entries(dados?.tarefas || {})
        modeloTR({ ...dados, id, idEtapa, cor: '#F5F5F5' })

        for (const [idTarefa, tarefa] of tarefas) {
            modeloTR({ ...tarefa, id, idEtapa, idTarefa })
        }
    }
}

function modeloTR({ descricao, unidade, porcentagem, quantidade, cor, id, idEtapa, idTarefa, concluido, fotos }) {

    const idLinha = idTarefa ? idTarefa : idEtapa
    const esquema = `('${id}', '${idEtapa}' ${idTarefa ? `, '${idTarefa}'` : ''})`
    const tr = `
        <tr id="${idLinha}" data-etapa="${!idTarefa ? 'sim' : ''}" data-concluido="${porcentagem >= 100 ? 'sim' : ''}" style="background-color: ${cor ? cor : ''};">
            <td>
                ${idTarefa ? `<input onchange="marcarConcluido(this, '${id}', '${idEtapa}', '${idTarefa}')" type="checkbox" ${concluido ? 'checked' : ''}>` : ''}
            </td>
            <td></td>
            <td>
                <div style="${horizontal}; justify-content: space-between;">
                    <span ${!idTarefa ? 'style="font-weight: bold;"' : ''}>${descricao}</span>
                    <span>${quantidade ? `${quantidade} ${unidade}` : ''}</span>
                </div>
            </td>
            <td>${idTarefa ? porcentagemHtml(porcentagem) : ''}</td>
            <td>
                <div class="edicao">
                    <img class="btnAcmp" src="imagens/lapis.png" onclick="editarTarefa${esquema}">
                    <img class="btnAcmp" src="imagens/fechar.png" onclick="confirmarExclusao${esquema}">
                    ${Object.keys(fotos || []).length > 0 ? `<img class="btnAcmp" src="imagens/camera.png">` : ''}
                </div>
            </td>
        </tr>
    `

    const trExistente = document.getElementById(idLinha)
    if (trExistente) return trExistente.innerHTML = tr
    document.getElementById('bodyTarefas').insertAdjacentHTML('beforeend', tr)

}

function caixa() {
    const el = document.querySelector('.caixa')
    el.style.display = getComputedStyle(el).display === 'none' ? 'flex' : 'none'
}

async function atualizarToolbar(id, nomeEtapa, resumo) {

    let obra = await recuperarDado('dados_obras', id)
    if (!obra.etapas) obra.etapas = {}

    if (nomeEtapa && nomeEtapa.includes('Todas')) nomeEtapa = false

    const bloco = (texto, valor) => `
        <div class="bloco">
            <span>${valor}</span>
            <label>${texto}</label>
        </div>
    `

    let totais = {
        excedente: 0,
        tarefas: 0,
        naoIniciado: 0,
        emAndamento: 0,
        concluido: 0,
        porcentagemConcluido: 0
    }

    let etapas = ['Todas as tarefas']

    etapasProvisorias = {} // Resetar esse objeto;
    for (let [idEtapa, dados] of Object.entries(obra.etapas)) {

        const etapaAtual = dados.descricao
        etapas.push(etapaAtual)
        etapasProvisorias[idEtapa] = dados.descricao

        if (nomeEtapa && nomeEtapa !== etapaAtual) continue

        const tarefas = Object.entries(dados?.tarefas || [])
        totais.tarefas += tarefas.length

        for (const [idTarefa, tarefa] of tarefas) {

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
        .map(op => `<option ${nomeEtapa == op ? 'selected' : ''}>${op}</option>`).join('')

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

async function editarTarefa(id, idEtapa, idTarefa) {

    const objeto = await recuperarDado('dados_obras', id)

    let tarefa = {}
    let funcao = ''
    const linhas = []

    if (idTarefa) {

        tarefa = objeto?.etapas?.[idEtapa]?.tarefas?.[idTarefa] || {}

        const unidades = ['ml', 'm²', 'und', 'm³', 'n/a']
            .map(op => `<option ${tarefa?.unidade == op ? 'selected' : ''}>${op}</option>`)
            .join('')

        funcao = `salvarTarefa('${id}', '${idEtapa}', '${idTarefa}')`

        linhas.push(...[
            {
                texto: 'Etapa', elemento: `
                <select name="Etapa">
                    ${Object.entries(etapasProvisorias).map(([id, nomeEtapa]) => `<option value="${id}" ${id == idEtapa ? 'selected' : ''}>${nomeEtapa}</option>`).join('')}
                </select>`
            },
            { texto: 'Unidade', elemento: `<select name="Unidade">${unidades}</select>` },
            { texto: 'Quantidade', elemento: `<input name="Quantidade" value="${tarefa?.quantidade || ''}">` },
            { texto: 'Resultado', elemento: `<input name="Resultado" value="${tarefa?.resultado || ''}"><div id="indPorcentagem"></div><input name="Porcentagem" type="number" style="display: none;">` }
        ])

    } else {
        funcao = `salvarTarefa('${id}', '${idEtapa}')`
    }

    linhas.push(...[
        { texto: 'Descrição', elemento: `<input name="Descrição" value="${tarefa?.descricao || ''}">` },
        { texto: '', elemento: await blocoAuxiliarFotos(tarefa?.fotos || {}) }
    ])

    const botoes = [{ texto: 'Salvar', img: 'concluido', funcao }]

    const form = new formulario({ botoes, linhas, titulo: 'Gerenciamento de Etapas e Tarefas' })
    form.abrirFormulario()

    visibilidadeFotos()

}

async function salvarTarefa(id, idEtapa, idTarefa) {
    overlayAguarde()

    const valor = (name) => document.querySelector(`[name="${name}"]`)?.value || ''
    let idEtapaAtual = valor('Etapa')

    let obra = await recuperarDado('dados_obras', id)
    if (!obra.etapas) obra.etapas = {}
    let objeto = obra

    let novosDadosBase = {
        descricao: valor('Descrição'),
    };

    let etapaAlterada = false;

    // CASO 1: NOVA ETAPA
    if (idEtapa === 'novo' && idTarefa !== 'novo') {
        idEtapaAtual = ID5digitos();
        objeto.etapas[idEtapaAtual] = {
            tarefas: {},
            ...novosDadosBase
        };

        await enviar(`dados_obras/${id}/etapas`, objeto.etapas);
        await inserirDados({ [id]: objeto }, 'dados_obras');
        await verAndamento(id);
        removerPopup();
        return;
    }

    novosDadosBase = {
        ...novosDadosBase,
        unidade: valor('Unidade'),
        quantidade: valor('Quantidade'),
        resultado: valor('Resultado'),
        porcentagem: Number(valor('Porcentagem') || 0)
    };

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

    if (idTarefa === 'novo') {
        idTarefa = ID5digitos();
        etapaAlterada = true;
    } else if (idEtapaAtual !== idEtapa) {
        delete objeto.etapas[idEtapa]?.tarefas?.[idTarefa];
        await deletar(`dados_obras/${id}/etapas/${idEtapa}/tarefas/${idTarefa}`);
        etapaAlterada = true;
    }

    // Adiciona a tarefa antes de reorganizar
    let tarefa = objeto.etapas[idEtapaAtual].tarefas[idTarefa] || {}

    tarefa.fotos = {
        ...(tarefa.fotos || {}),
        ...album
    }

    tarefa = {
        ...tarefa,
        ...novosDadosBase
    }

    objeto.etapas[idEtapaAtual].tarefas[idTarefa] = tarefa

    await enviar(`dados_obras/${id}/etapas`, objeto.etapas);
    await inserirDados({ [id]: objeto }, 'dados_obras');
    modeloTR({ ...tarefa, id, idTarefa, idEtapa: idEtapaAtual });

    etapaAlterada ? await verAndamento(id) : await atualizarToolbar(id);
    removerPopup();

    ordenacaoAutomatica()
}
