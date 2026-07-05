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
            <button onclick="balaoMensagem()">Enviar Mensagem</span>
            <button onclick="">Marcar como lida</button>
        </div>
    `
    const pag = 'mensagens'
    const tabela = await modTab({
        btnExtras,
        base: 'mensagens',
        body: 'bodyMensagens',
        ordenar: {
            path: 'lido',
            direcao: 'asc'
        },
        pag,
        criarLinha: 'criarDivMensagem'
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

    const contagem = await contarPorCampo({
        base: 'mensagens',
        path: 'snapshots.funcao'
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

function criarDivMensagem(m) {

    const { id, remetente, assunto, data, lido, mensagem, snapshots } = m

    return `
    <tr>
        <td style="padding: 0px;">
            <div name="linha" data-lido="${lido == 'S' ? 'S' : 'N'}" class="m-sagem-${lido == 'S' ? 'S' : 'N'}">
                <input name="mensagem" type="checkbox">
                <img src="imagens/carta.png" onclick="abrirMensagem('${id}')">
                <span><u>${remetente || ''}</u></span>
                <span><b>${snapshots?.funcao || ''}</b></span>
                <span style="font-size: 0.6rem;"><b>${data}</b></span>
                <span><b>${assunto || '...'}</b></span>
                <span>${String(mensagem || '').slice(0, 50)}...</span>
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
        lido
    } = await recuperarDado('mensagens', idMensagem) || {}

    const spansAnexos = Object.entries(anexos || {})
        .map(([id, anexo]) => {
            return criarAnexoVisual(anexo)
        })
        .join('')

    const linhas = [
        {
            texto: 'Assunto',
            elemento: `<textarea readOnly>${assunto || ''}</textarea>`
        },
        {
            texto: 'Mensagem',
            elemento: `<textarea readOnly>${mensagem || ''}</textarea>`
        },
        {
            texto: 'Anexos',
            elemento: `<div style="display: flex; flex-wrap: wrap; gap: 5px;">${spansAnexos || 'Sem anexos'}</div>`
        },
        {
            texto: `<button>Responder</button>`,
            elemento: `<div style="${vertical}; gap: 5px;"></div>`
        }
    ]

    popup({ linhas, titulo: `Mensagem de ${remetente}` })


    if (lido !== 'S')
        await enviar(`mensagens/${idMensagem}/lido`, 'S')

    await verificarMensagens()

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
            texto: 'Mensagem',
            elemento: `<textarea id="mensagem"></textarea>`
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

    const msg = document.querySelector('#mensagem')
    if (!msg.value)
        return removerPopup()

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
        mensagem: msg.value
    }

    await enviar(`mensagens/${id}`, m)

    removerPopup()

}