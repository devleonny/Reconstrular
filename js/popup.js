function popup({
    tempo = null,
    elemento,
    mensagem,
    imagem = 'gifs/alerta.gif',
    cor = '#ebebeb',
    linhas = [],
    botoes = [],
    titulo = 'Reconstrular',
    nra = true
}) {

    if (!elemento && !mensagem) mensagem = 'Função <b>inativa</b>. <br>Fale com o suporte para reativação.'

    const idPopup = ID5digitos()

    const arredondado = botoes.length
        ? ''
        : `border-bottom-left-radius: 10px; border-bottom-right-radius: 10px;`

    const linhaFormulario = ({ texto, elemento }) => {

        if (texto) texto = `<span style="text-align: left;">${texto}</span>`

        return `
            <div class="linha-padrao">
                ${texto || ''}
                ${elemento}
            </div>`
    }

    // Se img == concluido [ação de confirmar algo] && nra esteja falso [não manter anteriores]; Fechar todos os popups;
    const botaoPadrao = ({ funcao, img, texto }) => {
        const removerAnteriores = (!nra && img == 'concluido')
            ? `removerPopup(null, false)`
            : ''

        return `
        <div onclick="${funcao}; ${removerAnteriores}" class="botoes-rodape">
            <img src="imagens/${img}.png">
            <span>${texto}</span>
        </div>`
    }

    if (linhas.length) {

        const lins = linhas
            .map(l => linhaFormulario(l))
            .join('')

        elemento = `
            <div class="painel-padrao">
                ${lins}
            </div>`

    } else if (mensagem) {

        elemento = `
        <div class="mensagem" style="${arredondado}; background-color: ${cor};">
            <img src="${imagem}">
            <label>${mensagem}</label>
        </div>`

    } else {

        elemento = `
            <div class="janela" style="background-color: ${cor}; ${arredondado};">
                ${elemento}
            </div>
        `
    }

    const bts = botoes
        .map(b => botaoPadrao(b))
        .join('')

    const rodapePadrao = botoes.length
        ? `
            <div class="rodape-padrao">
                ${bts}
            </div>`
        : ''

    const p = `
        <div id="${idPopup}" class="popup">

            <div class="popup-janela-fora">
                
                <div class="popup-top">

                    <label style="background-color: transparent; color: white; margin-left: 1rem;">${titulo}</label>
                    <span onclick="removerPopup('${idPopup}')">×</span>

                </div>
                
                ${elemento}

                ${rodapePadrao}

            </div>

        </div>`

    const aguarde = document.querySelector('.aguarde')
    if (aguarde) aguarde.remove()

    document.body.insertAdjacentHTML('beforeend', p)

    if (tempo) {
        const pop = document.getElementById(idPopup)

        setTimeout(() => {
            if (pop) pop.remove()
        }, tempo * 1000)
    }

}

function removerPopup(id = null, nra = true) {
    const popups = document.querySelectorAll('.popup')

    if (nra === false) {
        popups.forEach(p => p.remove())
    } else if (id) {
        document.getElementById(id)?.remove()
    } else {
        popups[popups.length - 1]?.remove()
    }

    document.querySelector('.aguarde')?.remove()
}
