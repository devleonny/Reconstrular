let controlesCxOpcoes = {}

async function cxOpcoes(name) {

    const controle = controlesCxOpcoes[name]
    if (!controle)
        return popup({ mensagem: `>>> cxOpcoes(null) <<<` })

    controlesCxOpcoes.ativo = name
    const { colunas, base, filtros = {} } = controle

    const pag = 'cxOpcoes'
    const tabela = modTab({
        colunas,
        pag,
        base,
        filtros,
        criarLinha: 'linCxOpcoes',
        body: 'cxOpcoes'
    })

    const elemento = `
        <div style="padding: 1rem;">

            ${tabela}

        </div>`

    popup({ elemento, titulo: 'Selecione o item' })

    await paginacao(pag)
}

function linCxOpcoes(dado) {

    const { ativo } = controlesCxOpcoes // Ativo é o mesmo que o [name]
    const { colunas } = controlesCxOpcoes[ativo]
    const cod = dado.id || dado.codigo || dado.usuario || null
    const tds = []

    for (const coluna of Object.values(colunas)) {

        const d = getByPath(dado, coluna?.chave)

        tds.push(`
            <td>
                ${Array.isArray(d) ? d.join('<br>') : d || ''}
            </td>`)
    }

    return `
        <tr class="opcoes-v2" 
            onclick="selecionar('${ativo}', '${cod}')">
            ${tds.join('')}
        </tr>`
}

async function selecionar(name, cod) {

    const { funcaoAdicional, base, retornar } = controlesCxOpcoes[name]
    const painel = document.querySelector('.painel-padrao')

    if (!retornar)
        return popup({ mensagem: `campo retornar: ['exemplo'] → undefined` })

    // Painel quando for forms; do contrário qualquer outro elemento;
    const elemento = (painel || document)?.querySelector(`[name='${name}']`)
    const termos = []
    const dado = await recuperarDado(base, cod)

    for (const chave of retornar) {
        const d = getByPath(dado, chave)

        if (d ?? false) {
            if (Array.isArray(d))
                termos.push(...d)
            else
                termos.push(d)
        }
    }

    elemento.innerHTML = termos.join('<br>')
    elemento.id = cod

    removerPopup()

    if (funcaoAdicional)
        await window[funcaoAdicional]()
}

async function usuariosToolbar() {

    if (!acesso)
        return

    acesso = await recuperarDado('dados_setores', acesso.usuario) || JSON.parse(localStorage.getItem('acesso')) || {}

    const nomeUsuario = document.querySelector('.nomeUsuario')
    if (nomeUsuario)
        nomeUsuario.innerHTML = `<span><b>${inicialMaiuscula(acesso?.permissao || '')}</b> ${acesso.usuario || ''}</span>`


}