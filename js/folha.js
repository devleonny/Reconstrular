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

const optionsSelect = (obj) => {
    if (!obj) return
    let elemento = ''
    for (const [id, info] of Object.entries(obj).sort()) {
        elemento += `<option value="${id}">${info}</option>`
    }
    return elemento
}

async function mostrarFolha(idColaborador) {

    titulo.textContent = 'Registo de Ponto'

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
            <img src="imagens/pdf.png" onclick="gerarPDF('${idColaborador}', '${colaborador.nome}')">
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
    const telaInterna = document.querySelector('.telaInterna')
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
        const hora2 = entradas[1] || '00:00'
        const resultado = calcularHoras(hora1, hora2, '08:00')
        const [h, m] = resultado.total.split(':').map(Number)
        const fds = indiceSem == 0 || indiceSem == 6
        const minutosDiarios = h * 60 + m
        minutosRealizados += minutosDiarios
        const estiloDiferenca = resultado.diferenca.includes('-') ? 'negativo' : 'positivo'

        if (!fds) diasUteis++

        trs += `
        <tr>
            <td>${data.toLocaleDateString()}</td>
            <td style="${fds ? 'font-weight: bold;' : ''}">${diaDaSemana}</td>
            <td><span class="${estilo(hora1, 'entrada')}">${hora1}</span></td>
            <td><span class="${estilo(hora2, 'saida')}">${hora2}</span></td>
            <td><span class="${estilo(resultado.total, 'total')}">${resultado.total}</span></td>
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

function cloneWithInlineStyles(node) {
    const clone = node.cloneNode(true);

    const apply = (src, dst) => {
        const cs = getComputedStyle(src);
        let css = '';
        for (let i = 0; i < cs.length; i++) {
            const p = cs[i];
            css += `${p}:${cs.getPropertyValue(p)};`;
        }
        dst.setAttribute('style', css);
    };

    apply(node, clone);
    const srcAll = node.querySelectorAll('*');
    const dstAll = clone.querySelectorAll('*');
    for (let i = 0; i < srcAll.length; i++) apply(srcAll[i], dstAll[i]);

    return clone;
}

async function gerarPDF(idColaborador, nome) {

    overlayAguarde()
    const mes = document.querySelector('[name="mes"]').value
    const ano = document.querySelector('[name="ano"]').value

    return new Promise((resolve, reject) => {

        fetch(`${api}/documentos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dados: {
                    ano,
                    mes,
                    mesTexto: meses[mes],
                    idColaborador
                },
                documento: 'folha',
                servidor: 'RECONST'
            })
        })
            .then(response => response.blob())
            .then(blob => {
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.href = url;
                link.download = `${nome} - ${ano} - ${meses[mes]}.pdf`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
                removerOverlay()
                resolve()
            })
            .catch(err => {
                console.error("Erro ao gerar PDF:", err)
                popup(mensagem(`Falha no processo: ${err}`), 'Alerta')
                reject()
            });
    })
}

async function confimacaoZipPdf() {
    const acumulado = `
    <div class="popupPdfZip">
        <span>Selecione o período</span>
        <select name="ano">${optionsSelect(anos)}</select>
        <select name="mes">${optionsSelect(meses)}</select>

        <div style="${vertical}; gap: 3px;">
            <div style="${horizontal}; gap: 3px;">
                <input type="radio" name="modalidade" value="baixar">
                <span> Baixar agora </span>
            </div>
            <div style="${horizontal}; gap: 3px;">
                <input type="radio" name="modalidade" value="email">
                <span> Receber por E-mail </span>
            </div>
        </div>

        <button onclick="gerarTodosPDFs()">Confirmar</buttton>
    </div>
    `

    popup(acumulado, 'Baixar folhas compactadas em .zip')
}

async function gerarTodosPDFs() {
    overlayAguarde();
    const modalidade = document.querySelector('input[name="modalidade"]:checked').value
    const body = document.getElementById('body')
    const trs = body.querySelectorAll('tr')
    let colaboradores = []

    for (const tr of trs) {
        if (tr.style.display == 'none') continue
        const nome = tr.querySelectorAll('span')[0].textContent
        colaboradores.push({ idColaborador: tr.id, nome })
    }

    const mes = document.querySelector('[name="mes"]').value;
    const ano = document.querySelector('[name="ano"]').value;
    let requisicao = {
        colaboradores,
        documento: "folha",
        servidor: "RECONST",
        ano,
        mes,
        mesTexto: meses[mes]
    }

    if (modalidade == 'email') requisicao.email = 'lipe.leonny@live.com'

    if (!requisicao.email) {
        fetch(`${api}/documentos-massa`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requisicao)
        })
            .then(res => res.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `folhas - ${ano} - ${meses[mes]}.zip`;
                link.click();
                URL.revokeObjectURL(url);
                removerOverlay();
            });
    } else {
        fetch(`${api}/documentos-massa`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requisicao)
        })
            .then(res => res.json())
            .then(data => {
                popup(mensagem(data.mensagem, 'concluido'), 'Envio por E-mail')
            });
    }

}
