async function telaClientes() {

    const nomeBase = 'dados_clientes'
    titulo.textContent = 'Clientes'

    const btnExtras = `<button onclick="formularioCliente()">Adicionar</button>`

    const params = {
        colunas: ['Nome', 'Morada Fiscal', 'Morada de Execução', 'E-mail', 'Telefone', ''],
        btnExtras
    }

    const acumulado = modeloTabela(params)

    telaInterna.innerHTML = acumulado

    const clientes = await recuperarDados(nomeBase)
    for (const [idCliente, dados] of Object.entries(clientes).reverse()) criarLinhaClientes(idCliente, dados)

}

function criarLinhaClientes(idCliente, dados) {

    tds = `
        <td>${dados?.nome || '--'}</td>
        <td>${dados?.moradaFiscal || '--'}</td>
        <td>${dados?.moradaExecucao || '--'}</td>
        <td>${dados?.email || '--'}</td>
        <td>${dados?.telefone || '--'}</td>
        <td>
            <img onclick="formularioCliente('${idCliente}')" src="imagens/pesquisar.png">
        </td>
    `

    const trExistente = document.getElementById(idCliente)
    if (trExistente) return trExistente.innerHTML = tds
    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${idCliente}">${tds}</tr>`)

}

async function formularioCliente(idCliente) {

    const cliente = await recuperarDado('dados_clientes', idCliente)

    const modelo = (texto, valor) => {
        return {
            texto,
            elemento: `<input oninput="regrasClientes()" placeholder="${texto}" name="${texto}" value="${valor || ''}">`
        }
    }

    const botoes = [
        { texto: 'Salvar', img: 'concluido', funcao: idCliente ? `salvarCliente('${idCliente}')` : 'salvarCliente()' }
    ]

    if (idCliente) botoes.push({ texto: 'Excluir', img: 'cancel', funcao: `` })

    const linhas = [
        modelo('Nome', cliente?.nome || ''),
        modelo('Morada Fiscal', cliente?.moradaFiscal || ''),
        modelo('Morada de Execução', cliente?.moradaExecucao || ''),
        modelo('Número de Contribuinte', cliente?.numeroContribuinte || ''),
        modelo('Telefone', cliente?.telefone || ''),
        modelo('E-mail', cliente?.email || '')
    ]

    const form = new formulario({ linhas, botoes, titulo: 'Formulário de Cliente' })
    form.abrirFormulario()

    regrasClientes()
}

function regrasClientes() {

    const campos = ['Telefone', 'Número de Contribuinte']
    const limite = 9
    let bloqueio = false
    for (const campo of campos) {

        const el = document.querySelector(`[name="${campo}"]`)
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

async function salvarCliente(idCliente) {

    if (regrasClientes()) return popup(mensagem('Verifique os campos destacados'), 'Alerta', true)

    const obVal = (texto) => {
        const el = document.querySelector(`[name="${texto}"]`)
        return el.value
    }

    idCliente = idCliente || ID5digitos()
    let cliente = {
        nome: obVal('Nome'),
        moradaFiscal: obVal('Morada Fiscal'),
        moradaExecucao: obVal('Morada de Execução'),
        numeroContribuinte: obVal('Número de Contribuinte'),
        telefone: obVal('Telefone'),
        email: obVal('E-mail')
    }

    await enviar(`dados_clientes/${idCliente}`, cliente)
    await inserirDados({ [idCliente]: cliente }, 'dados_clientes')
    await telaClientes()
    mostrarMenus()
    popup(mensagem('Salvo com sucesso', 'imagens/concluido.png'), 'Salvo')
}