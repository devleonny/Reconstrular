
async function painelChat() {

    const menus = `
    <div class="menu-chat-superior">
        <div style="${horizontal}; gap: 5px;">
            <input type="checkbox" onclick="marcarTodos(this)">
            <span style="color: white;">Marcar todos</span>
        </div>
        <button onclick="confirmarArquivamento()">Arquivar mensagens</button>
        <button onclick="">Marcar como lida</button>
    </div>
    `
    const pag = 'mensagens'
    const tabela = await modTab({
        base: 'mensagens',
        body: 'bodyMensagens',
        ordenar: {
            path: 'lido',
            direcao: 'asc'
        },
        filtros: {
            'destinatario': { op: '=', value: acesso.usuario }
        },
        pag,
        criarLinha: 'criarDivMensagem'
    })

    const acumulado = `
        <div style="${vertical}; gap: 2px;">

            ${menus}

            <div class="tela-inferior-mensagens">
                <div class="mensagens-funcao"></div>
                ${tabela}
            </div>
        </div>
    `

    tela.innerHTML = acumulado

    await paginacao(pag)

}

async function confirmarArquivamento() {

    const botoes = [
        { texto: 'Arquivar', img: 'concluido', funcao: `arquivarMensagens('S')` },
        { texto: 'Desarquivar', img: 'desarquivar', funcao: `arquivarMensagens('N')` }
    ]

    popup({ mensagem: 'Arquivar mensagens?', botoes, titulo: 'Arquivar mensagens' })

}

function marcarTodos(inputM) {

    const inputs = document.querySelectorAll('[name="mensagem"]')
    for (const input of inputs) {
        input.checked = inputM.checked
    }
}

function criarDivMensagem(m) {

    const { id, remetente, assunto, data, lido, mensagem } = m

    const div = ` 
        <input name="mensagem" type="checkbox">
        <img src="imagens/carta.png" onclick="abrirMensagem('${id}')">
        <span><u>${remetente || ''}</u></span>
        <span style="font-size: 0.6rem;"><b>${data}</b></span>
        <span><b>${assunto || '...'}</b></span>
        <span>${String(mensagem || '').slice(0, 50)}...</span>
    `

    return `
    <tr>
        <td>
            <div name="linha" data-lido="${lido == 'S' ? 'S' : 'N'}" class="m-sagem-${lido || 'N'}">
                ${div}
            </div>
        </td>
    </tr>
    `

}

async function abrirMensagem(idMensagem) {

    const { assunto, mensagem, remetente, lido } = await recuperarDado('mensagens', idMensagem) || {}

    const linhas = [
        {
            texto: 'Remetente',
            elemento: `<input value="${remetente}" readOnly>`
        },
        {
            texto: 'Assunto',
            elemento: `<textarea>${assunto || ''}</textarea>`
        },
        {
            texto: 'Mensagem',
            elemento: `<textarea readOnly>${mensagem || ''}</textarea>`
        }
    ]

    popup({ linhas, titulo: `Mensagem de ${remetente}` })

    if (lido !== 'S')
        await enviar(`mensagens/${idMensagem}/lido`, 'S')

}

function balaoMensagem(destinatario) {

    const linhas = [
        {
            texto: 'Destinatário',
            elemento: `<input id="destinatario" value="${destinatario}" readOnly>`
        },
        {
            texto: 'Assunto',
            elemento: `<textarea id="assunto"></textarea>`
        },
        {
            texto: 'Mensagem',
            elemento: `<textarea id="mensagem"></textarea>`
        }
    ]

    const botoes = [
        { texto: 'Enviar', img: 'concluido', funcao: `enviarMensagem('${destinatario}')` }
    ]

    popup({ linhas, botoes, titulo: 'Enviar mensagem' })
}

async function enviarMensagem(destinatario) {

    overlayAguarde()

    const msg = document.querySelector('[name="mensagem"]')
    if (!msg.value)
        return removerPopup()

    const assunto = document.querySelector('[id="assunto"]').value

    if (!assunto)
        return popup({ mensagem: 'Assunto em branco...' })

    const id = crypto.randomUUID()
    const m = {
        id,
        destinatario,
        assunto,
        remetente: acesso.usuario,
        data: new Date().toLocaleString(),
        mensagem: msg.value
    }

    await enviar(`mensagens/${id}`, m)

    removerPopup()

}

async function alertaMensagens() {

    mensagens = await recuperarDados('mensagens')

    const total = Object
        .values(mensagens)
        .filter(m => !m?.lido).length

    const badge = document.getElementById('msg')

    if (badge) badge.innerHTML = total == 0
        ? ''
        : `<span class="badge-numero">${total}</span>`

}

async function arquivarMensagens(operacao) {

    overlayAguarde()

    const inputsM = document.querySelectorAll('[name="mensagem"]')
    const mensagens = []
    for (const inp of inputsM) {
        const div = inp.closest('div')
        if (inp.checked) mensagens.push(div.id)
    }

    if (mensagens.length == 0) return removerPopup()

    const url = `${api}/arquivar-mensagens`

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mensagens, operacao, servidor })
        })

        if (!response.ok) {
            popup({ mensagem: 'Falha ao arquivar mensagens, tente novamente mais tarde.' })
            const erroServidor = await response.text()
            console.error(`Resposta do servidor:`, erroServidor)
        }

        const data = await response.json()

        if (data.mensagem)
            return popup({ mensagem: data.mensagem })

        await sincronizarDados('mensagens')
        await painelChat()
        removerPopup()

        return

    } catch (erro) {
        console.log(erro)
        return popup({ mensagem: 'Falha ao arquivar mensagens, tente novamente mais tarde.' })
    }

}