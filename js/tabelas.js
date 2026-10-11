let controles = {}

function campoBloq() {
    popup({ mensagem: 'O campo não permite pesquisas' })
}

async function modTab(configuracoes) {

    const {
        btnExtras = null,
        ocultarPesquisa = false,
        detalhes = false,
        scroll = true,
        alturaMinima = '0px',
        cor = null,
        nude = null,
        criarLinha,
        base,
        colunas = {},
        body = null,
        pag = null
    } = configuracoes || {}

    if (!body || !pag || !base || !criarLinha)
        return popup({ mensagem: 'body/pag/base/criarLinha Não podem ser null' })

    controles[pag] ??= {}
    controles[pag] = {
        pagina: 1,
        ...controles[pag],
        ...configuracoes
    }
    controles[pag].detalhes = detalhes === true
    controles[pag].estadoDetalhes ??= new Map()

    const ths = Object.entries(colunas)
        .map(([th, query]) => `
        <th onclick="ordenarColuna({ pag: '${pag}', path: '${query.chave || ''}' })" style="cursor: pointer;">
            <div style="${horizontal}; width: 100%; justify-content: space-between; gap: 1rem;">
                <span>${th}</span>
                <span data-ordem="${query.chave || ''}"></span>
            </div>
        </th>
    `)
        .join('')

    const pesquisa = (await Promise.all(
        Object.entries(colunas).map(async ([th, query]) => {
            if (!query.chave)
                return `
                    <th class="tabela-pesquisa-inativa" title="Esta coluna não tem filtro">
                        <span aria-hidden="true">—</span>
                    </th>`

            if (query.tipoPesquisa == 'select') {
                const dados = await contarPorCampo({
                    base,
                    path: query.chave
                })

                const opcoes = Object.keys(dados)
                    .filter(r => r != 'todos' && r != 'EM BRANCO')
                    .sort((a, b) => a.localeCompare(b))
                    .map(r => `<option value="${String(r).toLowerCase()}">${r}</option>`)
                    .join('')

                return `
                    <th>
                        <select
                        aria-label="Filtrar ${escaparAtributo(th.replace(/<[^>]*>/g, ''))}"
                        data-chave="${query.chave}"
                        data-op="${query.op || '='}"
                        onchange="confirmarPesquisa({ event, chave: '${query.chave}', op: '${query.op || '='}', elemento: this, pag: '${pag}'})">
                            <option value="">Todos</option>
                            ${opcoes}
                        </select>
                    </th>`
            }

            if (query.tipoPesquisa == 'data')
                return `
                    <th>
                        <div class="tabela-pesquisa-datas">

                            <input
                            data-chave="${query.chave}"
                            data-op=">=d"
                            type="date"
                            aria-label="Data inicial do filtro"
                            onchange="confirmarPesquisa({ event, chave: '${query.chave}', op: '>=d', elemento: this, pag: '${pag}'})"
                            >

                            <input
                            data-chave="${query.chave}"
                            data-op="<=d"
                            type="date"
                            aria-label="Data final do filtro"
                            onchange="confirmarPesquisa({ event, chave: '${query.chave}', op: '<=d', elemento: this, pag: '${pag}'})"
                            >
                            
                        </div>
                    </th>`

            return `
                <th class="tabela-pesquisa-texto" role="textbox" aria-label="Filtrar ${escaparAtributo(th.replace(/<[^>]*>/g, ''))}" data-placeholder="Pesquisar…" title="Digite e pressione Enter para pesquisar"
                data-chave="${query.chave}"
                data-op="${query.op || 'includes'}"
                onkeydown="confirmarPesquisa({ event, chave: '${query.chave}', op: '${query.op || 'includes'}', elemento: this, pag: '${pag}'})"
                onpaste="colarTextoPuro(event)"
                contentEditable="true"></th>
            `
        })
    )).join('')

    const modelo = `
        <div style="${vertical}; width: 100%;">

            <div class="topo-tabela${nude ? ' nude' : ''}" ${cor ? `style="background: ${cor};"` : ''}">
                ${detalhes === true ? `<button type="button" class="tabela-expandir" data-expandir-todos data-body="${escaparAtributo(body)}" aria-expanded="false" aria-label="Expandir todos os detalhes" title="Expandir todos os detalhes" onclick="alternarTodosDetalhes(this)">+</button>` : ''}
                <div id="paginacao_${pag}"></div>
                <div style="padding: 0 1rem;">
                    ${btnExtras || ''}
                </div>
            </div>

            <div data-altura-adaptavel="${scroll && !nude}" style="--altura-minima-tabela: ${escaparAtributo(typeof alturaMinima === 'number' ? `${alturaMinima}px` : alturaMinima)}; ${!scroll ? `max-height: max-content` : ''};" class="div-tabela${nude ? ' nude' : ''}">

                <table class="tabela${nude ? ' nude' : ''}">
                    <thead>
                        <tr>${detalhes === true ? '<th class="tabela-coluna-detalhes" aria-label="Detalhes"></th>' : ''}${ths}</tr>
                        ${ocultarPesquisa ? '' : `<tr class="tabela-linha-pesquisa">${detalhes === true ? '<th class="tabela-coluna-detalhes"></th>' : ''}${pesquisa}</tr>`}
                    </thead>
                    <tbody id="${body}" data-detalhes="${detalhes === true}"></tbody>
                </table>

            </div>

            ${nude ? '' : '<div class="rodape-tabela"></div>'}
        </div>
    `
    return modelo
}

function colarTextoPuro(event) {
    event.preventDefault()

    const texto = event.clipboardData?.getData('text/plain') || ''

    if (document.queryCommandSupported?.('insertText')) {
        document.execCommand('insertText', false, texto)
        return
    }

    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return

    sel.deleteFromDocument()
    sel.getRangeAt(0).insertNode(document.createTextNode(texto))
    sel.collapseToEnd()
}

function restaurarPesquisa(pag) {
    const ctrl = controles[pag]
    const filtros = ctrl?.filtros
    if (!filtros) return

    const tabela = document.querySelector(`#paginacao_${pag}`)?.closest('.topo-tabela')?.nextElementSibling?.querySelector('table')
        || document.querySelector(`#${ctrl.body}`)?.closest('table')

    if (!tabela) return

    const thead = tabela.querySelector('thead')
    if (!thead) return

    const ativo = document.activeElement

    for (const [chave, filtro] of Object.entries(filtros)) {
        const lista = Array.isArray(filtro) ? filtro : [filtro]

        for (const f of lista) {
            const op = f?.op
            const value = String(f?.original ?? f?.value ?? '')

            const el = thead.querySelector(`[data-chave="${CSS.escape(chave)}"][data-op="${CSS.escape(op)}"]`)
            if (!el) continue

            const tag = el.tagName.toLowerCase()

            if (tag === 'input' || tag === 'select') {
                el.value = value
                continue
            }

            if (el.textContent !== value)
                el.textContent = value

            if (ativo === el)
                colocarCursorNoFim(el)
        }
    }
}

async function mudarPagina(valor, pag) {
    const { pagina, total } = controles[pag]

    if ((valor == -1 && pagina == 1) || (valor == 1 && pagina == total))
        return

    if (valor < 0) controles[pag].pagina--
    else controles[pag].pagina++

    await paginacao(pag)
}

async function confirmarPesquisa({ event, chave, op, elemento, pag }) {
    if (event?.type === 'keydown') {
        if (event.key !== 'Enter') return
        event.preventDefault()
    }

    const bruto = (elemento?.value ?? elemento?.textContent ?? '')
        .replace(/\n/g, '')
        .trim()

    const termo = bruto.toLowerCase()

    controles[pag].pagina = 1
    controles[pag].filtros ??= {}

    const isInput = elemento?.tagName?.toLowerCase() === 'input'
    const isSelect = elemento?.tagName?.toLowerCase() === 'select'

    if (isInput) {
        const atual = controles[pag].filtros[chave]
        const arr = Array.isArray(atual) ? atual : (atual ? [atual] : [])

        if (!termo) {
            const novo = arr.filter(f => f?.op !== op)

            if (!novo.length) {
                delete controles[pag].filtros[chave]
                if (Object.keys(controles[pag].filtros).length === 0)
                    delete controles[pag].filtros
            } else {
                controles[pag].filtros[chave] = novo
            }

            await paginacao(pag)
            return
        }

        const idx = arr.findIndex(f => f?.op === op)

        const registro = {
            op,
            value: termo,
            original: bruto
        }

        if (idx >= 0) arr[idx] = registro
        else arr.push(registro)

        controles[pag].filtros[chave] = arr
        await paginacao(pag)
        return
    }

    if (isSelect) {
        if (!termo) {
            delete controles[pag].filtros[chave]
            if (Object.keys(controles[pag].filtros).length === 0)
                delete controles[pag].filtros

            await paginacao(pag)
            return
        }

        controles[pag].filtros[chave] = {
            op,
            value: termo,
            original: bruto
        }

        await paginacao(pag)
        return
    }

    if (!termo) {
        delete controles[pag].filtros[chave]
        if (Object.keys(controles[pag].filtros).length === 0)
            delete controles[pag].filtros

        await paginacao(pag)
        return
    }

    controles[pag].filtros[chave] = {
        op,
        value: termo,
        original: bruto
    }

    await paginacao(pag)
}

function colocarCursorNoFim(el) {
    if (!el || el.tagName?.toLowerCase() === 'input' || el.tagName?.toLowerCase() === 'select')
        return

    const range = document.createRange()
    const sel = window.getSelection()

    range.selectNodeContents(el)
    range.collapse(false)

    sel.removeAllRanges()
    sel.addRange(range)
}

function stableStringify(valor) {
    if (valor === null || typeof valor !== 'object')
        return JSON.stringify(valor)

    if (Array.isArray(valor))
        return `[${valor.map(stableStringify).join(',')}]`

    const chaves = Object.keys(valor).sort()

    return `{${chaves.map(chave => `${JSON.stringify(chave)}:${stableStringify(valor[chave])}`).join(',')}}`
}

function obterChaveLinha(dado, indice = 0) {
    if (dado?.id !== undefined && dado?.id !== null && dado?.id !== '')
        return String(dado.id)

    if (dado?.codigo !== undefined && dado?.codigo !== null && dado?.codigo !== '')
        return String(dado.codigo)

    if (dado?.usuario !== undefined && dado?.usuario !== null && dado?.usuario !== '')
        return String(dado.usuario)

    if (dado?.chave !== undefined && dado?.chave !== null && dado?.chave !== '')
        return String(dado.chave)

    if (dado?._id !== undefined && dado?._id !== null && dado?._id !== '')
        return String(dado._id)

    return `linha_${indice}_${btoa(unescape(encodeURIComponent(stableStringify(dado)))).slice(0, 24)}`
}

function obterTimestampLinha(dado) {
    const candidatos = [
        dado?.timestamp,
        dado?.snapshots?.timestamp,
        dado?.updatedAt,
        dado?.dataAtualizacao
    ]

    for (const valor of candidatos) {
        if (valor === 0) return '0'
        if (valor) return String(valor)
    }

    return ''
}

function obterHashLinha(dado) {
    return stableStringify(dado)
}

function escaparAtributo(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

function injetarMetaTr(html, dado, indice = 0) {
    if (typeof html !== 'string')
        return ''

    const id = escaparAtributo(obterChaveLinha(dado, indice))
    const ts = escaparAtributo(obterTimestampLinha(dado))
    const hash = escaparAtributo(obterHashLinha(dado))

    return html.replace(
        /^\s*<tr\b([^>]*)>/i,
        (match, attrs = '') => `<tr${attrs} data-id="${id}" data-ts="${ts}" data-hash="${hash}">`
    )
}

function assinaturaConsulta({ base, substituicoes, ordenar, explode, pagina, filtros }) {
    return stableStringify({
        base,
        substituicoes: substituicoes || null,
        ordenar: ordenar || null,
        explode: explode || null,
        pagina,
        filtros: filtros || null
    })
}

function assinaturaPagina(resultados = []) {
    return stableStringify(
        resultados.map((d, indice) => ({
            id: obterChaveLinha(d, indice),
            ts: obterTimestampLinha(d),
            hash: obterHashLinha(d)
        }))
    )
}

async function paginacao(pag) {
    if (pag)
        return ativarPaginacao(pag)

    for (const pag of Object.keys(controles))
        await ativarPaginacao(pag)

    async function ativarPaginacao(pag) {
        if (controles[pag]?.atualizacaoManual) return
        const {
            pagina,
            base,
            body,
            limite,
            ocultarPaginacao,
            ocultarLegenda,
            substituicoes,
            relacionados,
            ordenar,
            alinPag = horizontal,
            explode = null,
            criarLinha,
            funcaoAdicional,
            filtros
        } = controles[pag] || {}

        const tbody = document.getElementById(body)

        if (!tbody)
            return

        const baseResolvida = typeof base === 'function'
            ? await base()
            : base

        const assinaturaAtualConsulta = assinaturaConsulta({
            base: baseResolvida,
            substituicoes,
            relacionados,
            ordenar,
            explode,
            pagina,
            filtros
        })

        const mesmaConsulta = controles[pag].ultimaAssinaturaConsulta === assinaturaAtualConsulta
        const tabela = tbody.parentElement
        const cols = tabela.querySelector('thead tr')?.children.length || 1

        if (!mesmaConsulta || !tbody.children.length) {
            tbody.innerHTML = ''
            tbody.appendChild(criarLoading(cols))
        }

        const dados = await pesquisarDB({
            limite,
            base: baseResolvida,
            substituicoes,
            relacionados,
            ordenar,
            explode,
            pagina,
            filtros
        })

        // Para casos de base objeto;
        if (typeof base === 'object' && controles[pag]?.priBase !== 'S') {
            controles[pag].priBase = 'S'
            controles[pag].base = dados.resultados
        }

        const assinaturaAtualPagina = assinaturaPagina(dados.resultados)
        const mesmaPagina = mesmaConsulta && controles[pag].ultimaAssinaturaPagina === assinaturaAtualPagina

        controles[pag].total = dados.paginas
        controles[pag].ultimaAssinaturaConsulta = assinaturaAtualConsulta

        const divPaginacao = document.getElementById(`paginacao_${pag}`)
        const paginaAtual = document.getElementById(`paginaAtual_${pag}`)
        const resultados = document.getElementById(`resultados_${pag}`)

        if (!divPaginacao)
            return

        if (!paginaAtual) {
            divPaginacao.innerHTML = `
                <div style="${alinPag}; align-items: center; padding: 2px; color: white; gap: 5px;">

                    <div style="display: ${ocultarPaginacao ? 'none' : 'flex'}; align-items: center; justify-content: center; gap: 5px;">
                        <img src="imagens/esq.png" style="width: 2rem;" onclick="mudarPagina(-1, '${pag}')">
                        <span id="paginaAtual_${pag}">${pagina}</span> de
                        <span id="totalPaginas_${pag}">${dados.paginas}</span> 
                        <img src="imagens/dir.png" style="width: 2rem;" onclick="mudarPagina(1, '${pag}')">
                    </div>
                    <span style="display: ${ocultarLegenda ? 'none' : 'flex'}; align-items: center; justify-content: center; white-space: nowrap; gap: 5px;">
                        <span style="font-size: 1rem;" id="resultados_${pag}">${dados.total}</span>
                        <span>${dados.total !== 1 ? 'Itens' : 'Item'}</span>
                    </span>

                </div>
            `
        } else {
            paginaAtual.textContent = pagina
            document.getElementById(`totalPaginas_${pag}`).textContent = dados.paginas
            resultados.textContent = dados.total
        }

        if (!dados.resultados.length) {
            controles[pag].ultimaAssinaturaPagina = assinaturaAtualPagina
            tbody.innerHTML = ''
            tbody.appendChild(criarDino(cols))
            await executarFuncoesAdicionais(funcaoAdicional)
            restaurarPesquisa(pag)
            aplicarColunasOcultas(pag)
            return
        }

        const temLoading = !!tbody.querySelector('#loading-tabela')
        const temDino = !!tbody.querySelector('#dinossauro')
        const tabelaNaoPronta = temLoading || temDino

        if (mesmaPagina && !tabelaNaoPronta) {
            restaurarPesquisa(pag)
            return
        }

        const reconstruirTudo = !mesmaConsulta
        await atualizarTabela(tbody, dados.resultados, criarLinha, baseResolvida, reconstruirTudo, controles[pag].estadoDetalhes)

        controles[pag].ultimaAssinaturaPagina = assinaturaAtualPagina

        await executarFuncoesAdicionais(funcaoAdicional)
        restaurarPesquisa(pag)
        atualizarIndicadorOrdenacao(pag)
        aplicarColunasOcultas(pag)
    }

    async function executarFuncoesAdicionais(funcaoAdicional = []) {
        if (funcaoAdicional.length) {
            for (const f of funcaoAdicional)
                await window[f]()
        }
    }
}

function criarLoading(cols) {
    const tr = document.createElement('tr')
    tr.id = 'loading-tabela'

    const td = document.createElement('td')
    td.colSpan = cols
    td.innerHTML = `
        <div style="${horizontal}; width: 100%; gap: 1rem; justify-content: center; padding: 1rem;">
            <img src="gifs/loading.gif" style="width: 5rem;">
        </div>
    `

    tr.appendChild(td)
    return tr
}

async function criarElementoLinha(dado, criarLinha, base, indice = 0, habilitarDetalhes = false, estadoDetalhes = new Map()) {
    const htmlBruto = await window[criarLinha]({ ...dado, base })
    // Retorno tradicional: '<tr>...</tr>'. Com detalhes: { linha, detalhes }.
    // detalhes recebe HTML de conteúdo, sem <tr>/<td> externos.
    const html = injetarMetaTr(typeof htmlBruto === 'string' ? htmlBruto : htmlBruto?.linha, dado, indice)

    const temp = document.createElement('tbody')
    temp.innerHTML = html.trim()

    const linha = temp.firstElementChild
    if (!linha || !habilitarDetalhes)
        return linha

    const celula = document.createElement('td')
    celula.className = 'tabela-coluna-detalhes'
    linha.prepend(celula)
    if (!htmlBruto?.detalhes || typeof htmlBruto === 'string') return linha

    const detalhes = document.createElement('tr')
    detalhes.className = 'tabela-linha-detalhes'
    detalhes.hidden = true
    const conteudo = document.createElement('td')
    conteudo.colSpan = [...linha.children].reduce((total, td) => total + td.colSpan, 0)
    conteudo.innerHTML = `<div class="tabela-detalhes-conteudo">${htmlBruto.detalhes}</div>`
    detalhes.appendChild(conteudo)

    const botao = document.createElement('button')
    botao.type = 'button'
    botao.className = 'tabela-expandir'
    botao.textContent = '+'
    botao.setAttribute('aria-expanded', 'false')
    botao.setAttribute('aria-label', 'Expandir detalhes')
    botao.addEventListener('click', event => {
        event.stopPropagation()
        definirDetalhesExpandidos(linha, detalhes.hidden)
        atualizarBotaoTodosDetalhes(linha.parentElement)
    })
    celula.prepend(botao)
    linha.detalhesTabela = detalhes
    linha.botaoDetalhesTabela = botao
    linha.estadoDetalhesTabela = estadoDetalhes
    definirDetalhesExpandidos(linha, estadoDetalhes.get(linha.dataset.id) === true)

    return linha
}

function definirDetalhesExpandidos(linha, expandir) {
    if (!linha?.detalhesTabela) return
    linha.estadoDetalhesTabela?.set(linha.dataset.id, !!expandir)
    linha.detalhesTabela.hidden = !expandir
    linha.botaoDetalhesTabela.textContent = expandir ? '−' : '+'
    linha.botaoDetalhesTabela.setAttribute('aria-expanded', String(expandir))
    linha.botaoDetalhesTabela.setAttribute('aria-label', expandir ? 'Recolher detalhes' : 'Expandir detalhes')
}

function adicionarLinhaTabela(fragment, linha) {
    if (!linha) return
    fragment.appendChild(linha)
    if (linha.detalhesTabela)
        fragment.appendChild(linha.detalhesTabela)
}

function atualizarBotaoTodosDetalhes(tbody) {
    if (!tbody) return
    const botao = tbody.closest('.div-tabela')?.previousElementSibling?.querySelector('[data-expandir-todos]')
    if (!botao) return
    const linhas = [...tbody.children].filter(linha => linha.detalhesTabela)
    const todosAbertos = linhas.length > 0 && linhas.every(linha => !linha.detalhesTabela.hidden)
    botao.textContent = todosAbertos ? '−' : '+'
    const descricao = todosAbertos ? 'Recolher todos os detalhes' : 'Expandir todos os detalhes'
    botao.title = descricao
    botao.setAttribute('aria-label', descricao)
    botao.setAttribute('aria-expanded', String(todosAbertos))
    botao.disabled = linhas.length === 0
}

function alternarTodosDetalhes(botao) {
    const tbody = document.getElementById(botao.dataset.body)
    if (!tbody) return
    const linhas = [...tbody.children].filter(linha => linha.detalhesTabela)
    const expandir = linhas.some(linha => linha.detalhesTabela.hidden)
    linhas.forEach(linha => definirDetalhesExpandidos(linha, expandir))
    atualizarBotaoTodosDetalhes(tbody)
}

async function atualizarTabela(tbody, dados, criarLinha, base, reconstruirTudo = false, estadoDetalhes = new Map()) {
    const habilitarDetalhes = tbody.dataset.detalhes === 'true'
    const loading = tbody.querySelector('#loading-tabela')
    if (loading)
        loading.remove()

    const dino = tbody.querySelector('#dinossauro')
    if (dino)
        dino.remove()

    if (reconstruirTudo || !tbody.querySelector('tr[data-id]')) {
        const linhas = await Promise.all(
            dados.map((d, indice) => criarElementoLinha(d, criarLinha, base, indice, habilitarDetalhes, estadoDetalhes))
        )

        const fragment = document.createDocumentFragment()
        linhas.forEach(linha => adicionarLinhaTabela(fragment, linha))
        tbody.replaceChildren(fragment)
        return
    }

    const atuais = new Map(
        [...tbody.children].filter(tr => tr.hasAttribute('data-id'))
            .map(tr => [String(tr.dataset.id), tr])
    )

    const fragment = document.createDocumentFragment()

    for (let indice = 0; indice < dados.length; indice++) {
        const dado = dados[indice]
        const id = obterChaveLinha(dado, indice)
        const ts = obterTimestampLinha(dado)
        const hash = obterHashLinha(dado)

        const atual = atuais.get(id)

        if (atual && atual.dataset.ts === ts && atual.dataset.hash === hash) {
            adicionarLinhaTabela(fragment, atual)
            continue
        }

        const novaLinha = await criarElementoLinha(dado, criarLinha, base, indice, habilitarDetalhes, estadoDetalhes)

        adicionarLinhaTabela(fragment, novaLinha)
    }

    tbody.innerHTML = ''
    tbody.appendChild(fragment)

}

function criarDino(cols) {
    const tr = document.createElement('tr')
    tr.id = 'dinossauro'

    const td = document.createElement('td')
    td.colSpan = cols
    td.innerHTML = `
        <div class="tabela-sem-resultados">
            ${achou() ? `<img src="gifs/offline.gif" style="width: 5rem;">` : '<span>Sem resultados</span>'}
        </div>
    `

    tr.appendChild(td)
    return tr
}

function achou() {
    return Math.random() < 0.1
}

function ordenarColuna({ pag, path }) {
    if (!path) return
    const ctrl = controles[pag]

    if (!ctrl) return

    const atual = ctrl.ordenar || {}

    if (atual.path === path) {
        ctrl.ordenar.direcao = atual.direcao === 'asc' ? 'desc' : 'asc'
    } else {
        ctrl.ordenar = {
            path,
            direcao: 'asc'
        }
    }

    ctrl.pagina = 1
    paginacao(pag)
}

function atualizarIndicadorOrdenacao(pag) {
    const ctrl = controles[pag]
    if (!ctrl) return

    const { ordenar } = ctrl || {}

    const tabela = document.querySelector(`#${ctrl.body}`)?.closest('table')
    if (!tabela) return

    tabela.querySelectorAll('[data-ordem]').forEach(el => {
        el.textContent = ''
    })

    if (!ordenar?.path) return

    const alvo = tabela.querySelector(`[data-ordem="${CSS.escape(ordenar.path)}"]`)
    if (!alvo) return

    alvo.textContent = ordenar.direcao === 'asc' ? '▲' : '▼'
}

function aplicarColunasOcultas(pag) {
    const ctrl = controles[pag]
    if (!ctrl || !ctrl.body) return

    const tabela = document.getElementById(ctrl.body)?.closest('table')
    if (!tabela) return

    const colunasOcultar = ctrl.ocultar || []

    const linhasHeader = tabela.querySelectorAll('thead tr')
    const thsTitulo = linhasHeader[0]?.querySelectorAll('th') || []
    const thsPesquisa = linhasHeader[1]?.querySelectorAll('th') || []

    thsTitulo.forEach((th, index) => {
        const nomeColuna = th.querySelector('span')?.textContent?.trim()
        const deveOcultar = !th.classList.contains('tabela-coluna-detalhes') && colunasOcultar.includes(nomeColuna)

        th.style.display = deveOcultar ? 'none' : ''

        if (thsPesquisa[index]) {
            thsPesquisa[index].style.display = deveOcultar ? 'none' : ''
        }

        const linhas = [...document.getElementById(ctrl.body).children]
        linhas.forEach(linha => {
            if (linha.id === 'dinossauro' || linha.id === 'loading-tabela') return
            if (linha.classList.contains('tabela-linha-detalhes')) return

            const td = linha.children[index]
            if (td) td.style.display = deveOcultar ? 'none' : ''
        })
    })

    const colunasVisiveis = [...thsTitulo].filter(th => th.style.display !== 'none').length
    for (const linha of document.getElementById(ctrl.body).children) {
        if (linha.classList.contains('tabela-linha-detalhes')) {
            linha.firstElementChild.colSpan = Math.max(1, colunasVisiveis)
            continue
        }
    }
    atualizarBotaoTodosDetalhes(document.getElementById(ctrl.body))
}

function moverPag(direcao) {

    const pag = document.querySelector('.div-tabela')

    pag.scrollLeft += direcao == 'esquerda'
        ? (-100) 
        : 100

}

// O limite depende da posição da tabela, e não de uma fração fixa da tela.
function calcularAlturaDisponivelTabela(div) {
    let limite = window.visualViewport
        ? window.visualViewport.offsetTop + window.visualViewport.height
        : window.innerHeight
    let reserva = 0
    let limiteInterno = Infinity
    let topo = div.getBoundingClientRect().top

    for (let elemento = div; elemento.parentElement; elemento = elemento.parentElement) {
        const pai = elemento.parentElement
        const estilo = getComputedStyle(pai)
        reserva += parseFloat(estilo.paddingBottom) || 0

        const layoutHorizontal = ['flex', 'inline-flex'].includes(estilo.display)
            && ['row', 'row-reverse'].includes(estilo.flexDirection)
        for (let irmao = layoutHorizontal ? null : elemento.nextElementSibling; irmao; irmao = irmao.nextElementSibling) {
            const css = getComputedStyle(irmao)
            if (css.display === 'none' || ['absolute', 'fixed'].includes(css.position)) continue
            reserva += irmao.getBoundingClientRect().height
                + (parseFloat(css.marginTop) || 0) + (parseFloat(css.marginBottom) || 0)
            reserva += parseFloat(estilo.rowGap) || 0
        }

        const janelaPopup = pai.classList.contains('janela') && pai.closest('.popup-janela-fora')
        if (janelaPopup) {
            // Usa o limite da janela, não sua altura atual, que depende da tabela.
            const maximo = parseFloat(getComputedStyle(janelaPopup).maxHeight)
            const popup = janelaPopup.closest('.popup')
            const cssPopup = getComputedStyle(popup)
            const alturaViewport = window.visualViewport?.height || window.innerHeight
            limite = Math.min(Number.isFinite(maximo) ? maximo : alturaViewport,
                alturaViewport - (parseFloat(cssPopup.paddingTop) || 0) - (parseFloat(cssPopup.paddingBottom) || 0))
            topo = div.getBoundingClientRect().top - pai.getBoundingClientRect().top + pai.scrollTop
            for (const parte of janelaPopup.children) {
                if (parte === pai) continue
                reserva += parte.getBoundingClientRect().height
            }
            break
        }

        if (/(auto|scroll|hidden|clip)/.test(estilo.overflowY)) {
            if (pai.closest('.popup-janela-fora')) {
                // Contêineres internos de pop-ups também têm altura definida pelo conteúdo.
                // Respeita seu max-height, mas não usa a altura atual como limite.
                const maximo = parseFloat(estilo.maxHeight)
                if (Number.isFinite(maximo)) {
                    const deslocamento = div.getBoundingClientRect().top - pai.getBoundingClientRect().top + pai.scrollTop
                    limiteInterno = Math.min(limiteInterno, maximo - deslocamento - reserva)
                }
                continue
            }
            const rect = pai.getBoundingClientRect()
            limite = Math.min(limite, rect.top + pai.clientTop + pai.clientHeight)
            // Rolar o contêiner externo não deve aumentar a altura da tabela.
            topo += pai.scrollTop
            break
        }
    }

    return Math.max(0, Math.floor(Math.min(limite - topo - reserva, limiteInterno)))
}

let ajusteAlturaTabelaPendente = false
const elementosAlturaTabela = new Set()
const observadorAlturaTabela = new ResizeObserver(agendarAlturaTabelas)

function agendarAlturaTabelas() {
    if (ajusteAlturaTabelaPendente) return
    ajusteAlturaTabelaPendente = true
    requestAnimationFrame(() => {
        ajusteAlturaTabelaPendente = false
        for (const elemento of elementosAlturaTabela) {
            if (elemento.isConnected) continue
            observadorAlturaTabela.unobserve(elemento)
            elementosAlturaTabela.delete(elemento)
        }
        const tabelas = [...document.querySelectorAll('.div-tabela:not(.nude)')]
            .filter(div => div.dataset.alturaAdaptavel !== 'false' && div.getClientRects().length)
        const alturas = tabelas.map(div => calcularAlturaDisponivelTabela(div))
        tabelas.forEach((div, indice) => {
            const altura = `${alturas[indice]}px`
            if (div.style.getPropertyValue('--altura-disponivel-tabela') !== altura)
                div.style.setProperty('--altura-disponivel-tabela', altura)
            // Observa também cabeçalhos e contêineres que mudam sem recriar o DOM.
            for (let elemento = div.parentElement; elemento; elemento = elemento.parentElement) {
                for (const alvo of [elemento, ...elemento.children]) {
                    if (alvo === div || elementosAlturaTabela.has(alvo)) continue
                    elementosAlturaTabela.add(alvo)
                    observadorAlturaTabela.observe(alvo)
                }
                if (elemento.classList.contains('tela')) break
            }
        })
    })
}

new MutationObserver(agendarAlturaTabelas).observe(document.documentElement, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class']
})
window.addEventListener('resize', agendarAlturaTabelas)
window.visualViewport?.addEventListener('resize', agendarAlturaTabelas)
agendarAlturaTabelas()
