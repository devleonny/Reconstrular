async function telaUsuarios() {

    mostrarMenus()

    const filtros = ({ objeto = {}, chave, texto }) => {

        const elemento = `
            <div style="${vertical}; gap: 2px; padding: 0.5rem;">
                <span>${texto}</span>
                <select>
                    ${Object.entries(objeto).map(([id, dados]) => `<option>${dados[chave]}</option>`).join('')}
                </select>
            </div>
        `

        return elemento
    }

    const distritos = await recuperarDados('dados_distritos')

    //cidades sempre vai ser filtrado pelo distrito... verificar uma funcao secundária;
    const cidades = Object.values(distritos).reduce((acc, distrito) => {
        return { ...acc, ...distrito.cidades }
    }, {})

    const departamentos = {
        1: { nome: 'Teste 1' },
        2: { nome: 'Teste 2' }
    }

    const btnExtras = `
        <img src="imagens/atualizar.png" style="width: 3rem;">
        ${filtros({ objeto: departamentos, chave: 'nome', texto: 'Departamentos' })}
        ${filtros({ texto: 'Função' })}
        ${filtros({ texto: 'Zona' })}
        ${filtros({ texto: 'Distrito', objeto: distritos, chave: 'nome' })}
        ${filtros({ texto: 'Cidade' })}
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

    const tds = `
        <td>${dados?.nome_completo || ''}</td>
        <td>${dados?.telefone || ''}</td>
        <td>${dados?.email || ''}</td>
        <td>${dados?.funcao || ''}</td>
        <td>${dados?.zona || ''}</td>
        <td>${dados?.distrito || ''}</td>
        <td>${dados?.cidade || ''}</td>
        <td>
            <img src="imagens/pesquisar.png" style="width: 2rem;">
        </td>
    `

    const trExistente = document.getElementById(usuario)
    if (trExistente) return trExistente.innerHTML = tds

    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${usuario}">${tds}</tr>`)

}