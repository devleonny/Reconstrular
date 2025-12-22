class formulario {

    constructor({ linhas, botoes, titulo }) {
        this.titulo = titulo
        this.linhas = linhas
        this.botoes = botoes
    }

    abrirFormulario() {

        const botaoPadrao = ({ funcao, img, texto }) => `
            <div ${texto == 'Excluir' ? 'data-controle="excluir"' : ''} onclick="${funcao}" class="botoes-rodape">
                <img src="imagens/${img}.png">
                <span>${texto}</span>
            </div>
        `

        const linhaFormulario = ({ texto, elemento }) => `
            <div class="linha-padrao">
                <span>${texto || ''}</span>
                <div>${elemento}</div>
            </div>
        `

        const linhas = this.linhas
            .map(l => linhaFormulario(l))
            .join('')

        const botoes = this.botoes
            .map(b => botaoPadrao(b))
            .join('')

        const acumulado = `
            <div style="${vertical}; background-color: #d2d2d2;">

                <div class="painel-padrao">

                    ${linhas}

                </div>
        
            </div>
            <div class="rodape-padrao">
                ${botoes}
            </div>
        `

        popup(acumulado, this.titulo, true)

        validarControlesAcesso()

    }


}