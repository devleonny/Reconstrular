async function telaClientes() {

    try {
        overlayAguarde()

        telaAtiva = 'clientes'

        const tabela = await modTab({
            btnExtras: '<button onclick="formularioCliente()">Adicionar Cliente</button>',
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

        tela.innerHTML = montarPagina({ tabela, titulo: 'Clientes', imagem: 'pessoas' })

        await paginacao()

        removerOverlay()

    } catch (err) {
        console.log(err)
        popup({ mensagem: 'Falha ao abrir a tela de Clientes: Fale com o suporte.' })
    }

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

async function formularioCliente(idCliente = crypto.randomUUID()) {

    try {

        overlayAguarde()

        const {
            nome,
            telefone,
            cidade,
            email,
            morada_execucao,
            morada_fiscal,
            numero_contribuinte
        } = await recuperarDado('dados_clientes', idCliente) || {}

        const botoes = [
            { texto: 'Salvar', img: 'concluido', funcao: `salvarCliente('${idCliente}')` }
        ]

        if (idCliente)
            botoes.push({ texto: 'Excluir', img: 'cancel', funcao: `confirmarExclusaoCliente('${idCliente}')` })

        const { nome: nomeCidade } = await recuperarDado('cidades', cidade) || {}

        controlesCxOpcoes.cidade = {
            base: 'cidades',
            retornar: ['nome'],
            funcaoAdicional: ['verificarRegras'],
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
                elemento: `<textarea oninput="verificarRegras()" placeholder="Nome do Cliente" name="nome">${nome || ''}</textarea>`
            },
            {
                texto: 'Morada Fiscal',
                elemento: `<textarea placeholder="Morada Fiscal" name="morada_fiscal">${morada_fiscal || ''}</textarea>`
            },
            {
                texto: 'Morada de Execução',
                elemento: `<textarea placeholder="Morada de Execução" name="morada_execucao">${morada_execucao || ''}</textarea>`
            },
            {
                texto: 'Número de Contribuinte',
                elemento: `<input oninput="verificarRegras()" placeholder="Limite 9 Dígitos" name="numero_contribuinte" value="${numero_contribuinte || ''}">`
            },
            {
                texto: 'Telefone',
                elemento: `<input oninput="verificarRegras()" placeholder="Limite 9 Dígitos" name="telefone" value="${telefone || ''}">`
            },
            {
                texto: 'E-mail',
                elemento: `<input oninput="verificarRegras()" placeholder="E-mail" name="email" value="${email || ''}">`
            },
            {
                texto: 'Cidade',
                elemento: `<span name="cidade" ${cidade ? `id="${cidade}"` : ''} class="opcoes" onclick="cxOpcoes('cidade')">${nomeCidade || 'Selecionar'}</span>`
            }
        ]

        popup({ linhas, botoes, titulo: 'Formulário de Cliente' })

        verificarRegras()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao abrir o cadastro do cliente: Fale com o suporte.' })
    }
}

function confirmarExclusaoCliente(idCliente) {

    const botoes = [
        { texto: 'Confirmar', img: 'concluido', funcao: `excluirCliente('${idCliente}')`, fechar: true }
    ]

    popup({ mensagem: 'Tem certeza?', botoes, titulo: 'Exclusão de Cliente', removerAnteriores: true })
}

async function excluirCliente(idCliente) {

    await deletar(`dados_clientes/${idCliente}`)

}

async function salvarCliente(idCliente) {

    try {

        overlayAguarde()

        const { campos } = verificarRegras()

        if (campos.length)
            return popup({
                imagem: 'gifs/interrogacao.gif',
                mensagem: `
                    <div style="${vertical}; gap: 4px;">
                        <span>Verifique os campos inválidos:</span>
                        ${campos.map(c => `<span>• ${inicialMaiuscula(c)}</span>`).join('')}
                    </div>
            `
            })

        const cliente = {
            nome: obVal('nome'),
            morada_fiscal: obVal('morada_fiscal'),
            morada_execucao: obVal('morada_execucao'),
            numero_contribuinte: obVal('numero_contribuinte'),
            telefone: obVal('telefone'),
            email: obVal('email'),
            cidade: obVal('cidade')
        }

        await enviar(`dados_clientes/${idCliente}`, cliente)

        const { usuario } = acesso || {}
        const mensagem = {
            funcao: ['Coordenador Operativo'],
            assunto: 'Cadastro de Cliente Realizado',
            remetente: usuario,
            data: new Date().toLocaleString(),
            mensagem: `<i>Cadastro/Atualização de cliente <b>realizado</b>:</i> <br> <b>Nome</b>: ${cliente.nome}`
        }

        await Promise.all([
            enviar(`dados_clientes/${idCliente}`, cliente),
            enviar(`mensagens/${idCliente}`, mensagem)
        ])

        removerTodosPopups()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao salvar o cliente: Fale com o suporte.' })
    }
}