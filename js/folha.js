const meses = {
    '01': 'Janeiro',
    '02': 'Fevereiro',
    '03': 'Março',
    '04': 'Abril',
    '05': 'Maio',
    '06': 'Junho',
    '07': 'Julho',
    '08': 'Agosto',
    '09': 'Setembro',
    '10': 'Outubro',
    '11': 'Novembro',
    '12': 'Dezembro'
}

const semana = {
    0: 'Domingo',
    1: 'Segunda',
    2: 'Terça',
    3: 'Quarta',
    4: 'Quinta',
    5: 'Sexta',
    6: 'Sábado'
}

const anos = {
    '2025': 2025,
    '2026': 2026
}

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
            <img src="imagens/pdf.png" onclick="gerarTodosPDFs('${idColaborador}', '${colaborador.nome}')">
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

    telaInterna.innerHTML = acumulado

    const obVal = (name) => {
        const el = document.querySelector(`[name="${name}"]`)
        if (!el) return null
        return el
    }

    obVal('Empresa').textContent = 'Enumeratributo Unipessoal Lda'
    obVal('Nome').textContent = colaborador.nome
    obVal('Nif').textContent = colaborador.numeroContribuinte
    obVal('Segurança Social').textContent = colaborador.segurancaSocial

    criarFolha(idColaborador)

}

async function criarFolha(idColaborador) {

    const obVal = (name) => {
        const el = document.querySelector(`[name="${name}"]`)
        if (!el) return null
        return el
    }

    const colaborador = await recuperarDado('dados_colaboradores', idColaborador)
    let folha = colaborador?.folha || {}
    const ano = Number(document.querySelector('[name="ano"]').value)
    const mesString = document.querySelector('[name="mes"]').value
    const mes = Number(mesString)
    const ultimoDia = new Date(ano, mes, 0).getDate()
    const body = document.getElementById('bodyFolha')
    const horaEntrada = '08:00'
    const horaSaida = '17:00'
    const horasDiarias = 8

    function estilo(hora, tipo) {
        let estilo = ''

        const [h, m] = hora.split(':').map(Number)

        if (h === 0 && m === 0 || hora == '') return ''

        if (tipo === 'entrada') {
            const [hE, mE] = horaEntrada.split(':').map(Number)
            if (h > hE || (h === hE && m > mE)) {
                estilo = 'negativo'
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
        const entradas = folha?.[ano]?.[mesString]?.[dia] || ['00:00', '00:00']
        const hora1 = entradas[0] || '00:00'
        const hora2 = entradas[1] ? entradas[1] : (entradas[0] && !entradas[1]) ? '17:00' : '00:00'
        const resultado = calcularHoras(hora1, hora2, '08:00')
        const [h, m] = resultado.total.split(':').map(Number)
        const fds = indiceSem == 0 || indiceSem == 6
        const minutosDiarios = h * 60 + m
        minutosRealizados += minutosDiarios
        const estiloDiferenca = resultado.diferenca.includes('-') ? 'negativo' : 'positivo'

        if (!fds) diasUteis++

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
                    <img data-controle="editar" style="width: 1.5rem;" onclick="registroHoras(this)" src="imagens/lapis.png">
                    <span class="${estilo(resultado.total, 'total')}">${resultado.total}</span>
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

    // Regras de validação;
    validarRegrasAcesso()

}

let sData = {}

async function registroHoras(img) {

    const tr = img.closest('tr')

    const dia = tr.dataset.dia
    const mes = tr.dataset.mes
    const ano = tr.dataset.ano
    const idColaborador = tr.dataset.colaborador

    // Salve Data;
    sData = { dia, mes, ano, idColaborador }

    const colaborador = await recuperarDado('dados_colaboradores', idColaborador)
    let marcacoes = colaborador?.folha?.[ano]?.[mes]?.[dia] || ['00:00', '00:00']
    if (marcacoes.lenght == 1) marcacoes.push('00:00')
    const inputs = marcacoes.map(m => `<input name="horas" type="time" value="${m}">`).join('')

    const acumulado = `
        <div style="background-color: #d2d2d2; min-width: 200px; ${vertical}; gap: 0.5rem; padding: 1rem;">

            <span>Marcações</span>
            <hr>
            <div style="${horizontal}; gap: 2rem;">
                ${inputs}
                <img onclick="salvarHoras('${idColaborador}')" src="imagens/concluido.png">
            </div>

        </div>
    `

    popup(acumulado, 'Edição de Horas', true)
}


async function salvarHoras() {

    overlayAguarde()

    const inputs = document.querySelectorAll('[name="horas"]')
    const horas = []
    for (const inp of inputs) horas.push(inp.value)

    const colaborador = await recuperarDado('dados_colaboradores', sData.idColaborador)
    colaborador.folha ??= {}
    colaborador.folha[sData.ano] ??= {}
    colaborador.folha[sData.ano][sData.mes] ??= {}
    colaborador.folha[sData.ano][sData.mes][sData.dia] = horas
    await inserirDados({ [sData.idColaborador]: colaborador }, 'dados_colaboradores')
    enviar(`dados_colaboradores/${sData.idColaborador}/folha/${sData.ano}/${sData.mes}/${sData.dia}`, horas)

    await mostrarFolha(sData.idColaborador)

    removerPopup()

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

async function gerarTodosPDFs(idColaborador, nome) {
    try {
        overlayAguarde()

        const hoje = new Date()
        const mes = document.querySelector('[name="mes"]').value || hoje.getMonth()
        const ano = document.querySelector('[name="ano"]').value || hoje.getFullYear()

        let colaboradores = []

        // Se o colaborador específico não for informado, então a função percorre as linhas visíveis;
        if (!idColaborador) {
            const trs = document.querySelectorAll('#body tr')
            for (const tr of trs) {
                if (tr.style.display == 'none') continue
                const nome = tr.querySelectorAll('span')[0].textContent
                colaboradores.push({ idColaborador: tr.id, nome })
            }
        } else {
            colaboradores = [{ idColaborador, nome }]
        }

        console.log(colaboradores);
        

        const requisicao = {
            colaboradores,
            servidor,
            ano,
            mes,
            mesTexto: meses[mes]
        }

        const resposta = await fetch(`${api}/folhas-em-massa`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requisicao)
        })

        // erro HTTP
        if (!resposta.ok) {
            removerOverlay()
            return popup(mensagem(`Erro: ${resposta.status} - Falha ao gerar os PDFs`), 'Erro', true)
        }

        const contentType = resposta.headers.get('content-type') || ''

        if (contentType.includes('application/json')) {
            const dados = await resposta.json()
            console.log(dados);

            if (dados.mensagem) {
                removerOverlay()
                return popup(mensagem(dados.mensagem), 'Alerta', true)
            }
        }

        // fluxo DOWNLOAD
        const blob = await resposta.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `folhas - ${ano} - ${meses[mes]}.tar`
        link.click()
        URL.revokeObjectURL(url)
        removerOverlay()
        return

    } catch (err) {
        popup(mensagem(`Falha ao gerar PDFs<br><small>${err.message}</small>`), 'Erro', true)
    }
}
