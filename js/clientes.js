const fPesq = ({ objeto = {}, chave, texto, config = '' }) => {

    const elemento = `
        <div class="filtro-tabela" style="${vertical}; gap: 2px; padding: 0.5rem;">
            <span>${texto}</span>
            <select onchange="aplicarFiltros()" ${config}>
                <option value=""></option>
                ${Object.entries(objeto)
            .map(([id, dados]) => `<option id="${id}" value="${dados[chave]}">${dados[chave]}</option>`)
            .join('')}
            </select>
        </div>`

    return elemento
}

async function telaClientes() {

    telaAtiva = 'clientes'

    mostrarMenus(false)

    dados_clientes = await recuperarDados('dados_clientes')
    dados_distritos = await recuperarDados('dados_distritos')

    titulo.textContent = 'Clientes'

    const btnExtras = `
        <button data-controle="inserir" onclick="formularioCliente()">Adicionar</button>
        ${fPesq({ texto: 'Distrito', config: 'onchange="filtroCidadesCabecalho(this)" name="distrito"', objeto: dados_distritos, chave: 'nome' })}
        ${fPesq({ texto: 'Cidade', config: 'name="cidade"' })}
    `

    const params = {
        colunas: ['Nome', 'Morada Fiscal', 'Morada de Execução', 'Distrito', 'Cidade', 'E-mail', 'Telefone', ''],
        btnExtras
    }

    const acumulado = modeloTabela(params)

    telaInterna.innerHTML = acumulado

    for (const [idCliente, dados] of Object.entries(dados_clientes).reverse()) {

        const d = dados_distritos?.[dados?.distrito] || {}
        const c = d?.cidades?.[dados?.cidade] || {}

        criarLinhaClientes(idCliente, { ...dados, nomeDistrito: d.nome || '-', nomeCidade: c.nome || '-' })
    }

    // Regras de validação;
    validarRegrasAcesso()

}

function criarLinhaClientes(idCliente, dados) {

    tds = `
        <td>${dados?.nome || '-'}</td>
        <td>${dados?.moradaFiscal || '-'}</td>
        <td>${dados?.moradaExecucao || '-'}</td>
        <td name="distrito" data-cod="${dados?.distrito}">${dados?.nomeDistrito || '-'}
        <td name="cidade" data-cod="${dados?.cidade}">${dados?.nomeCidade || '-'}
        <td>${dados?.email || '-'}</td>
        <td>${dados?.telefone || '-'}</td>
        <td>
            <img data-controle="editar" onclick="formularioCliente('${idCliente}')" src="imagens/pesquisar.png">
        </td>
    `

    const trExistente = document.getElementById(idCliente)
    if (trExistente) return trExistente.innerHTML = tds
    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${idCliente}">${tds}</tr>`)

}

async function formularioCliente(idCliente) {

    const cliente = await recuperarDado('dados_clientes', idCliente)
    const botoes = [
        { texto: 'Salvar', img: 'concluido', funcao: idCliente ? `salvarCliente('${idCliente}')` : 'salvarCliente()' }
    ]

    if (idCliente) botoes.push({ texto: 'Excluir', img: 'cancel', funcao: `confirmarExclusaoCliente('${idCliente}')` })

    const linhas = [
        { texto: 'Nome', elemento: `<textarea name="nome">${cliente?.nome || ''}</textarea>` },
        { texto: 'Morada Fiscal', elemento: `<input oninput="regrasClientes()" name="moradaFiscal" value="${cliente?.moradaFiscal || ''}">` },
        { texto: 'Morada de Execução', elemento: `<input oninput="regrasClientes()" name="moradaExecucao" value="${cliente?.moradaExecucao || ''}">` },
        { texto: 'Número de Contribuinte', elemento: `<input oninput="regrasClientes()" name="numeroContribuinte" value="${cliente?.numeroContribuinte || ''}">` },
        { texto: 'Telefone', elemento: `<input oninput="regrasClientes()" name="telefone" value="${cliente?.telefone || ''}">` },
        { texto: 'E-mail', elemento: `<input oninput="regrasClientes()" name="email" value="${cliente?.email || ''}">` },
        { texto: 'Distrito', elemento: `<select name="distrito" onchange="carregarSelects({select: this, painel: true})"></select>` },
        { texto: 'Cidade', elemento: `<select name="cidade"></select>` }
    ]

    const form = new formulario({ linhas, botoes, titulo: 'Formulário de Cliente' })
    form.abrirFormulario()

    await carregarSelects({ painel: true, ...cliente })

    regrasClientes()
}

function confirmarExclusaoCliente(idCliente) {
    const acumulado = `
        <div style="${horizontal}; gap: 1rem; background-color: #d2d2d2; padding: 1rem;">
            <span>Tem certeza?</span>
            <button onclick="excluirCliente('${idCliente}')">Confirmar</button>
        </div>
    `
    popup(acumulado, 'Exclusão de Cliente', true)
}

async function excluirCliente(idCliente) {

    overlayAguarde()

    deletar(`dados_clientes/${idCliente}`)
    await deletarDB(`dados_clientes`, idCliente)

    removerPopup()
    removerPopup()
    await telaClientes()

}

function regrasClientes() {

    const campos = ['telefone', 'numeroContribuinte']
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
        const painel = document.querySelector('.painel-padrao')
        const el = painel.querySelector(`[name="${texto}"]`)
        return el.value
    }

    idCliente = idCliente || ID5digitos()
    let cliente = {
        nome: obVal('nome'),
        moradaFiscal: obVal('moradaFiscal'),
        moradaExecucao: obVal('moradaExecucao'),
        numeroContribuinte: obVal('numeroContribuinte'),
        telefone: obVal('telefone'),
        email: obVal('email'),
        distrito: obVal('distrito'),
        cidade: obVal('cidade')
    }

    enviar(`dados_clientes/${idCliente}`, cliente)
    await inserirDados({ [idCliente]: cliente }, 'dados_clientes')
    await telaClientes()
    removerPopup()
}