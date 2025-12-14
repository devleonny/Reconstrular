async function telaUsuarios() {

    mostrarMenus(false)

    dados_setores = await recuperarDados('dados_setores')
    dados_distritos = await recuperarDados('dados_distritos')
    funcoes = await recuperarDados('funcoes')

    const idF = acesso?.funcao || ''
    const f = funcoes[idF] || {}
    const r = f?.regras || []
    const btnEdicao = r.length == 0 ? '' : `<button onclick="editarParceiros()">Cadastro</button>`

    const btnExtras = `
        <img src="imagens/atualizar.png" style="width: 3rem;">
        ${btnEdicao}
        ${fPesq({ texto: 'Função', objeto: funcoes, chave: 'nome', config: 'name="funcao"' })}
        ${fPesq({ texto: 'Zona', config: 'name="zona"' })}
        ${fPesq({ texto: 'Distrito', config: 'onclick="filtroCidadesCabecalho(this)" name="distrito"', objeto: dados_distritos, chave: 'nome' })}
        ${fPesq({ texto: 'Cidade', config: 'name="cidade"' })}
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

}

async function criarLinhaUsuarios(usuario, dados) {

    const distrito = dados_distritos[dados?.distrito] || {}
    const cidade = distrito?.cidades?.[dados?.cidade] || {}
    const f = await recuperarDado('funcoes', dados?.funcao)

    const idF = acesso.funcao || ''
    const r = funcoes?.[idF]?.regras || [] // Regras do usuário;
    const edicao = (r.includes(dados?.funcao) || idF == 'tL4LM') ? `<img onclick="editarParceiros('${usuario}')" src="imagens/pesquisar.png">` : ''

    const tds = `
        <td>${dados?.nome_completo || ''}</td>
        <td>${dados?.telefone || ''}</td>
        <td>${dados?.email || ''}</td>
        <td name="funcao">${f?.nome || ''}</td>
        <td name="zona">${dados?.zona || ''}</td>
        <td name="distrito">${distrito?.nome || ''}</td>
        <td name="cidade">${cidade?.nome || ''}</td>
        <td>
            ${edicao}
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

    const idF = acesso?.funcao || ''
    const r = funcoes?.[idF]?.regras || []

    const opcoes = Object.entries(funcoes)
        .map(([id, dados]) => {
            if (!r.includes(id)) return ''
            return `<option id="${id}" ${parceiro?.funcao == id ? 'selected' : ''}>${dados.nome}</option>`
        })
        .join('')

    const linhas = [
        { texto: 'E-mail', elemento: `<input name="email" type="email" placeholder="E-mail" value="${parceiro?.email || ''}">` },
        { texto: 'Telefone', elemento: `<input name="telefone" placeholder="Telefone" value="${parceiro?.telefone || ''}">` },
        {
            texto: 'Função',
            elemento: `
                <select name="funcao">
                    <option></option>
                    ${opcoes}
                </select>
            `},
        {
            texto: 'Distrito',
            elemento: `
                <select name="distrito" onchange="cidadesDisponiveis(this)">
                    <option></option>
                    ${Object.entries(dados_distritos).map(([id, dados]) => `<option id="${id}" ${parceiro?.distrito == id ? 'selected' : ''}>${dados.nome}</option>`).join('')}
                </select>
            `},
        { texto: 'Cidade', elemento: `<select name="cidade"></select>` }
    ]

    const botoes = [
        { texto: 'Salvar', img: 'concluido', funcao: `salvarParceiros('${usuario}')` }
    ]

    if (usuario) botoes.push({ texto: 'Desativar', img: 'cancel', funcao: `confirmarDesativarUsuario('${usuario}')` })

    const titulo = usuario ? `Gerenciar Parceiro` : `Criar acesso parceiro`
    const form = new formulario({ linhas, botoes, titulo })
    form.abrirFormulario()

    if (parceiro?.distrito) cidadesDisponiveis({ selectedOptions: [{ id: parceiro.distrito }] }, parceiro?.cidade)

}

function confirmarDesativarUsuario(usuario) {
    const acumulado = `
    <div style="${horizontal}; padding: 1rem; gap: 1rem; background-color: #d2d2d2;">
        <span>Deseja desativar o usuário?</span>
        <button onclick="desativarUsuario('${usuario}')">Confirmar</button>
    </div>
    `
    popup(acumulado, 'Pense bem...', true)
}

async function desativarUsuario(usuario) {

    removerPopup()
    removerPopup()
    overlayAguarde()

    const resposta = await configuracoes(usuario, 'excluído', { usuario: acesso.usuario, data: new Date().toLocaleString() })

    if (resposta.mensagem) return popup(mensagem(resposta.mensagem), 'Alerta', true)

    await deletarDB('dados_setores', usuario)
    await telaUsuarios()
    removerOverlay()

}

async function salvarParceiros(usuario) {

    overlayAguarde()

    const painelPadrao = document.querySelector('.painel-padrao')

    const el = (id) => {
        const elemento = painelPadrao.querySelector(`[name="${id}"]`)
        return elemento || null
    }

    const email = el('email').value
    const telefone = el('telefone').value
    const funcao = el('funcao')?.selectedOptions[0]?.id
    const distrito = el('distrito')?.selectedOptions[0]?.id
    const cidade = el('cidade')?.selectedOptions[0]?.id

    const dNovos = {
        email,
        telefone,
        funcao,
        distrito,
        cidade
    }

    const dAtuais = dados_setores[usuario]
    const parceiro = {
        ...dAtuais,
        ...dNovos
    }

    for (const [chave, dado] of Object.entries(dNovos)) {
        if (dAtuais[chave] !== dado) {
            const resposta = await configuracoes(usuario, chave, dado)
            if (resposta.mensagem) return popup(mensagem(resposta.mensagem), 'Alerta', true)
        }
    }

    await inserirDados({ [usuario]: parceiro }, 'dados_setores')
    await telaUsuarios()

    removerPopup()

}

async function cidadesDisponiveis(select, idCidade) {

    const cidades = Object.entries(dados_distritos)
        .filter(([id, dist]) => id == select.selectedOptions[0].id)
        .map(([id, dist]) => dist.cidades)[0]

    const opcoesCidades = `<option></option>
    ${Object.entries(cidades || {})
            .map(([id, dados]) => `<option ${idCidade == id ? 'selected' : ''} id="${id}">${dados.nome}</option>`)
            .join('')}
        `
    const painel = document.querySelector('.painel-padrao')
    const selectCidades = painel.querySelectorAll('[name="cidade"]')
    selectCidades.forEach(select => { select.innerHTML = opcoesCidades })

}

async function filtroCidadesCabecalho(select) {

    const distritos = await recuperarDados('dados_distritos')

    const cidades = Object.entries(distritos)
        .filter(([id, dist]) => id == select.selectedOptions[0].id)
        .map(([id, dist]) => dist.cidades)[0]

    const opcoesCidades = `<option></option>
    ${Object.entries(cidades || {})
            .map(([id, dados]) => `<option id="${id}">${dados.nome}</option>`)
            .join('')}
        `

    const selectCidades = document.querySelectorAll('select[name="cidade"]')
    selectCidades.forEach(select => { select.innerHTML = opcoesCidades })

}