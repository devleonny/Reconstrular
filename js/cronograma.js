function toDateInputValue(data) {
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const dia = String(data.getDate()).padStart(2, '0')

    return `${ano}-${mes}-${dia}`
}

function parseDateLocal(valor) {
    if (!valor)
        return new Date()

    if (valor instanceof Date)
        return new Date(
            valor.getFullYear(),
            valor.getMonth(),
            valor.getDate(),
            12,
            0,
            0
        )

    const [ano, mes, dia] = String(valor).slice(0, 10).split('-').map(Number)

    return new Date(ano, mes - 1, dia, 12, 0, 0)
}

function cloneDate(data) {
    return new Date(
        data.getFullYear(),
        data.getMonth(),
        data.getDate(),
        12,
        0,
        0
    )
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

function startOfWeekMonday(data) {
    const d = cloneDate(data)
    const dia = d.getDay()
    const diferenca = dia === 0 ? -6 : 1 - dia

    d.setDate(d.getDate() + diferenca)

    return d
}

function getWeekDates(data) {
    const inicio = startOfWeekMonday(data)

    return Array.from(
        { length: 7 },
        (_, i) => addDays(inicio, i)
    )
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

function formatarDataBR(data) {
    return parseDateLocal(data).toLocaleDateString('pt-BR')
}

function formatarDiaMes(data) {
    const dia = String(data.getDate()).padStart(2, '0')
    const mes = String(data.getMonth() + 1).padStart(2, '0')

    return `${dia}/${mes}`
}

function nomeDiaSemana(data) {
    const nomes = [
        'Dom',
        'Seg',
        'Ter',
        'Qua',
        'Qui',
        'Sex',
        'Sáb'
    ]

    return nomes[data.getDay()]
}

function escapeHtml(texto = '') {
    return String(texto)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}

function corAtividade() {
    return '#ffd84d'
}

function atividadeOcupaDia(atividade, data) {
    if (isWeekend(data))
        return false

    const inicio = parseDateLocal(atividade.inicio)
    const fim = parseDateLocal(atividade.fim)

    return data >= inicio && data <= fim
}

function renderTabelaSemana(atividades, semana, indiceSemana) {
    const headerDias = semana.map(data => {
        const fimDeSemana = isWeekend(data)

        return `
            <th class="cron-dia" style="background: ${fimDeSemana ? '#8c8c8c' : '#d92222'};">
                <div>${nomeDiaSemana(data)}</div>
                <div class="cron-dia-data">${formatarDiaMes(data)}</div>
            </th>
        `
    }).join('')

    const linhas = atividades.map((item, i) => {
        const cor = corAtividade(i)

        const dias = semana.map(data => {
            const fimDeSemana = isWeekend(data)
            const ocupado = atividadeOcupaDia(item, data)

            let fundo = '#fff'

            if (fimDeSemana)
                fundo = '#9b9b9b'

            if (ocupado)
                fundo = cor

            return `<td class="cron-celula" style="background: ${fundo};"></td>`
        }).join('')

        return `
            <tr>
                <td>${escapeHtml(item.zona || item.ambiente || '')}</td>
                <td>${escapeHtml(item.especialidade || '')}</td>
                <td>${escapeHtml(item.descricao || '')}</td>
                <td>${escapeHtml(item.medida || '')}</td>
                <td class="cron-curta">${item.quantidade || 0}</td>
                <td>${item.tempoTotalHHMM || '00:00'}</td>
                <td class="cron-curta">${formatarDataBR(item.inicio)}</td>
                <td class="cron-curta">${formatarDataBR(item.fim)}</td>
                ${dias}
            </tr>
        `
    }).join('')

    return `
        <table class="tabela-obras tabela-cronograma">
            <thead>
                <tr>
                    <th colspan="8" style="background:#5b707f; color:#fff; text-align:left;">
                        Semana ${indiceSemana + 1} - ${formatarDataBR(semana[0])} até ${formatarDataBR(semana[6])}
                    </th>
                    <th colspan="7" style="background:#5b707f;"></th>
                </tr>
                <tr>
                    <th>Zonas</th>
                    <th>Especialidades</th>
                    <th>Descrição do Serviço</th>
                    <th>Medida</th>
                    <th class="cron-curta">Qtd</th>
                    <th>Tempo (hh:mm)</th>
                    <th class="cron-curta">Início</th>
                    <th class="cron-curta">Fim</th>
                    ${headerDias}
                </tr>
            </thead>
            <tbody>
                ${linhas}
            </tbody>
        </table>
    `
}

async function renderCronogramaObra(ordem, idObra) {
    const cronograma = await recuperarDado(
        'mvw_cronograma_obras',
        ordem
    ) || {}

    const atividades = cronograma.atividades || []
    const dataInicio = parseDateLocal(cronograma.dt_inicio)
    const dataFim = parseDateLocal(
        cronograma.dt_fim_previsto || cronograma.dt_inicio
    )

    const semanas = atividades.length
        ? listarSemanas(dataInicio, dataFim)
        : [getWeekDates(dataInicio)]

    const tabInfos = `
        <table class="tabela-obras tabela-cronograma tabela-cronograma-info">
            <tbody>
                <tr>
                    <td colspan="2" style="background: #5b707f; color: #fff; font-size: 1.2rem;">CRONOGRAMA DE OBRA</td>
                    <td colspan="2" style="background: red; color: #fff;">Dias Úteis Estimados</td>
                </tr>
                <tr>
                    <td style="background: #5b707f; color:#fff;">Cliente</td>
                    <td style="background:#fff">${escapeHtml(cronograma.cliente || '')}</td>
                    <td rowspan="4" class="dias-uteis">${cronograma.total_dias_uteis || 0}</td>
                </tr>
                <tr>
                    <td style="background: #5b707f; color: #fff;">Morada de Execução</td>
                    <td>${escapeHtml(cronograma.morada_execucao || '')}</td>
                </tr>
                <tr>
                    <td style="background: #5b707f; color: #fff;">Data de Início</td>
                    <td>
                        <input
                            type="date"
                            id="dtInicio"
                            value="${String(cronograma.dt_inicio || '').slice(0, 10)}"
                            onchange="salvarDtInicio(this, '${idObra}', '${ordem}')">
                    </td>
                </tr>
                <tr>
                    <td style="background: #5b707f; color: #fff;">Data de Fim Previsto</td>
                    <td>${formatarDataBR(cronograma.dt_fim_previsto)}</td>
                </tr>
            </tbody>
        </table>
    `

    const tabelas = semanas
        .map((semana, i) => renderTabelaSemana(atividades, semana, i))
        .join('')

    tela.innerHTML = `
        <div class="acompanhamento">
                <button type="button" class="cronograma-pdf-fixo pdf-exportar-fixo" onclick="pdfObra('Cronograma')" title="Exportar cronograma em PDF" aria-label="Exportar cronograma em PDF"><span>PDF</span></button>

            <div id="pdf" style="${vertical}; width: 100%;">
                ${tabInfos}
                ${tabelas}
            </div>
        </div>
    `
}

async function telaCronograma(idObra) {
    overlayAguarde()

    const obra = await recuperarDado('dados_orcamentos', idObra) || {}
    controles.obraPdf = idObra

    titulo.textContent = 'Cronograma'

    if (!obra.dt_inicio) {
        const hoje = toDateInputValue(new Date())

        await enviar(`dados_orcamentos/${idObra}/dt_inicio`, hoje)
    }

    await renderCronogramaObra(obra.contrato, idObra)

    removerOverlay()
}

async function salvarDtInicio(input, idObra, ordem) {
    await enviar(`dados_orcamentos/${idObra}/dt_inicio`, input.value)

    await renderCronogramaObra(ordem, idObra)
}
