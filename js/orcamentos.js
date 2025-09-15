const voltarOrcamentos = `<button style="background-color: #3131ab;" onclick="telaOrcamentos()">Voltar</button>`
let ambientes = {
    'Quarto': [...povoarLista(0, 5, 'Quarto Piso'),
        ...povoarLista(1, 5, 'Quarto Piso')],
    'Wc': povoarLista(0, 5, 'Wc Social'),
    'Wc Suite': [...povoarLista(0, 5, 'Wc Suite - Quarto Piso'),
        ...povoarLista(1, 5, 'Wc Suite - Quarto Piso')],
    'Varanda': [],
    'Cozinha': [],
    'Dispensa': [],
    'Corredor': [],
    'Hall de Entrada': [],
    'Lavandaria': [],
    'Terraço': [],
    'Arrecadação': [],
    'Anexo': [],
    'Casa das Máquinas': [],
    'Escritório': [],
    'Sótão': [],
    'Escada': [],
    'Garagem': [],
    'Jardim': [],
    'Telhado': [],
    'Telheiro': [],
    'Piscina Interior': [],
    'Piscina Exterior': [],
    'Terreno': [],
    'Sala de Estar': [],
    'Sala de Refeições': []
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
            ${btn('todos', 'Verificar Orçamentos', '')}
        </div>
    `

    telaInterna.innerHTML = acumulado

}

async function formularioOrcamento(idOrcamento) {
    mostrarMenus()

    const orcamento = await recuperarDado('dados_orcamentos', idOrcamento)
    const cliente = {}

    const modelo = (texto, valor) => `
        <div style="${vertical}; padding: 10px;">
            <span>${texto}</span>
            <input oninput="regrasClientes()" placeholder="${texto}" name="${texto}" value="${valor || ''}">
        </div>
    `

    const zonas = (lista) => {
        const opcoes = lista
            .map(op => `<option>${op}</option>`)
            .join('')

        return `<select>${opcoes}</select>`

    }

    const campos = Object.entries(ambientes)
        .map(([ambiente, lista]) => modeloLivre(ambiente, zonas(lista)))
        .join('')

    titulo.textContent = 'Dados de Orçamento'
    const funcao = idOrcamento ? `salvarOrcamento('${idOrcamento}')` : 'salvarOrcamento()'
    const acumulado = `
    <div class="cabecalho-clientes">
        ${voltarOrcamentos}
        <button onclick="${funcao}">Salvar</button>
    </div>
    <div class="painel-clientes">
        ${modelo('Nome', cliente?.nome || '')}
        ${modelo('Número de contribuinte', cliente?.moradaFiscal || '')}
        ${modelo('Morada fiscal', cliente?.moradaExecucao || '')}
        ${modelo('Morada de Execução', cliente?.numeroContribuinte || '')}
        ${modelo('Telefone', cliente?.telefone || '')}
        ${modelo('E-mail', cliente?.email || '')}
        ${modeloLivre('Data de contato', `<input type="date">`)}
        ${modeloLivre('Data de visita', `<input type="date">`)}
    </div>

    <br>

    <div class="form-zonas">
        <span><b>Selecionar Zonas</b></span>
        <hr style="width: 100%">
        ${campos}
        <hr style="width: 100%">
        <button>Ir para a Fase 2 - Execuções</button>
    </div>
    `

    telaInterna.innerHTML = acumulado
}