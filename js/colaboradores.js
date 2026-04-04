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
    '2026': 2026,
    '2026': 2026
}

async function telaColaboradores() {

    telaAtiva = 'colaboradores'
    titulo.textContent = 'Colaboradores'

    const btnExtras = `
        <button onclick="gerarTodosPDFs()">Folhas de Ponto.pdf</button>
        <button onclick="excelColaboradores()">Trabalhadores.xlsx</button>
        <button onclick="adicionarColaborador()">Adicionar</button>
    `

    const colunas = {
        'Nome Completo': { chave: 'nome' },
        'Telefone': { chave: 'telefone' },
        'Obra Alocada': {},
        'Distrito': {},
        'Cidade': { chave: 'snapshots.cidade' },
        'Status': { chave: 'status', tipoPesquisa: 'select' },
        'Especialidade': { chave: 'especialidade' },
        'Folha de Ponto': {},
        'Editar': {}
    }

    const tabela = await modTab({
        colunas,
        pag: 'colaboradores',
        btnExtras,
        base: 'dados_colaboradores',
        body: 'bodyColaboradores',
        criarLinha: 'criarLinhaColaboradores'
    })

    tela.innerHTML = tabela

    await paginacao()

}

function labelStatus(st) {

    switch (st) {
        case 'Baixa Médica':
            return 'baixa-medica'
        case 'Ativo':
            return 'ativo'
        case 'Não Ativo':
            return 'invalido'
        default:
            return 'impedido'
    }

}
async function criarLinhaColaboradores(colaborador) {

    const { id, cidade } = colaborador || {}

    const dCidade = await recuperarDado('cidades', cidade) || {}

    const algoPendente = (!colaborador.epi || !colaborador.exame || !colaborador.contratoObra)
    const especialidades = (colaborador?.especialidade || [])
        .map(op => `<span>• ${op}</span>`)
        .join('')

    const estilo = labelStatus(colaborador?.status)

    const tds = `
        <td>
            <div class="camposTd">
                <img src="imagens/${algoPendente ? 'exclamacao' : 'doublecheck'}.png">
                <span>${colaborador?.nome || ''}</span>
            </div>
        </td>
        <td>${colaborador?.telefone || ''}</td>
        <td></td>
        <td>${dCidade.distrito || ''}</td>
        <td>${dCidade?.nome || ''}</td>
        <td>
            <span class="${estilo}">${colaborador?.status || ''}</span>
        </td>
        <td>
            <div style="${vertical}; gap: 2px;">
                ${especialidades}
            </div>
        </td>
        <td>
            <img src="imagens/relogio.png" onclick="mostrarFolha('${id}')">
        </td>
        <td>
            <img src="imagens/pesquisar.png" data-controle="editar" onclick="adicionarColaborador('${id}')">
        </td>
    `

    return `<tr>${tds}</tr>`
}

async function adicionarColaborador(id) {

    const colaborador = await recuperarDado('dados_colaboradores', id) || {}

    const listas = {
        status: ['Ativo', 'Baixa Médica', 'Não Ativo', 'Impedido'],
        documento: ['Cartão de Cidadão', 'Passaporte', 'Título de residência'],
        especialidade: ['Pedreiros', 'Ladrilhadores', 'Pintor', 'Estucador', 'Pavimento Laminado', 'Eletricista Certificado', 'Ajudante', 'Teto Falso e Paredes em Gesso Cartonado', 'Canalizador', 'Carpinteiro']
    }

    function retornarCaixas(name) {

        let opcoesStatus = ''
        const espc = name == 'especialidade'

        for (const op of listas[name]) {
            let checked = false

            const especialidades = colaborador?.especialidade || []
            if ((espc && especialidades.includes(op)) || colaborador?.[name] == op) {
                checked = true
            }

            opcoesStatus += `
            <div class="opcaoStatus">
                <input ${regras} value="${op}" 
                type="${espc ? 'checkbox' : 'radio'}" 
                name="${name}" 
                ${checked ? 'checked' : ''}>
                <span style="text-align: left;">${op}</span>
            </div>
            `
        }

        return `
            <div name="${name}_bloco" style="${vertical}; gap: 5px;">
                ${opcoesStatus}
            </div>`

    }

    const regras = `oninput="verificarRegras()"`
    const caixaStatus = retornarCaixas('status')
    const caixaEspecialidades = retornarCaixas('especialidade')
    const caixaDocumentos = `
        <div style="${vertical}; gap: 1rem;">
            ${retornarCaixas('documento')} 
            <input ${regras} value="${colaborador?.numeroDocumento || ''}" name="numeroDocumento" placeholder="Número do documento">
        </div>
        `
    const divAnexos = (chave) => {
        const anexos = colaborador?.[chave] || {}
        let anexoString = ''
        for (const [, anexo] of Object.entries(anexos)) {
            anexoString += criarAnexoVisual(anexo)
        }
        return `<div style="${vertical}">${anexoString}</div>`
    }

    // EPI
    let blocoEPI = `
    <div style="${vertical}; margin-bottom: 1vw;">
        <button onclick="formularioEPI('${id}')">Inserir EPI</button>
    </div>
    `
    if (colaborador.epi) {

        let camposEpi = ''
        for (const [equipamento, dados] of Object.entries(colaborador?.epi?.equipamentos || {})) {
            camposEpi += `
                <div style="${vertical}; gap: 2px;">
                    <span><strong>${equipamento.toUpperCase()}</strong></span>
                    <span>• Quantidade: ${dados.quantidade}</span>
                    <span>• Tamanho: ${dados.tamanho}</span>
                </div>
            `
        }

        blocoEPI += `
        <div class="epis">
            <div style="${horizontal}; justify-content: space-between; width: 100%;">
                <div style="${vertical}">
                    ${camposEpi}
                </div>
                <img src="imagens/pdf.png" onclick="abrirEPI('${id}')">
            </div>
            <hr style="width: 100%;">
            <span>Inserido em: ${new Date(colaborador.epi.data).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })}</span>
        </div>
    `
    }

    const cidade = await recuperarDado('cidades', colaborador?.cidade) || null
    const campoCidade = cidade
        ? `${cidade.nome}\n${cidade.distrito}`
        : 'Selecione'

    controlesCxOpcoes.cidade = {
        base: 'cidades',
        colunas: {
            'Cidade': { chave: 'nome' },
            'Distrito': { chave: 'distrito' },
            'Zona': { chave: 'zona' },
            'Area': { chave: 'area' }
        },
        retornar: ['nome', 'distrito']
    }

    const linhas = [
        { texto: 'Nome Completo', elemento: `<textarea ${regras} name="nome" placeholder="Nome Completo">${colaborador?.nome || ''}</textarea>` },
        { texto: 'Data de Nascimento', elemento: `<input ${regras} value="${colaborador?.dataNascimento || ''}" type="date" name="dataNascimento">` },
        { texto: 'Morada', elemento: `<textarea ${regras} name="morada" placeholder="Morada">${colaborador?.morada || ''}</textarea>` },
        {
            texto: 'Cidade',
            elemento: `
                <span class="opcoes" ${cidade ? `id="${colaborador.cidade}"` : ''} name="cidade" onclick="cxOpcoes('cidade')">${campoCidade}</span>`
            },
        { 
            texto: 'Apólice de Seguro', 
            elemento: `<input value="0010032495" name="apolice" placeholder="Número da Apólice" readOnly>` 
        },
        { 
            texto: 'Telefone', 
            elemento: `<input ${regras} value="${colaborador?.telefone || ''}" name="telefone" placeholder="Telefone">` 
        },
        { 
            texto: 'E-mail', 
            elemento: `<textarea ${regras} name="email" placeholder="E-mail">${colaborador?.email || ''}</textarea>` 
        },
        {
            texto: 'Obra Alocada',
            elemento: `<span name="obra" class="opcoes" onclick="cxOpcoes('obra')">Selecione</span>`
        },
        { texto: 'Documento', elemento: caixaDocumentos },
        { 
            texto: 'Número de Contribuinte', 
            elemento: `<input ${regras} value="${colaborador?.numeroContribuinte || ''}" name="numeroContribuinte" placeholder="Máximo de 9 dígitos">` 
        },
        { 
            texto: 'Segurança Social', 
            elemento: `<input ${regras} value="${colaborador?.segurancaSocial || ''}" name="segurancaSocial" placeholder="Máximo de 11 dígitos">` 
        },
        { texto: 'Especialidade', elemento: caixaEspecialidades },
        { texto: 'Status', elemento: caixaStatus },
        { texto: 'Contrato de Obra', elemento: `<input name="contratoObra" type="file">` },
        { texto: 'Anexos Contrato de Obra', elemento: divAnexos('contratoObra') },
        { texto: 'Exame médico', elemento: `<input name="exame" type="file">` },
        { texto: 'Anexos Exame', elemento: divAnexos('exame') },
        // separador
        { texto: 'Epi’s', elemento: blocoEPI },

        // foto
        {
            texto: 'Foto do Colaborador',
            elemento: `
            <div style="${vertical}; gap: 5px;">
                <img src="imagens/camera.png" class="cam" onclick="abrirCamera()">
                <div class="cameraDiv">
                    <button onclick="tirarFoto()">Tirar Foto</button>
                    <video autoplay playsinline></video>
                    <canvas style="display: none;"></canvas>
                </div>
                <img name="foto" ${colaborador?.foto 
                    ? `src="${api}/uploads/RECONST/${colaborador.foto}"` 
                    : ''
                } style="width: 7rem; border-radius: 3px;">
            </div>
            `
        },

        // PIN
        {
            texto: 'PIN de Acesso',
            elemento: `
            <div class="painel-pin">
                <input ${regras} type="password" value="${colaborador?.pin || ''}" ${colaborador.pin ? `data-existente="${colaborador.pin}"` : ''} name="pin" placeholder="Máximo de 4 números">
                <input ${regras} name="pinEspelho" value="${colaborador?.pin}" type="password" placeholder="Repita o PIN">
                
                <div class="rodape-alerta"></div>
                <button onclick="resetarPin()">Novo Pin</button>
            </div>
            `
        },
    ]

    const botoes = [
        { funcao: id ? `salvarColaborador('${id}')` : 'salvarColaborador()', texto: 'Salvar', img: 'concluido' }
    ]

    if (id) botoes.push({ img: 'cancel', texto: 'Excluir', funcao: `confirmarExclusaoColaborador('${id}')` })

    popup({ linhas, botoes, titulo: 'Cadastro de Colaborador' })

    verificarRegras()

}

function confirmarExclusaoColaborador(id) {

    const botoes = [
        { texto: 'Confirmar', img: 'concluido', funcao: `excluirColaborador('${id}')` }
    ]

    popup({ mensagem: 'Tem certeza?', botoes, titulo: 'Excluir colaborador', nra: false })
}

async function excluirColaborador(id) {

    overlayAguarde()

    await deletar(`dados_colaboradores/${id}`)

    removerOverlay()
}

async function salvarColaborador(idColaborador = crypto.randomUUID()) {
    const liberado = verificarRegras();
    if (!liberado)
        return popup({ mensagem: 'Verifique os campos inválidos!' })

    overlayAguarde()

    const colaboradorExistente = await recuperarDado('dados_cola') || {}

    const colaborador = {
        id: idColaborador,
        ...colaboradorExistente
    }

    const camposFixos = ['nome', 'dataNascimento', 'email', 'morada', 'apolice', 'telefone', 'numeroDocumento', 'segurancaSocial', 'obra', 'numeroContribuinte'];
    for (const campo of camposFixos) colaborador[campo] = obVal(campo);

    const camposRatio = ['status', 'documento'];
    for (const campo of camposRatio) {
        colaborador[campo] = document.querySelector(`input[name="${campo}"]:checked`)?.value || '';
    }

    const especialidades = document.querySelectorAll(`input[name="especialidade"]:checked`)
    colaborador.especialidade = []
    for (const especialidade of especialidades) {
        colaborador.especialidade.push(especialidade.value)
    }

    // Verificação do PIN;
    const inputPin = document.querySelector('[name="pin"]')
    const pinExistente = inputPin.dataset.existente

    if (pinExistente && pinExistente !== inputPin.value) {

        const resposta = await colaboradorPin(colaborador.pin, idColaborador)

        if (resposta?.mensagem) {
            inputPin.classList.add('invalido')
            return popup({ mensagem: resposta?.mensagem })
        }

    }

    colaborador.pin = inputPin.value

    const camposAnexos = ['contratoObra', 'exame'];
    for (const campo of camposAnexos) {
        const input = document.querySelector(`[name="${campo}"]`);
        if (!input || !input.files || input.files.length === 0) continue;

        const anexos = await importarAnexos({ input });

        if (!colaborador[campo]) colaborador[campo] = {};
        for (const anexo of anexos) {
            let idAnexo;
            do {
                idAnexo = ID5digitos();
            } while (colaborador[campo][idAnexo]); // evita IDs duplicados

            colaborador[campo][idAnexo] = anexo;
        }
    }

    // Cidade;
    colaborador.cidade = el('cidade').id

    const foto = document.querySelector('[name="foto"]')
    if (foto.src && !foto.src.includes(api)) {
        const resposta = await importarAnexos({ foto: foto.src })

        if (resposta[0].link) {
            colaborador.foto = resposta[0].link
        } else {
            return popup({ mensagem: 'Falha no envio da Foto: tente novamente.' })
        }

    }

    await enviar(`dados_colaboradores/${idColaborador}`, colaborador)

    removerPopup()
}


async function excelColaboradores() {

    const linhas = []

    const trs = document.querySelectorAll('tbody tr')

    const ids = [...trs]
        .filter(tr => tr.style.display !== 'none')
        .map(tr => tr.id)

    for (const [idColaborador, colaborador] of Object.entries(dados_colaboradores)) {

        if (!ids.includes(idColaborador)) continue

        const { cidade, contratoObra, epi, exame, excluido, obra, folha, foto, id, obraAlocada, pin, timestamp, ...resto } = colaborador
        const c = cidades?.[colaborador?.cidade] || {}
        const nomeCidade = c.nome || ''
        const distrito = c.distrito || ''

        const linha = {
            ...resto,
            distrito,
            cidade: nomeCidade,
            dataNascimento: dtFormatada(colaborador.dataNascimento),
            especialidade: colaborador.especialidade.map(esp => esp).join(', ')
        }

        linhas.push(linha)
    }

    await gerarExcel(linhas, `colaboradores-${new Date().getTime()}.xlsx`)

}

async function gerarExcel(dados, nomeArquivo = 'arquivo.xlsx') {
    if (!Array.isArray(dados) || !dados.length) return

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Dados')

    const colunas = Object.keys(dados[0])

    worksheet.columns = colunas.map(chave => ({
        header: chave.toUpperCase(),
        key: chave,
        width: 20
    }))

    // Cabeçalho
    const headerRow = worksheet.getRow(1)
    headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2F75B5' }
        }
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })

    // Dados
    dados.forEach((linha, index) => {
        const row = worksheet.addRow(linha)

        row.eachCell(cell => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }

            if (index % 2 === 0) {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF2F2F2' }
                }
            }
        })
    })

    // Filtro
    worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: worksheet.rowCount, column: colunas.length }
    }

    const buffer = await workbook.xlsx.writeBuffer()

    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = nomeArquivo
    link.click()
}
