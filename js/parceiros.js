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

    dados_setores = await recuperarDados('dados_setores')
    cidades = await recuperarDados('cidades')
    funcoes = await recuperarDados('funcoes')

    const idF = acesso?.funcao || ''
    const f = funcoes[idF] || {}
    const r = f?.regras || []
    const btnEdicao = r.length == 0 ? '' : `<button data-controle="inserir" onclick="editarParceiros()">Cadastro</button>`

    const distritos = Object
        .values(cidades)
        .map(c => c.distrito)

    const zonas = Object
        .values(cidades)
        .map(c => c.zona)

    const btnExtras = `
        ${btnEdicao}
        ${fPesq({ texto: 'Função', name: 'funcao', objeto: funcoes, chave: 'nome' })}
        ${fPesq({ texto: 'Zona', name: 'zona', lista: [...new Set(zonas)] })}
        ${fPesq({ texto: 'Distrito', name: 'distrito', config: 'filtroCidadesCabecalho(this)', lista: [...new Set(distritos)] })}
        ${fPesq({ texto: 'Cidade', name: 'cidade', objeto: cidades, chave: 'nome' })}
    `

    const acumulado = modeloTabela(
        {
            btnExtras,
            removerPesquisa: true,
            colunas: ['Nome Completo', 'Telefone', 'Email', 'Função', 'Zona', 'Distrito', 'Cidade', 'Edição']
        }
    )

    titulo.textContent = 'Parceiros'
    telaInterna.innerHTML = acumulado

    for (const [usuario, dados] of Object.entries(dados_setores).reverse()) {
        criarLinhaUsuarios(usuario, dados)
    }

    // Regras de validação;
    validarRegrasAcesso()

}

async function criarLinhaUsuarios(usuario, dados) {

    const { cidade } = dados
    const nCidade = cidades?.[cidade] || {}
    const f = await recuperarDado('funcoes', dados?.funcao)

    const tds = `
        <td>${dados?.nome_completo || ''}</td>
        <td>${dados?.telefone || ''}</td>
        <td>${dados?.email || ''}</td>
        <td name="funcao">${f?.nome || ''}</td>
        <td name="zona" data-cod="${nCidade?.zona}">${nCidade?.zona || ''}</td>
        <td name="distrito">${nCidade?.distrito || ''}</td>
        <td name="cidade" data-cod="${cidade}">${nCidade.nome}</td>
        <td>
            <img data-controle="editar" onclick="editarParceiros('${usuario}')" src="imagens/pesquisar.png">
        </td>
    `

    const trExistente = document.getElementById(usuario)
    if (trExistente) return trExistente.innerHTML = tds

    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${usuario}">${tds}</tr>`)

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

    funcoes = await recuperarDados('funcoes')
    const parceiro = dados_setores[usuario] || {}
    const cidade = cidades?.[parceiro?.cidade]

    const idF = acesso?.funcao || ''
    const r = funcoes?.[idF]?.regras || []

    const modS = (ops) => {

        const mod = `
        <Select>
            ${ops.map(o => `<option>${o}</option>`).join('')}
        </select>
        `

        return mod
    }

    const esquema = {
        3: [1],
        4: [1, 2, 3],
        5: [1, 2, 3, 4]
    }

    const opcoes = Object.entries(funcoes)
        .sort(([, a], [, b]) => a.ordem - b.ordem)
        .map(([id, dados]) => {
            if (!r.includes(id) && id !== 'tL4LM')
                return ''
            const { ordem } = dados

            return `
            <div style="${horizontal}; gap: 1rem;">
                <input name="funcao" type="radio" id="${id}" ${parceiro?.funcao == id ? 'selected' : ''}>
                <span style="width: 200px; text-align: left;">${dados.nome}</span>
                ${ordem > 2 ? modS([1, 2, 3]) : ''}
                ${ordem > 2 ? modS([1, 2, 3]) : ''}
                ${ordem > 2 ? modS([1, 2, 3]) : ''}
                ${ordem > 2 ? modS([1, 2, 3]) : ''}
            </div>`
        })
        .join('')

    const distritos = Object
        .values(cidades)
        .map(c => c.distrito)

    const opcoesDistrito = [...new Set(distritos)]
        .sort((a, b) => a.localeCompare(b))
        .map(d => `<option ${cidade?.distrito == d ? 'selected' : ''}>${d}</option>`)
        .join('')

    const linhas = [
        { texto: 'Usuário', elemento: `<input ${usuario ? 'readOnly="true"' : ''} name="usuario" placeholder="Usuário" value="${usuario || ''}">` },
        { texto: 'Nome', elemento: `<input name="nome_completo" placeholder="Nome Completo" value="${parceiro?.nome_completo || ''}">` },
        { texto: 'E-mail', elemento: `<input name="email" type="email" placeholder="E-mail" value="${parceiro?.email || ''}">` },
        { texto: 'Telefone', elemento: `<input name="telefone" placeholder="Telefone" value="${parceiro?.telefone || ''}">` },
        {
            texto: 'Distrito',
            elemento: `
                <select name="distrito" onchange="filtroCidadesCabecalho(this)">
                    <option></option>
                    ${opcoesDistrito}
                </select>
            `},
        { texto: 'Cidade', elemento: `<select name="cidade"></select>` },
        {
            elemento: `
                <div style="${vertical};gap: 2px;">
                    ${opcoes}
                </div>
            `
        }
    ]

    const botoes = [
        { texto: 'Salvar', img: 'concluido', funcao: `salvarParceiros()` }
    ]

    if (usuario) botoes.push({ texto: 'Excluir', img: 'cancel', funcao: `confirmarDesativarUsuario('${usuario}')` })

    const titulo = usuario ? `Gerenciar Parceiro` : `Criar acesso parceiro`
    popup({ linhas, botoes, titulo })

    if (cidade) {
        const lista = resolverCidadesPorDistrito(cidade.distrito)
        const selectCidade = el('cidade')
        aplicarCidadesNoSelect(lista, selectCidade, parceiro.cidade)
    }

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
    await telaUsuarios()
    removerOverlay()

}

async function salvarParceiros() {

    overlayAguarde()

    const usuario = el('usuario').value
    const nome_completo = el('nome_completo').value
    const email = el('email').value
    const telefone = el('telefone').value
    const funcao = el('funcao')?.selectedOptions[0]?.id
    const cidade = el('cidade')?.selectedOptions[0]?.value

    if (!usuario || !nome_completo || !email)
        return popup({ mensagem: 'Não deixe Usuário/Nome ou E-mail em branco' })

    const parceiro = {
        ...dados_setores[usuario],
        nome_completo,
        email,
        telefone,
        funcao,
        cidade
    }

    enviar(`dados_setores/${usuario}`, parceiro)
    await inserirDados({ [usuario]: parceiro }, 'dados_setores')
    await telaUsuarios()

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
