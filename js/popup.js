let autoDestruicaoGlobal = {}
let configPopupGlobal = {}

function popup({
    tempo = null,
    autoDestruicao = [],
    elemento,
    mensagem,
    imagem,
    cor = '#ebebeb',
    linhas = [],
    botoes = [],
    titulo,
    removerAnteriores = false
}) {
    if (!elemento && !mensagem)
        mensagem = 'Função <b>inativa</b>. <br>Fale com o suporte para reativação.'

    const idPopup = crypto.randomUUID()

    autoDestruicaoGlobal[idPopup] = autoDestruicao
    configPopupGlobal[idPopup] = { removerAnteriores }

    const arredondado = botoes.length
        ? ''
        : 'border-bottom-left-radius: 10px; border-bottom-right-radius: 10px;'

    const linhaFormulario = ({ texto, elemento, editor }) => {
        if (texto) texto = `<span style="text-align: left;">${texto}</span>`

        if (editor !== undefined) {
            // O ID vira só interno para não conflitar caso existam dois editores,
            // mas você não precisa se preocupar com ele na hora de chamar a função
            const idGerado = `editor-${crypto.randomUUID()}`

            elemento = `
                <div class="editor-container">
                    
                    <div class="editor-toolbar">

                        <span 
                            onclick="document.execCommand('bold', false, null)" 
                            class="editor-botao"
                            onmousedown="event.preventDefault()"
                            style="font-weight: bold;">B</span>
                        
                        <span 
                            onclick="document.execCommand('italic', false, null)"
                            class="editor-botao"
                            onmousedown="event.preventDefault()"
                            style="font-style: italic;">I</span>
                        
                        <span 
                            onclick="document.execCommand('underline', false, null)"
                            class="editor-botao" 
                            onmousedown="event.preventDefault()"
                            style="text-decoration: underline;">U</span>
                    
                        <span onclick="document.execCommand('insertUnorderedList', false, null)"
                            class="editor-botao"
                            onmousedown="event.preventDefault()"
                            style="width: 30px; height: 30px;">•</span>
                        
                        <input 
                            type="color"
                            onmousedown="event.preventDefault()"
                            onchange="document.execCommand('foreColor', false, this.value)" 
                            style="width: 30px; height: 30px; padding: 0; border: none;">

                    </div>
                    
                    <div id="${idGerado}" 
                    class="editor-conteudo" 
                    contenteditable="true">${editor}</div>
                
                </div>
            `
        }

        return `
            <div class="linha-padrao">
                ${texto || ''}
                ${elemento || ''}
            </div>`
    }

    const botaoPadrao = ({ funcao = '', img, texto, fechar = false }) => `
        <div onclick="${funcao}${fechar ? `${funcao ? ';' : ''}${removerAnteriores ? 'removerTodosPopups()' : `removerPopup('${idPopup}')`}` : ''}" class="botoes-rodape">
            <img src="imagens/${img}.png">
            <span>${texto}</span>
        </div>
    `

    let conteudo = ''

    if (linhas.length) {
        conteudo = `
            <div class="painel-padrao">
                ${linhas.map(linhaFormulario).join('')}
            </div>
        `
    } else if (mensagem) {
        conteudo = `
            <div class="mensagem" style="${arredondado}; background-color: ${cor};">
                <img src="${imagem || 'gifs/alerta.gif'}">
                <label>${mensagem}</label>
            </div>
        `
    } else {
        conteudo = `
            <div class="janela" style="background-color: ${cor}; ${arredondado};">
                ${elemento}
            </div>
        `
    }

    const rodape = botoes.length
        ? `<div class="rodape-padrao">${botoes.map(botaoPadrao).join('')}</div>`
        : ''

    const html = `
        <div id="${idPopup}" class="popup">
            <div class="popup-janela-fora">
                <div class="popup-top">
                    <label style="color:white;margin-left:1rem;">${titulo || 'Reconstrular'}</label>
                    <span onclick="removerPopup('${idPopup}')">×</span>
                </div>
                ${conteudo}
                ${rodape}
            </div>
        </div>
    `

    document.querySelector('.aguarde')?.remove()
    document.body.insertAdjacentHTML('beforeend', html)

    if (tempo)
        setTimeout(() => removerPopup(idPopup), tempo * 1000)

    return idPopup
}

function limparRecursosPopup(id) {
    ; (autoDestruicaoGlobal?.[id] || []).forEach(chave => {
        delete controles?.[chave]
        delete controlesCxOpcoes?.[chave]
    })

    delete autoDestruicaoGlobal[id]
    delete configPopupGlobal[id]
}

function removerTodosPopups() {
    const popups = [...document.querySelectorAll('.popup')]
    if (!popups.length) return

    popups.forEach(p => {
        limparRecursosPopup(p.id)
        p.remove()
    })

    document.querySelector('.aguarde')?.remove()
}

function removerPopup(id = null) {
    const popups = [...document.querySelectorAll('.popup')]
    if (!popups.length) return

    const alvo = id
        ? document.getElementById(id)
        : popups[popups.length - 1]

    if (!alvo) return

    limparRecursosPopup(alvo.id)
    alvo.remove()

    document.querySelector('.aguarde')?.remove()
}