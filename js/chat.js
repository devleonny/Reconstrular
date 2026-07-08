function regrasFiltros() {

    const { funcao } = acesso || {}

    const filtros = {
        funcao: {
            modo: 'OR',
            regras: []
        }
    }

    if (funcao == 'CEO') {

        filtros.funcao.regras = [{ op: '=', value: 'Diretor Operativo' }]

    } else if (funcao == 'Diretor Operativo') {

        filtros.funcao.regras = [
            { op: '=', value: 'CEO' },
            { op: '=', value: 'Coordenador Operativo' }
        ]

    } else if (funcao == 'Coordenador Operativo') {

        filtros.funcao.regras = [
            { op: '=', value: 'Encarregado de Obra' }
        ]

    } else if (funcao == 'Encarregado de Obra') {

        filtros.funcao.regras = [
            { op: '=', value: 'Coordenador Operativo' }
        ]

    }

    return filtros

}

async function painelChat() {

    const btnExtras = `
        <div style="${horizontal}; gap: 2px;">
            <div style="${horizontal}; gap: 5px;">
                <input type="checkbox" onclick="marcarTodos(this)">
                <span style="color: white;">Marcar todos</span>
            </div>
            <button onclick="balaoMensagem()">Enviar Mensagem</button>
        </div>
    `
    const { usuario } = acesso || {}
    const pag = 'mensagens'
    const tabela = await modTab({
        btnExtras,
        base: 'mensagens',
        body: 'bodyMensagens',
        filtros: {
            destinatario: { op: '=', value: usuario }
        },
        ordenar: {
            path: 'lido',
            direcao: 'asc'
        },
        pag,
        criarLinha: 'linMensagem'
    })

    tela.innerHTML = `
        <div class="painel-email">
            <div class="atalhos-email"></div>
            ${tabela}
        </div>
    `
    await paginacao(pag)

    carregarAtalhosEmail()

}

async function carregarAtalhosEmail() {

    const local = document.querySelector('.atalhos-email')

    local.innerHTML = `<img style="width: 5rem;" src="gifs/loading.gif">`

    const { usuario } = acesso || {}
    const contagem = await contarPorCampo({
        base: 'mensagens',
        path: 'snapshots.funcao',
        filtros: {
            destinatario: { op: '=', value: usuario },
            lido: { op: '=', value: 'N' }
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

    controles.mensagens.filtros ??= {}
    controles.mensagens.filtros['snapshots.funcao'] = { op: '=', value: funcao }

    if (funcao == 'todos')
        delete controles.mensagens.filtros['snapshots.funcao']

    await paginacao()

}

function marcarTodos(inputM) {

    const inputs = document.querySelectorAll('[name="mensagem"]')
    for (const input of inputs) {
        input.checked = inputM.checked
    }
}

function linMensagem(m) {

    const { id, remetente, assunto, data, lido, mensagem, snapshots, anexos } = m || {}

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

    const textoMensagem = mensagem.length > 50
        ? `${String(mensagem || '').slice(0, 50)}...`
        : mensagem

    return `
    <tr>
        <td style="padding: 0px;">
            <div class="m-sagem-${lido == 'S' ? 'S' : 'N'}">
                <div style="${horizontal}; gap: 5px;" name="linha" data-lido="${lido == 'S' ? 'S' : 'N'}" >
                    <input name="mensagem" type="checkbox">
                    <img src="imagens/carta.png" onclick="abrirMensagem('${id}')">
                    <span><u>${remetente || ''}</u></span>
                    <span><b>${snapshots?.funcao || ''}</b></span>
                    <span style="font-size: 0.6rem;"><b>${data}</b></span>
                    <div><b>${assunto || '...'}</b></div>
                    <span>${textoMensagem}</span>
                </div>
                ${divAnexos}
            </div>
        </td>
    </tr>
    `

}

async function abrirMensagem(idMensagem) {

    overlayAguarde()

    const {
        assunto,
        anexos,
        mensagem,
        remetente,
        respostas,
        lido
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
            texto: 'Assunto',
            elemento: `<div readOnly>${assunto || ''}</div>`
        },
        {
            texto: 'Mensagem',
            elemento: `<div>${mensagem || ''}</div>`
        },
        {
            texto: 'Anexos',
            elemento: `<div style="display: flex; flex-wrap: wrap; gap: 5px;">${spansAnexos || 'Sem anexos'}</div>`
        },
        {
            editor: ''
        },
        {
            elemento: `<div style="${vertical}; gap: 5px; width: 90%;">${listaRespostas || ''}</div>`
        }
    ]

    const botoes = [
        { texto: 'Responder', img: 'atualizar', funcao: `enviarResposta('${idMensagem}', '${remetente}')` }
    ]

    popup({ botoes, linhas, titulo: `Mensagem de ${remetente}` })

    if (lido !== 'S')
        await enviar(`mensagens/${idMensagem}/lido`, 'S')

    verificarMensagens()
    carregarAtalhosEmail()

}

async function enviarResposta(idMensagem, remetente) {

    overlayAguarde()

    const editor = document.querySelector('.editor-conteudo')

    if (editor.innerHTML == '')
        return popup({ mensagem: 'Não deixe a resposta em branco!' })

    const { usuario } = acesso || {}

    const timestamp = Date.now()
    const resposta = {
        timestamp,
        usuario,
        mensagem: editor.innerHTML
    }

    // pensar numa atualização só;
    await enviar(`mensagens/${idMensagem}/respostas/${crypto.randomUUID()}`, resposta),
    await enviar(`mensagens/${idMensagem}/lido`, 'N'),
    await enviar(`mensagens/${idMensagem}/destinatario`, remetente),
    await enviar(`mensagens/${idMensagem}/remetente`, usuario)

    removerTodosPopups()

}

function balaoMensagem() {

    controlesCxOpcoes.destinatario = {
        base: 'dados_setores',
        retornar: ['usuario'],
        filtros: regrasFiltros(),
        colunas: {
            'Usuario': { chave: 'usuario' },
            'Funcao': { chave: 'funcao' }
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
        lido: 'N',
        destinatario,
        assunto,
        remetente: acesso.usuario,
        data: new Date().toLocaleString(),
        mensagem: msg.innerHTML
    }

    await enviar(`mensagens/${id}`, m)

    removerPopup()

}