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

    const { usuario, funcao } = acesso || {}

    const tRecebidos = await modTab({
        pag: 'tRecebidos',
        base: 'mensagens',
        body: 'tRecebidos',
        funcaoAdicional: ['carregarAtalhosEmail', 'verificarMensagens'],
        filtros: {
            modo: 'OR',
            regras: [
                {
                    modo: 'AND',
                    regras: [
                        {
                            path: 'funcao',
                            op: 'includes',
                            value: funcao
                        },
                        {
                        
                            path: 'realizada',
                            op: '!=',
                            value: true
                        }
                    ]
                },
                {
                    path: 'snapshots.destinatario',
                    op: '=',
                    value: usuario
                }
            ]
        },
        criarLinha: 'linMensagem'
    })

    const tEnviados = await modTab({
        pag: 'tEnviados',
        base: 'mensagens',
        body: 'tEnviados',
        filtros: {
            modo: 'OR',
            regras: [
                { path: 'funcao', op: 'includes', value: funcao },
                { path: 'snapshots.envolvidos', op: 'includes', value: usuario }
            ]
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
                ${montarPagina({ tabela: tRecebidos, titulo: 'Responder', imagem: 'alerta' })}
                ${montarPagina({ tabela: tEnviados, titulo: 'Chats', imagem: 'chat' })}
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
        funcao,
        acao,
        realizada,
        destinatario,
        mensagem,
        snapshots,
        anexos
    } = m || {}


    const { funcao: funcaoUsuario } = acesso || {}

    const botaoAcao = acao && (funcao || []).includes(funcaoUsuario) && !realizada
        ? `<button onclick="confirmarAcao('${id}', '${acao}')">Confirmar Exclusão</button>`
        : realizada
            ? `
            <div style="${horizontal}; gap: 5px;">
                <img src="imagens/concluido.png">
                <span>Ação realizada</span>
            </div>
            `
            : ''

    const listAnexos = Object.values(anexos || {})
        .map(anexo => criarAnexoVisual(anexo))
        .join('')

    const divAnexos = `
            <div class="bloco-anexos">
                <img 
                    src="imagens/anexo.png"
                    style="cursor:pointer;"
                    onclick="document.getElementById('inputArquivos_${id}').click()">
                <input
                    type="file"
                    id="inputArquivos_${id}"
                    multiple
                    style="display:none;"
                    onchange="salvarAnexosChat(this, '${id}')">
                ${listAnexos || 'Sem anexos'}
            </div>
        `


    const listaRespostas = Object.entries(respostas || {})
        .sort(([, a], [, b]) => b.timestamp - a.timestamp)
        .map(([id, { usuario, mensagem, timestamp }], i) => {

            const data = new Date(timestamp).toLocaleString()
            return `
                <div ${i == 0 ? 'style="background-color: #ffeea3"' : ''} class="mensagem-resposta">
                    <span>${data}, <b>${usuario}</b></span>
                    <span>${mensagem}</span>
                </div>`
        })
        .join('')

    const campoRespostas = listaRespostas
        ? `<div class="bloco-respostas">${listaRespostas || ''}</div>`
        : ''

    const responder = `
        <div style="${horizontal}; gap: 5px; width: 95%;">
            <textarea id="${id}-chat" style="resize: vertical; padding: 0.5rem;" placeholder="Digite algo..."></textarea>
            <img src="imagens/concluido.png" onclick="enviarRespostaChat('${id}', '${destinatario}', '${remetente}')">
        </div>
    `

    const para = destinatario
        ? `<span>para <u>${destinatario || ''}</u></span>`
        : ''

    return `
    <tr>
        <td style="padding: 0px;">

            <div class="m-sagem">
                <span style="font-size: 0.6rem;"><b>${data}</b></span>
                <div style="${horizontal}; gap: 5px;" name="linha">
                    <img src="imagens/carta.png">
                    <span>de <u>${remetente || ''}</u></span>
                    <span><b>${snapshots?.funcao || ''}</b></span>
                    ${para}
                </div>
                <span><b>Assunto:</b></span> 
                <span>${assunto || 'Sem Assunto'}</span>

                <span><b>Mensagem:</b></span>
                <div style="white-space: wrap;">${mensagem}</div>

                ${botaoAcao}
            
                <span><b>Anexos:</b></span>
                ${divAnexos}
                
                <span><b>Responder:</b></span>
                ${responder}

            </div>
            ${campoRespostas}
            
        </td>
    </tr>
    `

}

function confirmarAcao(idMensagem, acao) {

    const botoes = [
        {
            texto: 'Confirmar',
            img: 'concluido',
            funcao: `executarAcao('${idMensagem}', '${acao}')`
        }
    ]

    popup({
        mensagem: 'Tem certeza disso?',
        botoes
    })

}

async function executarAcao(idMensagem, acao) {

    try {

        overlayAguarde()

        const resposta = await deletar(acao)

        console.log(resposta)

        if (resposta.success) {
            await enviar(`mensagens/${idMensagem}/realizada`, true)
            removerTodosPopups()
        } else
            popup({ mensagem: 'Falha ao executar a ação: Fale com o suporte.' })

    } catch (err) {

        console.error(err)
        popup({ mensagem: 'Falha ao executar a ação: Fale com o suporte.' })

    }

}

async function salvarAnexosChat(input, idMensagem) {

    try {

        overlayAguarde()

        if (!input || !input.files || input.files.length === 0)
            return

        const resposta = (await importarAnexos({ input }) || [])

        if (!resposta.length)
            return popup({ mensagem: 'Escolha alguns anexos' })

        const anexosAtuais = Object.assign({},
            ...resposta.map(anexo => ({ [crypto.randomUUID()]: anexo }))
        )

        const { anexos } = await recuperarDado('mensagens', idMensagem) || {}

        await enviar(`mensagens/${idMensagem}/anexos`, {
            ...anexosAtuais,
            ...anexos
        })

        removerOverlay()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao anexas arquivos, tente novamente em breve' })
    }

}

async function enviarRespostaChat(idMensagem, destinatario, remetente) {

    try {

        overlayAguarde()

        const mensagem = document.getElementById(`${idMensagem}-chat`)

        if (!mensagem.value)
            return popup({ mensagem: 'Não deixe a resposta em branco!' })

        const { usuario } = acesso || {}

        const novoDestinatario = usuario == destinatario
            ? remetente
            : destinatario

        const timestamp = Date.now()
        const resposta = {
            destinatario: novoDestinatario,
            timestamp,
            usuario,
            mensagem: mensagem.value
        }

        await enviar(`mensagens/${idMensagem}/respostas/${crypto.randomUUID()}`, resposta)

        mensagem.value = ''
        removerOverlay()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao enviar resposta: Fale com o suporte.' })
    }

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