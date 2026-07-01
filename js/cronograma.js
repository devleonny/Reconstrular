function toDateInputValue(data) {
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const dia = String(data.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
}

function parseDateLocal(valor) {
    if (!valor)
        return new Date()

    const [ano, mes, dia] = valor.split('-').map(Number)
    return new Date(ano, mes - 1, dia, 12, 0, 0)
}

function cloneDate(data) {
    return new Date(data.getFullYear(), data.getMonth(), data.getDate(), 12, 0, 0)
}

function addDays(data, dias) {
    const d = cloneDate(data)
    d.setDate(d.getDate() + dias)
    return d
}

function isWeekend(data) {
    const dia = data.getDay()
    return dia === 0 || dia === 6
}

function nextBusinessDay(data) {
    let d = cloneDate(data)

    do {
        d = addDays(d, 1)
    } while (isWeekend(d))

    return d
}

function advanceBusinessDays(data, qtd) {
    let d = cloneDate(data)
    let restantes = qtd

    while (restantes > 0) {
        d = addDays(d, 1)

        if (!isWeekend(d))
            restantes--
    }

    return d
}

function startOfWeekMonday(data) {
    const d = cloneDate(data)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return d
}

function getWeekDates(data) {
    const inicio = startOfWeekMonday(data)
    return Array.from({ length: 7 }, (_, i) => addDays(inicio, i))
}

function formatarDataBR(data) {
    return data.toLocaleDateString('pt-BR')
}

function formatarDiaMes(data) {
    const dia = String(data.getDate()).padStart(2, '0')
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    return `${dia}/${mes}`
}

function nomeDiaSemana(data) {
    const nomes = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    return nomes[data.getDay()]
}

function parseHHMM(texto = '00:00') {
    const [hh = 0, mm = 0] = String(texto).split(':').map(Number)
    return (hh * 60) + mm
}

function minutosParaHHMM(minutos = 0) {
    const hh = Math.floor(minutos / 60)
    const mm = minutos % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function escapeHtml(texto = '') {
    return String(texto)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}

function corAtividade(indice) {
    const cores = [
        '#19dbe3',
        '#24d8ff',
        '#38e27b',
        '#ffd84d',
        '#ffb84d',
        '#ff8a8a',
        '#b998ff'
    ]

    return cores[indice % cores.length]
}

function montarCronogramaAtividades(resultados, dataInicio) {
    let cursor = cloneDate(dataInicio)

    if (isWeekend(cursor))
        cursor = nextBusinessDay(addDays(cursor, -1))

    const atividades = []

    for (const item of resultados) {
        const quantidade = Number(calcularQuantidadeTotal(item.dimensoes)?.quantidade || 0)
        const duracaoMin = parseHHMM(item.duracao || '00:00')
        const tempoTotalMin = duracaoMin * quantidade

        if (!tempoTotalMin)
            continue

        const diasNecessarios = Math.max(1, Math.ceil(tempoTotalMin / 480))
        const inicio = cloneDate(cursor)
        const fim = advanceBusinessDays(inicio, diasNecessarios - 1)

        atividades.push({
            ...item,
            quantidade,
            duracaoMin,
            tempoTotalMin,
            tempoTotalHHMM: minutosParaHHMM(tempoTotalMin),
            diasNecessarios,
            inicio,
            fim
        })

        cursor = nextBusinessDay(fim)
    }

    return atividades
}

function listarSemanas(inicio, fim) {
    const semanas = []
    let cursor = startOfWeekMonday(inicio)
    const limite = startOfWeekMonday(fim)

    while (cursor <= limite) {
        semanas.push(getWeekDates(cursor))
        cursor = addDays(cursor, 7)
    }

    return semanas
}

function atividadeOcupaDia(atividade, data) {
    if (isWeekend(data))
        return false

    return data >= atividade.inicio && data <= atividade.fim
}

function renderTabelaSemana(atividades, semana, indiceSemana) {
    const headerDias = semana.map(data => {
        const fimDeSemana = isWeekend(data)

        return `
            <th style="
                min-width: 84px;
                background: ${fimDeSemana ? '#8c8c8c' : '#d92222'};
                color: #fff;
                text-align: center;
            ">
                <div>${nomeDiaSemana(data)}</div>
                <div style="font-size: .85rem;">${formatarDiaMes(data)}</div>
            </th>
        `
    }).join('')

    const linhas = atividades.map((item, i) => {
        const cor = corAtividade(i)

        const dias = semana.map(data => {
            const fimDeSemana = isWeekend(data)
            const ocupado = atividadeOcupaDia(item, data)

            let estilo = `
                min-width: 84px;
                height: 34px;
                border: 1px solid #bdbdbd;
                background: #fff;
            `

            if (fimDeSemana)
                estilo += 'background: #9b9b9b;'

            if (ocupado)
                estilo += `background: ${cor};`

            return `<td style="${estilo}"></td>`
        }).join('')

        return `
            <tr>
                <td>${escapeHtml(item.zona || item.ambiente || '')}</td>
                <td>${escapeHtml(item.especialidade || '')}</td>
                <td>${escapeHtml(item.descricao || '')}</td>
                <td style="text-align:center;">${escapeHtml(item.medida || '')}</td>
                <td style="text-align:center;">${item.quantidade}</td>
                <td style="text-align:center;">${item.tempoTotalHHMM}</td>
                <td style="text-align:center;">${formatarDataBR(item.inicio)}</td>
                <td style="text-align:center;">${formatarDataBR(item.fim)}</td>
                ${dias}
            </tr>
        `
    }).join('')

    return `
        <table class="tabela-obras" style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
            <thead>
                <tr>
                    <th colspan="9" style="background:#5b707f; color:#fff; text-align:left;">
                        Semana ${indiceSemana + 1} - ${formatarDataBR(semana[0])} até ${formatarDataBR(semana[6])}
                    </th>
                    <th colspan="7" style="background:#5b707f;"></th>
                </tr>
                <tr>
                    <th>Zonas</th>
                    <th>Especialidades</th>
                    <th>Descrição do Serviço</th>
                    <th>Medida</th>
                    <th>Quantidade</th>
                    <th>Tempo (hh:mm)</th>
                    <th>Início</th>
                    <th>Fim</th>
                    ${headerDias}
                </tr>
            </thead>
            <tbody>
                ${linhas}
            </tbody>
        </table>
    `
}

async function renderCronogramaObra(idObra) {
    const obra = await recuperarDado('dados_obras', idObra) || {}
    const { morada_execucao, nome } = await recuperarDado('dados_clientes', obra?.cliente) || {}

    const base = []

    for (const idOrcamento of (obra?.orcamentos_vinculados || [])) {
        const { zonas } = await recuperarDado('dados_orcamentos', idOrcamento) || {}

        if (!zonas)
            continue

        const camposMesclados = Object.values(zonas || {})
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

        base.push(...camposMesclados)
    }

    const pesquisa = await pesquisarDB({
        base,
        substituicoes: [
            {
                path: 'id',
                tabela: 'campos',
                campoBusca: 'id',
                retorno: 'duracao',
                destino: 'duracao'
            }
        ]
    })

    const resultados = pesquisa?.resultados || []
    const dataInicio = obra?.dt_inicio ? parseDateLocal(obra.dt_inicio) : new Date()
    const atividades = montarCronogramaAtividades(resultados, dataInicio)

    const totalDiasUteis = atividades.reduce((acc, item) => acc + item.diasNecessarios, 0)
    const dataFim = atividades.length ? atividades.at(-1).fim : dataInicio
    const semanas = atividades.length
        ? listarSemanas(atividades[0].inicio, dataFim)
        : [getWeekDates(dataInicio)]

    const tabInfos = `
        <table class="tabela-obras">
            <tbody>
                <tr>
                    <td colspan="2" style="background: #5b707f; color: #fff; font-size: 1.2rem;">CRONOGRAMA DE OBRA</td>
                    <td colspan="2" style="background: red; color: #fff;">Dias Úteis Estimados</td>
                </tr>
                <tr>
                    <td style="background: #5b707f; color:#fff;">Cliente</td>
                    <td style="background:#fff">${escapeHtml(nome || '')}</td>
                    <td rowspan="4" class="dias-uteis">${totalDiasUteis}</td>
                </tr>
                <tr>
                    <td style="background: #5b707f; color: #fff;">Morada de Execução</td>
                    <td>${escapeHtml(morada_execucao || '')}</td>
                </tr>
                <tr>
                    <td style="background: #5b707f; color: #fff;">Data de Início</td>
                    <td>
                        <input
                            type="date"
                            id="dtInicio"
                            value="${obra?.dt_inicio || toDateInputValue(new Date())}"
                            onchange="salvarDtInicio(this, '${idObra}')">
                    </td>
                </tr>
                <tr>
                    <td style="background: #5b707f; color: #fff;">Data de Fim Previsto</td>
                    <td>${formatarDataBR(dataFim)}</td>
                </tr>
            </tbody>
        </table>
    `

    const tabelas = semanas
        .map((semana, i) => renderTabelaSemana(atividades, semana, i))
        .join('')

    tela.innerHTML = `
        <div style="${horizontal}; gap: 2rem;">
            <button style="background-color: red;" onclick="pdfObra('Cronograma')">PDF</button>
            <button onclick="verAndamento('${idObra}', true)">Voltar</button>
        </div>
        <br>
        <div class="acompanhamento">
            <div id="pdf" style="${vertical}; width: 100%;">
                ${tabInfos}
                ${tabelas}
            </div>
        </div>
    `
}

async function telaCronograma(idObra) {

    overlayAguarde()
    const obra = await recuperarDado('dados_obras', idObra) || {}

    titulo.textContent = 'Cronograma'

    if (!obra?.dt_inicio) {
        const hoje = toDateInputValue(new Date())
        await enviar(`dados_obras/${idObra}/dt_inicio`, hoje)
    }

    await renderCronogramaObra(idObra)

    removerOverlay()
}

async function salvarDtInicio(input, idObra) {
    await enviar(`dados_obras/${idObra}/dt_inicio`, input.value)
    await renderCronogramaObra(idObra)
}