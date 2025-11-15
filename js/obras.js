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
        { texto: 'Vincular Orçamento', elemento: `<img src="imagens/link.png">` },
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