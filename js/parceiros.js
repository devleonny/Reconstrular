async function telaUsuarios() {

    dados_distritos = await recuperarDados('dados_distritos')
    const funcoes = await recuperarDados('funcoes')

    const btnExtras = `
        <img src="imagens/atualizar.png" style="width: 3rem;">
        ${fPesq({ texto: 'Função', objeto: funcoes, chave: 'nome' })}
        ${fPesq({ texto: 'Zona' })}
        ${fPesq({ texto: 'Distrito', config: 'onclick="filtroCidadesCabecalho(this)" name="distrito"', objeto: dados_distritos, chave: 'nome' })}
        ${fPesq({ texto: 'Cidade', config: 'name="cidade"' })}
    `

    const acumulado = `
        ${modeloTabela({ btnExtras, removerPesquisa: true, colunas: ['Nome Completo', 'Telefone', 'Email', 'Função', 'Zona', 'Distrito', 'Cidade', ''] })}
    `
    titulo.textContent = 'Parceiros'
    telaInterna.innerHTML = acumulado

    const dados_setores = await recuperarDados('dados_setores')
    for (const [usuario, dados] of Object.entries(dados_setores).reverse()) {

        const d = await recuperarDado('parceiros', usuario) || {}

        const mesclado = {
            ...dados,
            ...Object.fromEntries(Object.entries(d).filter(([_, v]) => v !== '' && v != null))
        }

        criarLinhaUsuarios(usuario, mesclado)
    }

}


async function criarLinhaUsuarios(usuario, dados) {

    const distrito = await recuperarDado('dados_distritos', dados?.distrito)
    const cidade = distrito?.cidades?.[dados?.cidade] || {}
    const f = await recuperarDado('funcoes', dados?.funcao)

    const tds = `
        <td>${dados?.nome_completo || ''}</td>
        <td>${dados?.telefone || ''}</td>
        <td>${dados?.email || ''}</td>
        <td>${f?.nome || ''}</td>
        <td>${dados?.zona || ''}</td>
        <td>${distrito?.nome || ''}</td>
        <td>${cidade?.nome || ''}</td>
        <td>
            <img onclick="editarParceiros('${usuario}')" src="imagens/pesquisar.png" style="width: 2rem;">
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

    const distritos = await recuperarDados('dados_distritos')
    const funcoes = await recuperarDados('funcoes')
    const p = await recuperarDado('parceiros', usuario) || {}
    const parceiro = {
        ...await recuperarDado('dados_setores', usuario),
        ...Object.fromEntries(Object.entries(p).filter(([_, v]) => v !== '' && v != null))
    }

    const linhas = [
        { texto: 'E-mail', elemento: `<input name="email" type="email" placeholder="E-mail" value="${parceiro?.email || ''}">` },
        { texto: 'Telefone', elemento: `<input name="telefone" placeholder="Telefone" value="${parceiro?.telefone || ''}">` },
        {
            texto: 'Função', elemento: `
                    <select name="funcao">
                        <option></option>
                        ${Object.entries(funcoes).map(([id, dados]) => `<option id="${id}" ${parceiro?.funcao == id ? 'selected' : ''}>${dados.nome}</option>`).join('')}
                    </select>
            `},
        {texto: 'Distrito', elemento: `
                <select name="distrito" onchange="cidadesDisponiveis(this)">
                    <option></option>
                    ${Object.entries(distritos).map(([id, dados]) => `<option id="${id}" ${parceiro?.distrito == id ? 'selected' : ''}>${dados.nome}</option>`).join('')}
                </select>
            `},
        { texto: 'Cidade', elemento: `<select name="cidade"></select>` }
    ]

    const botoes = [
        { texto: 'Salvar', img: 'concluido', funcao: `salvarParceiros('${usuario}')` }
    ]

    const form = new formulario({ linhas, botoes, titulo: 'Gerenciar Parceiro' })
    form.abrirFormulario()

    if (parceiro?.distrito) cidadesDisponiveis({ selectedOptions: [{ id: parceiro.distrito }] }, parceiro?.cidade)

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

    const p = await recuperarDado('parceiros', usuario)

    const parceiro = {
        ...p,
        email,
        telefone,
        funcao,
        distrito,
        cidade
    }

    await inserirDados({ [usuario]: parceiro }, 'parceiros')
    await telaUsuarios()

    removerPopup()

}

async function cidadesDisponiveis(select, idCidade) {

    const distritos = await recuperarDados('dados_distritos')

    const cidades = Object.entries(distritos)
        .filter(([id, dist]) => id == select.selectedOptions[0].id)
        .map(([id, dist]) => dist.cidades)[0]

    const opcoesCidades = `<option></option>
    ${Object.entries(cidades || {})
            .map(([id, dados]) => `<option ${idCidade == id ? 'selected' : ''} id="${id}">${dados.nome}</option>`)
            .join('')}
        `
    
    const selectCidades = document.querySelectorAll('[name="cidade"]')
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