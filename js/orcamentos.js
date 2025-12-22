const voltarOrcamentos = `<button onclick="telaOrcamentos()">Voltar</button>`
let campos = {}
let idOrcamento = null
let zona1 = null
let indiceZona = 0
let dados_clientes = {}
let dados_orcamentos = {}
let finalizado = 'N'

const ambientes = {
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

    dados_clientes = await recuperarDados('dados_clientes')

    mostrarMenus(false)

    titulo.textContent = 'Orçamentos'

    const acumulado = `
        <div class="painel-despesas">
            <br>
            ${btn('orcamentos', 'Dados de Orçamento', 'formularioOrcamento()')}
            ${btn('todos', 'Orçamentos em Aberto', `finalizado = 'N'; orcamentos()`)}
            ${btn('todos', 'Orçamentos Finalizados', `finalizado = 'S'; orcamentos()`)}
        </div>
    `

    telaInterna.innerHTML = acumulado

}

async function orcamentos() {

    telaAtiva = 'orçamentos'

    zona1 = null
    indiceZona = 0

    mostrarMenus(false)

    const colunas = [
        'Cliente',
        'Distrito',
        'Cidade',
        'Data de Contato',
        'Data de Visita',
        'E-mail enviado',
        'Data/Hora do Envio (E-mail)',
        'Listagem do Material',
        'Listagem de Ferramentas',
        'Zonas',
        'Editar',
        'Orcamento',
        'Versão Atual',
        'Excluir'
    ]
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

    titulo.textContent = finalizado == 'S' ? 'Orçamentos Finalizados' : 'Orçamentos em Aberto'

    dados_orcamentos = await recuperarDados('dados_orcamentos')

    for (const [idOrcamento, orcamento] of Object.entries(dados_orcamentos)) {

        if (finalizado !== orcamento?.finalizado) continue
        criarLinhaOrcamento(idOrcamento, orcamento)

    }

    // Regras de validação;
    validarRegrasAcesso()

}

function criarLinhaOrcamento(idOrcamento, orcamento) {

    const cliente = dados_clientes?.[orcamento.idCliente] || {}
    const d = dados_distritos?.[cliente?.distrito] || {}
    const c = d?.cidades?.[cliente?.cidade] || {}

    const dt = (data) => {
        if (!data) return '-'
        const [ano, mes, dia] = data.split('-')
        return `${dia}/${mes}/${ano}`
    }

    const versao = orcamento?.versao
    const tds = `
        <td>${cliente?.nome || '...'}</td>
        <td name="distrito" data-cod="${cliente?.distrito}">${d?.nome || '-'}
        <td name="cidade" data-cod="${cliente?.cidade}">${c?.nome || '-'}
        <td>${dt(orcamento.dataContato)}</td>
        <td>${dt(orcamento.dataVisita)}</td>
        <td>
            ${orcamento.emailEnviado ? `<img src="imagens/carta.png">` : ''}
        </td>
        <td>
            ${orcamento?.emailEnviado?.data || ''}
        </td>
        <td>
            <img src="imagens/pdf.png" onclick="listagem('${idOrcamento}', 'materiais')">
        </td>
        <td>
            <img src="imagens/pdf.png" onclick="listagem('${idOrcamento}', 'ferramentas')">
        </td>
        <td>
            <img data-controle="editar" src="imagens/planta.png" onclick="execucoes('${idOrcamento}', 'ferramentas')">
        </td>
        <td>
            <img data-controle="editar" src="imagens/pesquisar.png" onclick="formularioOrcamento('${idOrcamento}')">
        </td>
        <td>
            <img src="imagens/orcamentos.png" onclick="orcamentoFinal('${idOrcamento}')">
        </td>
        <td>
            ${versao ? `<span onclick="comparativoRevisoes('${idOrcamento}')" class="etiqueta-revisao">${versao}</span>` : ''}
        </td> 
        <td>
            <img data-controle="excluir" src="imagens/cancel.png" onclick="confirmarExclusaoOrcamento('${idOrcamento}')">
        </td>
    `

    const trExistente = document.getElementById(idOrcamento)

    if (trExistente) return trExistente.innerHTML = tds

    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${idOrcamento}">${tds}</tr>`)
}

async function confirmarExclusaoOrcamento(idOrcamento) {

    const acumulado = `
        <div style="${vertical}; gap: 1rem; padding: 1rem; background-color: #d2d2d2;">
            <span>Tem certeza que deseja excluir o Orçamento?</span>
            <button onclick="excluirOrcamento('${idOrcamento}')">Confirmar</button>
        </div>
    `
    popup(acumulado, 'Tem certeza?', true)
}

async function excluirOrcamento(idOrcamento) {
    overlayAguarde()
    deletar(`dados_orcamentos/${idOrcamento}`)
    await deletarDB('dados_orcamentos', idOrcamento)
    const tr = document.getElementById(idOrcamento)
    if (tr) tr.remove()
    removerPopup()
}

async function formularioOrcamento(idOrcamento) { //29

    mostrarMenus(false)

    const orcamento = dados_orcamentos[idOrcamento]

    // Verificação antes de Editar;
    if (orcamento.finalizado == 'S') {
        return popup(`
            <div style="${horizontal}; background-color: #d2d2d2; padding: 1rem; gap: 1rem;">
                <span>Se continuar você irá reabrir o orçamento para edição, <br>tem certeza?</span>
                <button onclick="idOrcamento = '${idOrcamento}'; alterarFinalizacao('N'); formularioOrcamento('${idOrcamento}'); removerPopup()">Confirmar</button>
            </div>
            `, 'Tem certeza?', true)
    }

    dados_clientes = await recuperarDados('dados_clientes')
    const opcoesClientes = Object.entries({ '': { nome: '' }, ...dados_clientes })
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

    dados_orcamentos = await recuperarDados('dados_orcamentos')
    const orcamento = dados_orcamentos[idOrcamento]

    // Verificação antes de Editar;
    if (orcamento.finalizado == 'S') {
        return popup(`
            <div style="${horizontal}; background-color: #d2d2d2; padding: 1rem; gap: 1rem;">
                <span>Se continuar você irá reabrir o orçamento para edição, <br>tem certeza?</span>
                <button onclick="alterarFinalizacao('N'); execucoes('${id}'); removerPopup()">Confirmar</button>
            </div>
            `, 'Tem certeza?', true)
    }

    campos = await recuperarDados('campos')
    let zonas = orcamento?.zonas || {}

    const chavesZonas = Object.keys(zonas)

    if (chavesZonas.length === 0) {
        await orcamentos();
        popup(mensagem('Orçamento sem nenhuma zona disponível'), 'Alerta');
        return
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
        'Metro Linear<br>(m)',
        'Comprimento<br>(m)',
        'Largura<br>(m)',
        'Altura<br>(m)',
        'Quantidade',
        'Valor Unit',
        'Valor Total',
        'Edição Preço'
    ].map(col => `<th>${col}</th>`).join('')

    const opcoesZonas = chavesZonas
        .map(op => `<option ${zona1 == op ? 'selected' : ''}>${op}</option>`)
        .join('')

    const acumulado = `
        <div style="${vertical}; gap: 1rem;">
            <div class="blocoTabela">
                <div class="painelBotoes">
                    <div style="${horizontal}; justify-content: space-between; width: 90%;">
                        <span style="font-size: 2rem; padding: 0.5rem;">${zona1}</span>
                        <button onclick="orcamentos()">
                            Voltar para Orçamentos
                            <img src="imagens/todos.png">
                        </button>
                        <button onclick="confirmarExcluirZona()">
                            Excluir Zona
                            <img src="imagens/cancel.png">
                        </button>
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
                    <button onclick="adicionarLinha()">
                        Adicionar Linha
                        <img src="imagens/baixar.png">
                    </button>
                    <select onchange="execucoes('${idOrcamento}', this.value)">${opcoesZonas}</select>
                </div>
            </div>
            <div style="${horizontal}; width: 100%; justify-content: space-between; gap: 1rem;">
                <div style="${horizontal}; gap: 1rem;">

                    <button onclick="execucoes('${idOrcamento}', -1)">
                        <img src="imagens/anterior.png">
                        Voltar a Zona
                    </button>

                    <button onclick="execucoes('${idOrcamento}', 1)">
                        Próxima Zona
                        <img src="imagens/proximo.png">
                    </button>

                    <div id="botaoFinalizacao">
                        <button onclick="orcamentoFinal('${idOrcamento}')">
                            Ver Orçamento
                            <img src="imagens/orcamentos.png">
                        </button>
                    </div>

                </div>
                <button onclick="alterarFinalizacao('S'); finalizado = 'S'; orcamentos();">
                    Concluir Orçamento
                    <img src="imagens/concluido.png">
                </button>
            </div>
        </div>
    `

    telaInterna.innerHTML = acumulado

    for (const [idItem, dados] of Object.entries(zonas?.[zona1] || {})) {
        adicionarLinha(idItem, dados)
    }

}

function proximaRevisao(revisoes = {}) {
    const nums = Object.keys(revisoes)
        .map(k => Number(k.replace(/\D/g, '')))
        .filter(n => !isNaN(n))

    const prox = nums.length ? Math.max(...nums) + 1 : 1
    return `R${prox}`
}

async function alterarFinalizacao(status) { //29

    overlayAguarde()
    enviar(`dados_orcamentos/${idOrcamento}/finalizado`, status)

    const orcamento = dados_orcamentos[idOrcamento]
    orcamento.finalizado = status

    if (status == 'S') {

        orcamento.revisoes ??= {}

        const R = proximaRevisao(orcamento.revisoes)

        orcamento.revisoes[R] = {
            zonas: orcamento.zonas,
            idCliente: orcamento.idCliente,
            dataContato: orcamento.dataContato,
            dataVisita: orcamento.dataVisita,
            data: new Date().toLocaleString(),
            usuario: acesso.usuario
        }

        orcamento.versao = R

        enviar(`dados_orcamentos/${idOrcamento}/revisoes/${R}`, orcamento.revisoes[R])
        enviar(`dados_orcamentos/${idOrcamento}/versao`, R)
    }

    await inserirDados({ [idOrcamento]: orcamento }, 'dados_orcamentos')
    removerOverlay()
}


function adicionarLinha(idItem = ID5digitos(), dados = {}) {

    const body = document.getElementById('body')

    const especialidades = []
    let opcoesDescricao = `<option></option>`

    for (const [idCampo, d] of Object.entries(campos)) {

        especialidades.push(d.especialidade)

        if (d.especialidade !== dados.especialidade) continue
        opcoesDescricao += `<option id="${idCampo}" data-medida="${d.medida}" ${dados?.campo == idCampo ? 'selected' : ''}>${d.descricao}</option>`
    }

    const opcoesEspecialidade = [...new Set(especialidades)]
        .map(op => `<option ${dados?.especialidade == op ? 'selected' : ''}>${op}</option>`)
        .join('')


    const auxC = ['unidades', 'metroLinear', 'comprimento', 'largura', 'altura']
    const tds = `
        <td>
            <div style="${horizontal}; gap: 5px;">
                <img onclick="removerLinhaZona(this)" src="imagens/cancel.png" style="width: 2rem;">
                <select name="especialidade" onchange="buscarCampos(this)">
                    <option></option>
                    ${opcoesEspecialidade}
                </select>
            </div>
        </td>
        <td>
            <select style="width: 100%;" name="campo" onchange="buscarMedidas(this)">
                ${opcoesDescricao}
            </select>
        </td>
        <td>    
            <div style="${horizontal}; gap: 5px;">
                <textarea name="descricaoExtra" style="min-width: 150px;" oninput="this.nextElementSibling.style.display = 'flex';">${dados?.descricaoExtra || ''}</textarea>
                <img src="imagens/concluido.png" onclick="filtroValores(this); this.style.display = 'none';" style="display: none;">
            </div>
        </td>
        <td>
            <span name="medida">${dados?.medida || ''}</span>
        </td>
        ${auxC.map(c => `
            <td>
                <span ${dados?.[c] ? 'class="campo-on" contentEditable="true"' : 'class="campo-off" contentEditable="false"'} oninput="filtroValores(this)" name="${c}">${dados?.[c] || ''}</span>
            </td>
            `).join('')
        }
        <td style="white-space: nowrap;" name="quantidade">${dados?.quantidade || 0}</td>
        <td style="white-space: nowrap;" name="unitario">${dinheiro(dados?.unitario)}</td>
        <td style="white-space: nowrap;" name="total">${dinheiro(dados?.unitario * dados?.quantidade)}</td>
        <td name="edicao">
            ${dados.campo ? `<img onclick="composicoes('${dados.campo}')" src="imagens/lapis.png">` : ''}
        </td>
    `

    const trExistente = document.getElementById(idItem)
    if (trExistente) return trExistente.innerHTML = tds

    body.insertAdjacentHTML('beforeend', `<tr id="${idItem}">${tds}</tr>`)

}

async function removerLinhaZona(img) {

    const tr = img.closest('tr')
    let orcamento = await recuperarDado('dados_orcamentos', idOrcamento)
    const idItem = tr.id
    delete orcamento.zonas[zona1][idItem]
    deletar(`dados_orcamentos/${idOrcamento}/zonas/${zona1}/${idItem}`)
    await inserirDados({ [idOrcamento]: orcamento }, 'dados_orcamentos')

    tr.remove()
}

function buscarCampos(select) {

    const tr = select.closest('tr')
    const selectDescricao = tr.querySelector('[name="campo"]')
    const especialidade = select.value

    const opcoes = {}

    for (const [id, campo] of Object.entries(campos)) {

        if (campo.especialidade !== especialidade) continue

        opcoes[id] = campo
    }

    let opcoesDescricao = `<option></option>`
    opcoesDescricao += Object.entries(opcoes || {})
        .map(([id, dados]) => `<option data-id="${id}" data-medida="${dados.medida}" ${idCampo == id ? 'selected' : ''}>${dados.descricao}</option>`)
        .join('')

    selectDescricao.innerHTML = opcoesDescricao

    filtroValores(select)

}

function buscarMedidas(select) {

    const medida = select.selectedOptions[0].dataset.medida
    const tr = select.closest('tr')
    tr.querySelector('[name="medida"]').textContent = medida

    filtroValores(select)
}

function filtroValores(elemento) {

    const tr = elemento.closest('tr')

    const esquema = {
        '': [],
        'm2': [6, 7, 8],
        'm3': [6, 7, 8],
        'ml': [5],
        'und': [4]
    }

    const tds = tr.querySelectorAll('td')
    const medida = tr.querySelector('[name="medida"]').textContent
    // conta campos preenchidos (apenas m2)
    let preenchidos = 0
    if (medida === 'm2') {
        for (const i of esquema.m2) {
            const span = tds[i].querySelector('span')
            if (span.textContent.trim() !== '') preenchidos++
        }
    }

    for (let i = 4; i <= 8; i++) {

        const span = tds[i].querySelector('span')

        if (!esquema[medida].includes(i)) {
            span.classList = 'campo-off'
            span.textContent = ''
            span.contentEditable = false
            continue
        }

        // regra especial do m2
        if (medida === 'm2') {

            if (preenchidos >= 2 && span.textContent.trim() === '') {
                span.classList = 'campo-off'
                span.contentEditable = false
            } else {
                span.classList = 'campo-on'
                span.contentEditable = true
            }

        } else {
            span.classList = 'campo-on'
            span.contentEditable = true
        }
    }

    salvarExecucao(tr)

}

async function salvarExecucao(tr) {
    let orcamento = await recuperarDado('dados_orcamentos', idOrcamento)
    if (!orcamento || !zona1) return
    orcamento.zonas ??= {}

    const idItem = tr.id

    const el = (campo) => {
        const elemento = tr.querySelector(`[name="${campo}"]`)
        if (!elemento) return ''
        return elemento
    }

    const especialidade = el('especialidade').value
    const descricao = el('campo').value
    const campo = el('campo').selectedOptions[0].id
    const descricaoExtra = el('descricaoExtra').value
    const medida = el('medida').textContent
    const unidades = Number(el('unidades').textContent)
    const metroLinear = Number(el('metroLinear').textContent)
    const comprimento = Number(el('comprimento').textContent)
    const largura = Number(el('largura').textContent)
    const altura = Number(el('altura').textContent)

    let quantidade = 0
    if (medida == 'und' || medida == 'ml') quantidade = unidades || metroLinear
    if (medida == 'm2' || medida == 'm3') quantidade = (altura || 1) * (largura || 1) * (comprimento || 1)

    const campoRef = campos[campo] || {}
    const unitario = campoRef?.totalComposicao || 0
    const total = (quantidade * unitario)

    el('edicao').innerHTML = campo ? `<img onclick="composicoes('${campo}')" src="imagens/lapis.png">` : ''
    el('quantidade').textContent = quantidade
    el('unitario').textContent = dinheiro(unitario)
    el('total').textContent = dinheiro(total)

    const item = {
        campo,
        maoObra: campoRef?.maoObra,
        materiais: campoRef?.materiais,
        ferramentas: campoRef?.ferramentas,
        especialidade,
        descricao,
        descricaoExtra,
        medida,
        unidades,
        metroLinear,
        comprimento,
        largura,
        altura,
        quantidade,
        unitario
    }

    orcamento.zonas[zona1] ??= {}
    orcamento.zonas[zona1][idItem] = item

    await inserirDados({ [idOrcamento]: orcamento }, 'dados_orcamentos');
    enviar(`dados_orcamentos/${idOrcamento}/zonas/${zona1}/${idItem}`, item)

    const total_geral = totalGeral(orcamento?.zonas)
    if (total_geral !== orcamento.total_geral) enviar(`dados_orcamentos/${idOrcamento}/total_geral`, total_geral)
    orcamento.total_geral = total_geral

    function totalGeral(zonas = {}) {
        return Object.values(zonas).reduce((total, zona) => {
            return total + Object.values(zona).reduce((somaZona, item) => {
                return somaZona + (Number(item.quantidade) || 0) * (Number(item.unitario) || 0)
            }, 0)
        }, 0)
    }

}

function comparativoRevisoes(idOrcamento) {

    const orcamento = dados_orcamentos[idOrcamento]
    const revisoes = orcamento.revisoes || {}
    const versaoAtual = orcamento.versao

    const keys = Object.keys(revisoes)
    if (!keys.length) {
        return popup(mensagem('Sem revisões'), 'Alerta', true)
    }

    function render(R) {

        const revAnt = revisoes[R]
        const revAtual = revisoes[versaoAtual] || orcamento

        if (!revAnt || !revAtual) return ''

        const usuarioAnt = revAnt.usuario || '-'
        const usuarioAtu = revAtual.usuario || '-'

        const camposGerais = [
            ['Cliente', revAnt.idCliente, revAtual.idCliente],
            ['Data contato', revAnt.dataContato, revAtual.dataContato],
            ['Data visita', revAnt.dataVisita, revAtual.dataVisita]
        ]

        const dadosGeraisHTML = camposGerais.map(([label, ant, atu]) => {

            let classe = ''
            if (ant && !atu) classe = 'cmp-removido'
            else if (!ant && atu) classe = 'cmp-novo'
            else if (ant !== atu) classe = 'cmp-alterado'

            return `
                <div class="cmp-linha ${classe}">
                    <div class="cmp-col cmp-label">${label}</div>
                    <div class="cmp-col cmp-ant">${ant || '-'}</div>
                    <div class="cmp-col cmp-atu">${atu || '-'}</div>
                </div>
            `
        }).join('')

        const zonasAnt = revAnt.zonas || {}
        const zonasAtu = revAtual.zonas || {}

        const todasZonas = new Set([
            ...Object.keys(zonasAnt),
            ...Object.keys(zonasAtu)
        ])

        const zonasHTML = [...todasZonas].map(zona => {

            const itensAnt = zonasAnt[zona] || {}
            const itensAtu = zonasAtu[zona] || {}

            const todosItens = new Set([
                ...Object.keys(itensAnt),
                ...Object.keys(itensAtu)
            ])

            const itensHTML = [...todosItens].map(id => {

                const ant = itensAnt[id]
                const atu = itensAtu[id]

                if (ant && !atu) {
                    return `
                        <div class="cmp-item cmp-removido">
                            <span class="cmp-desc">${ant.descricao}</span>
                            <span class="cmp-info">removido</span>
                        </div>
                    `
                }

                if (!ant && atu) {
                    return `
                        <div class="cmp-item cmp-novo">
                            <span class="cmp-desc">${atu.descricao}</span>
                            <span class="cmp-info">novo</span>
                        </div>
                    `
                }

                const qtdMudou = Number(ant.quantidade) !== Number(atu.quantidade)
                const unitMudou = Number(ant.unitario) !== Number(atu.unitario)

                const classe = (qtdMudou || unitMudou) ? 'cmp-alterado' : ''

                return `
                    <div class="cmp-item ${classe}">
                        <span class="cmp-desc">${atu.descricao || ant.descricao}</span>
                        ${classe ? `
                            <span class="cmp-info">
                                qtd ${ant.quantidade} → ${atu.quantidade} |
                                unit ${ant.unitario} → ${atu.unitario}
                            </span>
                        ` : ''}
                    </div>
                `
            }).join('')

            return `
                <div class="cmp-zona">
                    <div class="cmp-zona-titulo">${zona}</div>
                    <div class="cmp-itens">${itensHTML}</div>
                </div>
            `
        }).join('')

        return `
            <div class="cmp-header">
                <div>Revisão: <strong>${R}</strong> × Atual: <strong>${versaoAtual}</strong></div>
                <div class="cmp-usuarios">
                    <span>Alterado por: ${usuarioAnt}</span>
                    <span>Atual: ${usuarioAtu}</span>
                </div>
            </div>

            <div class="cmp-bloco">
                <div class="cmp-subtitulo">Dados gerais</div>
                <div class="cmp-tabela">
                    <div class="cmp-linha cmp-head">
                        <div class="cmp-col">Campo</div>
                        <div class="cmp-col">Antes</div>
                        <div class="cmp-col">Depois</div>
                    </div>
                    ${dadosGeraisHTML}
                </div>
            </div>

            <div class="cmp-bloco">
                <div class="cmp-subtitulo">Zonas</div>
                ${zonasHTML}
            </div>
        `
    }

    const selectHTML = `
        <select id="cmp-select" class="cmp-select">
            ${keys.map(k => `<option value="${k}">${k}</option>`).join('')}
        </select>
    `
    popup(`
        <div class="comparativo-revisoes">
            <div class="cmp-topo">
                ${selectHTML}
            </div>
            <div id="cmp-conteudo">
                ${render(keys[0])}
            </div>
        </div>
    `, 'Comparativo de Revisões', true)

    document.getElementById('cmp-select').onchange = e => {
        document.getElementById('cmp-conteudo').innerHTML = render(e.target.value)
    }
}

async function listagem(idOrcamento, tabela) {

    campos = await recuperarDados('campos')
    const orcamento = dados_orcamentos[idOrcamento]
    const idCliente = orcamento?.idCliente || ''
    const cliente = dados_clientes[idCliente]

    let total = 0
    const dados = {
        'PEDIDO DE MATERIAIS': 'TOTAL (c/iva)',
        'Empresa': cliente?.nome || '',
        'Morada de Execução': cliente?.moradaExecucao || '',
        'Nif': cliente?.numeroContribuinte || '',
        'E-mail': cliente?.email || '',
        'Contacto': cliente?.telefone || ''
    }

    let linhas = ''
    let i = 0
    for (const [titulo, dado] of Object.entries(dados)) {

        if (i == 0) {
            linhas += `
            <tr>
                <td colspan="2" style="background-color: #5b707f;">
                    <div class="titulo-orcamento">
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
                        <div class="total-valor"></div>
                    </td>
                    `
                    : ''}
            </tr>`
        }

        i++
    }

    const colunas = [
        'Especialidade',
        'Descrição do Material',
        'Quantidade',
        'Preço Unitário',
        'Total',
        'Link'
    ].map(col => `<th>${col}</th>`).join('')

    let itens = ''

    for (const [, especialidades] of Object.entries(orcamento?.zonas || {})) {
        for (const dados of Object.values(especialidades)) {

            const campo = campos?.[dados?.campo] || {}
            const materiais = campo[tabela] || {}

            for (const material of Object.values(materiais)) {

                const unitario = material?.preco || 0
                const qtde = material?.qtde || 0
                const totalLinha = unitario * qtde
                const link = material?.link

                itens += `
                    <tr>
                        <td>${campo?.descricao || ''}</td>
                        <td style="text-align: left;">${material.descricao || '-'}</td>
                        <td>${qtde}</td>
                        <td>${dinheiro(unitario)}</td>
                        <td>${dinheiro(totalLinha)}</td>
                        <td>${link ? `<a href="${link}">${link}</a>` : ''}</td>
                    </tr>
                    `

                total += totalLinha

            }
        }
    }

    const acumulado = `
        <div class="tela-orcamento">
            <div style="width: 100%; ${horizontal}; justify-content: start; gap: 3px; padding: 0.5rem;">
                <button onclick="imprimirRecorte()">Imprimir</button>
                <button onclick="pdfOrcamento('${tabela}')">Exportar</button>
            </div>

            <div class="orcamento-documento">
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
        </div>
    `

    popup(acumulado, 'Listagem de Materiais', true)

    document.querySelector('.total-valor').textContent = dinheiro(total)

}

async function orcamentoFinal(idOrcamento, emJanela) {

    campos = await recuperarDados('campos')
    const orcamento = dados_orcamentos[idOrcamento]
    const idCliente = orcamento?.idCliente || ''
    const cliente = dados_clientes[idCliente]

    let total = 0

    const dt = (data) => {
        if (!data) return '-'
        const [ano, mes, dia] = data.split('-')
        return `${dia}/${mes}/${ano}`
    }

    const dados = {
        'Selecionar Zonas': 'TOTAL (s/iva)',
        'Nome': cliente?.nome || '',
        'Morada Fiscal': cliente?.moradaFiscal || '',
        'Morada de Execução': cliente?.moradaExecucao || '',
        'Nif': cliente?.numeroContribuinte || '',
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
                        <img data-controle="editar" name="editaveis" class="btnAcmp" src="imagens/lapis.png" onclick="formularioOrcamento('${idOrcamento}')">
                        <span ${titulo == 'Selecionar Zonas' ? 'name="titulo"' : ''}>${titulo}</span>
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
                        <div class="total-valor"></div>
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

    let itens = ''
    for (const [zona, especialidades] of Object.entries(orcamento?.zonas || {})) {
        for (const dados of Object.values(especialidades)) {

            const dadosCampoEspecifico = campos?.[dados?.campo] || {}
            const quantidade = dados?.quantidade || 0
            const totalComposicao = dadosCampoEspecifico?.totalComposicao || 0
            const totalLinha = totalComposicao * quantidade
            total += totalLinha

            itens += `
                <tr>
                    <td>
                        <div style="${horizontal}; justify-content: start; gap: 0.5rem;">
                            <img data-controle="editar" name="editaveis" onclick="execucoes('${idOrcamento}', '${zona}')" src="imagens/lapis.png" style="width: 1.5rem;">
                            <span>${zona}</span>
                        </div>
                    </td>
                    <td>${dados?.especialidade || '...'}</td>
                    <td>${dados?.descricao || '...'}</td>
                    <td>
                        <div style="${horizontal}; justify-content: start; gap: 0.5rem;">
                            <img data-controle="editar" name="editaveis" name="editaveis" onclick="editarDescricaoExtra('${idOrcamento}', '${idCampo}', '${zona}')" src="imagens/lapis.png" style="width: 1.5rem;">
                            <span>${dados?.descricaoExtra || '...'}</span>
                        </div>
                    </td>
                    <td>${dados?.medida || ''}</td>
                    <td>${quantidade}</td>
                    <td>${dinheiro(totalLinha)}</td>
                </tr>
            `
        }
    }

    const acumulado = `
        <div class="tela-orcamento">

            ${emJanela
            ? ''
            : `
            <div style="width: 100%; ${horizontal}; justify-content: start; gap: 3px; padding: 0.5rem;">
                <button onclick="orcamentos()">Voltar para Orçamentos</button>
                <button onclick="imprimirRecorte()">Imprimir</button>
                <button onclick="pdfOrcamento('Orçamento')">Exportar</button>
                <button onclick="enviarOrcamentoPorEmail('${idOrcamento}')">Enviar</button>
                <button data-controle="editar" onclick="execucoes('${idOrcamento}')">Voltar para Zonas</button>
            </div>`}

            <div class="orcamento-documento">
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
        </div>
    `

    if (emJanela) {
        popup(acumulado, 'Orçamento', true)
        esconderEditaveis(true)
    } else {
        telaInterna.innerHTML = acumulado
    }

    document.querySelector('.total-valor').textContent = dinheiro(total)

    // Regras de validação;
    validarRegrasAcesso()

}

function imprimirRecorte() {

    esconderEditaveis(true)

    const origem = document.querySelector('.orcamento-documento')
    if (!origem) return

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'

    document.body.appendChild(iframe)

    const doc = iframe.contentWindow.document
    doc.open()
    doc.write('<html><head><meta charset="UTF-8"></head><body></body></html>')
    doc.close()

    const destino = origem.cloneNode(true)
    doc.body.appendChild(destino)

    copiarEstilos(origem, destino)

    const style = doc.createElement('style')
    style.textContent = `
        @page {
            size: A4 portrait;
            margin: 5mm;
        }
        * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
    `
    doc.head.appendChild(style)

    iframe.contentWindow.focus()
    iframe.contentWindow.print()

    setTimeout(() => iframe.remove(), 500)

    esconderEditaveis(false)
}

async function enviarOrcamentoPorEmail(idOrcamento) {

    overlayAguarde()

    const orcamento = dados_orcamentos[idOrcamento]
    const idCliente = orcamento?.idCliente || ''
    const cliente = clientes[idCliente]
    const emails = [] // Incluir outros e-mails;
    const titulo = cliente?.nome ? `Orçamento disponível - ${cliente.nome}` : 'Orçamento disponível'

    if (cliente.email) emails.push(cliente.email)

    const htmlContent = `
            <div style="${vertical}; gap: 2px;">
            
            <h1>Orçamento em anexo</h1>
            <span><b>Nome:</b> ${cliente?.nome || '...'}</span>
            <span><b>Total do Orçamento:</b> ${dinheiro(orcamento?.total_geral)}</span>

            </div>
    `
    esconderEditaveis(true)
    const htmlPdf = document.querySelector('.orcamento-documento')

    const html = `
        <html>
        <head>
            <meta charset="UTF-8">
            <link rel="stylesheet" href="https://devleonny.github.io/Reconstrular/css/orcamentos.css">
            <style>

                @page {
                    size: A4;
                    margin: 5mm;
                }

                body {
                    font-family: 'Poppins', sans-serif;
                    background: white;
                }

            </style>
        </head>
        <body>
            ${htmlPdf.outerHTML}
        </body>
        </html>
  `

    const resposta = await pdfEmail({ html, emails, htmlContent, titulo })
    esconderEditaveis(false)

    if (resposta.mensagem) return popup(mensagem(JSON.stringify(resposta.mensagem)), 'Aviso', true)

    if (resposta.success) {

        orcamento.emailEnviado = {
            usuario: acesso.usuario,
            data: new Date().toLocaleString()
        }

        await inserirDados({ [idOrcamento]: orcamento }, 'dados_orcamentos')
        enviar(`dados_orcamentos/${idOrcamento}/emailEnviado`, orcamento.emailEnviado)
        await orcamentos(finalizado)
        return popup(mensagem('Enviado com sucesso', 'imagens/concluido.png'), 'Feito', true)
    }

}

function copiarEstilos(origem, destino) {

    const origemEls = origem.querySelectorAll('*')
    const destinoEls = destino.querySelectorAll('*')

    origemEls.forEach((el, i) => {
        const estilo = getComputedStyle(el)
        const destinoEl = destinoEls[i]

        for (const prop of estilo) {
            destinoEl.style[prop] = estilo.getPropertyValue(prop)
        }
    })
}


async function pdfOrcamento(nome = 'Documento') {

    esconderEditaveis(true)
    const htmlPdf = document.querySelector('.orcamento-documento')

    const html = `
        <html>
        <head>
            <meta charset="UTF-8">
            <link rel="stylesheet" href="https://devleonny.github.io/Reconstrular/css/orcamentos.css">
            <style>

                @page {
                    size: A4;
                    margin: 5mm;
                }

                body {
                    font-family: 'Poppins', sans-serif;
                    background: white;
                }

            </style>
        </head>
        <body>
            ${htmlPdf.outerHTML}
        </body>
        </html>
  `
    await pdf(html, `${nome}-${new Date().getTime()}`)
    esconderEditaveis(false)
}

function esconderEditaveis(gatilho) {

    const editaveis = document.querySelectorAll('[name="editaveis"]')
    const titulo = document.querySelector('[name="titulo"]')

    if (titulo) titulo.textContent = gatilho ? 'ORÇAMENTO' : 'Selecionar Zonas'

    editaveis.forEach(e => {
        e.style.display = gatilho ? 'none' : ''
    })

}

async function editarDescricaoExtra(idOrcamento, idCampo, zona) {

    const acumulado = `
        <div style="${vertical}; background-color: #d2d2d2; padding: 1rem;">
            <span>Acrescente uma descrição extra</span>
            <hr style="width: 100%;">
            <textarea id="descricaoExtra"></textarea>
            <br>
            <button onclick="salvarDescricao('${idOrcamento}', '${idCampo}', '${zona}')">Salvar</button>
        </div>
    `

    popup(acumulado, 'Editar descrição extra', true)
}

async function salvarDescricao(idOrcamento, idCampo, zona) {

    let orcamento = await recuperarDado('dados_orcamentos', idOrcamento)

    const descricaoExtra = document.getElementById('descricaoExtra')

    orcamento.zonas[zona][idCampo].descricaoExtra = descricaoExtra.value

    await inserirDados({ [idOrcamento]: orcamento }, 'dados_orcamentos')

    await orcamentoFinal(idOrcamento)

    removerPopup()
}