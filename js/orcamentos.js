const voltarOrcamentos = `<button style="background-color: #3131ab;" onclick="telaOrcamentos()">Voltar</button>`
let ambientes = {
    'Quarto': [
        '',
        ...povoarLista(0, 5, 'Quarto Piso'),
        ...povoarLista(1, 5, 'Quarto Piso')
    ],
    'Wc': [
        '',
        ...povoarLista(0, 5, 'Wc Social')
    ],
    'Wc Suite': [
        '',
        ...povoarLista(0, 5, 'Wc Suite - Quarto Piso'),
        ...povoarLista(1, 5, 'Wc Suite - Quarto Piso')
    ],
    'Varanda': [
        '',
        'Varanda - Sala de Estar',
        'Varanda - Sala de Refeições',
        'Varanda - Cozinha',
        ...povoarLista(1, 5, 'Varanda - Piso')
    ],
    'Cozinha': ['', 'Cozinha'],
    'Dispensa': ['', 'Dispensa'],
    'Corredor': [
        '',
        'Corredor Quartos - Piso 0',
        'Corredor Quartos - Piso 1',
    ],
    'Hall de Entrada': [
        '',
        'Hall de Entrada - Piso 0',
        'Hall de Entrada - Piso 1',
    ],
    'Lavandaria': ['', 'Lavandaria'],
    'Terraço': ['', 'Terraço'],
    'Arrecadação': ['', 'Arrecadação'],
    'Anexo': ['', 'Anexo'],
    'Casa das Máquinas': ['', 'Anexo'],
    'Escritório': ['', 'Escritório'],
    'Sótão': ['', 'Sótão'],
    'Escada': ['', 'Escada'],
    'Garagem': ['', 'Garagem'],
    'Jardim': ['', 'Jardim'],
    'Telhado': ['', 'Telhado'],
    'Telheiro': ['', 'Telheiro'],
    'Piscina Interior': ['', 'Piscina Interior'],
    'Piscina Exterior': ['', 'Piscina Exterior'],
    'Terreno': ['', 'Terreno'],
    'Sala de Estar': ['', 'Sala de Estar'],
    'Sala de Refeições': ['', 'Sala de Refeições'],
}

function povoarLista(ini, lim, texto) {
    let lista = []

    for (let i = 1; i <= lim; i++) {
        lista.push(`${texto} ${ini} - ${i}`)
    }

    return lista
}

async function telaOrcamentos() {

    mostrarMenus()

    const acumulado = `
        <div class="painel-despesas">
            <br>
            ${btn('orcamentos', 'Dados de Orçamento', 'formularioOrcamento()')}
            ${btn('todos', 'Fase 1 - Dados de Orçamento', '')}
            ${btn('todos', 'Fase 2 - Execuções', '')}
            ${btn('todos', 'Fase 3 - Orçamento Final', '')}
        </div>
    `

    telaInterna.innerHTML = acumulado

}

async function formularioOrcamento(idOrcamento) {
    mostrarMenus()

    const orcamento = await recuperarDado('dados_orcamentos', idOrcamento)
    const clientes = await recuperarDados('dados_clientes')

    const opcoesClientes = Object.entries({ '': { nome: '' }, ...clientes })
        .map(([idCliente, dados]) => `<option id="${idCliente}">${dados.nome}</option>`)
        .join('')

    const zonas = (lista, ambiente) => {
        const opcoes = lista
            .map(op => `<option>${op}</option>`)
            .join('')

        return `<select name="${ambiente}">${opcoes}</select>`

    }

    const campos = Object.entries(ambientes)
        .map(([ambiente, lista]) => modeloLivre(ambiente, zonas(lista, ambiente)))
        .join('')

    const modelo = (texto, valor) => `
        <div style="${vertical}; padding: 10px;">
            <span>${texto}</span>
            <input oninput="regrasClientes()" placeholder="${texto}" name="${texto}" value="${valor || ''}">
        </div>
    `

    titulo.textContent = 'Dados de Orçamento'

    const acumulado = `
    <div class="cabecalho-clientes">
        ${voltarOrcamentos}
    </div>
    <div class="painel-clientes">
        ${modeloLivre('Nome', `<select name="idCliente" onchange="preencherCliente()">${opcoesClientes}</select>`)}
        ${modeloLivre('Número de contribuinte', `<input name="numeroContribuinte" readOnly>`)}
        ${modeloLivre('Morada fiscal', `<input name="moradaFiscal" readOnly>`)}
        ${modeloLivre('Morada de Execução', `<input name="moradaExecucao" readOnly>`)}
        ${modeloLivre('Telefone', `<input name="telefone" readOnly>`)}
        ${modeloLivre('E-mail', `<input name="email" readOnly>`)}
        ${modeloLivre('Data de contato', `<input name="dataContato" type="date">`)}
        ${modeloLivre('Data de visita', `<input name="dataVisita" type="date">`)}
    </div>

    <br>

    <div class="form-zonas">
        <span><b>Selecionar Zonas</b></span>
        <hr style="width: 100%">
        ${campos}
        <hr style="width: 100%">
        <button onclick="salvarOrcamento({idOrcamento: ${idOrcamento || false}})">Ir para a Fase 2 - Execuções</button>
    </div>
    `

    telaInterna.innerHTML = acumulado
}

async function preencherCliente() {

    const select = document.querySelector('[name="idCliente"]')
    const idCliente = select.selectedOptions[0]?.id
    const cliente = await recuperarDado('dados_clientes', idCliente)

    const campos = ['moradaExecucao', 'moradaFiscal', 'email', 'telefone', 'numeroContribuinte']

    for(const campo of campos) {
       const el = document.querySelector(`[name="${campo}"]`)
       if(el) el.value = cliente?.[campo] || ''
    }

}

async function salvarOrcamento({ idOrcamento }) {

    overlayAguarde()

    idOrcamento = idOrcamento || ID5digitos()

    const select = document.querySelector('[name="idCliente"]')
    const idCliente = select.selectedOptions[0]?.id 

    if(!idCliente) return popup(mensagem('Campo Cliente obrigatório'), 'Alerta')

    let orcamento = {
        idCliente,
        dataVisita: document.querySelector('[name="dataVisita"]').value,
        dataContato: document.querySelector('[name="dataContato"]').value,
        zonas: {}
    }

    for(const ambiente of Object.keys(ambientes)) {
        const el = document.querySelector(`[name="${ambiente}"]`)
        if(el && el.value !== '') orcamento.zonas[ambiente] = el.value
    }

    await inserirDados({[idOrcamento]: orcamento}, 'dados_orcamentos')

    await execucoes(idOrcamento)

    removerOverlay()

}

execucoes('Z9aym')

async function execucoes(idOrcamento) {

    let orcamento = await recuperarDado('dados_orcamentos', idOrcamento)

    let zonas = orcamento?.zonas || {} //Primeira zona, e seguir para as demais;
    let zona1 = Object.keys(zonas)[0]

    const colunas = ['Especialidade', 'Descrição', 'Item1', 'Item2']
        .map(col => `<th>${col}</th>`)
        .join('')

    const btn = (cor, texto, funcao) => `<button style="background-color: ${cor}; color: #222;" onclick="${funcao}">${texto}</button>`

    const acumulado = `
        <div style="${vertical}; gap: 1rem;">
            
            <div class="blocoTabela">
                <div class="painelBotoes">
                    <div style="${horizontal}; justify-content: space-between; width: 90%;">
                        <span style="font-size: 2rem; padding: 0.5rem;">${zona1}</span>
                        ${btn('#FF0000', 'Excluir Zona', '')}
                    </div>
                </div>
                <div class="recorteTabela">
                    <table class="tabela">
                        <thead>
                            <tr>${colunas}</tr>
                        </thead>
                        <tbody id="body"></tbody>
                    </table>
                </div>
                <div class="rodapeTabela"></div>
            </div>

            <div style="${horizontal}; gap: 1rem;">

                ${btn('#00FFFF', 'Voltar a Zona', '')}

                ${btn('#FFFF00', 'Próxima Zona', '')}

                ${btn('#FF9900', 'Ver Orçamento', '')}

                ${btn('#00FF00', 'Orçamento Final', '')}

            </div>

        </div>
    `

    telaInterna.innerHTML = acumulado
    
}