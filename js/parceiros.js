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
    titulo.textContent = 'Parceiros'

    const colunas = {
        'Nome Completo': { chave: 'nome_completo' },
        'Telefone': { chave: 'telefone' },
        'Email': { chave: 'email' },
        'Função': { chave: 'snapshots.funcao', tipoPesquisa: 'select' },
        'Zona': { chave: 'snapshots.cidade.zona', tipoPesquisa: 'select' },
        'Distrito': { chave: 'snapshots.cidade.distrito', tipoPesquisa: 'select' },
        'Cidade': { chave: 'snapshots.cidade.nome', tipoPesquisa: 'select' },
        'Edição': {}
    }

    const tabela = await modTab({
        colunas,
        pag: 'parceiros',
        base: 'dados_setores',
        criarLinha: 'criarLinhaUsuarios',
        body: 'bodyParceiros'
    })

    tela.innerHTML = tabela

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
        <td>${nome || ''}</td>
        <td>${nCidade?.zona || ''}</td>
        <td>${nCidade?.distrito || ''}</td>
        <td>${nCidade.nome || ''}</td>
        <td>
            <img onclick="editarParceiros('${usuario}')" src="imagens/pesquisar.png">
        </td>`

    return `<tr>${tds}</tr>`

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
            onclick="cxOpcoes('cidade')">${dCidades ? dCidades.nome : 'Selecionar'}</span>`
        },
        {
            texto: 'Função',
            elemento: `<span 
            class="opcoes" ${dFuncao ? `id="${funcao}"` : ''} 
            name="funcao" 
            onclick="cxOpcoes('funcao')">${dFuncao ? dFuncao.nome : 'Selecionar'}</span>`
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

    if (usuario == acesso.usuario)
        popup({ mensagem: 'Ao alterar seu usuário o seu acesso será encerrado. (Fazer login novamente)' })

}

function confirmarDesativarUsuario(usuario) {

    const botoes = [
        { texto: 'Confirmar', img: 'concluido', funcao: `desativarUsuario('${usuario}')` }
    ]
    popup({ botoes, mensagem: 'Tem certeza?', nra: false })
}

async function desativarUsuario(usuario) {

    overlayAguarde()

    await deletar(`dados_setores/${usuario}`)

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

    await Promise.all([
        configuracoes(usuario, 'nome_completo', nome_completo),
        configuracoes(usuario, 'email', email),
        configuracoes(usuario, 'telefone', telefone),
        configuracoes(usuario, 'cidade', cidade),
        configuracoes(usuario, 'funcao', funcao)
    ])

    removerPopup()

    if (usuario == acesso.usuario) {
        popup({ mensagem: 'Cliente reiniciando em 5 segundos' })
        setTimeout(() => {
            location.reload()
        }, 5000);

    }
}