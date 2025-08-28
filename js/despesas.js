function inicialMaiuscula(string) {
    if (string == undefined) {
        return ''
    }
    string.includes('_') ? string = string.split('_').join(' ') : ''

    if (string.includes('lpu')) return string.toUpperCase()
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

async function telaCadastros() {
    esconderMenus()
    titulo.textContent = 'Cadastros'
    const telaInterna = document.querySelector('.telaInterna')
    const bases = ['despesas', 'fornecedores', 'materiais', 'ferramentas']
    const acumulado = `
        <div style="${vertical}; gap: 2px;">
            <div class="painel-superior-cadastros">
                ${bases.map(base => `<button onclick="carregarBasesAuxiliares('${base}')">${inicialMaiuscula(base)}</button>`).join('')}
            </div>
            <div class="telaInferior"></div>
        </div>
    `

    telaInterna.innerHTML = acumulado

}

async function carregarBasesAuxiliares(nomeBase) {
    titulo.textContent = inicialMaiuscula(nomeBase)
    const colunas = ['Nome', '']
    await carregarElementosPagina(nomeBase, colunas, 'telaInferior')
}

async function editarBaseAuxiliar(nomeBase, id) {
    const dados = await recuperarDado(nomeBase, id)
    const funcao = id ? `salvarNomeAuxiliar('${nomeBase}', '${id}')` : `salvarNomeAuxiliar('${nomeBase}')`
    const acumulado = `
        <div class="painel-cadastro">
            <span>Nome</span>
            <input name="nome" placeholder="${inicialMaiuscula(nomeBase)}" value="${dados?.nome || ''}">
        </div>
        <div class="rodape-formulario">
            <button onclick="${funcao}">Salvar</button>
            <span style="margin-left: 5vw;" name="timer"></span>
        </div>
    `

    popup(acumulado, 'Gerenciar', true)

}

async function carregarElementosPagina(nomeBase, colunas, tela) {

    overlayAguarde()
    const dados = await recuperarDados(nomeBase)
    const telaInterna = document.querySelector(`.${tela ? tela : 'telaInterna'}`)
    telaInterna.innerHTML = modeloTabela(colunas, nomeBase)

    if (nomeBase !== 'dados_composicoes' && nomeBase !== 'dados_clientes') {
        const adicionar = `<button onclick="editarBaseAuxiliar('${nomeBase}')">Adicionar</button>`
        const painelBotoes = document.querySelector('.botoes')
        painelBotoes.insertAdjacentHTML('beforeend', adicionar)
    }

    for (const [id, objeto] of Object.entries(dados)) criarLinha(objeto, id, nomeBase)
    removerOverlay()

}