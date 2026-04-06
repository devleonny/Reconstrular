const voltarOrcamentos = `<button onclick="telaOrcamentos()">Voltar</button>`
let campos = {}
let idOrcamento = null
let zona1 = null
let indiceZona = 0
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

function povoarLista(ini, lim, texto) {
    let lista = []

    for (let i = 1; i <= lim; i++) {
        lista.push(`${texto} ${ini} - ${i}`)
    }

    return lista
}

async function telaOrcamentos() {

    const acumulado = `
        <div class="painel-despesas">
            <br>
            ${btn('orcamentos', 'Dados de Orçamento', 'formularioOrcamento()')}
            ${btn('todos', 'Orçamentos em Aberto', `finalizado = 'N'; orcamentos()`)}
            ${btn('todos', 'Orçamentos Finalizados', `finalizado = 'S'; orcamentos()`)}
        </div>
    `

    tela.innerHTML = acumulado

}

async function orcamentos() {

    telaAtiva = 'orçamentos'

    zona1 = null
    indiceZona = 0

    const tabela = await modTab({
        btnExtras: voltarOrcamentos,
        base: 'dados_orcamentos',
        pag: 'orcamentos',
        body: 'bodyOrcamentos',
        criarLinha: 'criarLinhaOrcamento',
        colunas: {
            'Cliente': { chave: 'snapshots.cliente' },
            'Distrito': {},
            'Cidade': {},
            'Data de Contato': {},
            'Data de Visita': {},
            'E-mail enviado': {},
            'Data/Hora do Envio (E-mail)': {},
            'Listagem do Material': {},
            'Listagem de Ferramentas': {},
            'Zonas': {},
            'Editar': {},
            'Orcamento': {},
            'Versão Atual': {},
            'Excluir': {}
        }
    })

    tela.innerHTML = tabela

    await paginacao()

}

async function criarLinhaOrcamento(orcamento) {

    const { snapshots } = orcamento || {}
    const idOrcamento = orcamento.id
    const cidade = snapshots?.cidade || {}
    const cliente = snapshots?.cliente

    const dt = (data) => {
        if (!data) return '-'
        const [ano, mes, dia] = data.split('-')
        return `${dia}/${mes}/${ano}`
    }

    const versao = orcamento?.versao
    const tds = `
        <td>${cliente || ''}</td>
        <td>${cidade?.distrito || ''}
        <td>${cidade?.nome || ''}
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
            <img data-controle="editar" src="imagens/planta.png" onclick="execucoes('${idOrcamento}', 0)">
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
    return `<tr>${tds}</tr>`
}

async function confirmarExclusaoOrcamento(idOrcamento) {

    const botoes = [
        { texto: 'Confirmar', img: 'concluido', funcao: `excluirOrcamento('${idOrcamento}')` }
    ]
    popup({ botoes, mensagem: 'Deseja excluir o orçamento?', nra: false })
}

async function excluirOrcamento(idOrcamento) {
    overlayAguarde()

    await deletar(`dados_orcamentos/${idOrcamento}`)

    removerPopup()
}

async function formularioOrcamento(idOrcamento) {

    const orcamento = await recuperarDado('dados_orcamentos', idOrcamento) || {}
    const cliente = orcamento?.snapshots?.cliente || 'Selecione'

    // Verificação antes de Editar;
    if (orcamento?.finalizado == 'S') {

        const botoes = [
            { texto: 'Confirmar', img: 'concluido', funcao: `idOrcamento = '${idOrcamento}'; alterarFinalizacao('N'); formularioOrcamento('${idOrcamento}'); removerPopup()` }
        ]
        return popup({ mensagem: `Se continuar você irá reabrir o orçamento para edição, <br>tem certeza?</span>`, botoes, nra: false })
    }

    const zonas = (lista, ambiente) => {
        const opcoes = lista
            .map(zona => `<option ${orcamento?.zonas?.[zona] ? 'selected' : ''}>${zona}</option>`)
            .join('')

        return `<select data-ambiente="${ambiente}" name="zonas">${opcoes}</select>`

    }

    const funcao = idOrcamento
        ? `salvarOrcamento('${idOrcamento}')`
        : 'salvarOrcamento()'

    const botoes = [
        { texto: 'Salvar', img: 'concluido', funcao }
    ]

    controlesCxOpcoes.cliente = {
        retornar: ['nome'],
        base: 'dados_clientes',
        colunas: {
            'Nome': { chave: 'nome' },
            'Morada Fiscal': { chave: 'moradaFiscal' },
            'Distrito': { chave: 'snapshots.cidade.distrito' },
            'Zona': { chave: 'snapshots.cidade.zona' },
            'Cidade': { chave: 'snapshots.cidade.nome' }
        }
    }

    const linhas = [
        {
            texto: 'Cliente',
            elemento: `<span ${orcamento?.cliente ? `id="${orcamento?.cliente}"` : ''} name="cliente" class="opcoes" onclick="cxOpcoes('cliente')">${cliente || 'Selecione'}</span>`
        },
        {
            texto: 'Data de contato',
            elemento: `<input value="${orcamento?.dataContato || ''}" name="dataContato" type="date">`
        },
        {
            texto: 'Data de visita',
            elemento: `<input value="${orcamento?.dataVisita || ''}" name="dataVisita" type="date">`
        }
    ]

    for (const [ambiente, lista] of Object.entries(ambientes)) {
        linhas.push({
            texto: ambiente,
            elemento: zonas(lista, ambiente)
        })
    }

    popup({ linhas, botoes, titulo: 'Criar orçamento', funcao })
}

async function salvarOrcamento(idOrcamento = crypto.randomUUID()) {

    overlayAguarde()

    const cliente = document.querySelector('[name="cliente"]').id

    if (!cliente)
        return popup({ mensagem: 'Campo Cliente obrigatório' })

    const orcamento = await recuperarDado('dados_orcamentos', idOrcamento) || {}

    const zonas = Object.fromEntries(
        [...document.querySelectorAll('[name="zonas"]')]
            .filter(select => select.value)
            .map(select => {
                const ambiente = select.dataset.ambiente
                const zona = select.value

                return [ambiente, { zona, ambiente }]
            })
    )

    const orcamentoAtualizado = {
        ...orcamento || {},
        cliente,
        dataVisita: document.querySelector('[name="dataVisita"]').value,
        dataContato: document.querySelector('[name="dataContato"]').value,
        zonas
    }

    await enviar(`dados_orcamentos/${idOrcamento}`, orcamentoAtualizado)

    await execucoes(idOrcamento, 0)

    removerPopup()

}

async function execucoes(id, ambienteOuIndice = 0) {

    overlayAguarde()

    // Salvamento do anterior;
    if (controles?.execucoes?.ambiente) {
        const campos = controles?.execucoes?.base || []
        await enviar(`dados_orcamentos/${id}/zonas/${controles?.execucoes?.ambiente}/campos`, campos)
    }

    const { zonas = {} } = await recuperarDado('dados_orcamentos', id) || {}

    const listaZonas = Object.values(zonas)

    if (!listaZonas.length) {
        popup({ mensagem: 'Orçamento sem nenhuma zona disponível' })
        return
    }

    let indice = 0

    if (typeof ambienteOuIndice === 'number') {
        indice = ambienteOuIndice
    } else if (typeof ambienteOuIndice === 'string') {
        indice = listaZonas.findIndex(z => z.ambiente == ambienteOuIndice)
        if (indice === -1)
            indice = 0
    }

    if (indice < 0)
        indice = 0

    if (indice >= listaZonas.length)
        indice = listaZonas.length - 1

    const ambienteAtual = listaZonas[indice] || {}

    const campos = ambienteAtual.campos || []

    const colunas = {
        'Remover': {},
        'Descrição do Serviço': { chave: 'campo.descricao' },
        'Descrição Extra <br>(facultativo)': { chave: 'descricaoExtra' },
        'Unidade de <br> Medida': { chave: 'campo.medida' },
        'Unidades': {},
        'Metro Linear<br>(m)': {},
        'Comprimento<br>(m)': {},
        'Largura<br>(m)': {},
        'Altura<br>(m)': {},
        'Quantidade': {},
        'Valor Unit': {},
        'Valor Total': {},
        'Edição Preço': {}
    }

    const pag = 'execucoes'
    const tabela = await modTab({
        btnExtras: `<span class="titulo-execucoes">${ambienteAtual.zona}</span>`,
        colunas,
        funcaoAdicional: ['atualizarMedidas'],
        pag,
        base: campos,
        criarLinha: 'adicionarLinha',
        body: 'execucoes'
    })

    const anterior = indice > 0
        ? `
            <button onclick="execucoes('${id}', ${indice - 1})">
                <img src="imagens/anterior.png">
                Voltar a Zona
            </button>
        `
        : ''

    const proximo = indice < listaZonas.length - 1
        ? `
            <button onclick="execucoes('${id}', ${indice + 1})">
                Próxima Zona
                <img src="imagens/proximo.png">
            </button>
        `
        : ''

    const acumulado = `
        <div class="execucoes">
            ${tabela}
            <div style="display: flex; flex-wrap: wrap; gap: 1rem;">

                <button onclick="incluirLinha()">
                    <img src="imagens/baixar.png">
                    Adicionar Linha
                </button>

                ${anterior}

                ${proximo}

                <div id="botaoFinalizacao">
                    <button onclick="orcamentoFinal('${id}')">
                        Ver Orçamento
                        <img src="imagens/orcamentos.png">
                    </button>
                </div>

                <button onclick="alterarFinalizacao('S'); finalizado = 'S'; orcamentos();">
                    Concluir Orçamento
                    <img src="imagens/concluido.png">
                </button>
            </div>
        </div>
    `

    controles.execucoes.ambiente = ambienteAtual.ambiente
    controles.execucoes.indice = indice

    tela.innerHTML = acumulado
    await paginacao(pag)

    removerOverlay()
}

async function incluirLinha() {

    controles.execucoes.base.push({ id: crypto.randomUUID() })
    await paginacao()

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

        await enviar(`dados_orcamentos/${idOrcamento}/revisoes/${R}`, orcamento.revisoes[R])
        await enviar(`dados_orcamentos/${idOrcamento}/versao`, R)
    }

    removerOverlay()
}


function adicionarLinha(dados) {

    const { id, campo, dimensoes } = dados || {}

    controlesCxOpcoes[id] = {
        base: 'campos',
        retornar: ['descricao'],
        funcaoAdicional: ['atualizarMedidas'],
        colunas: {
            'Especialidade': { chave: 'especialidade' },
            'Descrição': { chave: 'descricao' },
            'Medida': { chave: 'medida' }
        }
    }

    const camposDimensoes = ['unidades', 'metroLinear', 'comprimento', 'largura', 'altura']
        .map(c => `
            <td>
                <input 
                type="number"
                name="${c}"
                oninput="atualizarMedidas()"
                value="${dimensoes?.[c] || ''}"
                ${dimensoes?.[c] ? 'class="campo-on" contentEditable="true"' : 'class="campo-off" contentEditable="false"'}>
            </td>
            `)
        .join('')


    const tds = `
        <td>
            <img onclick="removerLinhaZona('${id}')" src="imagens/cancel.png" style="width: 2rem;">
        </td>
        <td style="min-width: 250px;">
            <span ${campo ? `id="${campo.id}"` : ''} name="${id}" class="opcoes" onclick="cxOpcoes('${id}')">${campo?.descricao || 'Selecione'}</span>
        </td>
        <td>
            <textarea name="descricaoExtra" style="min-width: 150px;" oninput="atualizarMedidas()">${dados?.descricaoExtra || ''}</textarea>
        </td>
        <td>
            <span name="medida">${dados?.medida || ''}</span>
        </td>
        ${camposDimensoes}
        <td style="white-space: nowrap;" name="quantidade">${dados?.quantidade || 0}</td>
        <td style="white-space: nowrap;" name="unitario">${dinheiro(dados?.unitario)}</td>
        <td style="white-space: nowrap;" name="total">${dinheiro(dados?.unitario * dados?.quantidade)}</td>
        <td name="edicao">
            ${campo
            ? `<img onclick="composicoes('${dados.campo}')" src="imagens/lapis.png">`
            : ''
        }
        </td>
    `

    return `<tr data-campos="S" id="${id}">${tds}</tr>`

}

async function removerLinhaZona(idItem) {

    controles.execucoes.base = controles.execucoes.base
        .filter(campo => campo.id !== idItem)

    await paginacao('execucoes')
}

async function atualizarMedidas() {

    const nomesCampos = ['unidades', 'metroLinear', 'comprimento', 'largura', 'altura']
    const esquema = {
        '': [],
        'm2': ['metroLinear', 'comprimento', 'largura'],
        'm3': ['metroLinear', 'comprimento', 'largura'],
        'ml': ['metroLinear'],
        'und': ['unidades']
    }

    const base = controles?.execucoes?.base || []
    const trs = document.querySelectorAll('tbody tr')

    for (const tr of trs) {

        if (!tr.dataset.campos)
            continue

        const id = tr.id

        const campo = tr.querySelector(`[name="${id}"]`)?.id
        const campoRef = await recuperarDado('campos', campo) || {}
        const descricaoExtra = tr.querySelector('[name="descricaoExtra"]')?.value || ''
        const medida = campoRef?.medida || ''
        tr.querySelector('[name="medida"]').textContent = medida
        const dimensoes = {}
        const permitidos = esquema[medida] || []
        let preenchidos = 0

        for (const nome of permitidos) {
            const input = tr.querySelector(`[name="${nome}"]`)

            if (input && input.value !== '') {
                preenchidos++
            }
        }

        for (const nome of nomesCampos) {
            const input = tr.querySelector(`[name="${nome}"]`)
            if (!input)
                continue

            const permitido = permitidos.includes(nome)
            const preenchido = input.value !== ''

            if (!permitido) {
                input.classList = 'campo-off'
                input.value = ''
                input.readOnly = true
                continue
            }

            if ((medida === 'm2' || medida === 'm3') && preenchidos >= 2 && !preenchido) {
                input.classList = 'campo-off'
                input.readOnly = true
                continue
            }

            if (input.value !== '')
                dimensoes[nome] = Number(input.value)

            input.classList = 'campo-on'
            input.readOnly = false
        }

        // Temporário;
        const posicao = base.findIndex(item => item.id == id)
        if (posicao !== -1) {
            base[posicao] = {
                ...base[posicao],
                campo: campoRef,
                dimensoes,
                descricaoExtra
            }
        }
    }

}

async function salvarExecucao() {
    const trs = document.querySelectorAll('#body tr')
    if (!trs.length) return

    let orcamento = await recuperarDado('dados_orcamentos', idOrcamento)
    if (!orcamento || !zona1) return
    orcamento.zonas ??= {}

    const itensZona = {}

    for (const tr of trs) {

        const el = (campo) => tr.querySelector(`[name="${campo}"]`) || { value: '', textContent: '' }

        const especialidade = el('especialidade').value
        const descricao = el('campo').value
        const campo = el('campo').selectedOptions?.[0]?.id || ''
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
        const unitario = campoRef?.total || 0
        const total = quantidade * unitario

        // atualiza a tabela
        el('quantidade').textContent = quantidade
        el('unitario').textContent = dinheiro(unitario)
        el('total').textContent = dinheiro(total)
        el('edicao').innerHTML = campo ? `<img onclick="composicoes('${campo}')" src="imagens/lapis.png">` : ''

        // monta objeto para salvar depois
        itensZona[tr.id] = {
            campo,
            mao_obra: campoRef?.mao_obra,
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
    }

    // salva toda a zona de uma vez
    orcamento.zonas[zona1] = itensZona

    await enviar(`dados_orcamentos/${idOrcamento}/zonas/${zona1}`, itensZona)

    // recalcula total geral
    const total_geral = Object.values(orcamento.zonas).reduce((total, zona) => {
        return total + Object.values(zona).reduce((soma, item) => soma + (Number(item.quantidade) || 0) * (Number(item.unitario) || 0), 0)
    }, 0)

    if (total_geral !== orcamento.total_geral)
        await enviar(`dados_orcamentos/${idOrcamento}/total_geral`, total_geral)

}

function comparativoRevisoes(idOrcamento) {

    const orcamento = dados_orcamentos[idOrcamento]
    const revisoes = orcamento.revisoes || {}
    const versaoAtual = orcamento.versao

    const keys = Object.keys(revisoes)
    if (!keys.length) {
        return popup({ mensagem: 'Sem revisões' })
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
    const elemento = `
        <div class="comparativo-revisoes">
            <div class="cmp-topo">
                ${selectHTML}
            </div>
            <div id="cmp-conteudo">
                ${render(keys[0])}
            </div>
        </div>
    `
    popup({ elemento, titulo: 'Comparativo de Revisões' })

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

    const elemento = `
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

    popup({ elemento, titulo: 'Listagem de Materiais' })

    document.querySelector('.total-valor').textContent = dinheiro(total)

}

async function orcamentoFinal(idOrcamento, emJanela) {

    const { zonas, dataContato, dataVisita, cliente } = await recuperarDado('dados_orcamentos', idOrcamento) || {}
    const { nome, numeroContribuinte, email, telefone, moradaFiscal, moradaExecucao } = await recuperarDado('dados_clientes', cliente) || {}

    let totalGeral = 0

    const dt = (data) => {
        if (!data) return '-'
        const [ano, mes, dia] = data.split('-')
        return `${dia}/${mes}/${ano}`
    }

    const dados = {
        'Selecionar Zonas': 'TOTAL (s/iva)',
        'Nome': nome || '',
        'Morada Fiscal': moradaFiscal || '',
        'Morada de Execução': moradaExecucao || '',
        'Nif': numeroContribuinte || '',
        'E-mail': email || '',
        'Contacto': telefone || '',
        'Data contacto': dt(dataContato),
        'Data de visita': dt(dataVisita),
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

    const camposMesclados = Object.values(zonas)
        .flatMap(z =>
            (z.campos || []).map(campo => ({
                ...campo?.campo || {},
                dimensoes: campo.dimensoes,
                idCampo: campo.id,
                descricaoExtra: campo.descricaoExtra,
                ambiente: z.ambiente,
                zona: z.zona
            }))
        )

    const itens = []

    for (const campo of camposMesclados) {

        const { quantidade, zona, idCampo, total, medida, descricaoExtra, especialidade, descricao } = campo || {}
        const totalLinha = total * quantidade

        totalGeral += totalLinha

        itens.push(`
            <tr>
                <td>
                    <div style="${horizontal}; justify-content: start; gap: 0.5rem;">
                        <img onclick="execucoes('${idOrcamento}', '${zona}')" src="imagens/lapis.png" style="width: 1.5rem;">
                        <span>${zona}</span>
                    </div>
                </td>
                <td>${especialidade || ''}</td>
                <td>${descricao || ''}</td>
                <td>${descricaoExtra || ''}</td>
                <td>${medida || ''}</td>
                <td>${quantidade}</td>
                <td>${dinheiro(totalLinha)}</td>
            </tr>
        `)
    }


    const elemento = `
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
                    <tbody>${itens.join('')}</tbody>
                </table>
            </div>
        </div>
    `

    if (emJanela) {
        popup({ elemento, titulo: 'Orçamento' })
        esconderEditaveis(true)
    } else {
        tela.innerHTML = elemento
    }

    document.querySelector('.total-valor').textContent = dinheiro(totalGeral)

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

    if (resposta.mensagem)
        return popup({ mensagem: JSON.stringify(resposta.mensagem) })

    if (resposta.success) {

        orcamento.emailEnviado = {
            usuario: acesso.usuario,
            data: new Date().toLocaleString()
        }

        await enviar(`dados_orcamentos/${idOrcamento}/emailEnviado`, orcamento.emailEnviado)
        await orcamentos(finalizado)
        return popup({ mensagem, titulo: 'Enviado com sucesso', imagem: 'imagens/concluido.png()' })
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

    if (titulo)
        titulo.textContent = gatilho ? 'ORÇAMENTO' : 'Selecionar Zonas'

    editaveis.forEach(e => {
        e.style.display = gatilho ? 'none' : ''
    })

}

async function salvarDescricao(idOrcamento, idCampo, zona) {

    overlayAguarde()

    const descricaoExtra = document.getElementById('descricaoExtra')

    await enviar(`dados_orcamentos/${idOrcamento}/zonas/${zona}/campos/${idCampo}/campo/descricaoExtra`, descricaoExtra.value)

    await orcamentoFinal(idOrcamento)

    removerPopup()
}