let dados_colaboradores = {}

async function telaColaboradores() {

    mostrarMenus(false)

    const modelo = (titulo, elemento) => `
        <div class="campos">
            <span>${titulo}</span>
            ${elemento}
        </div>
    `
    const distritos = await recuperarDados('dados_distritos')

    const btnExtras = `
        <div style="${vertical}; gap: 2px;">
            <button style="width: 100%;" onclick="gerarTodosPDFs()">Folhas de Ponto.pdf</button>
            <div style="${horizontal}; gap: 2px;">
                ${modelo('Ano', `<select name="ano"><option></option>${optionsSelect(anos)}</select>`)}
                ${modelo('Mês', `<select name="mes"><option></option>${optionsSelect(meses)}</select>`)}
            </div>
        </div>
        <div style="${vertical}; gap: 2px;">
            <button style="width: 100%;" onclick="excelColaboradores()">Trabalhadores.xlsx</button>
            <div style="${horizontal}; gap: 2px;">
                ${modelo('Distrito', `<select name="fdistrito"><option></option>${optionsSelect(distritos, 'nome')}</select>`)}
                ${modelo('Zona', `<select name="fzona"></select>`)}
            </div>
        </div>
        <button data-colaboradores="inserir" onclick="adicionarColaborador()">Adicionar</button>
    `
    const base = 'dados_colaboradores'
    titulo.textContent = 'Gerenciar Colaboradores'

    const colunas = [
        'Nome Completo',
        'Telefone',
        'Obra Alocada',
        'Status',
        'Especialidade',
        'Folha de Ponto',
        ''
    ]

    telaInterna.innerHTML = modeloTabela({
        colunas,
        btnExtras
    })

    dados_colaboradores = await recuperarDados(base)

    for (const [id, colaborador] of Object.entries(dados_colaboradores).reverse()) {
        criarLinhaColaboradores(id, colaborador)
    }

}

async function criarLinhaColaboradores(id, colaborador) {

    const algoPendente = (!colaborador.epi || !colaborador.exame || !colaborador.contratoObra)
    const especialidades = (colaborador?.especialidade || [])
        .map(op => `<span>• ${op}</span>`)
        .join('')

    tds = `
        <td>
            <div class="camposTd">
                <img src="imagens/${algoPendente ? 'exclamacao' : 'doublecheck'}.png">
                <span>${colaborador?.nome || ''}</span>
            </div>
        </td>
        <td>${colaborador?.telefone || ''}</td>
        <td>${await infoObra(colaborador)}</td>
        <td><span class="${colaborador?.status}">${colaborador?.status || ''}</span></td>
        <td>
            <div style="${vertical}; gap: 2px;">
                ${especialidades}
            </div>
        </td>
        <td>
            <img src="imagens/relogio.png" onclick="mostrarFolha('${id}')">
        </td>
        <td>
            <img src="imagens/pesquisar.png" data-colaboradores="inserir" onclick="adicionarColaborador('${id}')">
        </td>
    `

    const trExistente = document.getElementById(id)
    if (trExistente) return trExistente.innerHTML = tds

    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${id}">${tds}</tr>`)
}

async function adicionarColaborador(id) {

    colaborador = dados_colaboradores[id] || {}
    const dados_obras = await recuperarDados('dados_obras')
    const clientes = await recuperarDados('dados_clientes')

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

    const opcoesObras = Object.entries(dados_obras)
        .map(([idObra, obra]) => {
            const distrito = dados_distritos?.[obra.distrito] || {}
            const cidade = distrito?.cidades?.[obra.cidade] || {}
            const cliente = clientes?.[obra?.cliente] || {}
            return `<option value="${idObra}">${cliente?.nome || '--'} / ${distrito.nome || '--'} / ${cidade.nome || '--'}</option>`
        }).join('')

    const regras = `oninput="verificarRegras()"`
    const caixaStatus = retornarCaixas('status')
    const caixaEspecialidades = retornarCaixas('especialidade')
    const caixaDocumentos = `${retornarCaixas('documento')} <input ${regras} value="${colaborador?.numeroDocumento || ''}" name="numeroDocumento" placeholder="Número do documento">`
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

    const linhas = [
        { texto: 'Nome Completo', elemento: `<textarea ${regras} name="nome" placeholder="Nome Completo">${colaborador?.nome || ''}</textarea>` },
        { texto: 'Data de Nascimento', elemento: `<input ${regras} value="${colaborador?.dataNascimento || ''}" type="date" name="dataNascimento">` },
        { texto: 'Morada', elemento: `<textarea ${regras} name="morada" placeholder="Morada">${colaborador?.morada || ''}</textarea>` },
        { texto: 'Distrito', elemento: `<select name="distrito" onchange="carregarSelects({select: this})"></select>` },
        { texto: 'Cidade', elemento: `<select name="cidade"></select>` },
        { texto: 'Apólice de Seguro', elemento: `<input value="0010032495" name="apolice" placeholder="Número da Apólice" readOnly>` },
        { texto: 'Telefone', elemento: `<input ${regras} value="${colaborador?.telefone || ''}" name="telefone" placeholder="Telefone">` },
        { texto: 'E-mail', elemento: `<textarea ${regras} name="email" placeholder="E-mail">${colaborador?.email || ''}</textarea>` },
        { texto: 'Obra Alocada', elemento: `<select name="obra"><option></option>${opcoesObras}</select>` },
        { texto: 'Documento', elemento: caixaDocumentos },
        { texto: 'Número de Contribuinte', elemento: `<input ${regras} value="${colaborador?.numeroContribuinte || ''}" name="numeroContribuinte" placeholder="Máximo de 9 dígitos">` },
        { texto: 'Segurança Social', elemento: `<input ${regras} value="${colaborador?.segurancaSocial || ''}" name="segurancaSocial" placeholder="Máximo de 11 dígitos">` },
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
                <img name="foto" ${colaborador?.foto ? `src="${api}/uploads/RECONST/${colaborador.foto}"` : ''} class="foto">
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
        { funcao: id ? `salvarColaborador('${id}')` : null, texto: 'Salvar', img: 'concluido' }
    ]

    const form = new formulario({ linhas, botoes, titulo: 'Cadastro de Colaborador' })
    form.abrirFormulario()

    await carregarSelects({ ...colaborador })
    verificarRegras()

}


async function salvarColaborador(idColaborador) {
    const liberado = verificarRegras();
    if (!liberado) return popup(mensagem('Verifique os campos inválidos!'), 'Aviso', true);

    overlayAguarde();

    idColaborador = idColaborador || unicoID();

    // Recupera colaborador existente para não sobrescrever anexos
    let colaboradorExistente = dados_colaboradores[idColaborador] || {};

    let colaborador = { ...colaboradorExistente };

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

        const resposta = await colaboradorPin(colaborador.pin)
        if (resposta?.mensagem !== 'Pin não localizado') {
            inputPin.classList.add('invalido')
            return popup(mensagem('O PIN escolhido já está em uso'), 'Alerta', true)
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

    // Distrito & Cidade;
    colaborador.cidade = obVal('cidade')
    colaborador.distrito = obVal('distrito')

    const foto = document.querySelector('[name="foto"]')
    if (foto.src && !foto.src.includes(api)) {
        const resposta = await importarAnexos({ foto: foto.src })

        if (resposta[0].link) {
            colaborador.foto = resposta[0].link
        } else {
            return popup(mensagem('Falha no envio da Foto: tente novamente.'), 'Alerta', true)
        }

    }

    enviar(`dados_colaboradores/${idColaborador}`, colaborador)

    await inserirDados({ [idColaborador]: colaborador }, 'dados_colaboradores')

    await telaColaboradores()
    removerPopup()
}


async function excelColaboradores() {

    const linhas = []

    const deletar = ['id', 'obraAlocada', 'obra', 'timestamp', 'contratoObra', 'foto', 'folha', 'epi', 'exame']

    const fdistrito = Number(document.querySelector('[name="fdistrito"]').value)

    for (const linha of Object.values(dados_colaboradores)) {

        if (fdistrito && fdistrito !== linha.distrito) continue

        for (const chave of deletar) delete linha[chave]

        const d = dados_distritos?.[linha.distrito] || {}
        const c = d?.cidades[linha?.cidade] || {}
        linha.distrito = d?.nome || ''
        linha.cidade = c?.nome || ''
        linha.dataNascimento = dtFormatada(linha.dataNascimento)
        linha.especialidade = linha.especialidade.map(esp => esp).join(', ')

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
