const el = (name) => {
    return (
        document.querySelector(`.painel-padrao [name="${name}"]`) ||
        document.querySelector(`.filtro-tabela [name="${name}"]`) ||
        document.querySelector(`[name="${name}"]`) ||
        null
    )
}

async function telaUsuarios() {

    telaAtiva = 'parceiros'

    mostrarMenus(false)

    const colunas = {
        'Nome Completo': { chave: 'nome_completo' },
        'Telefone': { chave: 'telefone' },
        'Email': { chave: 'email' },
        'Função': { chave: 'snapshots.funcao' },
        'Zona': { chave: 'zona' },
        'Distrito': { chave: 'distrito' },
        'Cidade': { chave: 'snapshots.cidade' },
        'Edição': {}
    }

    const tabela = modTab({
        colunas,
        pag: 'parceiros',
        base: 'dados_setores',
        criarLinha: 'criarLinhaUsuarios',
        body: 'bodyParceiros'
    })

    titulo.textContent = 'Parceiros'
    telaInterna.innerHTML = tabela

    await paginacao()

}

async function criarLinhaUsuarios(dados) {

    const { usuario, nome_completo, telefone, email, cidade, funcao } = dados || {}
    const nCidade = await recuperarDado('cidades', cidade) || {}
    const { nome } = await recuperarDado('funcoes', funcao) || {}

    const tds = `
        <td>${nome_completo || ''}</td>
        <td>${telefone || ''}</td>
        <td>${email || ''}</td>
        <td name="funcao">${nome || ''}</td>
        <td name="zona" data-cod="${nCidade?.zona}">${nCidade?.zona || ''}</td>
        <td name="distrito">${nCidade?.distrito || ''}</td>
        <td name="cidade" data-cod="${cidade}">${nCidade.nome || ''}</td>
        <td>
            <img data-controle="editar" onclick="editarParceiros('${usuario}')" src="imagens/pesquisar.png">
        </td>`

    return `<tr>${tds}</tr>`

}

function aplicarFiltros() {
    const filtros = document.querySelectorAll('.filtro-tabela select')
    const linhas = document.querySelectorAll('#body tr')
    const valores = {}

    filtros.forEach(f => {
        const valor = f.selectedOptions[0]?.textContent?.trim()
        const nome = f.getAttribute('name')
        if (valor && nome) valores[nome] = valor.toLowerCase()
    })

    linhas.forEach(tr => {
        let visivel = true

        for (const nome in valores) {
            const alvo = tr.querySelector(`[name="${nome}"]`)
            const texto = alvo?.textContent?.trim().toLowerCase() || ''

            if (!texto.includes(valores[nome])) {
                visivel = false
                break
            }
        }

        tr.style.display = visivel ? '' : 'none'
    })
}

async function editarParceiros(usuario) {

    const { cidade, nome_completo, funcao, email, telefone } = await recuperarDado('dados_setores', usuario) || {}

    controlesCxOpcoes.cidade = {
        base: 'cidades',
        colunas: {
            'Distrito': { chave: 'distrito' },
            'Cidade': { chave: 'nome' },
            'Zona': { chave: 'zona' },
            'Area': { chave: 'area' },
        },
        retornar: ['nome', 'distrito']
    }

    controlesCxOpcoes.funcao = {
        base: 'funcoes',
        colunas: {
            'Nome': { chave: 'nome' }
        },
        retornar: ['nome']
    }

    const dCidades = await recuperarDado('cidades', cidade)
    const dFuncao = await recuperarDado('funcoes', funcao)

    const linhas = [
        { texto: 'Usuário', elemento: `<input ${usuario ? 'readOnly="true"' : ''} name="usuario" placeholder="Usuário" value="${usuario || ''}">` },
        { texto: 'Nome', elemento: `<input name="nome_completo" placeholder="Nome Completo" value="${nome_completo || ''}">` },
        { texto: 'E-mail', elemento: `<input name="email" type="email" placeholder="E-mail" value="${email || ''}">` },
        { texto: 'Telefone', elemento: `<input name="telefone" placeholder="Telefone" value="${telefone || ''}">` },
        {
            texto: 'Cidade',
            elemento: `<span 
            class="opcoes" ${dCidades ? `id="${cidade}"` : ''} 
            name="cidade" 
            onclick="cxOpcoes('cidade')">
                ${dCidades ? dCidades.nome : 'Selecionar'}
            </span>`
        },
        {
            texto: 'Função',
            elemento: `<span 
            class="opcoes" ${dFuncao ? `id="${funcao}"` : ''} 
            name="funcao" 
            onclick="cxOpcoes('funcao')">
                ${dFuncao ? dFuncao.nome : 'Selecionar'}
            </span>`
        },
    ]

    const botoes = [
        { texto: 'Salvar', img: 'concluido', funcao: `salvarParceiro('${usuario}')` }
    ]

    if (usuario)
        botoes.push({ texto: 'Excluir', img: 'cancel', funcao: `confirmarDesativarUsuario('${usuario}')` })

    const titulo = usuario
        ? `Gerenciar Parceiro`
        : `Criar acesso parceiro`

    popup({ linhas, botoes, titulo })

}

function confirmarDesativarUsuario(usuario) {

    const botoes = [
        { texto: 'Confirmar', img: 'concluido', funcao: `desativarUsuario('${usuario}')` }
    ]
    popup({ botoes, mensagem: 'Tem certeza?', nra: false })
}

async function desativarUsuario(usuario) {

    overlayAguarde()

    const resposta = await deletar(`dados_setores/${usuario}`)

    if (resposta.mensagem)
        return popup({ mensagem: `Falha ao excluir: ${resposta.mensagem}` })

    await deletarDB('dados_setores', usuario)
    removerOverlay()

}

async function salvarParceiro(usuario) {

    overlayAguarde()

    const nome_completo = el('nome_completo').value
    const email = el('email').value
    const telefone = el('telefone').value
    const cidade = el('cidade')?.id
    const funcao = el('funcao')?.id

    if (!usuario || !cidade || !nome_completo || !email)
        return popup({ mensagem: 'Não deixe Usuário/Nome ou E-mail em branco' })

    const parceiro = await recuperarDado('dados_setores', usuario) || {}

    const novo = {
        ...parceiro,
        nome_completo,
        funcao,
        email,
        telefone,
        cidade
    }

    enviar(`dados_setores/${usuario}`, novo)
    await inserirDados({ [usuario]: novo }, 'dados_setores')

    removerPopup()

}

function resolverCidadesPorDistrito(distrito) {
    return Object.entries(cidades)
        .filter(([, c]) => c.distrito == distrito)
        .sort(([, a], [, b]) => a.nome.localeCompare(b.nome))
}

function aplicarCidadesNoSelect(lista, selectCidade, cidadeSelecionada) {
    selectCidade.innerHTML =
        `<option></option>` +
        lista.map(([id, c]) =>
            `<option value="${id}" ${id == cidadeSelecionada ? 'selected' : ''}>${c.nome}</option>`
        ).join('')
}

function filtroCidadesCabecalho(select) {

    if (select.name !== 'distrito') return

    const painelBotoes = document.querySelector('.painelBotoes')
    const painel = document.querySelector('.painel-padrao')

    const selectCidade =
        painel?.querySelector('[name="cidade"]') ||
        painelBotoes?.querySelector('.filtro-tabela [name="cidade"]')


    if (!selectCidade) return

    if (!select.value) {
        selectCidade.innerHTML = '<option></option>'
        selectCidade.value = ''
        aplicarFiltros()
        return
    }

    const lista = resolverCidadesPorDistrito(select.value)
    aplicarCidadesNoSelect(lista, selectCidade)
    aplicarFiltros()
}
