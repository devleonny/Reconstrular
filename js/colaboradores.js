async function telaColaboradores() {

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
            <button style="width: 100%;" onclick="confimacaoZipPdf()">Trabalhadores.xls</button>
            <div style="${horizontal}; gap: 2px;">
                ${modelo('Distrito', `<select name="mes"><option></option>${optionsSelect(distritos, 'nome')}</select>`)}
                ${modelo('Zona', `<select name="mes"></select>`)}
            </div>
        </div>
        <button onclick="adicionarColaborador()">Adicionar</button>
    `
    const base = 'dados_colaboradores'
    titulo.textContent = 'Gerenciar Colaboradores'

    telaInterna.innerHTML = modeloTabela({
        colunas: ['Nome Completo', 'Telefone', 'Obra Alocada', 'Status', 'Especialidade', 'Folha de Ponto', ''],
        btnExtras
    })

    const dados_colaboradores = await recuperarDados(base)

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
            <img src="imagens/pesquisar.png" onclick="adicionarColaborador('${id}')">
        </td>
    `

    const trExistente = document.getElementById(id)
    if (trExistente) return trExistente.innerHTML = tds

    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${id}">${tds}</tr>`)
}

async function adicionarColaborador(id) {

    const colaborador = await recuperarDado('dados_colaboradores', id) || {}
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

    verificarRegras()

}