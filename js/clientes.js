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

    overlayAguarde()

    if (acesso.funcao !== 'Diretor Operativo')
        return popup({ mensagem: 'Apenas o <b>Diretor Operativo</b> pode incluir Clientes' })

    const {
        snapshots,
        nome,
        telefone,
        cidade,
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

    const { nome: nomeCidade } = await recuperarDado('cidades', cidade) || {}

    controlesCxOpcoes.cidade = {
        base: 'cidades',
        retornar: ['nome'],
        funcaoAdicional: ['notificarPessoas'],
        colunas: {
            'Cidade': { chave: 'nome' },
            'Distrito': { chave: 'distrito' },
            'Zona': { chave: 'zona' },
            'Área': { chave: 'area' }
        }
    }

    const linhas = [
        {
            texto: 'Nome',
            elemento: `<textarea name="nome">${nome || ''}</textarea>`
        },
        {
            texto: 'Morada Fiscal',
            elemento: `<input oninput="regrasClientes()" name="morada_fiscal" value="${morada_fiscal || ''}">`
        },
        {
            texto: 'Morada de Execução',
            elemento: `<input oninput="regrasClientes()" name="morada_execucao" value="${morada_execucao || ''}">`
        },
        {
            texto: 'Número de Contribuinte',
            elemento: `<input oninput="regrasClientes()" name="numero_contribuinte" value="${numero_contribuinte || ''}">`
        },
        {
            texto: 'Telefone',
            elemento: `<input oninput="regrasClientes()" name="telefone" value="${telefone || ''}">`
        },
        {
            texto: 'E-mail',
            elemento: `<input oninput="regrasClientes()" name="email" value="${email || ''}">`
        },
        {
            texto: 'Cidade',
            elemento: `<span name="cidade" ${cidade ? `id="${cidade}"` : ''} class="opcoes" onclick="cxOpcoes('cidade')">${nomeCidade || 'Selecionar'}</span>`
        },
        {
            texto: 'Notificação',
            elemento: `
            <div id="notificacoes" style="display: flex; flex-wrap: wrap; gap: 3px;">
                <img src="gifs/loading.gif" style="width: 5rem;">
            </div>`
        }
    ]

    popup({ linhas, botoes, titulo: 'Formulário de Cliente' })

    regrasClientes()
}

async function notificarPessoas() {

    const cidade = document.querySelector('[name="cidade"]')?.id

    if (!cidade)
        return

    const { zona, nome } = await recuperarDado('cidades', cidade)

    const [coordenadores, encarregados] = await Promise.all([
        pesquisarDB({
            base: 'dados_setores',
            filtros: {
                zona: { op: 'includes', value: zona },
                funcao: { op: '=', value: 'Coordenador Operativo' }
            }
        }),
        pesquisarDB({
            base: 'dados_setores',
            filtros: {
                cidade: { op: '=', value: cidade },
                funcao: { op: '=', value: 'Encarregado de Obra' }
            }
        })
    ])

    const usuariosNotificados = [...coordenadores.resultados, ...encarregados.resultados]
    const local = document.getElementById('notificacoes')
    local.innerHTML = ''

    for (const { usuario } of usuariosNotificados)
        local.insertAdjacentHTML('beforeend', `<span class="ativo">${usuario}</span>`)

    if (!usuariosNotificados.length)
        local.insertAdjacentHTML('beforeend', `<span class="notificacao-clientes">Nenhum representante localizado</span>`)

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

    const usuariosNotificados = [...document.querySelectorAll('#notificacoes span')]
        .map(span => {

            const { usuario } = acesso || {}
            const destinatario = span.textContent
            const id = crypto.randomUUID()

            const m = {
                id,
                lido: 'N',
                destinatario,
                assunto: 'Cadastro de Cliente Realizado',
                remetente: usuario,
                data: new Date().toLocaleString(),
                mensagem: `<i>Cadastro de cliente <b>realizado</b>:</i> <br> <b>Nome</b>: ${novo.nome}`
            }

            enviar(`mensagens/${id}`, m)

        })

    await enviar(`dados_clientes/${idCliente}`, novo)

    // Notificações
    await Promise.all(usuariosNotificados)

    removerPopup()
}