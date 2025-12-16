let mensagensFuncao = {}
let nLidas = true

async function painelUsuarios() {

    mostrarMenus(false)

    const stringUsuarios = {}
    titulo.textContent = 'Chat'

    funcoes = await recuperarDados('funcoes')
    dados_setores = await recuperarDados('dados_setores') || {}

    for (const [usuario, d] of Object.entries(dados_setores).sort((a, b) => a[0].localeCompare(b[0]))) {

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
    <div style="${horizontal}; gap: 5px;">
        <div style="${horizontal}; gap: 5px;">
            <input type="checkbox" onclick="marcarTodos(this)">
            <span style="color: white;">Marcar todos</span>
        </div>
        <button>Arquivar mensagens</button>
        <button onclick="filtrarNLidos(this)">Não lidas</button>
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

    mensagensFuncao = {}
    mensagens = await recuperarDados('mensagens')
    for (const [idMensagem, mensagem] of Object.entries(mensagens)) {
        if (mensagem.remetente == acesso.usuario) continue
        criarDivMensagem(idMensagem, mensagem)
    }

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

function marcarTodos(inputM) {

    const inputs = document.querySelectorAll('[name="mensagem"]')
    for (const input of inputs) {
        input.checked = inputM.checked
    }
}

function filtrarNLidos(button) {

    const linhas = document.querySelectorAll('[name="linha"]')

    nLidas = nLidas ? false : true 

    button.textContent = nLidas ? 'Não Lidas' : 'Lidas'

    for(const linha of linhas) {
        const lido = linha.dataset.lido == 'S'
        linha.style.display = lido == nLidas ? 'flex' : 'none'
    }

}

function criarDivMensagem(idMensagem, m) {

    const divExistente = document.getElementById(idMensagem)

    // Acumular mensagens por função; Apenas não lidas;
    const remF = dados_setores?.[m.remetente].funcao
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
        <span>${m.mensagem.slice(0, 50)}...</span>
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
    const acumulado = `
        <div style="${vertical}; min-width: 20rem; background-color: #d2d2d2; gap: 2px; padding: 1rem;">
            <span><u>${m.remetente}</u></span>
            <span><b>Assunto:</b> ${m?.assunto || '...'}</span>
            <div>${m.mensagem}</div>
        </div>
    `
    m.lido = 'S'
    await inserirDados({ [idMensagem]: m }, 'mensagens')
    enviar(`mensagens/${idMensagem}/lido`, 'S')
    popup(acumulado, `Mensagem de ${m.remetente}`, true)
    await painelUsuarios()

}

function togglePastas(div) {
    const el = div.nextElementSibling
    const aberto = getComputedStyle(el).display !== 'none'
    el.style.display = aberto ? 'none' : 'flex'
}

function balaoMensagem(destinatario) {

    const acumulado = `
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

    popup(acumulado, 'Enviar mensagem', true)
}

async function enviarMensagem() {

    overlayAguarde()
    const msg = document.querySelector('[name="mensagem"]')
    if (!msg.value) return popup(mensagem('Mensagem em branco...'), 'Alerta', true)

    const assunto = document.querySelector('[name="assunto"]').value

    if (!assunto) return popup(mensagem('Assunto em branco...'), 'Alerta', true)

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