// Foto do colaborador: círculo grande no topo do formulário. Sem foto, o círculo mostra um avatar genérico
// (fundo CSS, nunca gravado: a foto real é a referência do reconhecimento facial do ponto).
// Clicar na foto abre as opções de trocar: câmera ou imagem do aparelho.
function fotoColaboradorHtml(foto) {
    return `
        <div class="colaborador-foto">
            <button type="button" class="colaborador-avatar" title="Clique para alterar a foto" aria-label="Alterar foto do colaborador" aria-expanded="false" onclick="menuFotoColaborador(this)">
                <span class="colaborador-avatar-circulo">
                    <img name="foto" alt="Foto do colaborador" ${foto ? `src="${urlArquivo(foto)}"` : ''}>
                    <video autoplay muted playsinline hidden aria-label="Prévia da câmara"></video>
                </span>
                <span class="colaborador-avatar-editar" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>
                </span>
            </button>
            <div class="colaborador-foto-menu" hidden>
                <button type="button" onclick="abrirCameraColaborador(this)">Tirar foto com a câmara</button>
                <button type="button" onclick="this.closest('.colaborador-foto').querySelector('[data-foto-arquivo]').click()">Escolher imagem</button>
                <input type="file" accept="image/*" data-foto-arquivo hidden onchange="arquivoFotoColaborador(this)">
            </div>
            <div class="colaborador-foto-acoes">
                <button type="button" data-camera-capturar hidden onclick="capturarFotoColaborador(this)">Capturar foto</button>
                <button type="button" data-camera-cancelar hidden onclick="cancelarCameraColaborador(this.closest('.colaborador-foto'))">Cancelar</button>
            </div>
            <p class="colaborador-foto-status" role="status">${foto ? 'Clique na foto para alterar.' : 'Sem foto: clique no círculo para adicionar.'}</p>
        </div>`
}

function menuFotoColaborador(botao) {
    const painel = botao.closest('.colaborador-foto')
    if (painel.classList.contains('camera-ativa')) return
    const menu = painel.querySelector('.colaborador-foto-menu')
    menu.hidden = !menu.hidden
    botao.setAttribute('aria-expanded', String(!menu.hidden))
}

async function abrirCameraColaborador(botao) {
    const painel = botao.closest('.colaborador-foto')
    const video = painel.querySelector('video')
    const status = painel.querySelector('[role="status"]')
    const pedido = Symbol()
    painel.pedidoCamera = pedido
    painel.querySelector('.colaborador-foto-menu').hidden = true
    status.textContent = 'A abrir câmara…'
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
        painel.querySelector('[data-camera-cancelar]').hidden = false
        await video.play()
        if (!painel.isConnected || painel.pedidoCamera !== pedido) return
        painel.querySelector('[data-camera-capturar]').hidden = false
        status.textContent = 'Enquadre o rosto no centro do círculo e clique em Capturar foto.'
    } catch (erro) {
        if (!painel.isConnected || painel.pedidoCamera !== pedido) return
        cancelarCameraColaborador(painel)
        status.textContent = erro.name === 'NotAllowedError'
            ? 'Permita o acesso à câmara no navegador e tente novamente.'
            : 'Não foi possível abrir a câmara. Confira se ela está disponível e tente novamente.'
    }
}

function cancelarCameraColaborador(painel) {
    painel.pedidoCamera = null
    const video = painel.querySelector('video')
    video.srcObject?.getTracks().forEach(track => track.stop())
    video.srcObject = null
    video.hidden = true
    painel.classList.remove('camera-ativa')
    painel.querySelector('[data-camera-capturar]').hidden = true
    painel.querySelector('[data-camera-cancelar]').hidden = true
    painel.querySelector('[role="status"]').textContent = 'Clique na foto para alterar.'
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
    painel.querySelector('[role="status"]').textContent = 'Foto capturada. Ela será guardada ao guardar o registo.'
}

// Imagem do aparelho: reduzida para no máximo 1280 px (o envio e o reconhecimento facial não precisam de mais).
function arquivoFotoColaborador(input) {
    const painel = input.closest('.colaborador-foto')
    const arquivo = input.files?.[0]
    input.value = ''
    painel.querySelector('.colaborador-foto-menu').hidden = true
    if (!arquivo) return
    const status = painel.querySelector('[role="status"]')
    if (!arquivo.type.startsWith('image/')) return status.textContent = 'Escolha um ficheiro de imagem (JPG, PNG…).'
    const imagem = new Image()
    const url = URL.createObjectURL(arquivo)
    imagem.onload = () => {
        const escala = Math.min(1, 1280 / Math.max(imagem.width, imagem.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(imagem.width * escala)
        canvas.height = Math.round(imagem.height * escala)
        canvas.getContext('2d').drawImage(imagem, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        painel.querySelector('[name="foto"]').src = canvas.toDataURL('image/jpeg', 0.9)
        status.textContent = 'Imagem escolhida. Ela será guardada ao guardar o registo.'
    }
    imagem.onerror = () => { URL.revokeObjectURL(url); status.textContent = 'Não foi possível abrir esta imagem.' }
    imagem.src = url
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
        'Foto': {},
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
        acesso_bloqueado,
        foto
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

    // Miniatura no mesmo estilo do formulário; sem foto (ou se falhar ao carregar) fica o avatar genérico.
    const tds = `
        <td>
            <span class="colaborador-mini" title="${escaparAtributo(nome || '')}">
                ${foto ? `<img src="${urlArquivo(foto)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
            </span>
        </td>
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
        // Documento: os já guardados (abrir/remover), os novos por enviar e a área para arrastar ou escolher.
        // O input mantém o name do campo: salvarColaborador e verificarRegras leem dele os ficheiros novos.
        const zonaDocumento = (chave, nomeDocumento) => {
            const anexos = Object.entries(colaborador?.[chave] || {})
            const guardados = anexos.map(([idAnexo, anexo]) => criarAnexoVisual({ ...anexo,
                funcao: id ? `removerDocumentoColaborador(this, '${escaparAtributo(id)}', '${chave}', '${escaparAtributo(idAnexo)}')` : null })).join('')
            return `
                <div class="zona-documento" data-documento="${chave}">
                    <div class="zona-documento-lista" id="anexos_${chave}">${guardados}</div>
                    <div class="zona-documento-lista zona-documento-novos" data-novos></div>
                    <label class="zona-documento-alvo">
                        <input ${regras} name="${chave}" type="file" multiple accept="${DOCUMENTO_ACEITES}">
                        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>
                        <span><b>Arraste o ${nomeDocumento} para aqui</b> ou clique para escolher</span>
                        <small>PDF, imagem ou Word, até ${DOCUMENTO_MAX_MB} MB${anexos.length ? ' · os novos juntam-se aos já guardados' : ''}</small>
                    </label>
                </div>`
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
            // FOTO (primeiro item do formulário)
            { elemento: fotoColaboradorHtml(foto) },
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
                texto: 'Utilizador',
                elemento: `
                    <div style="${vertical}; gap: 5px;">
                        <input name="usuario" aria-label="Utilizador gerado pelo servidor" placeholder="Gerado automaticamente ao guardar" value="${escaparAtributo(usuario || '')}" readonly>
                        <small>O utilizador é gerado pelo servidor.</small>
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
            { texto: 'Contrato de Obra', elemento: zonaDocumento('contrato_obra', 'contrato') },
            { texto: 'Exame médico', elemento: zonaDocumento('exame', 'exame') },
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

            // PIN (Trabalhador); os demais entram com senha, gerada como provisória pelo rodapé.
            {
                texto: 'Forma de Acesso [PIN]',
                elemento: `
                    <div class="painel-pin">
                        <input ${regras} type="text" class="campo-pin" ${ATRIBUTOS_PIN} value="${pin || ''}" ${pin ? `data-existente="${pin}"` : ''} name="pin" placeholder="Máximo de 4 números">
                        <input ${regras} type="text" class="campo-pin" ${ATRIBUTOS_PIN} name="pinEspelho" value="${pin || ''}" placeholder="Repita o PIN">

                        <div class="rodape-alerta"></div>
                        <button onclick="resetarPin()">Novo Pin</button>
                    </div>
                `
            }
        ]

        linhas.push({ elemento: Remuneracao.formulario(colaborador) })

        const botoes = [
            { funcao: id ? `salvarColaborador('${id}')` : 'salvarColaborador()', texto: 'Guardar', img: 'concluido' }
        ]

        if (id && usuario && funcao !== 'Trabalhador')
            botoes.push({ img: 'cadeado', texto: 'Palavra-passe provisória', funcao: `confirmarSenhaProvisoria('${id}')` })

        if (id)
            botoes.push({ img: 'cancel', texto: 'Eliminar', funcao: `confirmarExclusaoColaborador('${id}')` })

        const idFormulario = popup({ linhas, botoes, titulo: 'Registo de Colaborador' })
        document.getElementById(idFormulario)?.classList.add('popup-colaborador')
        // Ficha de terceiros: o navegador não deve sugerir nem oferecer guardar estes dados (morada, telefone…).
        document.getElementById(idFormulario)?.querySelectorAll('input:not([type="file"]):not([type="radio"]):not([type="checkbox"]), textarea')
            .forEach(campo => campo.setAttribute('autocomplete', 'off'))
        prepararZonasDocumento()

        await carregarTabelaFuncoes(funcao, filtros, id)

        verificarRegras()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao abrir o formulário de Colaborador: Fale com o suporte.' })
    }

}

// PIN do terminal de ponto: texto numérico mascarado por CSS (.campo-pin), não type="password",
// para o navegador não o tratar como palavra-passe e oferecer guardá-lo ao fechar o formulário.
// data-lpignore / data-1p-ignore: o mesmo para os gestores de palavras-passe LastPass e 1Password.
const ATRIBUTOS_PIN = 'inputmode="numeric" maxlength="4" autocomplete="off" data-lpignore="true" data-1p-ignore'

// ---------- Documentos do colaborador (contrato e exame) ----------
const DOCUMENTO_EXTENSOES = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx']
const DOCUMENTO_ACEITES = DOCUMENTO_EXTENSOES.map(e => '.' + e).join(',')
const DOCUMENTO_MAX_MB = 20

// Liga cada área de documento: arrastar ou escolher junta ficheiros (não substitui os já escolhidos),
// mostra a pré-visualização dos novos e permite retirá-los antes de guardar.
function prepararZonasDocumento(raiz = document) {
    for (const zona of raiz.querySelectorAll('.zona-documento:not([data-pronta])')) {
        zona.dataset.pronta = '1'
        const input = zona.querySelector('input[type="file"]')
        const novos = zona.querySelector('[data-novos]')
        const escolhidos = new DataTransfer()

        const desenhar = () => {
            novos.querySelectorAll('img[data-previa]').forEach(img => URL.revokeObjectURL(img.src))
            novos.innerHTML = [...escolhidos.files].map((f, i) => {
                const extensao = (f.name.match(/\.([^.]+)$/)?.[1] || 'arq').toLowerCase()
                const remover = `<button type="button" class="anexo-remover" data-retirar="${i}" title="Retirar" aria-label="Retirar ${escaparAtributo(f.name)}">&times;</button>`
                return ['jpg', 'jpeg', 'png', 'webp'].includes(extensao)
                    ? `<div class="anexo-imagem anexo-novo" title="${escaparAtributo(f.name)}">${remover}<img class="foto-status" data-previa src="${URL.createObjectURL(f)}" alt=""></div>`
                    : `<div class="contorno-anexos anexo-novo" title="${escaparAtributo(f.name)}" style="--anexo-cor: ${corTipoAnexo(extensao)}">
                        <div class="contorno-iterno"><span class="anexo-tipo">${escaparAtributo(extensao.slice(0, 4))}</span>
                        <span class="anexo-textos"><span class="anexo-nome">${escaparAtributo(f.name.replace(/\.[^.]+$/, ''))}</span>
                        <small>${(f.size / 1048576).toFixed(1)} MB · por enviar</small></span></div>${remover}</div>`
            }).join('')
        }
        // O input passa a conter todos os escolhidos; avisa a validação do formulário.
        const sincronizar = () => {
            input.files = escolhidos.files
            desenhar()
            input.dispatchEvent(new Event('input', { bubbles: true }))
        }
        const adicionar = ficheiros => {
            const recusados = []
            for (const f of ficheiros) {
                const extensao = (f.name.match(/\.([^.]+)$/)?.[1] || '').toLowerCase()
                if (!DOCUMENTO_EXTENSOES.includes(extensao)) recusados.push(`${f.name}: tipo não aceite`)
                else if (f.size > DOCUMENTO_MAX_MB * 1048576) recusados.push(`${f.name}: acima de ${DOCUMENTO_MAX_MB} MB`)
                else if (![...escolhidos.files].some(e => e.name === f.name && e.size === f.size)) escolhidos.items.add(f)
            }
            sincronizar()
            if (recusados.length) popup({ titulo: 'Documento', mensagem: `Não foi possível juntar:<br>${recusados.map(escaparAtributo).join('<br>')}<br><br>Aceites: PDF, imagem (JPG, PNG, WEBP) ou Word, até ${DOCUMENTO_MAX_MB} MB.` })
        }

        input.addEventListener('change', () => adicionar([...input.files]))
        novos.addEventListener('click', e => {
            const botao = e.target.closest('[data-retirar]')
            if (!botao) return
            escolhidos.items.remove(Number(botao.dataset.retirar))
            sincronizar()
        })
        // Arrastar: a área inteira aceita a largada; o destaque some ao sair ou largar.
        let profundidade = 0
        zona.addEventListener('dragenter', e => { e.preventDefault(); profundidade++; zona.classList.add('arrastando') })
        zona.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' })
        zona.addEventListener('dragleave', () => { if (--profundidade <= 0) { profundidade = 0; zona.classList.remove('arrastando') } })
        zona.addEventListener('drop', e => {
            e.preventDefault()
            profundidade = 0
            zona.classList.remove('arrastando')
            if (e.dataTransfer?.files?.length) adicionar([...e.dataTransfer.files])
        })
    }
}

// Remover um documento já guardado: pede confirmação e apaga só aquele anexo do registo.
function removerDocumentoColaborador(botao, idColaborador, chave, idAnexo) {
    botao.closest('.anexo-imagem, .contorno-anexos')?.setAttribute('data-remover', idAnexo)
    popup({
        titulo: 'Remover documento',
        mensagem: 'Remover este documento do registo do colaborador?',
        botoes: [{ texto: 'Remover', img: 'cancel', funcao: `confirmarRemoverDocumento('${idColaborador}', '${chave}', '${idAnexo}')`, fechar: true }]
    })
}

async function confirmarRemoverDocumento(idColaborador, chave, idAnexo) {
    overlayAguarde()
    // deletar devolve o resultado (objeto) só quando apagou; recusa do servidor já mostra o motivo.
    const resultado = await deletar(`dados_colaboradores/${idColaborador}/${chave}/${idAnexo}`)
    removerOverlay()
    if (resultado === null) return popup({ mensagem: 'Não foi possível remover o documento. Tente novamente.' })
    if (typeof resultado !== 'object') return
    document.querySelector(`[data-remover="${CSS.escape(idAnexo)}"]`)?.remove()
    verificarRegras()
}

// Senha provisória: para usuário novo ou para quem perdeu o acesso. No primeiro login com ela
// a pessoa é obrigada a criar a própria senha (central.js, formularioPrimeiroAcesso).
function confirmarSenhaProvisoria(id) {

    const botoes = [
        { texto: 'Gerar', img: 'cadeado', funcao: `gerarSenhaProvisoria('${id}')` }
    ]

    popup({
        mensagem: `
            Gerar uma palavra-passe provisória para este colaborador?<br>
            <small>A palavra-passe atual deixa de funcionar e os aparelhos conectados saem. A provisória vale 48 horas
            e, no primeiro acesso, a pessoa cria a palavra-passe dela.</small>`,
        botoes,
        titulo: 'Palavra-passe provisória'
    })
}

async function gerarSenhaProvisoria(id) {

    overlayAguarde()

    try {
        const resposta = await fetchAutenticado(`${api}/senha-provisoria`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${acesso?.token}` },
            body: JSON.stringify({ id })
        })
        const dados = await resposta.json().catch(() => ({}))

        removerPopup()

        if (!resposta.ok || !dados.success)
            return popup({ mensagem: dados.mensagem || 'Falha ao gerar a palavra-passe provisória.' })

        const validade = new Date(dados.expiraEm).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })

        const linhas = [
            { texto: 'Utilizador', elemento: `<input value="${escaparAtributo(dados.usuario)}" readOnly>` },
            {
                texto: 'Palavra-passe provisória',
                elemento: `
                    <div style="${horizontal}; gap: 5px;">
                        <input value="${escaparAtributo(dados.senha)}" readOnly style="font-family: monospace; font-size: 1.1rem;">
                        <button type="button" onclick="navigator.clipboard.writeText(this.previousElementSibling.value).then(() => this.textContent = 'Copiada')">Copiar</button>
                    </div>`
            },
            { elemento: `<small style="text-align: left;">Válida até ${validade}. Ela aparece só agora: copie e envie para a pessoa.</small>` },
            dados.bloqueado
                ? { elemento: `<small style="text-align: left; color: #a63c3c;">O acesso deste colaborador está bloqueado: desbloqueie para ele conseguir entrar.</small>` }
                : {}
        ]

        popup({ linhas, titulo: 'Palavra-passe provisória' })

    } catch {
        removerOverlay()
        popup({ mensagem: 'Sem conexão com o servidor. Tente novamente.' })
    }
}

function confirmarExclusaoColaborador(id) {

    const botoes = [
        { texto: 'Confirmar', img: 'concluido', funcao: `excluirColaborador('${id}')`, fechar: true }
    ]

    popup({ mensagem: 'Tem certeza?', botoes, titulo: 'Eliminar colaborador', removerAnteriores: true })
}

async function excluirColaborador(id) {

    overlayAguarde()

    await deletar(`dados_colaboradores/${id}`)

    removerOverlay()
}

async function salvarColaborador(idExistente) {

    const idColaborador = idExistente || crypto.randomUUID()

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
        // Cadastro novo ainda não existe no servidor: não há histórico de remuneração a preservar.
        const anterior = idExistente ? await recuperarDado('dados_colaboradores', idColaborador) || {} : {}
        const remuneracao = Remuneracao.coletar(anterior)
        if (remuneracao) colaborador.remuneracao = remuneracao

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

        }

        // O servidor atribui o usuário na criação e preserva o login nas edições.
        // A senha não sai deste formulário: é gerada como provisória pelo botão do rodapé.

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
        popup({ mensagem: err.message || 'Falha ao guardar o colaborador: Fale com o suporte.' })
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
        popup({ mensagem: 'Falha ao gerar o ficheiro Excel: Fale com o suporte.' })
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
        await painelHistorico({
            titulo: 'Histórico de colaboradores',
            subtitulo: 'Registos, alterações e eliminações',
            base: 'vw_historico_colaboradores',
            tabelaPadrao: 'dados_colaboradores',
            buscarPessoa: true
        })
    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao gerar o histórico: Fale com o suporte.' })
    }

}
