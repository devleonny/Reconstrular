async function telaObras() {

    try {

        titulo.textContent = 'Obras'

        const tabela = await modTab({
            btnExtras: `<button onclick="adicionarObra()">Adicionar Obra</button>`,
            pag: 'obras',
            detalhes: true,
            body: 'bodyObras',
            base: 'vw_dados_orcamentos',
            filtros: { em_obra: { op: '=', value: true } },
            criarLinha: 'criarLinhaObras',
            colunas: {
                'Checklist': {},
                'Cronog.': {},
                'H. Edições': {},
                'Edição': {},
                'Status': {},
                'Número': { chave: 'contrato' },
                'Cliente': { chave: 'snapshots.cliente' },
                'Distrito': { chave: 'snapshots.cidade.distrito' },
                'Cidade': { chave: 'snapshots.cidade.nome' },
                'Total de orçamento': { chave: 'total_geral' }
            }
        })

        tela.innerHTML = tabela

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
        orcamentos_vinculados,
        distrito,
        total_materiais,
        total_ferramentas,
        total_mao_obra,
        total_geral,
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

    const numeroObra = obra.contrato || ordem || ''
    const colaboradores = Array.isArray(obra.colaboradores) ? obra.colaboradores : []
    const nomesColaboradores = colaboradores.map(colaborador => typeof colaborador === 'string'
        ? colaborador : colaborador?.nome_completo || colaborador?.nome || colaborador?.usuario)
        .filter(Boolean)

    const tds = `
        <td>
            <img src="imagens/checklist.svg" class="icone-tabela" alt="Checklist" title="Checklist" onclick="verAndamento('${id}')">
        </td>
        <td>
            <img src="imagens/cronograma.svg" class="icone-tabela" alt="Cronograma" title="Cronograma" onclick="telaCronograma('${id}')">
        </td>
        <td>
            <img src="imagens/historico.svg" class="icone-tabela" alt="Histórico de edições" title="Histórico de edições" onclick="historicoObras('${numeroObra}')">
        </td>
        <td>
            <img src="imagens/editar.svg" class="icone-editar" alt="Editar" title="Editar" onclick="adicionarObra('${id}')">
        </td>
        <td>
            <span class="${st.replace(' ', '_')}">${st}</span>
        </td>
        <td>
            <span class="tag-orcamento">${numeroObra}</span>
        </td>
        <td>${nome_cliente || ''}</td>
        <td>${cidade || ''}</td>
        <td>${distrito || ''}</td>
        <td style="white-space: nowrap;">${dinheiro(total_geral ?? 0)}</td>
    `
    const detalhes = `<div class="obra-detalhes-row">
        <div class="obra-detalhe"><strong>Andamento</strong>
            ${divPorcentagem(porcentagem)}
            <div style="${vertical}; gap: 2px;">
                ${excedente ? '<span class="excedente">Excedente</span>' : ''}
            </div>
        </div>
        <div class="obra-detalhe"><strong>Ferramentas</strong>
            <span class="${Number(total_ferramentas) < 0 ? 'credito' : 'despesa'}" onclick="mostrarMateriaisOrcamento('${id}', 'ferramentas')" style="cursor: pointer;">${dinheiro(total_ferramentas)}</span>
        </div>
        <div class="obra-detalhe"><strong>Mão de Obra</strong>
            <span class="${Number(total_mao_obra) < 0 ? 'credito' : 'despesa'}" onclick="mostrarMateriaisOrcamento('${id}', 'mao_obra')" style="cursor: pointer;">${dinheiro(total_mao_obra)}</span>
        </div>
        <div class="obra-detalhe"><strong>Material</strong>
            <span class="${Number(total_materiais) < 0 ? 'credito' : 'despesa'}" onclick="mostrarMateriaisOrcamento('${id}', 'materiais')" style="cursor: pointer;">${dinheiro(total_materiais)}</span>
        </div>
        <div class="obra-detalhe"><strong>Material Extra</strong>
            <span class="${Number(total_extra) < 0 ? 'credito' : 'despesa'}" onclick="mostrarMateriaisExtras('${numeroObra}')" style="cursor: pointer;">${dinheiro(total_extra)}</span>
        </div>
        <div class="obra-detalhe"><strong>% Material Extra</strong>
            ${porcentagemHtml(porcentagem_extra || 0)}
        </div>
        <div class="obra-detalhe obra-detalhe-colaboradores"><strong>Colaboradores</strong>
            <div class="obra-colaboradores-tags">${nomesColaboradores.length
                ? nomesColaboradores.map(nome => `<span class="tag-orcamento">${escaparAtributo(nome)}</span>`).join('')
                : '<span>Nenhum colaborador vinculado.</span>'}</div>
        </div>
    </div>`
    return { linha: `<tr>${tds}</tr>`, detalhes }

}

async function mostrarMateriaisOrcamento(id_obra, tipo) {
    const categorias = { materiais:'Materiais', ferramentas:'Ferramentas', mao_obra:'Mão de obra' }
    if (!categorias[tipo]) return
    overlayAguarde()
    try {
        const itens = await carregarItensExecucoes(id_obra)
        const linhas = listarComponentesObra(itens, tipo)
        const total = linhas.reduce((soma, item) => soma + item.total, 0)
        const html = `<div class="obra-itens-orcamento"><div class="obra-itens-resumo"><span>${linhas.length} itens · Quantidades do orçamento</span><strong>Custo total: ${dinheiro(total)}</strong></div><div class="obra-itens-recorte"><table class="tabela"><thead><tr><th>Ambiente</th><th>Zona</th><th>Serviço</th><th>Item</th><th>Quantidade total</th><th>Custo unitário</th><th>Custo total</th></tr></thead><tbody>${linhas.map(item => `<tr><td>${escaparAtributo(item.ambiente)}</td><td>${escaparAtributo(item.zona)}</td><td>${escaparAtributo(item.servico)}</td><td>${escaparAtributo(item.descricao)}</td><td>${item.quantidade.toLocaleString('pt-BR', {maximumFractionDigits:6})}</td><td>${dinheiro(item.preco)}</td><td>${item.total === 0 ? `<span class="obra-total-zerado" title="Valor total zerado">${dinheiro(item.total)}</span>` : dinheiro(item.total)}</td></tr>`).join('') || '<tr><td colspan="7">Nenhum item desta categoria registrado no orçamento.</td></tr>'}</tbody></table></div></div>`
        const idPopup = popup({titulo:`${categorias[tipo]} do orçamento`, elemento:html})
        document.getElementById(idPopup).classList.add('popup-itens-obra')
    } catch (erro) {
        console.error(erro)
        popup({mensagem:'Não foi possível carregar os itens do orçamento. Tente novamente.'})
    } finally { removerOverlay() }
}

function listarComponentesObra(servicos, tipo) {
    return servicos.flatMap(servico => Object.values(servico[tipo] || {}).filter(item => item && typeof item === 'object').map(item => {
        const quantidade = (Number(item.qtde) || 0) * (Number(servico.quantidade) || 0)
        const preco = Number(item.preco) || 0
        return {ambiente:servico.nome_ambiente || '', zona:servico.nome_zona || '', servico:servico.descricao || '', descricao:item.descricao || item.nome || item.id || 'Item sem descrição', quantidade, preco, total:quantidade * preco}
    }))
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
            <td>${ambiente || ''}</td>
            <td>${zona || ''}</td>
            <td>${inicialMaiuscula(tipo)}</td>
            <td>${descricao || ''}</td>
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
        detalhes: true,
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

function usuarioElegivelObra(usuario) {
    const funcao = String(usuario.funcao || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    return !['ceo', 'diretor programacao', 'diretor de programacao', 'diretor programador'].includes(funcao)
}

async function obraApi(rota, dados = {}) {
    const { token } = JSON.parse(localStorage.getItem('acesso')) || {}
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    try {
    const resposta = await fetchAutenticado(`${api}/obras/${rota}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(dados), signal: controller.signal
    })
    if (!resposta) throw new Error('Sua sessão foi encerrada.')
    const resultado = await resposta.json().catch(() => null)
    if (!resposta.ok || resultado?.success !== true)
        throw new Error(resultado?.mensagem || resultado?.erro || resultado?.message
            || `O servidor não confirmou a operação /obras/${rota} (HTTP ${resposta.status}).`)
    return resultado
    } catch (erro) {
        if (erro.name === 'AbortError') throw new Error('O servidor demorou para responder. Verifique se a obra foi ativada antes de repetir.')
        throw erro
    } finally { clearTimeout(timeout) }
}

async function adicionarObra(idOrcamento = null) {
    overlayAguarde()
    try {
        const dados = await obraApi('opcoes', { orcamento_id: idOrcamento })
        if (!idOrcamento && (!Array.isArray(dados.orcamentos) || !dados.orcamentos.length)) {
            dados.orcamentos = await orcamentosDisponiveisObra()
        }
        const usuarios = (dados.usuarios || []).filter(usuarioElegivelObra)
        const selecionados = new Set(dados.obra?.colaboradores || [])
        let salvando = false
        const idModal = popup({ titulo: idOrcamento ? 'Colaboradores da obra' : 'Evoluir orçamento para uma obra',
            botoes: [{ texto: idOrcamento ? 'Salvar colaboradores' : 'Evoluir orçamento para uma obra', img: 'concluido' }],
            elemento: `<div class="obra-formulario">
                <label>Orçamento<select class="obra-orcamento" ${idOrcamento ? 'disabled' : ''}>
                <option value="">${!idOrcamento && !dados.orcamentos?.length ? 'Nenhum orçamento disponível' : 'Selecione um orçamento'}</option>
                ${(idOrcamento ? [dados.obra] : dados.orcamentos || []).filter(Boolean).map(o => `<option value="${escaparAtributo(o.id)}" ${idOrcamento ? 'selected' : ''}>${escaparAtributo(o.contrato)} — ${escaparAtributo(o.nome_cliente || '')}</option>`).join('')}
                </select></label>
                <label>Colaboradores<input type="search" class="obra-busca-usuarios" placeholder="Pesquisar usuário, nome ou função"></label>
                <div class="obra-usuarios"></div><p class="obra-selecao" aria-live="polite"></p>
                <p class="obra-erro" role="status"></p>
            </div>` })
        const modal = document.getElementById(idModal)
        function renderUsuarios() {
            const busca = modal.querySelector('.obra-busca-usuarios').value.toLocaleLowerCase()
            modal.querySelector('.obra-usuarios').innerHTML = usuarios.filter(u =>
                `${u.usuario} ${u.nome_completo || u.nome || ''} ${u.funcao || ''}`.toLocaleLowerCase().includes(busca))
                .map(u => `<label class="obra-usuario"><input type="checkbox" value="${escaparAtributo(u.usuario)}" ${selecionados.has(u.usuario) ? 'checked' : ''} ${salvando ? 'disabled' : ''}>
                <span><b>${escaparAtributo(u.nome_completo || u.nome || u.usuario)}</b><small>${escaparAtributo(u.usuario)} · ${escaparAtributo(u.funcao || '')}</small></span></label>`).join('') || '<p>Nenhum usuário encontrado.</p>'
            modal.querySelector('.obra-selecao').textContent = `${selecionados.size} colaboradores selecionados`
        }
        modal.querySelector('.obra-busca-usuarios').addEventListener('input', renderUsuarios)
        modal.querySelector('.obra-usuarios').addEventListener('change', event => {
            if (salvando) return
            if (event.target.checked) selecionados.add(event.target.value)
            else selecionados.delete(event.target.value)
            modal.querySelector('.obra-selecao').textContent = `${selecionados.size} colaboradores selecionados`
        })
        modal.querySelector('.rodape-padrao .botoes-rodape').addEventListener('click', async event => {
            const botaoSalvar = event.currentTarget
            const textoBotao = botaoSalvar.querySelector('span')
            const textoOriginal = textoBotao.textContent
            const aviso = modal.querySelector('.obra-erro')
            const mostrarErro = mensagem => { aviso.textContent = mensagem; aviso.scrollIntoView({ block: 'nearest' }) }
            if (salvando) return
            const orcamento = modal.querySelector('.obra-orcamento').value
            if (!orcamento) { mostrarErro('Selecione um orçamento.'); return }
            salvando = true
            botaoSalvar.setAttribute('aria-disabled', 'true')
            textoBotao.textContent = idOrcamento ? 'Salvando…' : 'Evoluindo orçamento…'
            aviso.textContent = ''
            try {
                renderUsuarios()
                await obraApi('salvar', { orcamento_id: orcamento, colaboradores: [...selecionados], ativar: !idOrcamento })
                removerPopup(idModal)
                await telaObras()
            } catch (erro) {
                console.error('Falha na evolução/edição da obra:', erro.message)
                if (modal.isConnected) mostrarErro(erro.message)
            }
            finally { salvando = false; botaoSalvar.removeAttribute('aria-disabled'); textoBotao.textContent = textoOriginal; if (modal.isConnected) renderUsuarios() }
        })
        renderUsuarios()
    } catch (erro) { popup({ mensagem: escaparAtributo(erro.message) }) }
    finally { removerOverlay() }
}

async function orcamentosDisponiveisObra() {
    const orcamentos = new Map()
    let pagina = 1, paginas = 1
    do {
        const resposta = await pesquisarDB({ base: 'vw_dados_orcamentos', pagina, limite: 100 })
        if (!Array.isArray(resposta?.resultados)) throw new Error('Não foi possível consultar os orçamentos disponíveis.')
        for (const o of resposta.resultados) {
            if (o.em_obra === undefined) throw new Error('A view vw_dados_orcamentos ainda não expõe o campo em_obra. Atualize o SQL no servidor.')
            if ((o.em_obra === false || o.em_obra === null) && !o.excluido) orcamentos.set(o.id, o)
        }
        paginas = resposta.paginas || 1
        pagina++
    } while (pagina <= paginas)
    return [...orcamentos.values()]
}

async function verAndamento(id, resetar) {

    titulo.textContent = 'Lista de Tarefas'

    controles.andamento ??= {}
    controles.andamento.idObraAtual = id

    const acumulado = `
        <div style="${vertical}; gap: 1rem; padding: 1rem;">
            <div class="painel-1-tarefas">

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
            <button type="button" class="checklist-pdf-fixo pdf-exportar-fixo" onclick="pdfObra('Checklist')" title="Exportar checklist em PDF" aria-label="Exportar checklist em PDF"><span>PDF</span></button>
        </div>
    `

    const acompanhamento = document.querySelector('.acompanhamento')
    if (resetar || !acompanhamento || acompanhamento.dataset.obra !== String(id))
        tela.innerHTML = `<div class="acompanhamento">${acumulado}</div>`
    tela.querySelector('.acompanhamento').dataset.obra = id

    try {
        await carregarLinhasAndamento(id)
        await atualizarToolbar({ nomeTarefa: document.querySelector('.acompanhamento #etapas')?.value })
        filtrar()
    } catch (erro) {
        popup({ mensagem: escaparAtributo(erro.message || 'Não foi possível carregar o checklist.') })
    } finally { removerOverlay() }

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

    const linhas = document.querySelectorAll('.acompanhamento .tabTarefas tr')

    linhas.forEach(tr => {
        const etapaAttr = tr.dataset.etapa || ''
        const concluidoAttr = tr.dataset.concluido || ''

        let mostrar = true
        const termo = document.querySelector('.acompanhamento input[placeholder="Pesquisa"]')?.value.trim().toLocaleLowerCase() || ''
        const especialidade = document.querySelector('.acompanhamento #etapas')?.value
        if (termo && !tr.textContent.toLocaleLowerCase().includes(termo)) mostrar = false
        if (especialidade && especialidade !== 'Todas as tarefas' && tr.dataset.especialidade !== especialidade) mostrar = false

        if (etapaChecked && etapaAttr !== 'S') mostrar = false

        if (concluidoChecked && concluidoAttr == 'S') mostrar = false

        tr.style.display = mostrar ? '' : 'none'
    })
}

async function carregarLinhasAndamento(idObra) {

    const obra = await recuperarDado('dados_orcamentos', idObra) || {}
    controles.andamento.obraAtual = obra
    const tabTarefas = document.querySelector('.tabTarefas')
    if (!tabTarefas) return

    tabTarefas.innerHTML = ''

    for (const idOrcamento of [idObra]) {

        const orcamento = await recuperarDado('dados_orcamentos', idOrcamento) || {}
        if (!tabTarefas.isConnected || controles.andamento.idObraAtual !== idObra) return
        if (!orcamento)
            continue

        const blocoOrc = document.createElement('div')

        blocoOrc.className = 'orcamento-bloco'
        blocoOrc.innerHTML = `
            <div style="${horizontal}; gap: 5px;">
                <h2> Orçamento: </h2>
                <span class="tag-orcamento">${orcamento?.contrato}</span>  
                <span>${dinheiro(totalOrcamentoChecklist(orcamento))}</span>
            </div>
            `

        const grupos = {}

        const camposMesclados = camposChecklist(orcamento)

        // Agrupa por especialidade
        for (const campo of camposMesclados) {

            const especialidade = campo.especialidade || 'Sem especialidade'
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
            let trEsp = null

            if (!trEsp) {
                trEsp = document.createElement('tr')
                tbody.appendChild(trEsp)
            }

            trEsp.dataset.descricao = especialidade
            trEsp.dataset.especialidade = especialidade
            trEsp.dataset.etapa = 'N'
            trEsp.style.backgroundColor = '#efefef'

            trEsp.innerHTML = `
                <td></td>
                <td>1.0</td>
                <td><b>${escaparAtributo(especialidade)}</b></td>
                <td>Qtde Orçada / Qtde Realizada</td>
                <td>Andamento</td>
                <td>Gerenciar</td>
            `

            // ====== Itens ======
            let index = 1

            for (const item of itens) {

                const { dimensoes } = item?.campo || {}
                const quantidade = quantidadeCampoChecklist(item.campo)

                const idItem = `desc-${item.idDescricao}`
                let tr = null

                if (!tr) {
                    tr = document.createElement('tr')
                    tbody.appendChild(tr)
                }

                const ordem = `1.${index}`
                const qtdeRealizada = item.campo.andamento?.realizado || 0


                const riscado = !!item.campo.andamento?.removido
                const estilo = riscado ? 'style="text-decoration: line-through"' : ''
                const fotos = Object.keys(item.campo.andamento?.fotos || {}).length > 0
                const icoCam = fotos ? 'camera-fotos' : 'camera'
                const concluido = !!item.campo.andamento?.concluido

                const porcent = percentualItemChecklist(quantidade, qtdeRealizada, concluido)

                tr.dataset.concluido = porcent >= 100 ? 'S' : 'N'
                tr.dataset.removido = riscado ? 'S' : 'N'
                tr.dataset.etapa = 'S'
                tr.dataset.especialidade = especialidade
                tr.dataset.orcamento = idOrcamento
                tr.dataset.item = item.idDescricao
                tr.dataset.semQuantidade = quantidade > 0 ? 'N' : 'S'
                tr.checklist = { quantidade, realizado: Number(qtdeRealizada), concluido, removido: riscado }
                tr.campoOrcamento = item.campo

                const params = [idObra, idOrcamento, item.idDescricao].map(v => escaparAtributo(JSON.stringify(String(v)))).join(', ')

                tr.innerHTML = `
                    <td>
                        <input onchange="marcarConclusao(this, ${params})" ${concluido ? 'checked' : ''} type="checkbox" style="width: 1.5rem; height: 1.5rem">
                    </td>

                    <td ${estilo}>${ordem}</td>

                    <td>
                        <div style="${horizontal}; justify-content: space-between; width: 100%; gap: 1rem;">
                            <span ${estilo}>${escaparAtributo(item.campo.descricaoExtra || item.campo.descricao || '')}</span>
                            <span>${escaparAtributo(item.campo.medida || '')}</span>
                        </div>
                    </td>

                    <td style="text-align: center;">${quantidade > 0 ? quantidade : 'Não definida'} / ${qtdeRealizada}</td>
                    <td>
                        <input name="porcentagem" style="display: none;" type="number" value="${porcent}">
                        ${andamentoVisualChecklist(quantidade, qtdeRealizada, concluido)}
                    </td>

                    <td>
                        <div class="gerenciar">
                            <img onclick="gerenciar(${params})" src="imagens/editar.svg" class="icone-tabela" alt="Editar item" title="Editar item">
                            <img onclick="painelFotos(${params})" src="imagens/${icoCam}.svg" class="icone-tabela" alt="${fotos ? 'Ver fotos anexadas' : 'Adicionar fotos'}" title="${fotos ? 'Ver fotos anexadas' : 'Adicionar fotos'}">
                            <img onclick="riscarItem(${params})" src="imagens/riscar.svg" class="icone-tabela" alt="Riscar item" title="Riscar item">
                        </div>
                    </td>
                `

                index++
            }

            blocoOrc.appendChild(tabela)
        }

        tabTarefas.appendChild(blocoOrc)
    }
    if (!tabTarefas.children.length) tabTarefas.textContent = 'Nenhum orçamento vinculado a esta obra.'
}

function camposChecklist(orcamento) {
    if (orcamento.campos && Object.keys(orcamento.campos).length) {
        return Object.entries(orcamento.campos).filter(([, c]) => c && typeof c === 'object')
            .map(([id, c]) => ({ ...c, id }))
    }
    return Object.values(orcamento.ambientes || {}).flatMap(z =>
        Object.entries(z.campos || {}).map(([id, c]) => ({ ...c.campo, ...c,
            id: c.id ?? c.campo?.id ?? id, ambiente: z.ambiente, zona: z.zona })))
}

function quantidadeCampoChecklist(campo) {
    if (campo.quantidade !== null && campo.quantidade !== undefined && campo.quantidade !== '') {
        const quantidade = Number(campo.quantidade)
        return Number.isFinite(quantidade) ? quantidade : 0
    }
    return calcularQuantidadeTotal(Object.fromEntries(Object.entries(campo.dimensoes || {})
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => [k, Number(v)]))).quantidade
}

function totalOrcamentoChecklist(orcamento) {
    return camposChecklist(orcamento).reduce((total, campo) => {
        const unitario = Number(campo.unitario || 0)
        return total + (Number.isFinite(unitario) ? unitario : 0) * quantidadeCampoChecklist(campo)
    }, 0)
}

async function marcarConclusao(input, idObra, idOrcamento, idDescricao) {
    const marcado = input.checked
    input.disabled = true
    try {
        await salvarChecklist(`dados_orcamentos/${idOrcamento}/campos/${idDescricao}/andamento/concluido`, marcado)
        await atualizarItemChecklist(idObra, idOrcamento, idDescricao, { concluido: marcado })
    } catch (erro) {
        input.checked = !marcado
        popup({ mensagem: escaparAtributo(erro.message) })
    } finally { input.disabled = false }

}

async function riscarItem(idObra, idOrcamento, idDescricao) {
    try {
        const item = await recuperarAndamentoItem(idOrcamento, idDescricao)
        await salvarChecklist(`dados_orcamentos/${idOrcamento}/campos/${idDescricao}/andamento/removido`, !item.removido)
        await verAndamento(idObra)
    } catch (erro) { popup({ mensagem: escaparAtributo(erro.message) }) }
}

async function salvarChecklist(caminho, valor) {
    const resposta = await enviar(caminho, valor)
    if (!resposta || resposta.success === false || resposta.erro)
        throw new Error(resposta?.mensagem || 'Não foi possível salvar a alteração no checklist.')
    return resposta
}

async function atualizarItemChecklist(idObra, idOrcamento, idDescricao, alteracoes) {
    const painel = document.querySelector('.acompanhamento')
    if (!painel || painel.dataset.obra !== String(idObra)) return
    const linha = [...painel.querySelectorAll('tr[data-item]')].find(tr =>
        tr.dataset.orcamento === String(idOrcamento) && tr.dataset.item === String(idDescricao))
    if (!linha?.checklist) return
    Object.assign(linha.checklist, alteracoes)
    if (linha.campoOrcamento) {
        linha.campoOrcamento.andamento = { ...(linha.campoOrcamento.andamento || {}), ...alteracoes }
    }
    const { quantidade, realizado, concluido } = linha.checklist
    const percentual = percentualItemChecklist(quantidade, realizado, concluido)
    linha.dataset.concluido = percentual >= 100 ? 'S' : 'N'
    linha.children[0].querySelector('input').checked = concluido
    linha.children[3].textContent = `${quantidade > 0 ? quantidade : 'Não definida'} / ${realizado}`
    linha.children[4].innerHTML = `<input name="porcentagem" hidden type="number" value="${percentual}">${andamentoVisualChecklist(quantidade, realizado, concluido)}`
    try { await atualizarToolbar({ nomeTarefa: painel.querySelector('#etapas')?.value }) }
    catch (erro) { popup({ mensagem: 'O item foi salvo, mas o resumo da obra não pôde ser atualizado. Abra novamente o checklist para tentar.' }) }
}

function percentualItemChecklist(quantidade, realizado, concluido) {
    return concluido ? 100 : Number(quantidade) > 0
        ? Number((Number(realizado || 0) / Number(quantidade) * 100).toFixed(2)) : 0
}

function andamentoVisualChecklist(quantidade, realizado, concluido) {
    if (!(quantidade > 0) && !concluido)
        return '<span title="Defina a quantidade deste item no orçamento para calcular o andamento">Sem quantidade orçada</span>'
    return porcentagemHtml(percentualItemChecklist(quantidade, realizado, concluido))
}

async function painelFotos(idObra, idOrcamento, idDescricao) {

    const andamento = await recuperarAndamentoItem(idOrcamento, idDescricao)
    const fotos = andamento.fotos || {}
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

    try {
    const fotos = document.querySelector('.fotos')
    if (!fotos) throw new Error('O painel de fotos não está aberto.')
    const imgs = fotos.querySelectorAll('img')

    const album = {}

    if (imgs.length > 0) {
        for (const img of imgs) {
            if (img.dataset?.salvo === 'sim') continue

            const foto = img.anexoChecklist || await importarAnexos({ foto: img.src })
            if (!foto?.[0]?.link) throw new Error('Não foi possível enviar a foto.')
            img.anexoChecklist = foto
            const idFoto = foto[0].link
            album[idFoto] = foto[0]
            await salvarChecklist(`dados_orcamentos/${idOrcamento}/campos/${idDescricao}/andamento/fotos/${idFoto}`, foto[0])
            img.dataset.salvo = 'sim'
        }
    }

    removerPopup()
    await verAndamento(idObra)
    } catch (erro) { popup({ mensagem: escaparAtributo(erro.message || 'Não foi possível salvar as fotos.') }) }
    finally { removerOverlay() }
}

async function gerenciar(idObra, idOrcamento, idDescricao) {

    const andamento = await recuperarAndamentoItem(idOrcamento, idDescricao)
    const quantidade = andamento.realizado || 0
    const linhas = [
        {
            texto: 'Quantidade',
            elemento: `<input type="number" min="0" step="any" id="qtdeRealizada" value="${quantidade}">`
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
    const realizado = Number(qtdeRealizada?.value)
    try {
        if (!qtdeRealizada || !Number.isFinite(realizado) || realizado < 0) throw new Error('Informe uma quantidade válida, positiva ou zero.')
        await salvarChecklist(`dados_orcamentos/${idOrcamento}/campos/${idDescricao}/andamento/realizado`, realizado)
        removerPopup()
        await atualizarItemChecklist(idObra, idOrcamento, idDescricao, { realizado })
    } catch (erro) { popup({ mensagem: escaparAtributo(erro.message) }) }
    finally { removerOverlay() }
}

async function recuperarAndamentoItem(idOrcamento, idItem) {
    const orcamento = await recuperarDado('dados_orcamentos', idOrcamento)
    const campo = orcamento?.campos?.[idItem]
    if (!campo) throw new Error('O item não foi encontrado no orçamento. Atualize o checklist.')
    return campo.andamento || {}
}

function pesquisarObras(input) {
    filtrar()
}

async function atualizarToolbar({ nomeTarefa } = {}) {

    if (nomeTarefa && nomeTarefa.includes('Todas')) nomeTarefa = false
    const linhas = document.querySelectorAll('.acompanhamento .tabTarefas tr')

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
        porcentagemConcluido: 0,
        semQuantidade: 0
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
        if (linha.dataset.removido === 'S') continue
        totais.tarefas++
        if (linha.dataset.semQuantidade === 'S' && linha.dataset.concluido !== 'S') {
            totais.semQuantidade++
            continue
        }

        //Salvar os stats e usar eles na tabela principal;
        const porcentagem = Number(linha.querySelector('[name="porcentagem"]').value)

        totais.porcentagemConcluido += porcentagem > 100 ? 100 : porcentagem

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
        : Number((emPorcentagemConcluido / (totais.tarefas - totais.semQuantidade)).toFixed(2))

    const idObraAtual = controles.andamento.idObraAtual
    const obra = controles.andamento.obraAtual || await recuperarDado('dados_orcamentos', idObraAtual)
    if (!obra) throw new Error('Não foi possível recuperar o resumo da obra.')
    obra.resultado ??= {}
    const resultado = {
        porcentagem: porcentagemAndamento,
        excedente
    }

    if (Number(obra.resultado.porcentagem || 0) !== resultado.porcentagem || Boolean(obra.resultado.excedente) !== resultado.excedente) {
        await salvarChecklist(`dados_orcamentos/${idObraAtual}/resultado`, resultado)
        obra.resultado = resultado
    }

    const opcoes = [... new Set(tarefas)]
        .map(op => `<option ${nomeTarefa == op ? 'selected' : ''}>${op}</option>`)
        .join('')

    document.getElementById('etapas').innerHTML = opcoes
    document.getElementById('resumo').innerHTML = `
        ${bloco('Total', totais.tarefas)}
        ${bloco('Sem quantidade', totais.semQuantidade)}
        ${bloco('Não iniciado', totais.naoIniciado)}
        ${bloco('Em andamento', totais.emAndamento)}
        ${bloco('Excedente', totais.excedente)}
        ${bloco('Concluída', totais.concluido)}
        ${bloco(totais.semQuantidade ? 'Realizado (itens calculáveis)' : 'Realizado', `${porcentagemAndamento}%`)}
    `
    filtrar()
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
                'Alterações': {},
                'Tabela': {},
                'Data': { chave: 'data', tipoPesquisa: 'data' },
                'Alterado por': { chave: 'usuario' }
            },
            criarLinha: 'linhaHisObras'
        })

        const idPopup = popup({
            elemento: `<div style="padding: 0.5rem;">${tabela}</div>`
        })
        document.getElementById(idPopup).classList.add('popup-historico')

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
        nome_colaborador
    } = his || {}

    // Alterações em colaboradores (ex.: acesso a esta obra) mostram de quem se trata.
    const entidade = escaparAtributo(nomeEntidadeHistorico(his, 'dados_orcamentos'))
    const labelEntidade = nome_colaborador
        ? `${entidade} · <span class="historico-pessoa">${escaparAtributo(nome_colaborador)}</span>`
        : entidade

    return `
        <tr>
            <td>
                <div class="janela-alteracoes">${linhasAlteracoesHistorico(his, 'dados_orcamentos')}</div>
            </td>
            <td>${labelEntidade}</td>
            <td>${escaparAtributo(data)}</td>
            <td>${escaparAtributo(usuario)}</td>
        </tr>
    `

}
