let controles = {}

function campoBloq() {
    popup({ mensagem: 'O campo não permite pesquisas' })
}

async function modTab(configuracoes) {
    const { btnExtras = '', ocultarPaginacao = false, criarLinha, base, colunas = {}, body = null, pag = null } = configuracoes || {}

    if (!body || !pag || !base || !criarLinha)
        return popup({ mensagem: 'body/pag/base/criarLinha Não podem ser null' })

    controles[pag] ??= {}
    controles[pag] = {
        pagina: 1,
        ...controles[pag],
        ...configuracoes
    }

    const ths = Object.keys(colunas)
        .map(th => `
            <th>
                <div style="${horizontal}; width: 100%; justify-content: space-between; gap: 1rem;">
                    <span>${th}</span>    
                </div>
            </th>`
        )
        .join('')

    const pesquisa = (await Promise.all(
        Object.entries(colunas).map(async ([th, query]) => {
            if (!query.chave)
                return `
                    <th style="background-color: white;">
                        <img src="imagens/alerta.png" onclick="campoBloq()" title="Campo não permite pesquisa!" style="width: 1.5rem;">
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
                    <th style="background-color: white;">
                        <select
                        data-chave="${query.chave}"
                        data-op="${query.op || '='}"
                        onchange="confirmarPesquisa({ event, chave: '${query.chave}', op: '${query.op || '='}', elemento: this, pag: '${pag}'})">
                            <option></option>
                            ${opcoes}
                        </select>
                    </th>`
            }

            if (query.tipoPesquisa == 'data')
                return `
                    <th style="background-color: white;">
                        <div style="${horizontal}; gap: 2px;">
                            <input data-chave="${query.chave}" data-op=">=d" type="date" onchange="confirmarPesquisa({ event, chave: '${query.chave}', op: '>=d', elemento: this, pag: '${pag}'})">
                            <input data-chave="${query.chave}" data-op="<=d" type="date" onchange="confirmarPesquisa({ event, chave: '${query.chave}', op: '<=d', elemento: this, pag: '${pag}'})">
                        </div>
                    </th>`

            return `
                <th style="background-color: white; text-align: left;"
                data-chave="${query.chave}"
                data-op="${query.op || 'includes'}"
                onkeydown="confirmarPesquisa({ event, chave: '${query.chave}', op: '${query.op || 'includes'}', elemento: this, pag: '${pag}'})"
                contentEditable="true">
                </th>
                `
        })
    )).join('')

    const modelo = `
        <div style="${vertical}; width: 100%;">
            <div class="topo-tabela">
                <div style="display: ${ocultarPaginacao ? 'none' : ''};" id="paginacao_${pag}"></div>
                <div style="display: flex; flex-wrap: wrap;">
                    ${btnExtras}
                </div>
            </div>
            <div class="div-tabela" style="overflow-x: auto;">
                <table class="tabela">
                    <thead>
                        <tr>${ths}</tr>
                        <tr>${pesquisa}</tr>
                    </thead>
                    <tbody id="${body}"></tbody>
                </table>
            </div>
            <div class="rodape-tabela"></div>
        </div>
    `
    return modelo
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
        dado?.snapshots?.tsUltimoStatus,
        dado?.tsUltimoStatus,
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
        const {
            pagina,
            base,
            body,
            substituicoes,
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
            ordenar,
            explode,
            pagina,
            filtros
        })

        const mesmaConsulta = controles[pag].ultimaAssinaturaConsulta === assinaturaAtualConsulta

        const tabela = tbody.parentElement
        const cols = tabela.querySelectorAll('thead th').length

        if (!mesmaConsulta || !tbody.children.length) {
            tbody.innerHTML = ''
            tbody.appendChild(criarLoading(cols))
        }

        const dados = await pesquisarDB({
            base: baseResolvida,
            substituicoes,
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
                <div style="${alinPag}; align-items: center; padding: 2px; color: white;">
                    <div style="${horizontal}; gap: 5px;">
                    <img src="imagens/esq.png" style="width: 2rem;" onclick="mudarPagina(-1, '${pag}')">
                    <span id="paginaAtual_${pag}">${pagina}</span> de
                    <span id="totalPaginas_${pag}">${dados.paginas}</span> 
                    <img src="imagens/dir.png" style="width: 2rem;" onclick="mudarPagina(1, '${pag}')">
                    </div>
                    <span style="white-space: nowrap;"><span style="font-size: 1rem;" id="resultados_${pag}">${dados.total}</span> ${dados.total !== 1 ? 'Itens' : 'Item'}</span>
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
            return
        }

        const temLoading = !!tbody.querySelector('#loading-tabela')
        const temDino = !!tbody.querySelector('#dinossauro')
        const tabelaNaoPronta = temLoading || temDino

        if (mesmaPagina && !tabelaNaoPronta) {
            await executarFuncoesAdicionais(funcaoAdicional)
            restaurarPesquisa(pag)
            return
        }

        const reconstruirTudo = !mesmaConsulta
        await atualizarTabela(tbody, dados.resultados, criarLinha, baseResolvida, reconstruirTudo)

        controles[pag].ultimaAssinaturaPagina = assinaturaAtualPagina

        await executarFuncoesAdicionais(funcaoAdicional)
        restaurarPesquisa(pag)
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

async function criarElementoLinha(dado, criarLinha, base, indice = 0) {
    const htmlBruto = await window[criarLinha]({ ...dado, base })
    const html = injetarMetaTr(htmlBruto, dado, indice)

    const temp = document.createElement('tbody')
    temp.innerHTML = html.trim()

    return temp.firstElementChild
}

async function atualizarTabela(tbody, dados, criarLinha, base, reconstruirTudo = false) {
    const loading = tbody.querySelector('#loading-tabela')
    if (loading)
        loading.remove()

    const dino = tbody.querySelector('#dinossauro')
    if (dino)
        dino.remove()

    if (reconstruirTudo || !tbody.querySelector('tr[data-id]')) {
        const linhas = await Promise.all(
            dados.map(async (d, indice) => {
                const html = await Promise.resolve(window[criarLinha]({ ...d, base }))
                return injetarMetaTr(html, d, indice)
            })
        )

        tbody.innerHTML = linhas.join('')
        return
    }

    const atuais = new Map(
        [...tbody.querySelectorAll('tr[data-id]')]
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
            fragment.appendChild(atual)
            continue
        }

        const novaLinha = await criarElementoLinha(dado, criarLinha, base, indice)

        if (novaLinha)
            fragment.appendChild(novaLinha)
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
        <div style="${horizontal}; width: 100%; gap: 1rem;">
            ${achou() ? `<img src="gifs/offline.gif" style="width: 5rem;">` : '<span>Sem resultados</span>'}
        </div>
    `

    tr.appendChild(td)
    return tr
}

function achou() {
    return Math.random() < 0.01
}