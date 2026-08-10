
const optionsSelect = (obj, chave) => {
    if (!obj) return
    let elemento = ''
    const ano = new Date().getFullYear()
    for (const [id, info] of Object.entries(obj).sort()) {
        const valor = chave ? info[chave] : info
        elemento += `<option id="${id}" ${ano == valor ? 'selected' : ''} value="${id}">${valor}</option>`
    }
    return elemento
}

async function mostrarFolha(idColaborador) {

    titulo.textContent = 'Registo de Ponto'
    telaAtiva = 'registro_de_ponto'

    const colaborador = await recuperarDado('dados_colaboradores', idColaborador)

    const esquema = [
        'Empresa',
        'Nome',
        'Nif',
        'Segurança Social',
        'Mês',
        'Horas Estimadas Dias Úteis',
        'Horas Reais',
        'Dias Trabalhados',
        'Horas Diárias',
        'Hora de Entrada',
        'Hora de Saída',
        'Hora de Refeição'
    ]

    const ths = ['Data', 'Dia da Semana', 'Entrada', 'Saída', 'Total', 'Diferença']
        .map(op => `<th>${op}</th>`).join('')

    const trs = esquema
        .map(op => `
            <tr>
                <td><span>${op}:</span></td>
                <td><span name="${op}"></span></td>
            </tr>
            `).join('')

    const modelo = (titulo, elemento) => `
        <div class="campos">
            <span>${titulo}</span>
            ${elemento}
        </div>
    `

    const acumulado = `
        
        <div class="painelFiltros">
            ${modelo('Ano', `<select name="ano" onchange="criarFolha('${idColaborador}')">${optionsSelect(anos)}</select>`)}
            ${modelo('Mês', `<select name="mes" onchange="criarFolha('${idColaborador}')">${optionsSelect(meses)}</select>`)}
            <img src="imagens/pdf.png" onclick="gerarPdfFolha('${idColaborador}')">
            <button onclick="telaColaboradores()">Voltar</button>
        </div>

        <div class="contornoFolha">
            <div class="folha">
                <div class="cabecalho">
                    <h1>Registo de Ponto</h1>
                    <img src="https://i.imgur.com/9MA4A99.png">
                </div>
                <div class="tabCab">
                    <table>
                        <tbody>
                            ${trs}
                        </tbody>
                    </table>
                </div>
                <br>
                <div class="tabelaPonto">
                    <table>
                        <thead>
                            <tr>${ths}</tr>
                        </thead>
                        <tbody id="bodyFolha"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `

    tela.innerHTML = acumulado

    const obVal = (name) => {
        const el = document.querySelector(`[name="${name}"]`)
        if (!el) return null
        return el
    }

    obVal('Empresa').textContent = 'Enumeratributo Unipessoal Lda'
    obVal('Nome').textContent = colaborador.nome
    obVal('Nif').textContent = colaborador.numero_contribuinte
    obVal('Segurança Social').textContent = colaborador.seguranca_social

    criarFolha(idColaborador)

}

async function criarFolha(idColaborador) {

    const obVal = (name) => {
        const el = document.querySelector(`[name="${name}"]`)
        if (!el) return null
        return el
    }

    const ano = Number(document.querySelector('[name="ano"]').value)
    const mesString = document.querySelector('[name="mes"]').value
    const mes = Number(mesString)
    const ultimoDia = new Date(ano, mes, 0).getDate()
    const body = document.getElementById('bodyFolha')
    const horaEntrada = '08:00'
    const horaSaida = '17:00'
    const horasDiarias = 8

    // Registros;
    const pesquisa = await pesquisarDB({
        base: 'registros_ponto',
        limite: 999,
        filtros: {
            colaborador: { op: '=', value: idColaborador },
            ano: { op: '=', value: ano },
            mes: { op: '=', value: mes }
        }
    })

    function estilo(hora, tipo) {
        let estilo = ''

        const [h, m] = hora.split(':').map(Number)

        if (h === 0 && m === 0 || hora == '')
            return ''

        if (tipo === 'entrada') {
            const [hE, mE] = horaEntrada.split(':').map(Number)
            if (h > hE || (h === hE && m > mE)) {
                estilo = 'negativo'
            } else {
                estilo = 'positivo'
            }

        } else if (tipo === 'saida') {
            const [hS, mS] = horaSaida.split(':').map(Number)
            if (h < hS || (h === hS && m < mS)) {
                estilo = 'negativo'
            } else {
                estilo = 'positivo'
            }

        } else if (tipo === 'total') {
            if (h < horasDiarias || (h === horasDiarias && m < 0)) {
                estilo = 'negativo'
            } else {
                estilo = 'positivo'
            }
        }

        return estilo
    }

    let trs = ''
    let diasUteis = 0
    let minutosRealizados = 0

    for (let i = 1; i <= ultimoDia; i++) {

        const dia = i < 10 ? `0${i}` : i
        const data = new Date(ano, mes - 1, i)
        const indiceSem = data.getDay()
        const diaDaSemana = semana[indiceSem]

        const entradas = pesquisa.resultados
            .filter(registro => registro.dia == i)
            .map(registro => registro.hora)
            .sort((a, b) => a.localeCompare(b))  // 'HH:MM' ordena certo como string

        const hora1 = entradas[0] || '00:00'
        const hora2 = entradas[1]
            ? entradas[1]
            : (entradas[0] && !entradas[1]) ? '17:00' : '00:00'

        const resultado = calcularHoras(hora1, hora2, '08:00')
        const [h, m] = resultado.total.split(':').map(Number)
        const fds = indiceSem == 0 || indiceSem == 6
        const minutosDiarios = h * 60 + m
        minutosRealizados += minutosDiarios
        const estiloDiferenca = resultado.diferenca.includes('-') ? 'negativo' : 'positivo'

        if (!fds)
            diasUteis++

        trs += `
        <tr data-colaborador="${idColaborador}" data-dia="${dia}" data-mes="${mesString}" data-ano="${ano}">
            <td>${data.toLocaleDateString()}</td>
            <td style="${fds ? 'font-weight: bold;' : ''}">${diaDaSemana}</td>
            <td>
                <span class="${estilo(hora1, 'entrada')}">${hora1}</span>
            </td>
            <td>
                <span class="${estilo(hora2, 'saida')}">${hora2}</span>
            </td>
            <td>
                <div style="${horizontal}; gap: 0.5rem;">
                    <span class="${estilo(resultado.total, 'total')}">${resultado.total}</span>
                    <img style="width: 1.5rem;" onclick="registroHoras(${i}, ${mes}, ${ano}, '${idColaborador}')" src="imagens/lapis.png">
                </div>
            </td>
            <td><span class="${estiloDiferenca}">${resultado.diferenca}</span></td>
        </tr>   
        `
    }

    const diasTrabalhados = Math.floor(minutosRealizados / (60 * 8));
    const horas = Math.floor(minutosRealizados / 60);
    const minutos = minutosRealizados % 60;

    obVal('Hora de Entrada').textContent = horaEntrada
    obVal('Hora de Saída').textContent = horaSaida
    obVal('Hora de Refeição').textContent = '01:00'
    obVal('Horas Diárias').textContent = '08:00'
    obVal('Dias Trabalhados').textContent = diasTrabalhados
    obVal('Horas Reais').textContent = (horas == 0 && minutos == 0) ? '00:00' : `${horas}:${minutos}`
    obVal('Mês').textContent = meses[mesString]
    obVal('Horas Estimadas Dias Úteis').textContent = `${horasDiarias * diasUteis}:00`

    body.innerHTML = trs

}

async function registroHoras(dia, mes, ano, idColaborador) {

    try {

        overlayAguarde()

        const pesquisa = await pesquisarDB({
            base: 'registros_ponto',
            limite: 999,
            filtros: {
                colaborador: { op: '=', value: idColaborador },
                ano: { op: '=', value: ano },
                mes: { op: '=', value: mes },
                dia: { op: '=', value: dia }
            }
        })

        const marcacoes = !pesquisa.resultados.length
            ? [{ hora: '00:00' }, { hora: '00:00' }]
            : pesquisa.resultados.length == 1
                ? [...pesquisa.resultados, { hora: '00:00' }]
                : pesquisa.resultados

        const inputs = marcacoes
            .sort((a, b) => a.hora.localeCompare(b.hora))
            .map(registro => `<input data-id="${registro?.id || crypto.randomUUID()}" name="horas" type="time" value="${registro?.hora || '00:00'}">`)
            .join('')

        const linhas = [
            {
                texto: 'Marcações',
                elemento: inputs
            }
        ]

        const botoes = [
            { texto: 'Salvar', img: 'concluido', funcao: `salvarHoras(${dia}, ${mes}, ${ano}, '${idColaborador}')` }
        ]

        popup({ linhas, botoes, titulo: 'Edição de Horas' })

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao abrir os registros: Fale com o suporte.' })
    }

}


async function salvarHoras(dia, mes, ano, idColaborador) {

    try {
        overlayAguarde()

        const horas = [...document.querySelectorAll('[name="horas"]')]

        await Promise.all(horas.map(async (inputHora) => {

            const hora = inputHora.value
            const id = inputHora.dataset.id

            await enviar(`registros_ponto/${id}`, { hora, dia, mes, ano, colaborador: idColaborador })
        }))

        await criarFolha(idColaborador)
        removerPopup()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao salvar as horas: Fale com o suporte.' })
    }

}

function calcularHoras(hora1, hora2, esperado) {

    const [h1, m1] = hora1.split(':').map(Number);
    const [h2, m2] = hora2.split(':').map(Number);
    const [he, me] = esperado.split(':').map(Number);

    const minutos1 = h1 * 60 + m1;
    const minutos2 = h2 * 60 + m2;

    // diferença entre maior e menor
    const totalMinutos = Math.abs(minutos1 - minutos2);
    const totalHoras = Math.floor(totalMinutos / 60);
    const totalMin = totalMinutos % 60;

    const esperadoMinutos = he * 60 + me;
    const diffMinutos = totalMinutos - esperadoMinutos;
    const sinal = diffMinutos >= 0 ? '' : '-';
    const absDiff = Math.abs(diffMinutos);
    const diffHoras = Math.floor(absDiff / 60);
    const diffMin = absDiff % 60;

    return {
        total: `${String(totalHoras).padStart(2, '0')}:${String(totalMin).padStart(2, '0')}`,
        diferenca: `${sinal}${String(diffHoras).padStart(2, '0')}:${String(diffMin).padStart(2, '0')}`
    };
}

function gerarTodosPDFs() {

    const opMeses = Object.entries({ '': '', ...meses })
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([m, mes]) => `<option value="${m}">${mes}</option>`)
        .join('')

    popup({
        imagem: 'imagens/relogio.png',
        mensagem: `
            <div style="${vertical}; gap: 5px;">

                <span>Selecione o ano e/ou mês:</span>
                
                <select name="pdf_ano">${['', '2026'].map(o => `<option value="${o}">${o}</option>`).join('')}</select>
                <select name="pdf_mes">${opMeses}</select>

            </div>
        `,
        botoes: [
            {
                texto: 'Baixar',
                funcao: 'gerarPdfFolha()',
                img: 'concluido'
            }
        ]
    })

}

async function gerarPdfFolha(idColaborador) {

    try {

        overlayAguarde()

        const mes = document.querySelector(`[name="${!idColaborador ? 'pdf_' : ''}mes"]`).value
        const ano = document.querySelector(`[name="${!idColaborador ? 'pdf_' : ''}ano"]`).value

        const req = {
            ...(idColaborador ? { idColaborador } : {}),
            ...(mes ? { mes } : {}),
            ...(ano ? { ano } : {})
        }

        await baixarFolha(req)

        removerTodosPopups()

    } catch (err) {
        console.error(err)
        popup({ mensagem: `Falha ao baixar PDFs: Fale com o suporte.` })
    }
}

async function baixarFolha(req = null) {

    overlayAguarde()

    const { token } = JSON.parse(localStorage.getItem('acesso')) || {}

    const resposta = await fetch(`${api}/folha-pdf`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(req)
    })

    if (!resposta.ok) {
        const textoErro = await resposta.text()

        let mensagemErro = textoErro

        try {
            const erroJson = JSON.parse(textoErro)

            mensagemErro =
                erroJson.mensagem ||
                textoErro
        } catch (err) {

            console.log(err)
            // A resposta não era JSON
        }

        return popup({
            mensagem: mensagemErro ||
                `Erro HTTP ${resposta.status}`
        })
    }

    const contentDisposition =
        resposta.headers.get(
            'Content-Disposition'
        )

    if (!contentDisposition) {
        return popup({
            mensagem:
                'A API não enviou o nome do arquivo.'
        })
    }

    const resultado = contentDisposition.match(
        /filename="([^"]+)"/i
    )

    if (!resultado || !resultado[1]) {

        return popup({
            mensagem:
                'A API enviou um nome de arquivo inválido.'
        })
    }

    const blob = await resposta.blob()

    if (!blob.size) {
        return popup({
            mensagem:
                'A API retornou um arquivo vazio.'
        })
    }

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')

    link.href = url
    link.download = resultado[1]

    document.body.appendChild(link)
    link.click()
    link.remove()

    setTimeout(() => {
        URL.revokeObjectURL(url)
    }, 100)

    removerOverlay()

}