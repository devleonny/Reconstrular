async function telaCronograma(idObra) { //29

    const obra = await recuperarDado('dados_obras', idObra) || {}
    const cliente = await recuperarDado('dados_clientes', obra?.cliente) || {}

    titulo.textContent = 'Cronograma'

    function pMin(hhmm) {
        if (!hhmm) return 0
        const [h, m] = hhmm.split(':').map(Number)
        return (h * 60) + (m || 0)
    }

    function avancarDiasUteis(data, dias) {
        const d = new Date(data)
        while (dias > 0) {
            d.setDate(d.getDate() + 1)
            const dia = d.getDay()
            if (dia !== 0 && dia !== 6) dias--
        }
        return d
    }

    const colunas = [
        'Ação', 'Zonas', 'Especialidades', 'Descrição do Serviço', 'Medida',
        'Quantidade', 'Tempo (hh:mm)',
        'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'
    ]

    let duracaoTotal = 0
    let linhasBase = []

    for (const idOrcamento of (obra?.orcamentos_vinculados || [])) {

        const orcamento = await recuperarDado('dados_orcamentos', idOrcamento)

        const camposMesclados = Object.values(orcamento?.zonas || {})
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

        for (const dados of camposMesclados) {

            const { zona, duracao, especialidade, descricao, medida, dimensoes } = dados || {}
            const { quantidade } = calcularQuantidadeTotal(dimensoes)
            const minutos = pMin(duracao) * (quantidade || 0)
            duracaoTotal += minutos

            linhasBase.push({
                zona,
                especialidade: especialidade || '',
                descricao: descricao || '',
                medida: medida || '',
                quantidade: quantidade,
                duracao: calcularDuracao(quantidade, duracao)
            })
        }

    }

    console.log(linhasBase);
    

    const MINUTOS_DIA = 8 * 60
    const DIAS_SEMANA = 5

    const diasUteis = Math.ceil(duracaoTotal / MINUTOS_DIA)
    const semanas = Math.ceil(diasUteis / DIAS_SEMANA)

    const dataInicial = obra?.dtInicio
        ? new Date(obra.dtInicio + 'T00:00')
        : new Date()

    const dataFinal = avancarDiasUteis(dataInicial, diasUteis - 1)
    const dataFinalConvertida = dataFinal
        ? new Date(dataFinal).toLocaleDateString()
        : ''

    const tabInfos = `
        <table class="tabela-obras">
            <tbody>
                <tr>
                    <td colspan="2" style="background: #5b707f; color: #fff; font-size: 1.2rem;">CRONOGRAMA DE OBRA</td>
                    <td colspan="2" style="background: red; color: #fff;">Dias Úteis Estimados</td>
                </tr>
                <tr>
                    <td style="background: #5b707f; color:#fff;">Cliente</td>
                    <td style="background:#fff">${cliente?.nome || '--'}</td>
                    <td rowspan="4" class="dias-uteis">${diasUteis || 0}</td>
                </tr>
                <tr>
                    <td style="background: #5b707f; color: #fff;">Morada de Execução</td>
                    <td>${cliente?.moradaExecucao || '--'}</td>
                </tr>
                <tr>
                    <td style="background: #5b707f; color: #fff;">Data de Início</td>
                    <td>
                        <input type="date" id="dtInicio"
                            value="${obra?.dtInicio || ''}"
                            onchange="salvarDtInicio(this, '${idObra}')">
                    </td>
                </tr>
                <tr>
                    <td style="background: #5b707f; color: #fff;">Data de Fim Previsto</td>
                    <td>${dataFinalConvertida}</td>
                </tr>
            </tbody>
        </table>
    `

    let tabelas = ''
    let cursor = new Date(dataInicial)

    for (let s = 0; s < semanas; s++) {

        let linhas = montarSemana(cursor)
        for (const l of linhasBase) {
            linhas += `
                <tr>
                    <td></td>
                    <td>${l.zona}</td>
                    <td>${l.especialidade}</td>
                    <td>${l.descricao}</td>
                    <td>${l.medida}</td>
                    <td>${l.quantidade}</td>
                    <td name="duracao">${l.duracao}</td>
                    ${['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']
                    .map(d => `<td name="${d}"></td>`).join('')}
                </tr>
            `
        }

        tabelas += `
            <h3>Semana de ${cursor.toLocaleDateString()}</h3>
            <table class="tabela-obras">
                <thead>
                    <tr style="background: #5b707f;">
                        ${colunas.map(c => `<th>${c}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>${linhas}</tbody>
            </table>
        `

        cursor = avancarDiasUteis(cursor, 5)
    }

    tela.innerHTML = `
        <div style="${horizontal}; gap: 2rem;">
            <button>Gravar</button>
            <button style="background-color: red;" onclick="pdfObra('Cronograma')">PDF</button>
            <button onclick="verAndamento('${idObra}', true)">Voltar</button>
        </div>
        <br>
        <div class="acompanhamento">
            <div id="pdf" style="${vertical}; gap: 1rem; width: 100%;">
                ${tabInfos}
                ${tabelas}
            </div>
        </div>
    `

    pintarTabelas()
}

function montarSemana(data) {
    const inicio = new Date(data)
    const tdsFixos = `<td></td>`.repeat(7) // colunas fixas
    let tdsDias = []

    let d = new Date(inicio)
    for (let i = 0; i < 7; i++) {
        tdsDias.push(`<td>${d.toLocaleDateString('pt-BR')}</td>`)
        d.setDate(d.getDate() + 1)
    }

    return `<tr class="linha-semana">${tdsFixos}${tdsDias.join('')}</tr>`
}

function pintarTabelas() {

    const MIN_DIA = 8 * 60
    const diasValidos = ['seg', 'ter', 'qua', 'qui', 'sex']

    const tabelas = [...document.querySelectorAll('.tabela-obras:not(:first-of-type)')]
    if (!tabelas.length) return

    const linhasBase = [...tabelas[0].querySelectorAll('tbody tr')]
        .filter(tr => !tr.classList.contains('linha-semana'))

    let cursorGlobal = 0 // cursor geral entre tabelas

    linhasBase.forEach((linhaBase, indexLinha) => {

        const duracaoEl = linhaBase.querySelector('[name="duracao"]')
        if (!duracaoEl) return

        const [h, m] = duracaoEl.textContent.split(':').map(Number)
        let diasNecessarios = Math.ceil(((h * 60) + m) / MIN_DIA)

        while (diasNecessarios > 0) {

            const tabelaIndex = Math.floor(cursorGlobal / diasValidos.length)
            const diaIndex = cursorGlobal % diasValidos.length

            const tabela = tabelas[tabelaIndex]
            if (!tabela) break

            const linhas = [...tabela.querySelectorAll('tbody tr')]
                .filter(tr => !tr.classList.contains('linha-semana'))

            const linha = linhas[indexLinha]
            if (!linha) break

            const td = linha.querySelector(`[name="${diasValidos[diaIndex]}"]`)
            if (td) td.style.background = '#00ffff'

            cursorGlobal++
            diasNecessarios--
        }
    })
}


async function salvarDtInicio(input, idObra) {

    await enviar(`dados_obras/${idObra}/dtInicio`, input.value)

}

function calcularDuracao(q = 0, d = '00:00') {
    if (!d) return '00:00'
    const [h, m] = d.split(':').map(Number)
    const total = (h * 60 + m) * q
    return [
        String(Math.floor(total / 60)).padStart(2, '0'),
        String(total % 60).padStart(2, '0')
    ].join(':')
}
