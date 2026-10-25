async function abrirCameraColaborador(botao) {
    const painel = botao.closest('.colaborador-foto')
    const video = painel.querySelector('video')
    const status = painel.querySelector('[role="status"]')
    const pedido = Symbol()
    painel.pedidoCamera = pedido
    botao.disabled = true
    status.textContent = 'Abrindo câmera…'
    try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('indisponivel')
        const captura = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } } })
        if (!painel.isConnected || painel.pedidoCamera !== pedido) {
            captura.getTracks().forEach(track => track.stop())
            return
        }
        video.srcObject = captura
        video.hidden = false
        painel.classList.add('camera-ativa')
        botao.hidden = true
        painel.querySelector('[data-camera-cancelar]').hidden = false
        await video.play()
        if (!painel.isConnected || painel.pedidoCamera !== pedido) return
        painel.querySelector('[data-camera-capturar]').hidden = false
        status.textContent = 'Enquadre o rosto no centro e clique em Capturar foto.'
    } catch (erro) {
        if (!painel.isConnected || painel.pedidoCamera !== pedido) return
        cancelarCameraColaborador(painel)
        status.textContent = erro.name === 'NotAllowedError'
            ? 'Permita o acesso à câmera no navegador e tente novamente.'
            : 'Não foi possível abrir a câmera. Confira se ela está disponível e tente novamente.'
    } finally { botao.disabled = false }
}

function cancelarCameraColaborador(painel) {
    painel.pedidoCamera = null
    const video = painel.querySelector('video')
    video.srcObject?.getTracks().forEach(track => track.stop())
    video.srcObject = null
    video.hidden = true
    painel.classList.remove('camera-ativa')
    painel.querySelector('[data-camera-abrir]').hidden = false
    painel.querySelector('[data-camera-capturar]').hidden = true
    painel.querySelector('[data-camera-cancelar]').hidden = true
    painel.querySelector('[role="status"]').textContent = 'Use um local iluminado e enquadre o rosto de frente.'
}

function capturarFotoColaborador(botao) {
    const painel = botao.closest('.colaborador-foto')
    const video = painel.querySelector('video')
    if (!video.videoWidth || !video.videoHeight) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    painel.querySelector('[name="foto"]').src = canvas.toDataURL('image/png')
    cancelarCameraColaborador(painel)
    painel.querySelector('[data-camera-abrir]').textContent = 'Tirar outra foto'
    painel.querySelector('[role="status"]').textContent = 'Foto capturada. Confira a imagem antes de salvar o cadastro.'
}

let obrasFiltrosColaboradores = []

async function carregarObrasFiltrosColaboradores() {
    const obras = new Map()
    let pagina = 1, paginas = 1
    do {
        const resposta = await pesquisarDB({ base: 'vw_dados_orcamentos', pagina, limite: 100,
            filtros: { em_obra: { op: '=', value: true } } })
        if (!Array.isArray(resposta?.resultados)) throw new Error('Não foi possível carregar as obras.')
        for (const obra of resposta.resultados) obras.set(obra.id, obra)
        paginas = resposta.paginas || 1
        pagina++
    } while (pagina <= paginas)
    obrasFiltrosColaboradores = [...obras.values()]
}

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

let esquema = null
let cidades = null

async function telaColaboradores() {

    overlayAguarde()

    titulo.textContent = 'Colaboradores'

    const colunas = {
        'Usuário': { chave: 'usuario' },
        'Função': { chave: 'funcao', tipoPesquisa: 'select' },
        'Nome Completo': { chave: 'nome' },
        'Telefone': { chave: 'telefone' },
        'Distrito': { chave: 'snapshots.cidade.distrito', tipoPesquisa: 'select' },
        'Cidade': { chave: 'snapshots.cidade.nome', tipoPesquisa: 'select' },
        'Status': { chave: 'status_disponivel', tipoPesquisa: 'select' },
        'Folha de Ponto': {},
        'Ficha de EPI': {},
        ...(
            ['CEO', 'Diretor Programador'].includes(acesso.funcao)
                ? { 'Bloquear acesso': {} }
                : {}
        ),
        'Editar': {}
    }

    const tabela = await modTab({
        colunas,
        detalhes: true,
        pag: 'colaboradores',
        btnExtras: '<button data-acao="editavel" onclick="adicionarColaborador()">Adicionar Colaborador</button>',
        // Só quem o usuário pode editar (abaixo dele, na sua região); o servidor aplica a mesma regra do salvar.
        base: 'dados_colaboradores_gerenciaveis',
        ordenar: { path: 'timestamp', direcao: 'desc', tipo: 'numero' },
        body: 'bodyColaboradores',
        criarLinha: 'criarLinhaColaboradores'
    })

    tela.innerHTML = tabela

    await paginacao()

    removerOverlay()

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

    const {
        id,
        epi,
        funcao,
        snapshots,
        usuario,
        telefone,
        nome,
        status_disponivel,
        especialidade,
        acesso_bloqueado
    } = colaborador || {}
    const { distrito, nome: nomeCidade } = snapshots?.cidade || {}

    const tdBloqueio = ['CEO', 'Diretor Programador'].includes(acesso.funcao)
        ? `
            <td>
                <label class="interruptor">
                    <input onchange="bloquearUsuario('${id}', this)" type="checkbox" id="acesso-bloqueado" ${acesso_bloqueado ? 'checked' : ''}>
                    <span class="trilho"></span>
                </label>
            </td>
        `
        : ''

    const especialidades = (especialidade || [])
        .map(op => `<span class="tag-especialidade">${escaparAtributo(op)}</span>`)
        .join('')

    const estilo = labelStatus(status_disponivel)

    let qtdeEPIs = 0

    Object.values(epi?.equipamentos || {}).forEach(e => {
        qtdeEPIs += e.quantidade
    })

    const formEpi = `
            <div data-acao="editavel" style="${vertical}; align-items: center;" onclick="abrirEPI('${id}')">
                <img src="imagens/colaborador.png">
                ${qtdeEPIs ? `<div class="labelQuantidade">${qtdeEPIs}</div>` : ''}
            </div>
        `

    const tds = `
        <td>
            ${usuario ? `<span class="tag-usuario">${usuario}</span>` : ''}
        </td>
        <td>
            ${funcao || ''}
        </td>
        <td>
            ${nome}
        </td>
        <td>${telefone || ''}</td>
        <td>${distrito || ''}</td>
        <td>${nomeCidade || ''}</td>
        <td>
            <span class="${estilo}">${status_disponivel || ''}</span>
        </td>
        <td>
            <img data-acao="editavel" src="imagens/relogio.svg" class="icone-tabela" alt="Folha de ponto" title="Folha de ponto" onclick="mostrarFolha('${id}')">
        </td>
        <td>
            ${formEpi}
        </td>
        ${tdBloqueio}
        <td>
            <img src="imagens/editar.svg" class="icone-editar" alt="Editar" title="Editar" data-acao="editavel" onclick="adicionarColaborador('${id}')">
        </td>
    `

    return {
        linha: `<tr>${tds}</tr>`,
        detalhes: `<div><strong>Especialidades</strong><div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px;">${especialidades || '<span>Não se aplica</span>'}</div></div>`
    }
}

async function adicionarColaborador(id) {

    try {
        overlayAguarde()

        const colaborador = await recuperarDado('dados_colaboradores', id) || {}

        const {
            cidade,
            nome,
            funcao,
            filtros,
            morada,
            pin,
            data_nascimento,
            epi,
            usuario,
            email,
            especialidade,
            numero_documento,
            telefone,
            foto,
            seguranca_social,
            numero_contribuinte,
            snapshots
        } = colaborador

        const { equipamentos } = epi || {}
        const campoCidade = snapshots?.cidade?.nome || 'Selecione'

        const listas = {
            status_disponivel: ['Ativo', 'Baixa Médica', 'Não Ativo', 'Impedido'],
            documento: ['Cartão de Cidadão', 'Passaporte', 'Título de residência'],
            especialidade: ['Pedreiros', 'Ladrilhadores', 'Pintor', 'Estucador', 'Pavimento Laminado', 'Eletricista Certificado', 'Ajudante', 'Teto Falso e Paredes em Gesso Cartonado', 'Canalizador', 'Carpinteiro']
        }

        function retornarCaixas(name) {

            const espc = name == 'especialidade'

            const opcoesStatus = (listas?.[name] || [])
                .map(op => {

                    let checked = false

                    const valor = colaborador?.[name]
                    const especialidades = especialidade || []
                    if ((espc && especialidades.includes(op)) || valor == op) {
                        checked = true
                    }

                    // Se status, se valor null e op seja Ativo; Default marcado;
                    if (name == 'status_disponivel' && !valor && op == 'Ativo')
                        checked = true

                    return `
                        <div class="opcaoStatus">
                            <input ${regras} value="${op}" 
                            type="${espc ? 'checkbox' : 'radio'}" 
                            name="${name}" 
                            ${checked ? 'checked' : ''}>
                            <span style="text-align: left;">${op}</span>
                        </div>
                    `
                })
                .join('')

            return `
            <div name="${name}_bloco" class="opcoes-formulario">
                ${opcoesStatus}
            </div>`

        }

        // Formulário de EPI;
        const opcoes = (ini, fim, valorAtual) => {
            let stringOpcoes = '<option></option>'
            for (let i = ini; i <= fim; i++) stringOpcoes += `<option ${valorAtual == i ? 'selected' : ''}>${i}</option>`
            return stringOpcoes
        }

        const tr = (texto, value) => {

            const equipamento = equipamentos?.[value]
            const visibilidade = `style="display: ${equipamento ? '' : 'none'}"`
            return `
                <tr>
                    <td style="text-align: left;">${texto}</td>
                    <td>
                        <input ${regras} onchange="visibilidade(this, '${value}')" 
                        type="checkbox" 
                        class="input-colaboradores" 
                        value="${value}" 
                        name="camposEpi"
                        ${equipamentos?.[value] ? 'checked' : ''}>
                    </td>
                    <td><select ${visibilidade} name="${value}_quantidade">${opcoes(1, 10, equipamento?.quantidade)}</select></td>
                    <td><select ${visibilidade} name="${value}_tamanho">${opcoes(37, 47, equipamento?.tamanho)}</select></td>
                </tr>
                `
        }

        const regras = `oninput="verificarRegras()"`
        const caixaStatus = retornarCaixas('status_disponivel')
        const caixaEspecialidades = retornarCaixas('especialidade')
        const caixaDocumentos = `
        <div style="${vertical}; gap: 1rem;">
            ${retornarCaixas('documento')} 
            <input ${regras} value="${numero_documento || ''}" name="numero_documento" placeholder="Número do documento">
        </div>
        `
        const divAnexos = (chave) => {
            const anexos = colaborador?.[chave] || {}
            let anexoString = ''
            for (const [, anexo] of Object.entries(anexos)) {
                anexoString += criarAnexoVisual(anexo)
            }
            return `<div id="anexos_${chave}" style="${vertical}">${anexoString}</div>`
        }

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

        const cabEpi = ['Equipamento', '', 'Quantidade', 'Tamanho']
            .map(op => `<th>${op}</th>`)
            .join('')

        const linhas = [
            {
                texto: 'Nome Completo',
                elemento: `<textarea ${regras} name="nome" placeholder="Nome Completo">${nome || ''}</textarea>`
            },
            {
                elemento: `
                    <div style="${vertical}; gap: 5px; width: stretch;">
                        <span>Função</span>
                        <div class="campo-funcoes"></div>
                    </div>
                `
            },
            {
                texto: 'Usuário',
                elemento: `
                    <div style="${vertical}; gap: 5px;">
                        <input name="usuario" aria-label="Usuário gerado pelo servidor" placeholder="Gerado automaticamente ao salvar" value="${escaparAtributo(usuario || '')}" readonly>
                        <small>O usuário é gerado pelo servidor.</small>
                    </div>
                `
            },
            {
                texto: 'Data de Nascimento',
                elemento: `<input ${regras} value="${data_nascimento || ''}" type="date" name="data_nascimento">`
            },
            {
                texto: 'Morada',
                elemento: `<textarea ${regras} name="morada" placeholder="Morada">${morada || ''}</textarea>`
            },
            {
                texto: 'Cidade',
                elemento: `
                <span class="opcoes" ${cidade ? `id="${cidade}"` : ''} name="cidade" onclick="cxOpcoes('cidade')">${campoCidade}</span>`
            },
            {
                texto: 'Apólice de Seguro',
                elemento: `<input value="0010032495" name="apolice" placeholder="Número da Apólice" readOnly>`
            },
            {
                texto: 'Telefone',
                elemento: `<input ${regras} value="${telefone || ''}" name="telefone" placeholder="Telefone">`
            },
            {
                texto: 'E-mail',
                elemento: `<textarea ${regras} name="email" placeholder="E-mail">${email || ''}</textarea>`
            },
            { texto: 'Documento', elemento: caixaDocumentos },
            {
                texto: 'Número de Contribuinte',
                elemento: `<input ${regras} value="${numero_contribuinte || ''}" name="numero_contribuinte" placeholder="Máximo de 9 dígitos">`
            },
            {
                texto: 'Segurança Social',
                elemento: `<input ${regras} value="${seguranca_social || ''}" name="seguranca_social" placeholder="Máximo de 11 dígitos">`
            },
            { texto: 'Especialidade', elemento: caixaEspecialidades },
            { texto: 'Status', elemento: caixaStatus },

            // EXAMES
            {
                texto: 'Contrato de Obra',
                elemento: `
                    <div style="${vertical}; gap: 2px;">
                        <input ${regras} name="contrato_obra" type="file">
                        ${divAnexos('contrato_obra')}
                    </div>
                `
            },
            {
                texto: 'Exame médico',
                elemento: `
                    <div style="${vertical}; gap: 2px;">
                        <input ${regras} name="exame" type="file">
                        ${divAnexos('exame')}
                    </div>
                `
            },
            {
                elemento: `
                    <div class="bloco-form-epi">
                        <span>Formulário de EPI</span>
                        <table class="tabela" style="background-color: white;">
                            <thead style="position: static;">${cabEpi}</thead>
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
                    </div>
            `
            },

            // FOTO
            {
                elemento: `
                    <div class="colaborador-foto">
                        <h3 class="colaborador-foto-titulo">Foto do colaborador</h3>
                        <div class="colaborador-foto-quadro">
                            <span class="colaborador-foto-vazia">Nenhuma foto adicionada</span>
                            <img name="foto" alt="Foto do colaborador" ${foto
                        ? `src="${api}/uploads/RECONST/${foto}"`
                        : ''
                    }>
                            <video autoplay muted playsinline hidden aria-label="Prévia da câmera"></video>
                        </div>
                        <p class="colaborador-foto-status" role="status">Use um local iluminado e enquadre o rosto de frente.</p>
                        <div class="colaborador-foto-acoes">
                            <button type="button" data-camera-abrir onclick="abrirCameraColaborador(this)">${foto ? 'Tirar outra foto' : 'Abrir câmera'}</button>
                            <button type="button" data-camera-capturar hidden onclick="capturarFotoColaborador(this)">Capturar foto</button>
                            <button type="button" data-camera-cancelar hidden onclick="cancelarCameraColaborador(this.closest('.colaborador-foto'))">Cancelar</button>
                        </div>
                        <small>A foto será salva ao salvar o cadastro.</small>
                    </div>
                `
            },

            // PIN
            {
                texto: 'Forma de Acesso [PIN / Senha]',
                elemento: `
                    <div class="painel-pin">
                        <input ${regras} type="password" value="${pin || ''}" ${pin ? `data-existente="${pin}"` : ''} name="pin" placeholder="Máximo de 4 números">
                        <input ${regras} name="pinEspelho" value="${pin}" type="password" placeholder="Repita o PIN">
                        
                        <div class="rodape-alerta"></div>
                        <button onclick="resetarPin()">Novo Pin</button>
                    </div>
                    <div class="painel-senha">
                        <input type="password" placeholder="Senha" name="senha">
                    </div>
                `
            }
        ]

        const botoes = [
            { funcao: id ? `salvarColaborador('${id}')` : 'salvarColaborador()', texto: 'Salvar', img: 'concluido' }
        ]

        if (id)
            botoes.push({ img: 'cancel', texto: 'Excluir', funcao: `confirmarExclusaoColaborador('${id}')` })

        popup({ linhas, botoes, titulo: 'Cadastro de Colaborador' })

        await carregarTabelaFuncoes(funcao, filtros, id)

        verificarRegras()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao abrir o formulário de Colaborador: Fale com o suporte.' })
    }

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

        overlayAguarde()

        const { campos } = await verificarRegras()

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

        const camposRatio = ['status_disponivel', 'documento']
        for (const campo of camposRatio) {
            colaborador[campo] = document.querySelector(`input[name="${campo}"]:checked`)?.value || ''
        }

        const especialidades = document.querySelectorAll(`input[name="especialidade"]:checked`)
        colaborador.especialidade = []
        for (const especialidade of especialidades) {
            colaborador.especialidade.push(especialidade.value)
        }

        // Função;
        colaborador.funcao = [...document.querySelectorAll('[name="funcao"]:checked')]?.[0]?.dataset?.valor

        if (colaborador.funcao == 'Trabalhador') {
            // A unicidade e o formato do PIN são validados pelo servidor ao salvar.
            const inputPin = document.querySelector('[name="pin"]')
            colaborador.pin = inputPin.value

        } else {

            // O servidor atribui o usuário na criação e preserva o login nas edições.
            // Não enviar uma sugestão do navegador: a reserva precisa ser atômica no banco.

            const possivelSenha = obVal('senha')

            if (possivelSenha) // Se existir, salva;
                colaborador.senha = possivelSenha

        }

        const camposAnexos = ['contrato_obra', 'exame']
        for (const campo of camposAnexos) {
            const input = document.querySelector(`[name="${campo}"]`)
            if (!input || !input.files || input.files.length === 0) continue

            const anexos = await importarAnexos({ input })

            if (!colaborador[campo])
                colaborador[campo] = {}

            for (const anexo of anexos) {
                let idAnexo
                do {
                    idAnexo = crypto.randomUUID()
                } while (colaborador[campo][idAnexo])

                colaborador[campo][idAnexo] = anexo
            }
        }

        // Cidade;
        colaborador.cidade = Number(obVal('cidade'))

        const foto = document.querySelector('[name="foto"]')
        if (foto.src && !foto.src.includes(api)) {
            const resposta = await importarAnexos({ foto: foto.src })

            if (resposta[0].link) {
                colaborador.foto = resposta[0].link
            } else {
                return popup({ mensagem: 'Falha no envio da Foto: tente novamente.' })
            }

        }

        const coletarMarcados = (campo) => {
            return [...new Set([...(document.querySelectorAll(`[name="${campo}"]:checked`) || [])]
                .map(input => {
                    return ['zona', 'area'].includes(campo)
                        ? Number(input.dataset.valor)
                        : input.dataset.valor
                })
                .filter(Boolean))]
        }

        // EPI
        const inputsAtivos = document.querySelectorAll('input[name="camposEpi"]:checked')
        const equipamentos = {}

        for (const input of inputsAtivos) {
            const campo = input.value
            equipamentos[campo] = {
                quantidade: Number(document.querySelector(`[name="${campo}_quantidade"]`).value),
                tamanho: Number(document.querySelector(`[name="${campo}_tamanho"]`).value)
            }
        }

        colaborador.epi = {
            equipamentos
        }

        const posicaoDelegacao = document.querySelector('.campo-funcoes')?.dataset.posicaoDelegacao
        if (posicaoDelegacao) colaborador.posicao_delegacao_id = posicaoDelegacao

        const salvo = await enviar(`dados_colaboradores/${idColaborador}`, colaborador)
        if (!salvo) return // O motivo já foi exibido por enviar(); o formulário continua aberto.

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
            titulo: `Colaboradores_${Date.now()}.xlsx`,
            filtros: controles.colaboradores?.filtros || {},
            ordenar: controles.colaboradores?.ordenar || { path: 'timestamp', direcao: 'desc', tipo: 'numero' },
            formatacao: {
                datas: ['data_nascimento'],
            }
        }

        await baixarRelatorioExcel(dados)

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao gerar o arquivo Excel: Fale com o suporte.' })
    } finally { removerOverlay() }

}

async function carregarTabelaFuncoes(funcaoUsuario, filtros, colaboradorId) {
    const campo = document.querySelector('.campo-funcoes')
    const contexto = await dadosMapaDelegacao()
    const titulos = [...new Set(contexto.funcoes.map(f => f.titulo).concat(funcaoUsuario || []))]
    campo.innerHTML = '<div class="delegacao-escolher"><button type="button" onclick="abrirMapaDelegacao(true)">Escolher função e região no mapa</button><span class="delegacao-selecao"></span></div>'
    const status = campo.querySelector('.delegacao-selecao')
    status.textContent = funcaoUsuario || 'Nenhuma função selecionada'
    for (const titulo of titulos) {
        const radio = document.createElement('input')
        radio.type = 'radio'; radio.name = 'funcao'; radio.hidden = true
        radio.dataset.valor = titulo; radio.checked = titulo === funcaoUsuario
        campo.append(radio)
    }
    if (colaboradorId) {
        const atribuicao = await requisicaoDelegacao('/atribuicao', { colaborador_id: colaboradorId })
        if (atribuicao.posicao_id) {
            campo.dataset.posicaoDelegacao = atribuicao.posicao_id
            const p = contexto.posicoes.find(p => p.id === atribuicao.posicao_id)
            if (p) status.textContent = rotuloPosicaoDelegacao(p, contexto)
        } else if (funcaoUsuario !== 'Diretor Programador') {
            status.textContent += ' · sem posição vinculada'
        }
    }
}

function mostrarFiltros(titulo, filtros) {
    const root = document.querySelector('.campo-filtros')
    const statusDelegacao = root.closest('.campo-funcoes')?.querySelector('.delegacao-selecao')
    if (statusDelegacao) statusDelegacao.textContent = titulo || 'Nenhuma função selecionada'
    // Conservar selecoes compativeis ao trocar a funcao, sem alterar o contrato salvo.
    if (!filtros) filtros = Object.fromEntries(['zona','distrito','area','obra'].map(campo => [campo,
        [...new Set([...root.querySelectorAll('[name="' + campo + '"]:checked')].map(input => ['zona','area'].includes(campo) ? Number(input.dataset.valor) : input.dataset.valor))]
    ]))
    const permitidos = esquema.find(item => item.titulo === titulo)?.campos || []
    const nomes = {zona:'Zona', distrito:'Distrito', area:'Área'}
    const input = (campo, valor, rotulo) => {
        const normalizado = ['zona','area'].includes(campo) ? Number(valor) : String(valor)
        const checked = (filtros[campo] || []).includes(normalizado)
        return '<label class="regiao-opcao"><input type="checkbox" name="' + campo + '" data-valor="' + escaparAtributo(valor) + '" ' + (checked ? 'checked' : '') + '><span>' + escaparAtributo(rotulo) + '</span></label>'
    }
    const construir = (registros, nivel = 0) => {
        const campo = ['zona','distrito','area'][nivel]
        const valores = [...new Set(registros.map(c => c[campo]).filter(v => v != null && v !== ''))]
            .sort((a,b) => campo === 'distrito' ? String(a).localeCompare(String(b), 'pt-BR') : Number(a)-Number(b))
        return valores.map(valor => {
            const filhos = registros.filter(c => String(c[campo]) === String(valor))
            const rotulo = nomes[campo] + ' ' + valor
            const controle = permitidos.includes(campo) ? input(campo, valor, rotulo) : '<span class="regiao-contexto">' + escaparAtributo(rotulo) + '</span>'
            const cidadesHtml = [...new Set(filhos.map(c => c.nome).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(nome => '<span class="regiao-cidade">' + escaparAtributo(nome) + '</span>').join('')
            const conteudo = nivel < 2 ? construir(filhos, nivel+1) : '<div class="regiao-cidades">' + cidadesHtml + '</div>'
            return '<div class="regiao-no" data-nivel="' + campo + '"><div class="regiao-linha">' + (conteudo ? '<button type="button" class="regiao-expandir" aria-expanded="false" aria-label="Expandir ' + escaparAtributo(rotulo) + '">&#8250;</button>' : '<span class="regiao-espaco"></span>') + controle + '<span class="regiao-parcial" hidden>Parcial</span></div><div class="regiao-filhos" hidden>' + conteudo + '</div></div>'
        }).join('')
    }
    const geografia = permitidos.some(campo => ['zona','distrito','area'].includes(campo))
    const obras = permitidos.includes('obra') ? [...new Set(obrasFiltrosColaboradores.map(o=>o.contrato).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(ordem=>input('obra',ordem,ordem)).join('') : ''
    root.innerHTML = geografia || obras ? '<div class="regiao-painel"><div class="regiao-toolbar"><input type="search" class="regiao-busca" aria-label="Pesquisar regioes e obras" placeholder="Pesquisar cidade, distrito, zona ou obra..."><button type="button" data-regiao-expandir>Expandir tudo</button><button type="button" data-regiao-limpar>Limpar seleção</button></div><div class="regiao-resumo" aria-live="polite"></div><div class="regiao-arvore">' + (geografia ? construir(cidades) : '') + '</div>' + (permitidos.includes('obra') ? '<section class="regiao-obras"><h4>Obras atribuídas</h4>' + (obras || '<span>Nenhuma obra disponível.</span>') + '</section>' : '') + '</div>' : '<span>Não se aplica</span>'
    root.onchange = event => {
        const alvo = event.target
        if (!alvo.matches('input[type="checkbox"]')) return
        for (const outro of root.querySelectorAll('input[name="' + alvo.name + '"]')) if (outro.dataset.valor === alvo.dataset.valor) outro.checked = alvo.checked
        filtrarCidades({campo:alvo.name})
    }
    root.onclick = event => {
        const botao = event.target.closest('.regiao-expandir')
        if (botao) {
            const filhos = botao.closest('.regiao-no').querySelector(':scope > .regiao-filhos')
            filhos.hidden = !filhos.hidden
            botao.setAttribute('aria-expanded', String(!filhos.hidden))
        }
    }
    root.querySelector('[data-regiao-expandir]')?.addEventListener('click', () => {
        const abrir = !!root.querySelector('.regiao-filhos[hidden]')
        root.querySelectorAll('.regiao-filhos').forEach(el=>el.hidden = !abrir)
        root.querySelectorAll('.regiao-expandir').forEach(el=>el.setAttribute('aria-expanded',String(abrir)))
    })
    root.querySelector('[data-regiao-limpar]')?.addEventListener('click', () => {
        root.querySelectorAll('input[type="checkbox"]').forEach(el=>el.checked=false)
        filtrarCidades({})
    })
    root.querySelector('.regiao-busca')?.addEventListener('input', pesquisarRegioesColaborador)
    filtrarCidades({filtros})
    // Revelar caminhos das selecoes existentes, mantendo demais ramos recolhidos.
    root.querySelectorAll('input:checked').forEach(el=> {
        let pai = el.closest('.regiao-filhos')
        while (pai) { pai.hidden = false; pai.parentElement.querySelector('.regiao-expandir')?.setAttribute('aria-expanded','true'); pai = pai.parentElement.parentElement.closest('.regiao-filhos') }
    })
    verificarRegras()
}

function pesquisarRegioesColaborador() {
    const root = document.querySelector('.campo-filtros')
    const normalizar = valor => valor.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()
    const termo = normalizar(root.querySelector('.regiao-busca').value.trim())
    for (const no of [...root.querySelectorAll('.regiao-no')].reverse()) {
        no.hidden = !!termo && !normalizar(no.textContent).includes(termo)
        if (termo && !no.hidden) { no.querySelector(':scope > .regiao-filhos').hidden=false; no.querySelector('.regiao-expandir')?.setAttribute('aria-expanded','true') }
    }
    root.querySelectorAll('.regiao-obras .regiao-opcao').forEach(label=>label.hidden = !!termo && !normalizar(label.textContent).includes(termo))
}

async function tooltipObra(elemento, ordem) {
    document.getElementById('tooltip')?.remove()

    const tooltip = document.createElement('div')
    tooltip.id = 'tooltip'
    tooltip.className = 'tooltip-colaboradores'

    Object.assign(tooltip.style, {
        position: 'fixed',
        transform: 'translate(-50%, -100%)',
        zIndex: '99999',
        pointerEvents: 'none',
        visibility: 'hidden'
    })

    document.body.appendChild(tooltip)

    elemento.addEventListener('mouseleave', () => tooltip.remove(), {
        once: true
    })

    try {
        const pesquisa = await pesquisarDB({
            base: 'vw_dados_orcamentos',
            filtros: {
                contrato: { op: '=', value: ordem },
                em_obra: { op: '=', value: true }
            }
        })

        if (!tooltip.isConnected) return

        const { snapshots } = pesquisa.resultados?.[0] || {}

        tooltip.textContent = snapshots?.morada_execucao || 'Sem informação'

        const rect = elemento.getBoundingClientRect()

        Object.assign(tooltip.style, {
            left: `${rect.left + rect.width / 2}px`,
            top: `${rect.top - 8}px`,
            visibility: 'visible'
        })
    } catch (erro) {
        tooltip.remove()
        console.error(erro)
    }
}

function filtrarCidades({ filtros = null, campo = null }) {
    const root = document.querySelector('.campo-filtros')
    if (!root) return
    const funcao = document.querySelector('[name="funcao"]:checked')?.dataset.valor
    const marcados = nome => [...root.querySelectorAll('[name="'+nome+'"]:checked')].map(el=>el.dataset.valor)
    const ajustar = (nome, disponiveis, automatico = false) => {
        for (const input of root.querySelectorAll('[name="'+nome+'"]')) {
            const disponivel = disponiveis.has(input.dataset.valor)
            input.disabled = !disponivel
            input.closest('label').title = disponivel ? '' : 'Selecione primeiro a região superior.'
            if (!disponivel) input.checked = false
            else if (filtros) input.checked = (filtros[nome] || []).map(String).includes(input.dataset.valor)
            else if (automatico) input.checked = true
            input.closest('label').classList.toggle('regiao-indisponivel',!disponivel)
        }
    }
    if (filtros) root.querySelectorAll('[name="zona"]').forEach(input=>input.checked=(filtros.zona||[]).map(String).includes(input.dataset.valor))
    const zonas = marcados('zona')
    ajustar('distrito',new Set(cidades.filter(c=>zonas.includes(String(c.zona))).map(c=>String(c.distrito))))
    const distritos = marcados('distrito')
    ajustar('area',new Set(cidades.filter(c=>distritos.includes(String(c.distrito))).map(c=>String(c.area))),campo==='distrito' && funcao==='Encarregado de Obra')
    ajustar('obra',new Set(obrasFiltrosColaboradores.map(o=>String(o.contrato))),campo==='area' && funcao==='Trabalhador')
    for (const no of root.querySelectorAll('.regiao-no')) {
        const filhos = [...no.querySelectorAll(':scope > .regiao-filhos input[type="checkbox"]')].filter(el=>!el.disabled)
        const selecionados = filhos.filter(el=>el.checked).length
        const parcial = selecionados > 0 && selecionados < filhos.length
        // Indicador separado: o checkbox do pai continua representando a selecao explicita salva.
        no.querySelector(':scope > .regiao-linha > .regiao-parcial').hidden = !parcial
    }
    const resumo = root.querySelector('.regiao-resumo')
    if (resumo) resumo.textContent = ['zona','distrito','area','obra'].map(nome=>new Set(marcados(nome)).size + ' ' + ({zona:'zonas',distrito:'distritos',area:'áreas',obra:'obras'}[nome])).join(' · ')
}

async function historicoColaborador() {

    try {

        overlayAguarde()

        const pag = 'his'
        const tabela = await modTab({
            base: 'vw_historico_colaboradores',
            pag,
            body: 'his',
            colunas: {
                'Colaborador': { chave: 'nome_colaborador' },
                'Alterações': {},
                'Data': { chave: 'data', tipoPesquisa: 'data' },
                'Alterado por': { chave: 'usuario' }
            },
            criarLinha: 'linhaHis'
        })

        const idPopup = popup({
            elemento: `<div style="padding: 0.5rem;">${tabela}</div>`
        })
        document.getElementById(idPopup).classList.add('popup-historico')

        await paginacao(pag)

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao gerar o histórico: Fale com o suporte.' })
    }


}

function linhaHis(his) {

    const {
        nome_colaborador,
        data,
        usuario
    } = his || {}

    return `
        <tr>
            <td>
                <span class="historico-pessoa">${escaparAtributo(nome_colaborador || '—')}</span>
            </td>
            <td>
                <div class="janela-alteracoes">${linhasAlteracoesHistorico(his, 'dados_colaboradores')}</div>
            </td>
            <td>${escaparAtributo(data)}</td>
            <td>${escaparAtributo(usuario)}</td>
        </tr>
    `

}
