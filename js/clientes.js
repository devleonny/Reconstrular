async function telaClientes() {

    overlayAguarde()

    telaAtiva = 'clientes'

    const { funcao } = acesso

    const tabela = await modTab({
        btnExtras: '<button onclick="formularioCliente()">Adicionar</button>',
        base: 'dados_clientes',
        pag: 'clientes',
        body: 'bodyClientes',
        criarLinha: 'criarLinhaClientes',
        colunas: {
            'Data da Criação': {},
            'Nome': { chave: 'nome' },
            'Morada Fiscal': { chave: 'morada_fiscal' },
            'Morada de Execução': { chave: 'morada_execucao' },
            'Zona': { chave: 'snapshots.cidade.zona', tipoPesquisa: 'select' },
            'Distrito': { chave: 'snapshots.cidade.distrito', tipoPesquisa: 'select' },
            'Cidade': { chave: 'snapshots.cidade.nome', tipoPesquisa: 'select' },
            'E-mail': { chave: 'email' },
            'Telefone': { chave: 'telefone' },
            'Detalhes': {}
        }

    })

    tela.innerHTML = tabela

    await paginacao()

    removerOverlay()
}

function criarLinhaClientes(dados) {

    const {
        timestamp,
        snapshots,
        id,
        email,
        telefone,
        nome,
        morada_fiscal,
        morada_execucao
    } = dados || {}

    const cidade = snapshots?.cidade || {}

    tds = `
        <td>${new Date(timestamp).toLocaleString()}</td>
        <td>${nome || ''}</td>
        <td>${morada_fiscal || ''}</td>
        <td>${morada_execucao || ''}</td>
        <td>${cidade?.zona || ''}
        <td>${cidade?.distrito || ''}
        <td>${cidade?.nome || ''}
        <td>${email || ''}</td>
        <td>${telefone || ''}</td>
        <td>
            <img onclick="formularioCliente('${id}')" src="imagens/pesquisar.png">
        </td>
    `
    return `<tr>${tds}</tr>`

}

async function formularioCliente(idCliente) {

    if (acesso.funcao !== 'Diretor Operacional')
        return popup({ mensagem: 'Apenas o <b>Diretor Operacional</b> pode incluir Clientes' })

    const {
        snapshots,
        nome,
        telefone,
        email,
        morada_execucao,
        morada_fiscal,
        numero_contribuinte
    } = await recuperarDado('dados_clientes', idCliente) || {}

    const botoes = [
        { texto: 'Salvar', img: 'concluido', funcao: idCliente ? `salvarCliente('${idCliente}')` : 'salvarCliente()' }
    ]

    if (idCliente)
        botoes.push({ texto: 'Excluir', img: 'cancel', funcao: `confirmarExclusaoCliente('${idCliente}')` })

    const spanCidade = snapshots?.cidade
        ? `${snapshots.cidade?.nome} \n ${snapshots.cidade?.distrito}`
        : 'Selecionar'

    controlesCxOpcoes.cidade = {
        base: 'cidades',
        retornar: ['nome', 'distrito'],
        colunas: {
            'Cidade': { chave: 'nome' },
            'Distrito': { chave: 'distrito' },
            'Zona': { chave: 'zona' },
            'Área': { chave: 'area' }
        }
    }

    const linhas = [
        { texto: 'Nome', elemento: `<textarea name="nome">${nome || ''}</textarea>` },
        { texto: 'Morada Fiscal', elemento: `<input oninput="regrasClientes()" name="morada_fiscal" value="${morada_fiscal || ''}">` },
        { texto: 'Morada de Execução', elemento: `<input oninput="regrasClientes()" name="morada_execucao" value="${morada_execucao || ''}">` },
        { texto: 'Número de Contribuinte', elemento: `<input oninput="regrasClientes()" name="numero_contribuinte" value="${numero_contribuinte || ''}">` },
        { texto: 'Telefone', elemento: `<input oninput="regrasClientes()" name="telefone" value="${telefone || ''}">` },
        { texto: 'E-mail', elemento: `<input oninput="regrasClientes()" name="email" value="${email || ''}">` },
        {
            texto: 'Cidade',
            elemento: `<span name="cidade" class="opcoes" onclick="cxOpcoes('cidade')">${spanCidade}</span>`
        },
    ]

    popup({ linhas, botoes, titulo: 'Formulário de Cliente' })

    regrasClientes()
}

function confirmarExclusaoCliente(idCliente) {

    const botoes = [
        { texto: 'Confirmar', img: 'concluido', funcao: `excluirCliente('${idCliente}')` }
    ]

    popup({ mensagem: 'Tem certeza?', botoes, titulo: 'Exclusão de Cliente', nra: false })
}

async function excluirCliente(idCliente) {

    await deletar(`dados_clientes/${idCliente}`)

}

function regrasClientes() {

    const campos = ['telefone', 'numero_contribuinte']
    const limite = 9
    let bloqueio = false
    const painel = document.querySelector('.painel-padrao')

    const cidade = painel.querySelector('[name="cidade"]').id

    if (!cidade)
        return true

    for (const campo of campos) {

        const el = painel.querySelector(`[name="${campo}"]`)
        el.value = el.value.replace(/\D/g, '');
        if (el.value.length > limite) {
            el.value = el.value.slice(0, limite);
        }

        if (el.value.length !== limite) {
            el.classList.add('invalido')
            bloqueio = true
        } else {
            el.classList.remove('invalido')
        }

    }

    return bloqueio

}

async function salvarCliente(idCliente = unicoID()) {

    if (regrasClientes())
        return popup({ mensagem: 'Não deixe campos sem preenchimento' })

    const painel = document.querySelector('.painel-padrao')

    const obVal = (texto) => {
        const el = painel.querySelector(`[name="${texto}"]`)
        return el.value
    }

    const cliente = await recuperarDado('dados_clientes', idCliente) || {}

    const novo = {
        ...cliente,
        nome: obVal('nome'),
        morada_fiscal: obVal('morada_fiscal'),
        morada_execucao: obVal('morada_execucao'),
        numero_contribuinte: obVal('numero_contribuinte'),
        telefone: obVal('telefone'),
        email: obVal('email'),
        cidade: painel.querySelector('[name="cidade"]').id
    }

    await enviar(`dados_clientes/${idCliente}`, novo)

    removerPopup()
}