let mensagensFuncao = {}
let nLidas = true
let arquivado = false
let filtroMensagens = 'todas' // 'todas', 'lidas', 'nLidas'

function aplicarFiltroMensagens() {
    const linhas = document.querySelectorAll('div[name="linha"]')

    for (const linha of linhas) {
        const lido = linha.dataset.lido == 'S'

        switch (filtroMensagens) {
            case 'nLidas':
                linha.style.display = lido ? 'none' : 'flex'
                break
            case 'lidas':
                linha.style.display = lido ? 'flex' : 'none'
                break
            default:
                linha.style.display = 'flex'
        }
    }
}


async function painelUsuarios() {

    mostrarMenus(false)

    const stringUsuarios = {}
    titulo.textContent = 'Chat'

    funcoes = await recuperarDados('funcoes')
    dados_setores = await recuperarDados('dados_setores') || {}
    const uOrganizados = Object
        .entries(dados_setores)
        .sort((a, b) => a[0].localeCompare(b[0]))

    for (const [usuario, d] of uOrganizados) {

        const status = d?.status || 'offline'
        if (!stringUsuarios[status]) stringUsuarios[status] = { quantidade: 0, linhas: '' }

        const f = funcoes?.[d?.funcao]?.nome || '...'
        stringUsuarios[status].quantidade++
        stringUsuarios[status].linhas += `
            <div class="usuarioOnline">
                ${usuario !== acesso.usuario
                ? `<img onclick="balaoMensagem('${usuario}')" src="imagens/carta.png">`
                : '<span style="width: 2rem;"></span>'}
                <img src="imagens/${status}.png" style="width: 1.5rem;">
                <label>${usuario}</label>
                <label style="font-size: 0.6rem;">
                    <b>${f}</b>
                </label>
            </div>
        `
    }

    let info = ''

    // ordena as chaves colocando "offline" no final
    const chavesOrdenadas = Object.keys(stringUsuarios).sort((a, b) => {
        if (a === 'offline') return 1
        if (b === 'offline') return -1
        return a.localeCompare(b)
    })

    for (const st of chavesOrdenadas) {
        const dados = stringUsuarios[st]
        info += `
            <label><strong>${st}</strong> ${dados.quantidade}</label>
            ${dados.linhas}
        `
    }

    const menus = `
    <div class="menu-chat-superior">
        <div style="${horizontal}; gap: 5px;">
            <input type="checkbox" onclick="marcarTodos(this)">
            <span style="color: white;">Marcar todos</span>
        </div>
        <button onclick="confirmarArquivamento()">Arquivar mensagens</button>
        <button onclick="filtrarNLidos()">Não Lidas</button>
        <button onclick="filtrarLidas()">Lidas</button>
        <button onclick="mostrarTodasMensagens()">Todas</button>
        <div class="pesquisa">
            <input oninput="pesquisarEmMensagens(this.value)" placeholder="Pesquisar" style="width: 100%;">
            <img src="imagens/pesquisar2.png">
        </div>
    </div>
    `

    const acumulado = `
        <div style="${vertical}; width: 90vw; gap: 2px;">

            ${menus}

            <div class="tela-inferior-mensagens">
                <div class="mensagens-funcao"></div>
                <div class="painel-mensagens"></div>
                <div class="divOnline">${info}</div>
            </div>
        </div>
    `

    const divOnline = document.querySelector('.divOnline')
    if (!divOnline) telaInterna.innerHTML = acumulado

    const btnArq = document.getElementById('btnArq')
    if (btnArq) btnArq.textContent = arquivado ? 'Não arquivados' : 'Arquivados'

    mensagensFuncao = {}
    mensagens = await recuperarDados('mensagens')
    const organizado = Object.entries(mensagens)
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)

    const ativos = []
    for (const [idMensagem, mensagem] of organizado) {

        if (mensagem.remetente == acesso.usuario) continue
        if (!arquivado && mensagem.arquivado == 'S') continue

        ativos.push(idMensagem)
        criarDivMensagem(idMensagem, mensagem)
    }

    // Remoção de linhas de itens não ativos;
    const divs = document.querySelectorAll('[name="linha"]')
    for (const d of divs) if (!ativos.includes(d.id)) d.remove()

    // Carregara primeira tabela com as pendências por Função;

    const mf = document.querySelector('.mensagens-funcao')
    mf.innerHTML = ''

    for (const [f, m] of Object.entries(mensagensFuncao)) {
        const div = `
            <div class="etiqueta">
                <span>${f}</span>
                <span class="badge-numero">${Object.keys(m).length}</span>
            </div>
        `
        mf.innerHTML += div
    }

}

function pesquisarEmMensagens(texto) {
    texto = texto.toLowerCase().trim()
    const linhas = document.querySelectorAll('div[name="linha"]')

    for (const linha of linhas) {
        const conteudo = linha.textContent.toLowerCase()

        linha.style.display = conteudo.includes(texto) ? '' : 'none'
    }
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

function filtrarNLidos() {
    filtroMensagens = 'nLidas'
    aplicarFiltroMensagens()
}

function filtrarLidas() {
    filtroMensagens = 'lidas'
    aplicarFiltroMensagens()
}

function mostrarTodasMensagens() {
    filtroMensagens = 'todas'
    aplicarFiltroMensagens()
}


function criarDivMensagem(idMensagem, m) {

    const divExistente = document.getElementById(idMensagem)

    // Acumular mensagens por função; Apenas não lidas;
    const remF = dados_setores?.[m.remetente]?.funcao || '...'
    const nFun = funcoes?.[remF]?.nome
    if (nFun && m.lido !== 'S') {
        mensagensFuncao[nFun] ??= {}
        mensagensFuncao[nFun][idMensagem] = m
    }

    const div = ` 
        <input name="mensagem" type="checkbox">
        <img src="imagens/carta.png" onclick="abrirMensagem('${idMensagem}')">
        <span><u>${m.remetente}</u></span>
        <span style="font-size: 0.6rem;"><b>${m.data}</b></span>
        <span><b>${m?.assunto || '...'}</b></span>
        <span>${String(m.mensagem).slice(0, 50)}...</span>
    `

    if (divExistente) return divExistente.innerHTML = div

    const painel = document.querySelector('.painel-mensagens')
    painel.insertAdjacentHTML('beforeend', `
        <div id="${idMensagem}" name="linha" data-lido="${m?.lido == 'S' ? 'S' : 'N'}" class="m-sagem-${m.lido || 'N'}">
            ${div}
        </div>`)

}

async function abrirMensagem(idMensagem) {
    const m = mensagens[idMensagem]
    const elemento = `
        <div style="${vertical}; min-width: 20rem; background-color: #d2d2d2; gap: 2px; padding: 1rem;">
            <span><b>Remetente:</b> <u>${m.remetente}</u></span>
            <span><b>Assunto:</b> ${m?.assunto || '...'}</span>
            <hr>
            <span><b>Mensagem:</b></span>
            <div>${m.mensagem}</div>
        </div>
    `

    m.lido = 'S'
    await inserirDados({ [idMensagem]: m }, 'mensagens')
    enviar(`mensagens/${idMensagem}/lido`, 'S')
    popup({ elemento, titulo: `Mensagem de ${m.remetente}` })

    const divMsg = document.getElementById(idMensagem)
    divMsg.classList = `m-sagem-S`
    divMsg.dataset.lido = 'S'

    aplicarFiltroMensagens() // atualiza visibilidade conforme filtro atual
}

function balaoMensagem(destinatario) {

    const elemento = `
        <div class="painel-email">
            <span><b>Para:</b> ${destinatario}</span>
            <span>Assunto</span>
            <textarea name="assunto"></textarea>
            <span>Mensagem</span>
            <textarea rows="5" name="mensagem" data-destinatario="${destinatario}"></textarea>
            <hr>
            <button onclick="enviarMensagem()">Enviar</button>
        </div>
    `

    popup({ elemento, titulo: 'Enviar mensagem' })
}

async function enviarMensagem() {

    overlayAguarde()
    const msg = document.querySelector('[name="mensagem"]')
    if (!msg.value)
        return popup({ mensagem: 'Mensagem em branco...' })

    const assunto = document.querySelector('[name="assunto"]').value

    if (!assunto)
        return popup({ mensagem: 'Assunto em branco...' })

    const destinatario = msg.dataset.destinatario
    const idMensagem = unicoID()

    const m = {
        destinatario,
        assunto,
        remetente: acesso.usuario,
        data: new Date().toLocaleString(),
        mensagem: msg.value
    }

    enviar(`mensagens/${idMensagem}`, m)
    await inserirDados({ [idMensagem]: m }, 'mensagens')
    mensagens[idMensagem] = m
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
        await painelUsuarios()
        removerPopup()

        return

    } catch (erro) {
        console.log(erro)
        return popup({ mensagem: 'Falha ao arquivar mensagens, tente novamente mais tarde.' })
    }

}