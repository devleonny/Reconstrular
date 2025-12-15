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
                ${usuario !== acesso.usuario ? `<img onclick="balaoMensagem('${usuario}')" src="imagens/carta.png">` : ''}
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

    const acumulado = `
        <div class="conteinerOnline">
            <div class="mensagens-funcao"></div>
            <div class="divOnline">${info}</div>
        </div>
    `

    const divOnline = document.querySelector('.divOnline')
    if (!divOnline) telaInterna.innerHTML = acumulado

    mensagens = await recuperarDados('mensagens')
    for (const [idMensagem, mensagem] of Object.entries(mensagens)) {

        if (mensagem.remetente == acesso.usuario) continue
        criarDivMensagem(idMensagem, mensagem)
    }

}

function criarDivMensagem(idMensagem, m) {

    const divExistente = document.getElementById(idMensagem)
    
    const div = `
        <div onclick="abrirMensagem('${idMensagem}')" class="m-sagem-${m.lido || 'N'}">
            <span><u>${m.remetente}</u></span>
            <span style="font-size: 0.6rem;"><b>${m.data}</b></span>
            <span><b>${m?.assunto || '...'}</b></span>
            <span>${m.mensagem.slice(0, 50)}...</span>
        </div>
    `

    if(divExistente) return divExistente.innerHTML = div

    const painel = document.querySelector('.mensagens-funcao')
    painel.insertAdjacentHTML('beforeend', `<div style="width: 100%;" id="${idMensagem}">${div}</div>`)                
    
}

async function abrirMensagem(idMensagem) {

    const m = mensagens[idMensagem]
    const acumulado = `
        <div style="${vertical}; min-width: 20rem; background-color: #d2d2d2; gap: 2px; padding: 1rem;">
            <span><u>${m.remetente}</u></span>
            <span><b>Assunto:</b> ${m?.assunto || '...'}</span>
            <hr>
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
            <hr>
            <textarea rows="5" name="mensagem" data-destinatario="${destinatario}"></textarea>
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