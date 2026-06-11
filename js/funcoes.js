async function telaNiveis() {

titulo.textContent = 'Níveis de acesso'

  const acumulado = `
        <div class="painel-despesas">
            <br>
            ${btn('concluido', 'Autorizações de acesso', '')}
            ${btn('colaborador', 'Adicionar Parceiro', 'editarParceiros()')}
            ${btn('todos', 'Parceiros', 'telaUsuarios()')}
        </div>
    `
  tela.innerHTML = acumulado

}


async function tabelaNiveis() {

    const colunas = {
        'Função': { chave: 'nome' },
        'Pode Cadastrar': {},
        'Zonas': {},
        'Distritos': {},
        'Áreas': {},
        'Edição': {}
    }

    const btnExtras = `<button onclick="adicionarFuncao()">Adicionar Função</button>`

    const tabela = await modTab({
        base: 'funcoes',
        colunas,
        pag: 'funcoes',
        body: 'funcoes',
        criarLinha: 'criarLinhaFuncao',
        substituicoes: [
            {
                path: 'funcao.*.id',
                tabela: 'funcoes',
                campoBusca: 'id',
                retorno: 'nome',
                destino: 'funcao.*.nome'
            }
        ],
        btnExtras
    })

    tela.innerHTML = tabela

    await paginacao()
}

function criarLinhaFuncao(dados) {

    const { id } = dados || {}

    const tdsExtras = []
    const regras = ['funcao', 'zona', 'distrito', 'area']

    for (const regra of regras) {

        const lista = dados?.[regra] || []
        const td = []
        for (const item of lista)
            td.push(`${item?.nome || item?.id}`)

        tdsExtras.push(`<td style="text-align: left; white-space: pre-wrap;">${td.join('\n')}</td>`)
    }

    const tds = `
        <td>${dados?.nome || ''}</td>
        ${tdsExtras.join('')}
        <td>
            <img onclick="adicionarFuncao('${id}')" src="imagens/pesquisar.png">
        </td>
    `

    return `<tr>${tds}</tr>`

}

async function adicionarFuncao(idFuncao) {

    overlayAguarde()
    const funcao = await recuperarDado('funcoes', idFuncao) || {}

    const campos = [
        { span: 'Pode cadastrar / Função', param: 'funcao' },
        { span: 'Pode acessar / Zonas', param: 'zona' },
        { span: 'Pode acessar / Distrito', param: 'distrito' },
        { span: 'Pode acessar / Áreas', param: 'area' },
    ]

    const linhas = [
        {
            texto: 'Função',
            elemento: `<textarea name="nomeFuncao" placeholder="Nome da Função">${funcao?.nome || ''}</textarea>`
        }
    ]

    campos.forEach(({ span, param }) =>
        linhas.push({
            texto: `
                <div style="${horizontal}; gap: 5px;">
                    <img src="imagens/baixar.png" onclick="maisCampo('${param}')">
                    <span>${span}</span>
                </div>
            `,
            elemento: `<div style="display: flex; flex-direction: column; align-items: end; gap: 2px;" id="div_${param}"></div>`
        })
    )

    const botoes = [
        {
            funcao: idFuncao
                ? `salvarFuncao('${idFuncao}')`
                : 'salvarFuncao()',
            img: 'concluido',
            texto: 'Salvar'
        }
    ]

    if (idFuncao)
        botoes.push({ texto: 'Excluir', img: 'cancel', funcao: `confirmarExcluirFuncao('${idFuncao}')` })

    const titulo = idFuncao
        ? 'Editar Função'
        : 'Adicionar Função'

    popup({ linhas, botoes, titulo })

    // Inclusão dos itens;
    const preenchidos = ['funcao', 'area', 'zona', 'distrito']
        .map(async (campo) => {
            const lista = funcao?.[campo] || []

            for (const item of lista)
                maisCampo(campo, item.id)

        })

    Promise.all(preenchidos)


}

async function maisCampo(base = null, id = null) {

    let termo = 'Selecione'
    const idName = crypto.randomUUID()

    // Antes da ref base mudar;
    const local = document.getElementById(`div_${base}`)

    if (base == 'funcao') {

        const { nome } = await recuperarDado('funcoes', id) || {}
        termo = nome || id

    } else {

        // Caso das bases;
        if (id)
            termo = id

    }

    const campos = await contarPorCampo({
        base: base == 'funcao' ? 'funcoes' : 'cidades',
        path: base == 'funcao' ? 'nome' : base
    })

    base = Object
        .keys(campos || {})
        .filter(c => c !== 'todos')
        .map(c => {
            return {
                id: c,
                nome: c
            }
        })

    controlesCxOpcoes[idName] = {
        base: [{ id: ' 🟢 GERAL', nome: ' 🟢 GERAL' }, ...base],
        retornar: ['nome'],
        colunas: {
            nome: { chave: 'nome' }
        }
    }

    const span = `
        <div style="${horizontal}; gap: 1rem;">
            <span ${id ? `id="${id}"` : ''} name="${idName}" class="opcoes" onclick="cxOpcoes('${idName}')">${termo || 'Selecione'}</span>
            <img src="imagens/cancel.png" style="width: 1.5rem;" onclick="this.parentElement.remove()">
        </div>
    `

    if (local)
        local.insertAdjacentHTML('beforeend', span)


}


async function confirmarExcluirFuncao(idFuncao) {

    const botoes = [
        { texto: 'Confirmar', img: 'concluido', funcao: `excluirFuncao('${idFuncao}')` }
    ]

    popup({ botoes, mensagem: 'Excluir Função?', nra: false })

}

async function excluirFuncao(idFuncao) {

    overlayAguarde()

    await deletar(`funcoes/${idFuncao}`)

}

async function salvarFuncao(idFuncao = crypto.randomUUID()) {

    overlayAguarde()

    const funcao = await recuperarDado('funcoes', idFuncao) || {}
    const nomeFuncao = document.querySelector('[name="nomeFuncao"]')

    // Campos extras;
    const campos = ['funcao', 'zona', 'distrito', 'area']

    campos.forEach(campo => {
        funcao[campo] ??= []
        funcao[campo] = [...document.querySelectorAll(`#div_${campo} span`)]
            .filter(span => span.id)
            .map(span => {
                return { id: span.id }
            })

    })

    funcao.nome = nomeFuncao.value

    await enviar(`funcoes/${idFuncao}`, funcao)
    removerPopup()

}