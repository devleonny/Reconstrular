// Ver Obras. Com { contrato }, mostra só essa obra com os detalhes abertos (ex.: vindo do lucro na folha de ponto).
async function telaObras({ contrato = null } = {}) {

    try {

        titulo.textContent = 'Obras'

        const destaque = contrato
            ? `<span class="obras-destaque">A mostrar a obra <b>${escaparAtributo(contrato)}</b> <button type="button" onclick="telaObras()">Ver todas as obras</button></span>`
            : ''
        const tabela = await modTab({
            btnExtras: `${destaque}<button onclick="adicionarObra()">Adicionar Obra</button>`,
            pag: 'obras',
            detalhes: true,
            body: 'bodyObras',
            base: 'vw_dados_orcamentos',
            filtros: { em_obra: { op: '=', value: true }, ...(contrato ? { contrato: { op: '=', value: String(contrato) } } : {}) },
            ...(contrato ? { pagina: 1 } : {}),
            criarLinha: 'criarLinhaObras',
            colunas: {
                'Checklist': {},
                'Alinhamento de Tarefas': {},
                'Cronograma': {},
                'Histórico de Edições': {},
                'Colaboradores da Obra': {},
                'Status': {},
                'Número': { chave: 'contrato' },
                'Cliente': { chave: 'snapshots.cliente' },
                'Distrito': { chave: 'distrito' },
                'Cidade': { chave: 'cidade' },
                'Morada': { chave: 'morada' },
                'Total de orçamento': { chave: 'total_geral' }
            }
        })

        tela.innerHTML = tabela

        await paginacao()

        if (contrato) {
            const linhas = [...document.querySelectorAll('#bodyObras > tr')].filter(tr => tr.detalhesTabela)
            if (!linhas.length) return popup({ mensagem: `A obra ${escaparAtributo(contrato)} não está disponível para si (fora da sua região ou já não está em obra).` })
            for (const linha of linhas) definirDetalhesExpandidos(linha, true)
            atualizarBotaoTodosDetalhes(document.getElementById('bodyObras'))
        }

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao abrir o ecrã de Obras: Fale com o suporte.' })
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
    // Lucro do orçamento = total − custos (materiais, mão de obra e ferramentas). É o valor do variável na folha de ponto.
    const lucro = (Number(total_geral) || 0) - (Number(total_materiais) || 0) - (Number(total_mao_obra) || 0) - (Number(total_ferramentas) || 0)
    const margemLucro = Number(total_geral) ? lucro / Number(total_geral) * 100 : 0

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
            <img src="imagens/checklist.svg" class="icone-tabela" alt="Alinhamento de tarefas" title="Alinhamento de tarefas (ordem de execução do cronograma)" onclick="alinhamentoTarefas('${id}')">
        </td>
        <td>
            <img src="imagens/cronograma.svg" class="icone-tabela" alt="Cronograma" title="Cronograma" onclick="telaCronograma('${id}')">
        </td>
        <td>
            <img src="imagens/historico.svg" class="icone-tabela" alt="Histórico de edições" title="Histórico de edições" onclick="historicoObras('${numeroObra}')">
        </td>
        <td>
            <img src="imagens/editar.svg" class="icone-editar" alt="Editar colaboradores da obra" title="Editar os colaboradores da obra" onclick="adicionarObra('${id}')">
        </td>
        <td>
            <span class="${st.replace(' ', '_')}">${st}</span>
        </td>
        <td>
            <span class="tag-orcamento">${numeroObra}</span>
        </td>
        <td>${nome_cliente || ''}</td>
        <td>${distrito || ''}</td>
        <td>${cidade || ''}</td>
        <td>${escaparAtributo(obra.morada || '')}</td>
        <td style="white-space: nowrap;">${dinheiro(total_geral ?? 0)}</td>
    `
    // Detalhes em cartões: Andamento · Orçamento (total, custos e lucro, com barra da composição) · Material extra · Colaboradores.
    const total = Number(total_geral) || 0
    const custos = [
        ['materiais', 'Material', Number(total_materiais) || 0],
        ['mao_obra', 'Mão de Obra', Number(total_mao_obra) || 0],
        ['ferramentas', 'Ferramentas', Number(total_ferramentas) || 0]
    ]
    const fatia = v => total > 0 ? Math.max(0, v) / total * 100 : 0
    const pct = v => v.toLocaleString('pt-PT', { maximumFractionDigits: 1 })
    const barraComposicao = total > 0 ? `<div class="obra-composicao" role="img" aria-label="Composição do total: ${custos.map(([, nome, v]) => `${nome} ${pct(fatia(v))}%`).join(', ')}, Lucro ${pct(fatia(lucro))}%">
            ${custos.map(([tipo, nome, v]) => `<span class="obra-composicao-${tipo}" style="width: ${fatia(v)}%" title="${nome}: ${pct(fatia(v))}%"></span>`).join('')}
            <span class="obra-composicao-lucro" style="width: ${fatia(lucro)}%" title="Lucro: ${pct(fatia(lucro))}%"></span>
        </div>` : ''
    const linhaValor = ([tipo, nome, v]) => `<button type="button" class="obra-valor-linha" onclick="mostrarMateriaisOrcamento('${id}', '${tipo}')" title="Ver os itens de ${nome}">
            <span><i class="obra-legenda obra-composicao-${tipo}"></i>${nome}</span><span>${dinheiro(v)} <small>${pct(fatia(v))}%</small> ›</span>
        </button>`
    const extra = Number(total_extra) || 0
    const detalhes = `<div class="obra-detalhes-cartoes">
        <section class="obra-cartao">
            <h4>Andamento</h4>
            ${divPorcentagem(porcentagem)}
            <div class="obra-cartao-rodape"><span class="${st.replace(' ', '_')}">${st}</span>${excedente ? '<span class="excedente">Excedente</span>' : ''}</div>
        </section>
        <section class="obra-cartao obra-cartao-orcamento">
            <h4>Orçamento</h4>
            <div class="obra-total"><span>Total do orçamento</span><b>${dinheiro(total)}</b></div>
            ${barraComposicao}
            <div class="obra-valores">${custos.map(linhaValor).join('')}</div>
            <div class="obra-lucro ${lucro < 0 ? 'obra-lucro-negativo' : ''}" title="Total do orçamento menos Material, Mão de Obra e Ferramentas. É a base do variável na folha de ponto.">
                <span><i class="obra-legenda obra-composicao-lucro"></i>Lucro</span>
                <span><b>${dinheiro(lucro)}</b> <small>${pct(margemLucro)}% do total</small></span>
            </div>
        </section>
        <section class="obra-cartao">
            <h4>Material extra</h4>
            <button type="button" class="obra-valor-destaque" onclick="mostrarMateriaisExtras('${numeroObra}')" title="Ver as despesas extra da obra">${dinheiro(extra)} ›</button>
            ${barraPercentagem(porcentagem_extra || 0, { tipo: 'consumo', titulo: 'Material extra face ao material orçado' })}
            <small class="obra-nota">face ao material orçado (${dinheiro(total_materiais ?? 0)})</small>
        </section>
        <section class="obra-cartao">
            <h4>Colaboradores <small>${nomesColaboradores.length}</small></h4>
            <div class="obra-colaboradores-tags">${nomesColaboradores.length
                ? nomesColaboradores.map(nome => `<span class="tag-orcamento">${escaparAtributo(nome)}</span>`).join('')
                : '<span class="obra-nota">Nenhum colaborador vinculado.</span>'}</div>
        </section>
    </div>`
    return { linha: `<tr>${tds}</tr>`, detalhes }

}

// Alinhamento de Tarefas: itens da checklist com a especialidade, na ordem de execução (Interior e depois Exterior,
// pela sequência lógica das especialidades). Arrastar (ou ▲/▼) muda a ordem; ao guardar, o cronograma segue-a.
async function alinhamentoApi(idObra, metodo = 'GET', corpo) {
    const resposta = await fetchAutenticado(`${api}/obras-alinhamento/${encodeURIComponent(idObra)}`, {
        method: metodo,
        headers: { Authorization: `Bearer ${acesso?.token}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
        ...(corpo ? { body: JSON.stringify(corpo) } : {})
    })
    if (!resposta) throw new Error('Sessão encerrada.')
    const dados = await resposta.json().catch(() => ({}))
    if (!resposta.ok || dados.success === false) throw new Error(dados.mensagem || `Falha no alinhamento de tarefas (HTTP ${resposta.status}).`)
    return dados
}

async function alinhamentoTarefas(idObra) {
    overlayAguarde()
    try {
        const { contrato, itens, personalizado } = await alinhamentoApi(idObra)
        const linhas = itens.map(item => `
            <tr draggable="true" data-chave="${escaparAtributo(item.chave)}">
                <td class="alinhamento-pega" title="Arraste para mudar a ordem">⋮⋮</td>
                <td class="alinhamento-numero"></td>
                <td><span class="alinhamento-secao alinhamento-${item.secao === 'Exterior' ? 'exterior' : 'interior'}">${escaparAtributo(item.secao)}</span></td>
                <td>${escaparAtributo(item.especialidade || 'Sem especialidade')}</td>
                <td>${escaparAtributo(item.descricao || '')}</td>
                <td>${escaparAtributo(item.zona || '')}</td>
                <td class="alinhamento-mover"><button type="button" data-subir title="Subir">▲</button><button type="button" data-descer title="Descer">▼</button></td>
            </tr>`).join('')
        const elemento = `
            <div class="alinhamento-tarefas" data-obra="${escaparAtributo(idObra)}">
                <div class="alinhamento-info">
                    <p>Obra <b>${escaparAtributo(contrato || '')}</b> · ${personalizado ? 'ordem definida pela equipa' : 'ordem padrão (Interior e depois Exterior)'}.</p>
                    <p>Arraste as tarefas (ou use ▲ ▼) para a ordem de execução; o cronograma é atualizado ao guardar.</p>
                </div>
                <div class="alinhamento-recorte">
                    <table class="tabela"><thead><tr><th></th><th>Nº</th><th>Secção</th><th>Especialidade</th><th>Tarefa</th><th>Divisão</th><th>Mover</th></tr></thead>
                    <tbody>${linhas || '<tr><td colspan="7">Esta obra não tem tarefas no orçamento.</td></tr>'}</tbody></table>
                </div>
            </div>`
        const idPopup = popup({
            titulo: 'Alinhamento de Tarefas', elemento, botoes: [
                { texto: 'Guardar ordem', img: 'concluido', funcao: `salvarAlinhamento('${idObra}')` },
                { texto: 'Repor ordem padrão', img: 'atualizar', funcao: `reporAlinhamento('${idObra}')` }
            ]
        })
        document.getElementById(idPopup)?.classList.add('popup-alinhamento')
        prepararAlinhamento(document.querySelector('.alinhamento-tarefas tbody'))
    } catch (erro) { popup({ mensagem: escaparAtributo(erro.message) }) }
    finally { removerOverlay() }
}

function prepararAlinhamento(tbody) {
    if (!tbody) return
    const numerar = () => [...tbody.querySelectorAll('tr[data-chave]')].forEach((tr, i) => { tr.querySelector('.alinhamento-numero').textContent = i + 1 })
    let arrastada = null
    tbody.addEventListener('dragstart', e => { arrastada = e.target.closest('tr[data-chave]'); arrastada?.classList.add('alinhamento-arrastando') })
    tbody.addEventListener('dragend', () => { arrastada?.classList.remove('alinhamento-arrastando'); arrastada = null; numerar() })
    tbody.addEventListener('dragover', e => {
        e.preventDefault()
        const alvo = e.target.closest('tr[data-chave]')
        if (!arrastada || !alvo || alvo === arrastada) return
        const meio = alvo.getBoundingClientRect().top + alvo.offsetHeight / 2
        alvo.parentNode.insertBefore(arrastada, e.clientY < meio ? alvo : alvo.nextSibling)
    })
    tbody.addEventListener('click', e => {
        const tr = e.target.closest('tr[data-chave]')
        if (!tr) return
        if (e.target.closest('[data-subir]') && tr.previousElementSibling) tr.parentNode.insertBefore(tr, tr.previousElementSibling)
        if (e.target.closest('[data-descer]') && tr.nextElementSibling) tr.parentNode.insertBefore(tr.nextElementSibling, tr)
        numerar()
    })
    numerar()
}

async function salvarAlinhamento(idObra) {
    const ordem = [...document.querySelectorAll('.alinhamento-tarefas tr[data-chave]')].map(tr => tr.dataset.chave)
    overlayAguarde()
    try {
        await alinhamentoApi(idObra, 'PUT', { ordem })
        removerPopup()
        popup({ titulo: 'Alinhamento de Tarefas', mensagem: 'Ordem guardada. O cronograma da obra já segue esta sequência.' })
    } catch (erro) { popup({ mensagem: escaparAtributo(erro.message) }) }
    finally { removerOverlay() }
}

async function reporAlinhamento(idObra) {
    overlayAguarde()
    try {
        await alinhamentoApi(idObra, 'PUT', { padrao: true })
        removerPopup()
        await alinhamentoTarefas(idObra)
    } catch (erro) { popup({ mensagem: escaparAtributo(erro.message) }) }
    finally { removerOverlay() }
}

async function mostrarMateriaisOrcamento(id_obra, tipo) {
    const categorias = { materiais:'Materiais', ferramentas:'Ferramentas', mao_obra:'Mão de obra' }
    if (!categorias[tipo]) return
    overlayAguarde()
    try {
        const itens = await carregarItensExecucoes(id_obra)
        const linhas = listarComponentesObra(itens, tipo)
        const total = linhas.reduce((soma, item) => soma + item.total, 0)
        const html = `<div class="obra-itens-orcamento"><div class="obra-itens-resumo"><span>${linhas.length} itens · Quantidades do orçamento</span><strong>Custo total: ${dinheiro(total)}</strong></div><div class="obra-itens-recorte"><table class="tabela"><thead><tr><th>Ambiente</th><th>Zona</th><th>Serviço</th><th>Item</th><th>Quantidade total</th><th>Custo unitário</th><th>Custo total</th></tr></thead><tbody>${linhas.map(item => `<tr><td>${escaparAtributo(item.ambiente)}</td><td>${escaparAtributo(item.zona)}</td><td>${escaparAtributo(item.servico)}</td><td>${escaparAtributo(item.descricao)}</td><td>${item.quantidade.toLocaleString('pt-BR', {maximumFractionDigits:6})}</td><td>${dinheiro(item.preco)}</td><td>${item.total === 0 ? `<span class="obra-total-zerado" title="Valor total zerado">${dinheiro(item.total)}</span>` : dinheiro(item.total)}</td></tr>`).join('') || '<tr><td colspan="7">Nenhum item desta categoria registado no orçamento.</td></tr>'}</tbody></table></div></div>`
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
            botoes: [{ texto: idOrcamento ? 'Guardar colaboradores' : 'Evoluir orçamento para uma obra', img: 'concluido' }],
            elemento: `<div class="obra-formulario">
                <label>Orçamento<select class="obra-orcamento" ${idOrcamento ? 'disabled' : ''}>
                <option value="">${!idOrcamento && !dados.orcamentos?.length ? 'Nenhum orçamento disponível' : 'Selecione um orçamento'}</option>
                ${(idOrcamento ? [dados.obra] : dados.orcamentos || []).filter(Boolean).map(o => `<option value="${escaparAtributo(o.id)}" ${idOrcamento ? 'selected' : ''}>${escaparAtributo(o.contrato)} — ${escaparAtributo(o.nome_cliente || '')}</option>`).join('')}
                </select></label>
                <label>Colaboradores<input type="search" class="obra-busca-usuarios" placeholder="Pesquisar utilizador, nome ou função"></label>
                <div class="obra-usuarios"></div><p class="obra-selecao" aria-live="polite"></p>
                <p class="obra-erro" role="status"></p>
            </div>` })
        const modal = document.getElementById(idModal)
        function renderUsuarios() {
            const busca = modal.querySelector('.obra-busca-usuarios').value.toLocaleLowerCase()
            modal.querySelector('.obra-usuarios').innerHTML = usuarios.filter(u =>
                `${u.usuario} ${u.nome_completo || u.nome || ''} ${u.funcao || ''}`.toLocaleLowerCase().includes(busca))
                .map(u => `<label class="obra-usuario"><input type="checkbox" value="${escaparAtributo(u.usuario)}" ${selecionados.has(u.usuario) ? 'checked' : ''} ${salvando ? 'disabled' : ''}>
                <span><b>${escaparAtributo(u.nome_completo || u.nome || u.usuario)}</b><small>${escaparAtributo(u.usuario)} · ${escaparAtributo(u.funcao || '')}</small></span></label>`).join('') || '<p>Nenhum utilizador encontrado.</p>'
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
            textoBotao.textContent = idOrcamento ? 'A guardar…' : 'Evoluindo orçamento…'
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
    controles.obraPdf = id

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

// PDF da checklist ou do cronograma: cabeçalho com o logótipo e os dados da obra; sem a coluna "Gerir".
async function pdfObra(nome) {

    const original = document.querySelector('#pdf')
    if (!original) return
    const copia = original.cloneNode(true)
    copia.querySelectorAll('.col-gerir').forEach(el => el.remove())
    // Checklist no PDF: linhas todas com fundo branco (a da especialidade tem cinzento na app).
    copia.querySelectorAll('.tabela-especialidade tr').forEach(tr => { tr.style.backgroundColor = '#fff' })

    const obra = controles.obraPdf ? await recuperarDado('dados_orcamentos', controles.obraPdf) : null
    const cliente = obra?.cliente ? await recuperarDado('dados_clientes', obra.cliente) : null
    copia.insertAdjacentHTML('afterbegin', cabecalhoPdf({
        titulo: nome,
        linhas: [['Obra', obra?.contrato], ['Cliente', cliente?.nome], ['Morada', cliente?.morada_execucao]]
    }))

    await pdf({
        html: copia.outerHTML,
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

        // Renderiza especialidades: cada uma tem o seu número (1, 2, 3…) e os itens continuam-no (1.1, 1.2…).
        let numeroEspecialidade = 0
        for (const [especialidade, itens] of Object.entries(grupos)) {
            numeroEspecialidade++

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
                <td>${numeroEspecialidade}</td>
                <td><b>${escaparAtributo(especialidade)}</b></td>
                <td>Qtde Orçada / Qtde Realizada</td>
                <td>Andamento</td>
                <td class="col-gerir">Gerir</td>
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

                const ordem = `${numeroEspecialidade}.${index}`
                const qtdeRealizada = item.campo.andamento?.realizado || 0


                // Riscar: ícone verde; riscado, ícone e risco vermelhos. Fotos: câmara vermelha sem foto, verde com foto.
                const riscado = !!item.campo.andamento?.removido
                const estilo = riscado ? 'class="checklist-riscado"' : ''
                const fotos = Object.keys(item.campo.andamento?.fotos || {}).length > 0
                const icoCam = fotos ? 'camera-verde' : 'camera-vermelha'
                const icoRiscar = riscado ? 'riscar-vermelho' : 'riscar-verde'
                // A 100% a tarefa conta como concluída: caixa marcada e linha verde.
                const concluido = !!item.campo.andamento?.concluido

                const porcent = percentualItemChecklist(quantidade, qtdeRealizada, concluido)

                tr.classList.toggle('checklist-completo', porcent >= 100)
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
                        <input onchange="marcarConclusao(this, ${params})" ${porcent >= 100 ? 'checked' : ''} type="checkbox" style="width: 1.5rem; height: 1.5rem">
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

                    <td class="col-gerir">
                        <div class="gerenciar">
                            <img onclick="gerenciar(${params})" src="imagens/editar.svg" class="icone-tabela" alt="Editar item" title="Editar item">
                            <img onclick="painelFotos(${params})" src="imagens/${icoCam}.svg" class="icone-tabela" alt="${fotos ? 'Ver fotos anexadas' : 'Adicionar fotos'}" title="${fotos ? 'Ver fotos anexadas' : 'Adicionar fotos'}">
                            <img onclick="riscarItem(${params})" src="imagens/${icoRiscar}.svg" class="icone-tabela" alt="${riscado ? 'Retirar risco do item' : 'Riscar item'}" title="${riscado ? 'Retirar risco do item' : 'Riscar item'}">
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
        throw new Error(resposta?.mensagem || 'Não foi possível guardar a alteração no checklist.')
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
    linha.classList.toggle('checklist-completo', percentual >= 100)
    linha.children[0].querySelector('input').checked = percentual >= 100
    linha.children[3].textContent = `${quantidade > 0 ? quantidade : 'Não definida'} / ${realizado}`
    linha.children[4].innerHTML = `<input name="porcentagem" hidden type="number" value="${percentual}">${andamentoVisualChecklist(quantidade, realizado, concluido)}`
    try { await atualizarToolbar({ nomeTarefa: painel.querySelector('#etapas')?.value }) }
    catch (erro) { popup({ mensagem: 'O item foi guardado, mas o resumo da obra não pôde ser atualizado. Abra novamente o checklist para tentar.' }) }
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

// Fotos do item: as guardadas podem ser eliminadas; novas vêm da câmara (com pré-visualização para usar ou repetir)
// ou de um ficheiro. As novas só são enviadas em "Guardar".
async function painelFotos(idObra, idOrcamento, idDescricao) {

    const andamento = await recuperarAndamentoItem(idOrcamento, idDescricao)
    const fotos = andamento.fotos || {}
    const params = [idObra, idOrcamento, idDescricao].map(v => escaparAtributo(JSON.stringify(String(v)))).join(', ')
    const guardadas = Object.keys(fotos).map(link => `
        <div class="foto-checklist">
            <img data-salvo="sim" data-link="${escaparAtributo(link)}" src="${escaparAtributo(urlArquivo(link))}" class="foto" onclick="ampliarImagem(this)" alt="Foto do item">
            <button type="button" class="foto-checklist-remover" title="Eliminar foto" aria-label="Eliminar foto" onclick="confirmarRemoverFotoChecklist(this, ${params})">&times;</button>
        </div>`).join('')

    const elemento = `
        <div class="painel-fotos-checklist">
            <div class="painel-fotos-acoes">
                <button type="button" onclick="cameraFotoChecklist()">📷 Tirar foto</button>
                <label class="painel-fotos-ficheiro">🖼️ Escolher imagem<input type="file" accept="image/*" multiple hidden onchange="ficheirosFotoChecklist(this)"></label>
            </div>
            <div class="fotos fotos-checklist">${guardadas}</div>
            <p class="painel-fotos-vazio" ${guardadas ? 'hidden' : ''}>Sem fotos neste item.</p>
        </div>`

    const botoes = [
        { texto: 'Guardar', img: 'concluido', funcao: `salvarFotos('${idObra}', '${idOrcamento}', '${idDescricao}')` }
    ]

    popup({ elemento, botoes, titulo: 'Fotos do item' })
}

// Junta uma foto nova (ainda por enviar) ao painel, com o botão de a retirar.
function adicionarFotoChecklist(src) {
    const grelha = document.querySelector('.fotos-checklist')
    if (!grelha) return
    grelha.insertAdjacentHTML('beforeend', `
        <div class="foto-checklist foto-checklist-nova">
            <img src="${src}" class="foto" onclick="ampliarImagem(this)" alt="Foto nova">
            <button type="button" class="foto-checklist-remover" title="Retirar foto" aria-label="Retirar foto" onclick="this.closest('.foto-checklist').remove(); atualizarVazioFotosChecklist()">&times;</button>
        </div>`)
    atualizarVazioFotosChecklist()
}

function atualizarVazioFotosChecklist() {
    const vazio = document.querySelector('.painel-fotos-vazio')
    if (vazio) vazio.hidden = !!document.querySelector('.fotos-checklist .foto-checklist')
}

function ficheirosFotoChecklist(input) {
    for (const ficheiro of input.files) {
        const leitor = new FileReader()
        leitor.onload = () => adicionarFotoChecklist(leitor.result)
        leitor.readAsDataURL(ficheiro)
    }
    input.value = ''
}

// Câmara: captura, mostra a foto e deixa usar ou repetir.
async function cameraFotoChecklist() {
    popup({
        titulo: 'Tirar foto',
        elemento: `
            <div class="camera-checklist">
                <div class="cameraDiv"><video autoplay playsinline></video><canvas hidden></canvas></div>
                <img class="camera-checklist-previa" hidden alt="Foto capturada">
                <div class="camera-checklist-acoes">
                    <button type="button" data-capturar onclick="capturarFotoChecklist()">Capturar</button>
                    <button type="button" data-usar hidden onclick="usarFotoChecklist()">Usar esta foto</button>
                    <button type="button" data-repetir hidden onclick="repetirFotoChecklist()">Repetir</button>
                </div>
            </div>`
    })
    await abrirCamera()
}

function capturarFotoChecklist() {
    const caixa = document.querySelector('.camera-checklist')
    const video = caixa.querySelector('video'), canvas = caixa.querySelector('canvas'), previa = caixa.querySelector('.camera-checklist-previa')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    previa.src = canvas.toDataURL('image/png')
    previa.hidden = false
    caixa.querySelector('.cameraDiv').hidden = true
    caixa.querySelector('[data-capturar]').hidden = true
    caixa.querySelector('[data-usar]').hidden = false
    caixa.querySelector('[data-repetir]').hidden = false
}

function repetirFotoChecklist() {
    const caixa = document.querySelector('.camera-checklist')
    caixa.querySelector('.camera-checklist-previa').hidden = true
    caixa.querySelector('.cameraDiv').hidden = false
    caixa.querySelector('[data-capturar]').hidden = false
    caixa.querySelector('[data-usar]').hidden = true
    caixa.querySelector('[data-repetir]').hidden = true
}

function usarFotoChecklist() {
    const src = document.querySelector('.camera-checklist .camera-checklist-previa')?.src
    encerrarCam()
    removerPopup()
    if (src) adicionarFotoChecklist(src)
}

function confirmarRemoverFotoChecklist(botao, idObra, idOrcamento, idDescricao) {
    const link = botao.closest('.foto-checklist')?.querySelector('img')?.dataset.link
    if (!link) return
    popup({
        titulo: 'Eliminar foto',
        mensagem: 'Eliminar esta foto do item?',
        botoes: [{ texto: 'Eliminar', img: 'cancel', funcao: `removerFotoChecklist(${[idObra, idOrcamento, idDescricao, link].map(v => escaparAtributo(JSON.stringify(String(v)))).join(', ')})` }]
    })
}

async function removerFotoChecklist(idObra, idOrcamento, idDescricao, link) {
    overlayAguarde()
    try {
        const resultado = await deletar(`dados_orcamentos/${idOrcamento}/campos/${idDescricao}/andamento/fotos/${link}`)
        if (resultado === null) throw new Error('Não foi possível eliminar a foto. Tente novamente.')
        removerPopup()
        document.querySelector(`.fotos-checklist img[data-link="${CSS.escape(link)}"]`)?.closest('.foto-checklist')?.remove()
        atualizarVazioFotosChecklist()
        await atualizarIconeFotosChecklist(idObra, idOrcamento, idDescricao)
    } catch (erro) { popup({ mensagem: escaparAtributo(erro.message) }) }
    finally { removerOverlay() }
}

// Ícone da câmara na linha: verde com fotos, vermelho sem.
async function atualizarIconeFotosChecklist(idObra, idOrcamento, idDescricao) {
    const linha = [...document.querySelectorAll('.acompanhamento tr[data-item]')].find(tr =>
        tr.dataset.orcamento === String(idOrcamento) && tr.dataset.item === String(idDescricao))
    const icone = linha?.querySelector('img[onclick^="painelFotos"]')
    if (!icone) return
    const andamento = await recuperarAndamentoItem(idOrcamento, idDescricao).catch(() => ({}))
    const tem = Object.keys(andamento.fotos || {}).length > 0
    icone.src = `imagens/${tem ? 'camera-verde' : 'camera-vermelha'}.svg`
    icone.title = icone.alt = tem ? 'Ver fotos anexadas' : 'Adicionar fotos'
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
    } catch (erro) { popup({ mensagem: escaparAtributo(erro.message || 'Não foi possível guardar as fotos.') }) }
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
            texto: 'Guardar',
            img: 'concluido',
            funcao: `salvarAndamento('${idObra}', '${idOrcamento}', '${idDescricao}')`
        }
    ]

    popup({ linhas, botoes, titulo: 'Gerir quantidade' })

}

async function salvarAndamento(idObra, idOrcamento, idDescricao) {

    overlayAguarde()

    const qtdeRealizada = document.getElementById('qtdeRealizada')
    const realizado = Number(qtdeRealizada?.value)
    try {
        if (!qtdeRealizada || !Number.isFinite(realizado) || realizado < 0) throw new Error('Informe uma quantidade válida, positiva ou zero.')
        await salvarChecklist(`dados_orcamentos/${idOrcamento}/campos/${idDescricao}/andamento/realizado`, realizado)
        // Chegou à quantidade orçada (100%): a tarefa fica marcada como concluída.
        const linha = [...document.querySelectorAll('.acompanhamento tr[data-item]')].find(tr =>
            tr.dataset.orcamento === String(idOrcamento) && tr.dataset.item === String(idDescricao))
        const quantidade = Number(linha?.checklist?.quantidade) || 0
        const alteracoes = { realizado }
        if (quantidade > 0 && realizado >= quantidade && !linha.checklist.concluido) {
            await salvarChecklist(`dados_orcamentos/${idOrcamento}/campos/${idDescricao}/andamento/concluido`, true)
            alteracoes.concluido = true
        }
        removerPopup()
        await atualizarItemChecklist(idObra, idOrcamento, idDescricao, alteracoes)
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

// Andamento de um item da checklist (mais é melhor; acima de 100 % é excedente).
function porcentagemHtml(percentual) {
    return barraPercentagem(percentual, { titulo: Number(percentual) > 100 ? 'Acima da quantidade orçada' : 'Andamento do item' })
}

async function historicoObras(ordem) {

    try {
        // Inclui o orçamento, as despesas da obra e as mudanças de acesso de colaboradores a ela.
        await painelHistorico({
            titulo: 'Histórico da obra',
            subtitulo: `Obra ${ordem}`,
            base: 'vw_historico_obras',
            filtrosFixos: { ordem_obra: { op: '=', value: ordem } },
            tabelaPadrao: 'dados_orcamentos'
        })
    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao gerar o histórico: Fale com o suporte.' })
    }

}
