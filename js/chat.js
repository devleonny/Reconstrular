function regrasFiltros(esquema = false) {
    const { funcao } = acesso || {}

    const filtros = {
        funcao: {
            modo: 'OR',
            regras: []
        }
    }

    if (funcao === 'CEO') {
        filtros.funcao.regras = [
            { op: '=', value: 'Diretor Operativo' }
        ]
    } else if (funcao === 'Diretor Operativo') {
        filtros.funcao.regras = [
            { op: '=', value: 'CEO' },
            { op: '=', value: 'Coordenador Operativo' }
        ]
    } else if (funcao === 'Coordenador Operativo') {
        filtros.funcao.regras = [
            { op: '=', value: 'Encarregado de Obra' }
        ]
    } else if (funcao === 'Encarregado de Obra') {
        filtros.funcao.regras = [
            { op: '=', value: 'Coordenador Operativo' }
        ]
    }

    if (esquema !== true) {
        return filtros
    }

    const relacoes = {
        'CEO': [
            'Diretor Operativo'
        ],
        'Diretor Operativo': [
            'CEO',
            'Coordenador Operativo'
        ],
        'Coordenador Operativo': [
            'Encarregado de Obra'
        ],
        'Encarregado de Obra': [
            'Coordenador Operativo'
        ]
    }

    const escaparHtml = valor => {
        return String(valor)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
    }

    const destacarFuncaoAtual = cargo => {
        const cargoHtml = escaparHtml(cargo)

        if (cargo === funcao) {
            return `
                <span class="funcao-atual">
                    ◉ ${cargoHtml}
                </span>
            `
        }

        return cargoHtml
    }

    const montarRelacoes = (cargo, nivel = 0) => {
        const destinos = relacoes[cargo] || []

        const indentacao = '│   '.repeat(nivel)
        const prefixo = nivel === 0 ? '' : `${indentacao}└── `

        let html = `
            <div class="linha-hierarquia">
                ${prefixo}${destacarFuncaoAtual(cargo)}
            </div>
        `

        destinos.forEach((destino, indice) => {
            const ultimaRelacao = indice === destinos.length - 1
            const prefixoDestino = nivel === 0
                ? '└── '
                : `${'│   '.repeat(nivel)}${ultimaRelacao ? '└── ' : '├── '}`

            html += `
                <div class="linha-hierarquia">
                    ${prefixoDestino}${destacarFuncaoAtual(destino)}
                </div>
            `
        })

        return html
    }

    const htmlHierarquia = Object.keys(relacoes)
        .map(cargo => montarRelacoes(cargo))
        .join('<br>')

    return montarPagina({ 
        tabela: `<div class="esquema-hierarquia">${htmlHierarquia}</div>`, 
        titulo: 'Hierarquia', 
        imagem: 'hierarquia' 
    })

}

async function painelChat() {

    overlayAguarde()

    const { usuario } = acesso || {}

    const tRecebidos = await modTab({
        pag: 'tRecebidos',
        base: 'mensagens',
        body: 'tRecebidos',
        funcaoAdicional: ['carregarAtalhosEmail', 'verificarMensagens'],
        filtros: {
            'snapshots.destinatario': { op: '=', value: usuario }
        },
        criarLinha: 'linMensagem'
    })

    const tEnviados = await modTab({
        pag: 'tEnviados',
        base: 'mensagens',
        body: 'tEnviados',
        filtros: {
            remetente: { op: '=', value: usuario }
        },
        criarLinha: 'linMensagem'
    })

    const painelEsquerda = montarPagina({
        tabela: `<div class="atalhos-email"></div>`,
        titulo: 'Atalhos',
        imagem: 'chat'
    })

    tela.innerHTML = `
        <div class="painel-email">
            <div style="${vertical}; gap: 3px;">
                ${painelEsquerda}
                <br>
                ${regrasFiltros(true)}
            </div>
            <div class="painel-chat-tabelas">
                ${montarPagina({ tabela: tRecebidos, titulo: 'Recebidos', imagem: 'alerta' })}
                ${montarPagina({ tabela: tEnviados, titulo: 'Enviados', imagem: 'enviado' })}
            </div>
        </div>
    `
    await paginacao()

    removerOverlay()

}


async function carregarAtalhosEmail() {

    const local = document.querySelector('.atalhos-email')

    local.innerHTML = `<img style="width: 5rem;" src="gifs/loading.gif">`

    const { usuario } = acesso || {}

    const contagem = await contarPorCampo({
        base: 'mensagens',
        path: 'snapshots.funcao',
        filtros: {
            'snapshots.envolvidos': { op: 'includes', value: usuario }
        }
    })

    const elementos = Object.entries(contagem)
        .map(([funcao, quantidade]) => {
            return `
                <div class="etiqueta" onclick="filtrarPorFuncao('${funcao}')">
                    <span class="badge-numero">${quantidade}</span>
                    <span>${inicialMaiuscula(funcao)}</span>
                </div>
                `
        })
        .join('')

    local.innerHTML = elementos

}

async function filtrarPorFuncao(funcao) {

    controles.tEnviados.filtros['snapshots.funcao'] = { op: '=', value: funcao }
    controles.tRecebidos.filtros['snapshots.funcao'] = { op: '=', value: funcao }

    if (funcao == 'todos') {
        delete controles.tEnviados.filtros['snapshots.funcao']
        delete controles.tRecebidos.filtros['snapshots.funcao']
    }

    await paginacao()

}

function marcarTodos(inputM) {

    const inputs = document.querySelectorAll('[name="mensagem"]')
    for (const input of inputs) {
        input.checked = inputM.checked
    }
}

function linMensagem(m) {

    const {
        id,
        respostas,
        remetente,
        assunto,
        data,
        destinatario,
        mensagem,
        snapshots,
        anexos
    } = m || {}

    const listAnexos = Object.entries(anexos || {})
        .map(([id, { link, nome }]) => {

            const titulo = nome.length >= 15
                ? `${nome.slice(0, 15)}...`
                : nome

            return `
                <div class="balao-anexo">
                    <img src="imagens/anexo.png" style="width: 1.5rem;">
                    <span>${titulo}</span>
                </div>`
        })
        .join('')

    const divAnexos = listAnexos.length
        ? `<div style="display: flex; flex-wrap: wrap; gap: 5px; padding: 3px; margin-left: 2rem;">${listAnexos}</div>`
        : ''

    const listaRespostas = Object.entries(respostas || {})
        .sort(([, a], [, b]) => b.timestamp - a.timestamp)
        .map(([id, { usuario, mensagem, timestamp }], i) => {

            const data = new Date(timestamp).toLocaleString()
            return `
                <div ${i == 0 ? 'style="background-color: #ffeea3"' : ''} class="mensagem-resposta">
                    <span>${data}, <b>${usuario}</b></span>
                    <span>${mensagem}</span>
                    ${i == 0 ? `<img src="gifs/alerta.gif" style="position: absolute; top: 0; right: 0;">` : ''}
                </div>`
        })
        .join('')

    const campoRespostas = listaRespostas
        ? `<div class="bloco-respostas">${listaRespostas || ''}</div>`
        : ''

    return `
    <tr>
        <td style="padding: 0px;">
            <div class="m-sagem">
                <span style="font-size: 0.6rem;"><b>${data}</b></span>
                <div style="${horizontal}; gap: 5px;" name="linha">
                    <img src="imagens/carta.png" onclick="abrirMensagem('${id}')">
                    <span>de <u>${remetente || ''}</u></span>
                    <span><b>${snapshots?.funcao || ''}</b></span>
                    <span>para <u>${destinatario || ''}</u></span>
                </div>
                <div><b>Assunto:</b> ${assunto || 'Sem Assunto'}</div>
                <span style="white-space: wrap;"><b>Mensagem:</b> \n${mensagem}</span>
            </div>
            ${divAnexos}
            ${campoRespostas}
        </td>
    </tr>
    `

}

async function abrirMensagem(idMensagem) {

    overlayAguarde()

    const { usuario } = acesso || {}

    const {
        assunto,
        anexos,
        mensagem,
        destinatario,
        remetente,
        respostas
    } = await recuperarDado('mensagens', idMensagem) || {}

    const listaRespostas = Object.entries(respostas || {})
        .sort(([, a], [, b]) => b.timestamp - a.timestamp)
        .map(([id, { usuario, mensagem, timestamp }]) => {
            const data = new Date(timestamp).toLocaleString()
            return `
            <div class="mensagem-resposta">
                <span>${data}, <b>${usuario}</b></span>
                <div>${mensagem}</div>
            </div>`
        })
        .join('')

    const spansAnexos = Object.entries(anexos || {})
        .map(([id, anexo]) => {
            return criarAnexoVisual(anexo)
        })
        .join('')

    const linhas = [
        {
            elemento: `
                <div style="${vertical}">
                    <span>➤ Assunto</span>
                    <div style="display: flex; flex-wrap: wrap;">${assunto || 'Sem Assunto'}</div>

                    <br>
                    <span>➤ Mensagem</span>   
                    <div style="display: flex; flex-wrap: wrap;">${mensagem || 'Sem Mensagem'}</div>

                    <br>
                    <span>➤ Anexos</span>   
                    <div style="display: flex; flex-wrap: wrap; gap: 5px;">${spansAnexos || 'Sem anexos'}</div>
                </div>
            `
        },
        {
            texto: 'Responder',
            editor: ''
        },
        {
            elemento: `<div style="${vertical}; gap: 5px; width: 90%;">${listaRespostas || ''}</div>`
        }
    ]

    const novoDestinatario = usuario == destinatario
        ? remetente
        : destinatario

    const botoes = [
        { texto: 'Responder', img: 'atualizar', funcao: `enviarResposta('${idMensagem}', '${novoDestinatario}')` }
    ]

    popup({ botoes, linhas, titulo: `Mensagem de ${remetente}` })


}

async function enviarResposta(idMensagem, destinatario) {

    overlayAguarde()

    const editor = document.querySelector('.editor-conteudo')

    if (editor.innerHTML == '')
        return popup({ mensagem: 'Não deixe a resposta em branco!' })

    const { usuario } = acesso || {}

    const timestamp = Date.now()
    const resposta = {
        destinatario,
        timestamp,
        usuario,
        mensagem: editor.innerHTML
    }

    await enviar(`mensagens/${idMensagem}/respostas/${crypto.randomUUID()}`, resposta)

    removerTodosPopups()

}

function balaoMensagem() {

    controlesCxOpcoes.destinatario = {
        base: 'dados_setores',
        retornar: ['usuario'],
        filtros: regrasFiltros(),
        colunas: {
            'Usuario': { chave: 'usuario' },
            'Nome': { chave: 'nome_completo' },
            'Cidade': { chave: 'snapshots.cidade.nome' },
            'Distrito': { chave: 'snapshots.cidade.distrito' },
            'Funcao': { chave: 'funcao', bloquearPesquisa: true }
        }
    }

    const linhas = [
        {
            texto: 'Destinatário',
            elemento: `<span class="opcoes" name="destinatario" onclick="cxOpcoes('destinatario')">Selecionar</span>`
        },
        {
            texto: 'Assunto',
            elemento: `<textarea id="assunto"></textarea>`
        },
        {
            editor: ''
        },
        {
            texto: 'Anexos',
            elemento: `<input id="anexos" type="file" multiple>`
        }
    ]

    const botoes = [
        { texto: 'Enviar', img: 'concluido', funcao: `enviarMensagem()` }
    ]

    popup({ linhas, botoes, titulo: 'Enviar mensagem' })
}

async function enviarMensagem() {

    try {

        overlayAguarde()

        const msg = document.querySelector('.editor-conteudo')
        if (msg.innerHTML == '')
            return popup({ mensagem: 'Mensagem em branco' })

        const assunto = document.querySelector('[id="assunto"]').value

        if (!assunto)
            return popup({ mensagem: 'Assunto em branco...' })

        const destinatario = document.querySelector('[name="destinatario"]')?.id

        if (!destinatario)
            return popup({ mensagem: 'Escolha um destinatário' })

        // Anexos
        const input = document.getElementById('anexos')
        const retornoAnexos = await importarAnexos({ input })
        const anexos = {}

        if (Array.isArray(retornoAnexos)) {

            for (const a of retornoAnexos) {
                anexos[crypto.randomUUID()] = a
            }

        }

        const id = crypto.randomUUID()
        const m = {
            anexos,
            id,
            destinatario,
            assunto,
            remetente: acesso.usuario,
            data: new Date().toLocaleString(),
            mensagem: msg.innerHTML
        }

        await enviar(`mensagens/${id}`, m)

        removerPopup()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao enviar a mensagem: Fale com o suporte.' })
    }

}