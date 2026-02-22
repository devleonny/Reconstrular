let controles = {}

function campoBloq() {
    popup({ mensagem: 'O campo não permite pesquisas' })
}

function modTab(configuracoes) {

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

    const pesquisa = Object.entries(colunas)
        .map(([th, query]) => {
            if (!query.chave)
                return `
            <th style="background-color: white;">
                <img src="imagens/alerta.png" onclick="campoBloq()" title="Campo não permite pesquisa!" style="width: 1.5rem;">
            </th>`

            return `
            <th 
                style="background-color: white; text-align: left;"
                name="${th}"
                onkeydown="confirmarPesquisa({ event, chave: '${query.chave}', op: '${query.op || 'includes'}', elemento: this, pag: '${pag}'})"
                contentEditable="true">
            </th>`

        })
        .join('')


    const modelo = `
        <div style="${vertical}; width: 100%;">
            <div class="topo-tabela">
                <div style="display: ${ocultarPaginacao ? 'none' : ''};" id="paginacao_${pag}"></div>
                ${pesquisa ? `<span style="color: white; margin-right: 1rem;">Use o <b>ENTER</b> para pesquisar</span>` : ''}
                ${btnExtras}
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

async function mudarPagina(valor, pag) {

    const { pagina, total } = controles[pag]

    if ((valor == -1 && pagina == 1) || (valor == 1 && pagina == total))
        return

    if (valor < 0) controles[pag].pagina--
    else controles[pag].pagina++

    await paginacao(pag)

}

async function confirmarPesquisa({ event, chave, op, elemento, pag }) {

    if (event) {
        if (event.type !== 'keydown') return
        if (event.key !== 'Enter') return
        event.preventDefault()
    }

    const termo = elemento.textContent
        .replace(/\n/g, '')
        .trim()
        .toLowerCase()

    controles[pag].pagina = 1
    controles[pag].filtros ??= {}

    if (!termo) {
        delete controles[pag].filtros[chave]

        if (Object.keys(controles[pag].filtros).length === 0) {
            delete controles[pag].filtros
        }

        await paginacao(pag)
        return
    }

    controles[pag].filtros[chave] = {
        op,
        value: termo
    }

    await paginacao(pag)
}

async function paginacao(pag) {

    if (pag)
        return ativarPaginacao(pag)

    for (const pag of Object.keys(controles))
        await ativarPaginacao(pag)

    async function ativarPaginacao(pag) {

        const { pagina, base, body, alinPag = horizontal, criarLinha, funcaoAdicional, filtros } = controles[pag] || {}

        const tbody = document.getElementById(body)

        if (!tbody)
            return

        const baseResolvida = typeof base === 'function'
            ? await base()
            : base

        const dados = await pesquisarDB({
            base: baseResolvida,
            pagina,
            filtros
        })

        const tabela = tbody.parentElement
        const cols = tabela.querySelectorAll('thead th').length
        const divPaginacao = document.getElementById(`paginacao_${pag}`)
        const paginaAtual = document.getElementById(`paginaAtual_${pag}`)
        const resultados = document.getElementById(`resultados_${pag}`)

        controles[pag].total = dados.paginas

        if (!divPaginacao)
            return

        if (!paginaAtual) {

            divPaginacao.innerHTML = `
                <div style="${alinPag}; align-items: center; padding: 2px; color: white;">
                    <div style="${horizontal}; gap: 5px;">

                        <img src="imagens/esq.png" style="width: 2rem;" onclick="mudarPagina(-1, '${pag}')">
                        <span id="paginaAtual">${pagina}</span> de
                        <span id="totalPaginas">${dados.paginas}</span> 
                        <img src="imagens/dir.png" style="width: 2rem;" onclick="mudarPagina(1, '${pag}')">
                        
                    </div>
                    <span><span style="font-size: 1rem;" id="resultados">${dados.total}</span> ${dados.total !== 1 ? 'Itens' : 'Item'}</span>
                </div>
                `

        } else {
            paginaAtual.textContent = pagina
            totalPaginas.textContent = dados.paginas
            resultados.textContent = dados.total
        }

        if (!dados.resultados.length) {
            tbody.innerHTML = ''
            tbody.appendChild(criarDino(cols))

        } else {
            const dinossauro = tbody.querySelector('#dinossauro')
            if (dinossauro)
                dinossauro.remove()

            await atualizarComTS(tbody, dados.resultados, criarLinha, baseResolvida)
        }

        await executarFuncoesAdicionais(funcaoAdicional)

    }

    async function executarFuncoesAdicionais(funcaoAdicional = []) {
        // Função adicional, se existir;
        if (funcaoAdicional.length) {
            for (const f of funcaoAdicional)
                await window[f]()
        }
    }

}

async function atualizarComTS(tbody, dados, criarLinha, base) {

    const dino = tbody.querySelector('#dinossauro')
    if (dino)
        dino.remove()

    let linhas = ''

    for (const d of dados) {
        linhas += await window[criarLinha]({ ...d, base })
    }

    tbody.innerHTML = linhas
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
    return Math.random() < 0.1
}

