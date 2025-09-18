const voltarOrcamentos = `<button style="background-color: #3131ab;" onclick="telaOrcamentos()">Voltar</button>`
let campos = {}
let idOrcamento = null
let zona1 = null
let indiceZona = 0
let clientes = {}

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

async function atualizarOrcamentos() {

    await sincronizarDados('dados_orcamentos')
    await sincronizarDados('dados_clientes')
    await orcamentos()

}

function povoarLista(ini, lim, texto) {
    let lista = []

    for (let i = 1; i <= lim; i++) {
        lista.push(`${texto} ${ini} - ${i}`)
    }

    return lista
}

async function telaOrcamentos() {

    clientes = await recuperarDados('dados_clientes')

    mostrarMenus(false)

    titulo.textContent = 'Orçamentos'

    const acumulado = `
        <div class="painel-despesas">
            <br>
            ${btn('orcamentos', 'Dados de Orçamento', 'formularioOrcamento()')}
            ${btn('todos', 'Orçamentos', 'orcamentos()')}
        </div>
    `

    telaInterna.innerHTML = acumulado

}

async function orcamentos() {

    zona1 = null
    indiceZona = 0

    mostrarMenus(false)

    const colunas = ['Cliente', 'Data de Contato', 'Data de Visita', 'Zonas', 'Editar', 'Orcamento']
    let ths = ''
    let pesquisa = ''

    for (const col of colunas) {

        ths += `<th>${col}</th>`

        pesquisa += `<th style="background-color: white; text-align: left;" contentEditable="true"></th>`

    }

    const acumulado = `
        <div class="blocoTabela">
            <div class="painelBotoes">
                <div class="botoes">
                    <div class="pesquisa">
                        <input oninput="pesquisar(this, 'body')" placeholder="Pesquisar" style="width: 100%;">
                        <img src="imagens/pesquisar2.png">
                    </div>
                    ${voltarOrcamentos}
                </div>
                <img class="atualizar" src="imagens/atualizar.png" onclick="atualizarOrcamentos()">
            </div>
            <div class="recorteTabela">
                <table class="tabela">
                    <thead>
                        <tr>${ths}</tr>
                        <tr>${pesquisa}</tr>
                    </thead>
                    <tbody id="body"></tbody>
                </table>
            </div>
            <div class="rodapeTabela"></div>
        </div>
    `

    telaInterna.innerHTML = acumulado

    const orcamentos = await recuperarDados('dados_orcamentos')

    for (const [idOrcamento, orcamento] of Object.entries(orcamentos)) {

        criarLinhaOrcamento(idOrcamento, orcamento)

    }

}

function criarLinhaOrcamento(idOrcamento, orcamento) {

    const cliente = clientes?.[orcamento.idCliente] || {}

    const dt = (data) => {
        if (!data) return '--/--/----'
        const [ano, mes, dia] = data.split('-')
        return `${dia}/${mes}/${ano}`
    }

    const tds = `
        <td>${cliente?.nome || '...'}</td>
        <td>${dt(orcamento.dataContato)}</td>
        <td>${dt(orcamento.dataVisita)}</td>
        <td>
            <img src="imagens/planta.png" style="width: 2rem;" onclick="execucoes('${idOrcamento}')">
        </td>
        <td>
            <img src="imagens/pesquisar.png" style="width: 2rem;" onclick="formularioOrcamento('${idOrcamento}')">
        </td>
        <td>
            <img src="imagens/orcamentos.png" style="width: 2rem;" onclick="orcamentoFinal('${idOrcamento}')">
        </td>
    `

    const trExistente = document.getElementById(idOrcamento)

    if (trExistente) return trExistente.innerHTML = tds

    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${idOrcamento}">${tds}</tr>`)
}

async function formularioOrcamento(idOrcamento) {
    mostrarMenus()

    const orcamento = await recuperarDado('dados_orcamentos', idOrcamento)
    const clientes = await recuperarDados('dados_clientes')

    const opcoesClientes = Object.entries({ '': { nome: '' }, ...clientes })
        .map(([idCliente, dados]) => `<option id="${idCliente}" ${orcamento?.idCliente == idCliente ? 'selected' : ''}>${dados.nome}</option>`)
        .join('')

    const zonas = (lista, ambiente) => {
        const opcoes = lista
            .map(zona => `<option ${orcamento?.zonas?.[zona] ? 'selected' : ''}>${zona}</option>`)
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
    const funcao = idOrcamento ? `salvarOrcamento('${idOrcamento}')` : 'salvarOrcamento()'

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
        ${modeloLivre('Data de contato', `<input value="${orcamento?.dataContato || ''}" name="dataContato" type="date">`)}
        ${modeloLivre('Data de visita', `<input value="${orcamento?.dataVisita || ''}" name="dataVisita" type="date">`)}
    </div>

    <br>

    <div class="form-zonas">
        <span><b>Selecionar Zonas</b></span>
        <hr style="width: 100%">
        ${campos}
        <hr style="width: 100%">
        <button onclick="${funcao}">Ir para a Fase 2 - Execuções</button>
    </div>
    `

    telaInterna.innerHTML = acumulado

    preencherCliente()
}

async function preencherCliente() {

    const select = document.querySelector('[name="idCliente"]')
    const idCliente = select.selectedOptions[0]?.id
    const cliente = await recuperarDado('dados_clientes', idCliente)

    const campos = ['moradaExecucao', 'moradaFiscal', 'email', 'telefone', 'numeroContribuinte']

    for (const campo of campos) {
        const el = document.querySelector(`[name="${campo}"]`)
        if (el) el.value = cliente?.[campo] || ''
    }

}

async function salvarOrcamento(idOrcamento) {

    overlayAguarde()

    idOrcamento = idOrcamento || ID5digitos()

    const select = document.querySelector('[name="idCliente"]')
    const idCliente = select.selectedOptions[0]?.id

    if (!idCliente) return popup(mensagem('Campo Cliente obrigatório'), 'Alerta')

    let orcamento = await recuperarDado('dados_orcamentos', idOrcamento)
    let zonas = orcamento?.zonas || {}

    let orcamentoAtualizado = {
        idCliente,
        dataVisita: document.querySelector('[name="dataVisita"]').value,
        dataContato: document.querySelector('[name="dataContato"]').value,
        zonas: { ...zonas }
    }

    for (const ambiente of Object.keys(ambientes)) {
        const el = document.querySelector(`[name="${ambiente}"]`)
        if (el && el.value !== '') {
            if (!orcamentoAtualizado.zonas[el.value]) orcamentoAtualizado.zonas[el.value] = {}
        }
    }

    await inserirDados({ [idOrcamento]: orcamentoAtualizado }, 'dados_orcamentos')

    enviar(`dados_orcamentos/${idOrcamento}`, orcamentoAtualizado)

    await execucoes(idOrcamento)

    removerOverlay()

}

function confirmarExcluirZona() {

    const acumulado = `
        <div style="${horizontal}; gap: 10px; padding: 1rem; background-color: #d2d2d2;">
            <span>Tem certeza que deseja excluir esta Zona?</span>
            <button onclick="excluirZona()">Confirmar</button>
        </div>
    `
    popup(acumulado, 'Tem certeza?', true)
}

async function excluirZona() {

    overlayAguarde()

    let orcamento = await recuperarDado('dados_orcamentos', idOrcamento)

    delete orcamento.zonas[zona1]

    deletar(`dados_orcamentos/${idOrcamento}/zonas/${zona1}`)

    await inserirDados({ [idOrcamento]: orcamento }, 'dados_orcamentos')

    removerPopup()

    await execucoes(idOrcamento)

}

async function execucoes(id, proximo = 0) {
    idOrcamento = id;

    campos = await recuperarDados('campos_orcamento');
    let orcamento = await recuperarDado('dados_orcamentos', idOrcamento);
    let zonas = orcamento?.zonas || {};

    const chavesZonas = Object.keys(zonas);

    if (chavesZonas.length === 0) {
        await orcamentos();
        popup(mensagem('Orçamento sem nenhuma zona disponível'), 'Alerta');
        return;
    }

    // Se for string, tenta localizar a chave
    if (typeof proximo === "string") {
        const idx = chavesZonas.indexOf(proximo);
        indiceZona = idx >= 0 ? idx : 0;
    } else {
        // numérico: avança/retrocede
        indiceZona = (indiceZona ?? 0) + proximo;

        if (indiceZona < 0) indiceZona = 0;
        if (indiceZona >= chavesZonas.length) indiceZona = chavesZonas.length - 1;
    }

    zona1 = chavesZonas[indiceZona];

    // cabeçalhos
    const colunas = [
        'Especialidade',
        'Descrição do Serviço',
        'Descrição Extra <br>(facultativo)',
        'Unidade de <br> Medida',
        'Unidades',
        'Metro Linear<br>(cm)',
        'Comprimento<br>(cm)',
        'Largura<br>(cm)',
        'Altura<br>(cm)'
    ].map(col => `<th>${col}</th>`).join('');

    const btn = (cor, texto, funcao, branco) =>
        `<button style="color:${branco ? 'white' : '#222'};background-color:${cor};" onclick="${funcao}">${texto}</button>`;

    const acumulado = `
        <div style="${vertical}; gap: 1rem;">
            <div class="blocoTabela">
                <div class="painelBotoes">
                    <div style="${horizontal}; justify-content: space-between; width: 90%;">
                        <span style="font-size: 2rem; padding: 0.5rem;">${zona1}</span>
                        ${btn('#ad0000ff', 'Excluir Zona', `confirmarExcluirZona()`, true)}
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
                <div class="rodapeTabela">
                    ${btn('green', 'Adicionar Linha', 'adicionarLinha()', true)}
                </div>
            </div>
            <div style="${horizontal}; gap: 1rem;">
                ${btn('#00FFFF', 'Voltar a Zona', `execucoes('${idOrcamento}', -1)`)}
                ${btn('#FFFF00', 'Próxima Zona', `execucoes('${idOrcamento}', 1)`)}
                ${btn('#FF9900', 'Ver Orçamento', `orcamentoFinal('${idOrcamento}')`)}
            </div>
        </div>
    `;

    telaInterna.innerHTML = acumulado;

    for (const [especialidade, dados] of Object.entries(zonas?.[zona1] || {})) {
        adicionarLinha(especialidade, dados);
    }

    filtroValores();
}

function adicionarLinha(especialidade, dados = {}) {
    const body = document.getElementById('body')

    const especialidades = ['', ...Object.keys(campos)]
        .map(op => `<option ${especialidade == op ? 'selected' : ''}>${op}</option>`)
        .join('')

    const idTemp = ID5digitos()

    let tds = ''
    for (let i = 0; i <= 4; i++) {
        tds += ``
    }

    const tr = `
        <tr>
            <td>
                <select style="width: 100%;" name="espec_${idTemp}" onchange="buscarCampos('${idTemp}')">${especialidades}</select>
            </td>
            <td>
                <select style="width: 100%;" name="desc_${idTemp}" onchange="buscarMedidas('${idTemp}')"></select>
            </td>

            <td oninput="salvarExecucao()" contentEditable="true" style="text-align: left;">${dados?.descricaoExtra || ''}</td>
            <td name="medida_${idTemp}" oninput="salvarExecucao()">${dados?.medida || ''}</td>
            <td oninput="salvarExecucao()">${dados?.unidades || ''}</td>
            <td oninput="salvarExecucao()">${dados?.metroLinear || ''}</td>
            <td oninput="salvarExecucao()">${dados?.comprimento || ''}</td>
            <td oninput="salvarExecucao()">${dados?.largura || ''}</td>
            <td oninput="salvarExecucao()">${dados?.altura || ''}</td>

        </tr>
    `

    body.insertAdjacentHTML('beforeend', tr)

    if (especialidade) buscarCampos(idTemp, dados.descricao)
}

async function salvarExecucao() {
    let orcamento = await recuperarDado('dados_orcamentos', idOrcamento);
    if (!orcamento || !zona1) return;
    if (!orcamento.zonas) orcamento.zonas = {};

    orcamento.zonas[zona1] = {};

    const body = document.getElementById('body');
    if (!body) return;

    const trs = body.querySelectorAll('tr');

    for (const tr of trs) {
        const tds = tr.querySelectorAll('td');
        const selEsp = tds[0]?.querySelector('select');
        const especialidade = selEsp ? selEsp.value.trim() : '';
        if (!especialidade) continue;

        const selDesc = tds[1]?.querySelector('select');
        const descricao = selDesc ? selDesc.value : '';

        orcamento.zonas[zona1][especialidade] = {
            descricao,
            descricaoExtra: tds[2]?.textContent || '',
            medida: tds[3]?.textContent || '',
            unidades: Number(tds[4]?.textContent || 0),
            metroLinear: Number(tds[5]?.textContent || 0),
            comprimento: Number(tds[6]?.textContent || 0),
            largura: Number(tds[7]?.textContent || 0),
            altura: Number(tds[8]?.textContent || 0)
        };
    }

    await inserirDados({ [idOrcamento]: orcamento }, 'dados_orcamentos');

    enviar(`dados_orcamentos/${idOrcamento}/zonas/${zona1}`, orcamento.zonas[zona1])
}


function buscarCampos(idTemp, descSalva) {

    const especialidade = document.querySelector(`[name="espec_${idTemp}"]`)
    const descricao = document.querySelector(`[name="desc_${idTemp}"]`)

    const opcoes = ['', ...Object.keys(campos[especialidade.value])]
        .map(op => `<option ${descSalva == op ? 'selected' : ''}>${op}</option>`)
        .join('')

    descricao.innerHTML = opcoes

    filtroValores()

}

function buscarMedidas(idTemp) {
    const medida = document.querySelector(`[name="medida_${idTemp}"]`)
    const especialidade = document.querySelector(`[name="espec_${idTemp}"]`)
    const desc = document.querySelector(`[name="desc_${idTemp}"]`)

    medida.textContent = campos[especialidade.value][desc.value]

    filtroValores()
}

function filtroValores() {

    const body = document.getElementById('body')
    const trs = body.querySelectorAll('tr')

    const esquema = {
        '': [],
        'm2': [6, 8],
        'm3': [6, 7, 8],
        'ml': [5],
        'und': [4]
    }

    for (const tr of trs) {

        const tds = tr.querySelectorAll('td')
        const medida = tds[3].textContent

        for (let i = 4; i <= 8; i++) {

            if (esquema[medida].includes(i)) {
                tds[i].style.backgroundColor = '#00FFFF'
                tds[i].contentEditable = true
            } else {
                tds[i].textContent = ''
                tds[i].contentEditable = false
                tds[i].style.backgroundColor = ''
            }
        }

    }

    salvarExecucao()

}

async function orcamentoFinal(idOrcamento) {

    let orcamento = await recuperarDado('dados_orcamentos', idOrcamento)
    let idCliente = orcamento?.idCliente || ''
    let cliente = await recuperarDado('dados_clientes', idCliente)

    const dt = (data) => {
        if (!data) return '--/--/----'
        const [ano, mes, dia] = data.split('-')
        return `${dia}/${mes}/${ano}`
    }

    const dados = {
        'ORÇAMENTO': 'TOTAL (s/iva)',
        'Nome': cliente?.nome || '',
        'Morada Fiscal': cliente?.moradaFiscal || '',
        'Morada de Execução': cliente?.moradaExecucao || '',
        'Nif': cliente?.nif || '',
        'E-mail': cliente?.email || '',
        'Contacto': cliente?.telefone || '',
        'Data contacto': dt(orcamento?.dataContato),
        'Data de visita': dt(orcamento?.dataVisita),
        'Dias Úteis Estimados': ''
    }

    let linhas = ''
    let i = 0
    for (const [titulo, dado] of Object.entries(dados)) {

        if (i == 0) {
            linhas += `
            <tr>
                <td colspan="2" style="background-color: #5b707f;">
                    <div class="titulo-orcamento">
                        <img class="btnAcmp" src="imagens/lapis.png" onclick="formularioOrcamento('${idOrcamento}')">
                        <span>${titulo}</span>
                    </div>
                </td>
                <td class="total-orcamento">${dado}</td>
            </tr>
            `

        } else {

            linhas += `
            <tr>
                <td style="background-color: #5b707f; color: white;">${titulo}</td>
                <td style="background-color: #DCE6F5;">${dado}</td>
                ${i == 1
                    ? `
                    <td rowspan="9" style="background-color: white;">
                        <div class="total-valor">0,00 €</div>
                    </td>
                    `
                    : ''}
            </tr>`
        }

        i++
    }

    const colunas = ['Zona', 'Especialidade', 'Descrição do Serviço', 'Descrição Extra <br>(facultativo)', 'Unidade de Medida', 'Qtd', 'Preço Final']
        .map(col => `<th>${col}</th>`)
        .join('')

    const quantidadeFinal = ({ metroLinear, altura, largura, comprimento, unidades, medida }) => {

        let final = 0
        if (medida == 'm2') {
            final = comprimento * altura
        } else if (medida == 'm3') {
            final = comprimento * altura * largura
        } else if (medida == 'ml') {
            final = metroLinear / 1000
        } else if (medida == 'und') {
            final = unidades
        }

        return final
    }

    let itens = ''
    for (const [zona, especialidades] of Object.entries(orcamento?.zonas || {})) {
        for (const [especialidade, dados] of Object.entries(especialidades)) {
            itens += `
                <tr>
                    <td>
                        <div style="${horizontal}; justify-content: start; gap: 0.5rem;">
                            <img onclick="execucoes('${idOrcamento}', '${zona}')" src="imagens/lapis.png" style="width: 1.5rem;">
                            <span>${zona}</span>
                        </div>
                    </td>
                    <td>${especialidade}</td>
                    <td>${dados?.descricao || ''}</td>
                    <td>${dados?.descricaoExtra || ''}</td>
                    <td>${dados?.medida || ''}</td>
                    <td>${quantidadeFinal(dados)}</td>
                    <td></td>
                </tr>
            `
        }
    }

    const acumulado = `
        <div style="width: 100%; padding: 1rem;">
            <div style="width: 100%; ${horizontal}; justify-content: start; padding: 0.5rem;">
                <button onclick="orcamentos()">Voltar para Orçamentos</button>
            </div>
            <table class="tabela-orcamento">
                <tbody>
                    ${linhas}
                </tbody>
            </table>

            <br>

            <table class="tabela-orcamento-2">
                <thead>${colunas}</thead>
                <tbody>${itens}</tbody>
            </table>

        </div>
    `

    telaInterna.innerHTML = acumulado

}