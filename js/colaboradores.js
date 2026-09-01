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

    overlayAguarde()

    telaAtiva = 'colaboradores'
    titulo.textContent = 'Colaboradores'

    const btnExtras = `
        <div style="display: flex; flex-wrap: wrap; gap: 3px;">

            <button data-acao="editavel" onclick="gerarTodosPDFs()">
                <img src="imagens/pdf.png">
                Folhas de Ponto
            </button>

            <button data-acao="editavel" onclick="excelColaboradores()">
                <img src="imagens/planilha.png">
                Baixar Planilha
            </button>

            <button data-acao="editavel" onclick="adicionarColaborador()">Adicionar Colaborador</button>
        </div>
    `

    const colunas = {
        'Nome Completo': { chave: 'nome' },
        'Telefone': { chave: 'telefone' },
        'Distrito': { chave: 'snapshots.cidade.distrito', tipoPesquisa: 'select' },
        'Cidade': { chave: 'snapshots.cidade.nome', tipoPesquisa: 'select' },
        'Status': { chave: 'status', tipoPesquisa: 'select' },
        'Especialidade': { chave: 'especialidade' },
        'Folha de Ponto': {},
        'Ficha de EPI': {},
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

    tela.innerHTML = montarPagina({ titulo: 'Colaboradores', imagem: 'colaborador', tabela })

    await paginacao()

    removerOverlay()

    remElementosEditaveis()

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

    const { id, epi, snapshots } = colaborador || {}
    const { cidade } = snapshots || {}

    const algoPendente = (!colaborador.epi || !colaborador.exame || !colaborador.contrato_obra)
    const especialidades = (colaborador?.especialidade || [])
        .map(op => `<span>• ${op}</span>`)
        .join('')

    const estilo = labelStatus(colaborador?.status)

    let qtdeEPIs = 0

    Object.values(epi?.equipamentos || {}).forEach(e => {
        qtdeEPIs += e.quantidade
    })

    const tds = `
        <td>
            <div class="camposTd">
                <img src="imagens/${algoPendente ? 'exclamacao' : 'doublecheck'}.png">
                <span>${colaborador?.nome || ''}</span>
            </div>
        </td>
        <td>${colaborador?.telefone || ''}</td>
        <td>${cidade?.distrito || ''}</td>
        <td>${cidade?.nome || ''}</td>
        <td>
            <span class="${estilo}">${colaborador?.status || ''}</span>
        </td>
        <td>
            <div style="${vertical}; gap: 2px;">
                ${especialidades}
            </div>
        </td>
        <td>
            <img data-acao="editavel" src="imagens/relogio.png" onclick="mostrarFolha('${id}')">
        </td>
        <td>
            <div data-acao="editavel" style="${vertical}; align-items: center;" onclick="formularioEPI('${id}')">
                <img src="imagens/colaborador.png">
                ${qtdeEPIs ? `<div class="labelQuantidade">${qtdeEPIs}</div>` : ''}
            </div>
        </td>
        <td>
            <img src="imagens/pesquisar.png" data-acao="editavel" onclick="adicionarColaborador('${id}')">
        </td>
    `

    return `<tr>${tds}</tr>`
}

async function adicionarColaborador(id) {

    overlayAguarde()

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
            <div name="${name}_bloco" class="opcoes-formulario">
                ${opcoesStatus}
            </div>`

    }

    const regras = `oninput="verificarRegras()"`
    const caixaStatus = retornarCaixas('status')
    const caixaEspecialidades = retornarCaixas('especialidade')
    const caixaDocumentos = `
        <div style="${vertical}; gap: 1rem;">
            ${retornarCaixas('documento')} 
            <input ${regras} value="${colaborador?.numero_documento || ''}" name="numero_documento" placeholder="Número do documento">
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

    const cidade = await recuperarDado('cidades', colaborador?.cidade) || null
    const campoCidade = cidade
        ? cidade.nome
        : 'Selecione'

    controlesCxOpcoes.cidade = {
        base: 'cidades',
        funcaoAdicional: ['verificarRegras'],
        colunas: {
            'Cidade': { chave: 'nome' },
            'Distrito': { chave: 'distrito' },
            'Zona': { chave: 'zona' },
            'Area': { chave: 'area' }
        },
        retornar: ['nome']
    }

    const linhas = [
        { 
            texto: 'Nome Completo', 
            elemento: `<textarea ${regras} name="nome" placeholder="Nome Completo">${colaborador?.nome || ''}</textarea>` 
        },
        { 
            texto: 'Data de Nascimento', 
            elemento: `<input ${regras} value="${colaborador?.data_nascimento || ''}" type="date" name="data_nascimento">` 
        },
        { 
            texto: 'Morada', 
            elemento: `<textarea ${regras} name="morada" placeholder="Morada">${colaborador?.morada || ''}</textarea>` 
        },
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
        { texto: 'Documento', elemento: caixaDocumentos },
        {
            texto: 'Número de Contribuinte',
            elemento: `<input ${regras} value="${colaborador?.numero_contribuinte || ''}" name="numero_contribuinte" placeholder="Máximo de 9 dígitos">`
        },
        {
            texto: 'Segurança Social',
            elemento: `<input ${regras} value="${colaborador?.seguranca_social || ''}" name="seguranca_social" placeholder="Máximo de 11 dígitos">`
        },
        { texto: 'Especialidade', elemento: caixaEspecialidades },
        { texto: 'Status', elemento: caixaStatus },
        { texto: 'Contrato de Obra', elemento: `<input name="contrato_obra" type="file">` },
        { texto: 'Anexos Contrato de Obra', elemento: divAnexos('contrato_obra') },
        { texto: 'Exame médico', elemento: `<input name="exame" type="file">` },
        { texto: 'Anexos Exame', elemento: divAnexos('exame') },

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

    if (id)
        botoes.push({ img: 'cancel', texto: 'Excluir', funcao: `confirmarExclusaoColaborador('${id}')` })

    popup({ linhas, botoes, titulo: 'Cadastro de Colaborador' })

    verificarRegras()

}

function confirmarExclusaoColaborador(id) {

    const botoes = [
        { texto: 'Confirmar', img: 'concluido', funcao: `excluirColaborador('${id}')`, fechar: true }
    ]

    popup({ mensagem: 'Tem certeza?', botoes, titulo: 'Excluir colaborador', removerAnteriores: true })
}

async function excluirColaborador(id) {

    overlayAguarde()

    await deletar(`dados_colaboradores/${id}`)

    removerOverlay()
}

async function salvarColaborador(idColaborador = crypto.randomUUID()) {

    try {
        const { campos } = verificarRegras()

        if (campos.length)
            return popup({
                imagem: 'gifs/interrogacao.gif',
                mensagem: `
                    <div style="${vertical}; gap: 4px;">
                        <span>Verifique os campos inválidos:</span>
                        ${campos.map(c => `<span>• ${inicialMaiuscula(c)}</span>`).join('')}
                    </div>
            `
            })

        overlayAguarde()

        const colaborador = {}

        const camposFixos = [
            'nome',
            'data_nascimento',
            'email',
            'morada',
            'apolice',
            'telefone',
            'numero_documento',
            'seguranca_social',
            'numero_contribuinte'
        ]

        for (const campo of camposFixos)
            colaborador[campo] = obVal(campo)

        const camposRatio = ['status', 'documento']
        for (const campo of camposRatio) {
            colaborador[campo] = document.querySelector(`input[name="${campo}"]:checked`)?.value || ''
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

        const camposAnexos = ['contrato_obra', 'exame']
        for (const campo of camposAnexos) {
            const input = document.querySelector(`[name="${campo}"]`)
            if (!input || !input.files || input.files.length === 0) continue

            const anexos = await importarAnexos({ input })

            if (!colaborador[campo]) 
                colaborador[campo] = {}

            for (const anexo of anexos) {
                let idAnexo;
                do {
                    idAnexo = crypto.randomUUID()
                } while (colaborador[campo][idAnexo]) // evita IDs duplicados

                colaborador[campo][idAnexo] = anexo
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

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao salvar o colaborador: Fale com o suporte.' })
    }
}


async function excelColaboradores() {

    try {
        overlayAguarde()

        const dados = {
            base: "dados_colaboradores",
            titulo: `Colaboradores_${Date.now()}`,
            formatacao: {
                datas: ['data_nascimento'],
            }
        }

        await baixarRelatorioExcel(dados)

        removerOverlay()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao gerar o arquivo Excel: Fale com o suporte.' })
    }

}

async function formularioEPI(idColaborador) {


    try {

        overlayAguarde()

        const { pin, epi } = await recuperarDado('dados_colaboradores', idColaborador) || {}
        const { equipamentos } = epi || {}

        const opcoes = (ini, fim, valorAtual) => {
            let stringOpcoes = '<option></option>'
            for (let i = ini; i <= fim; i++) stringOpcoes += `<option ${valorAtual == i ? 'selected' : ''}>${i}</option>`
            return stringOpcoes
        }

        const senhas = (texto, limite) => `
        <div style="${vertical}; gap: 5px;">
            <label>${texto}</label>
            <input type="password" ${limite
                ? `maxlength="${limite}" id="pin" data-pin="${pin}" placeholder="Limite de ${limite} dígitos"`
                : 'id="supervisor" placeholder="Senha de acesso ao App"'
            }>
        </div>
    `

        const tr = (texto, value) => {

            const equipamento = equipamentos?.[value]
            const visibilidade = `style="display: ${equipamento ? '' : 'none'}"`
            return `
                <tr>
                    <td style="text-align: left;">${texto}</td>
                    <td>
                        <input onchange="visibilidade(this, '${value}')" 
                        type="checkbox" 
                        class="megaInput" 
                        value="${value}" 
                        name="camposEpi"
                        ${equipamentos?.[value] ? 'checked' : ''}>
                    </td>
                    <td><select ${visibilidade} name="${value}_quantidade">${opcoes(1, 10, equipamento?.quantidade)}</select></td>
                    <td><select ${visibilidade} name="${value}_tamanho">${opcoes(37, 47, equipamento?.tamanho)}</select></td>
                </tr>
                `
        }

        const cab = ['Equipamento', '', 'Quantidade', 'Tamanho']
            .map(op => `<th>${op}</th>`)
            .join('')

        const linhas = [
            {
                elemento: `
            <table class="tabela">
                <thead style="position: static;">${cab}</thead>
                <tbody>
                    ${tr('Botas de segurança com biqueira reforçada', 'botas')}
                    ${tr('Capacete de proteção', 'capacete')}
                    ${tr('Colete fluorescente', 'colete')}
                    ${tr('Luvas (par)', 'luvas')}
                    ${tr('Mascara com filtro de particulas', 'mascara')}
                    ${tr('Óculos de protecção', 'oculos')}
                    ${tr('Proteção auditiva', 'protecaoAuditiva')}
                </tbory>
            </table>
            `
            },
            {
                texto: 'Pin Colaborador',
                elemento: senhas('Pin Colaborador', 4)
            },
            {
                texto: 'Senha Supervisor',
                elemento: senhas('Senha Supervisor')
            }
        ]

        const botoes = [
            { texto: 'Salvar', img: 'concluido', funcao: `salvarEpi('${idColaborador}')"`, fechar: true },
            { texto: 'PDF', img: 'pdf', funcao: `abrirEPI('${idColaborador}')"` }
        ]

        popup({ linhas, botoes, titulo: 'Formulário de EPI', removerAnteriores: true })

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao abrir Ficha de EPI: Fale com o suporte.' })
    }
}

async function salvarEpi(idColaborador) {

    overlayAguarde()

    const pinInput = document.getElementById('pin')

    if (pinInput.dataset.pin !== pinInput.value)
        return popup({ mensagem: 'Pin do colaborador não confere' })

    let colaborador = await recuperarDado('dados_colaboradores', idColaborador)
    const inputsAtivos = document.querySelectorAll('input[name="camposEpi"]:checked')
    let epi = {
        data: new Date().getTime(),
        equipamentos: {}
    }

    for (const input of inputsAtivos) {
        const campo = input.value
        epi.equipamentos[campo] = {
            quantidade: Number(document.querySelector(`[name="${campo}_quantidade"]`).value),
            tamanho: Number(document.querySelector(`[name="${campo}_tamanho"]`).value)
        }
    }

    colaborador.epi = epi

    // Verificar acesso do supervisor
    const senhaSupervisor = document.getElementById('supervisor')
    const acesso = JSON.parse(localStorage.getItem('acesso'))
    const resposta = await verificarSupervisor(acesso.usuario, senhaSupervisor.value)

    if (resposta !== 'Senha válida')
        return popup({ mensagem: resposta })

    await enviar(`dados_colaboradores/${idColaborador}/epi`, epi)

    removerPopup()

}