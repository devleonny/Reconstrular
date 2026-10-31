// A folha de ponto foi para o menu Ponto → Folha de ponto (com lançamentos do gestor sinalizados e motivo).
// O ícone de relógio em Colaboradores abre lá o colaborador escolhido.
function mostrarFolha(idColaborador) {
    Assiduidade.abrir('folha', { colaborador: idColaborador })
}

function gerarTodosPDFs() {

    const opMeses = Object.entries({ '': '', ...meses })
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([m, mes]) => `<option value="${m}">${mes}</option>`)
        .join('')

    popup({
        imagem: 'imagens/relogio.png',
        mensagem: `
            <div style="${vertical}; gap: 5px;">

                <span>Selecione o ano e/ou mês:</span>
                
                <select name="pdf_ano">${['', '2026'].map(o => `<option value="${o}">${o}</option>`).join('')}</select>
                <select name="pdf_mes">${opMeses}</select>

            </div>
        `,
        botoes: [
            {
                texto: 'Descarregar',
                funcao: 'gerarPdfFolha()',
                img: 'concluido'
            }
        ]
    })

}

async function gerarPdfFolha(idColaborador) {

    try {

        overlayAguarde()

        const mes = document.querySelector(`[name="${!idColaborador ? 'pdf_' : ''}mes"]`).value
        const ano = document.querySelector(`[name="${!idColaborador ? 'pdf_' : ''}ano"]`).value

        const req = {
            ...(idColaborador ? { idColaborador } : {}),
            ...(mes ? { mes } : {}),
            ...(ano ? { ano } : {})
        }

        await baixarFolha(req)

    } catch (err) {
        console.error(err)
        popup({ mensagem: `Falha ao descarregar PDFs: Fale com o suporte.` })
    } finally { removerOverlay() }
}

async function baixarFolha(req = null) {

    overlayAguarde()

    const { token } = JSON.parse(localStorage.getItem('acesso')) || {}

    const resposta = await fetch(`${api}/folha-pdf`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(req)
    })

    if (!resposta.ok) {
        const textoErro = await resposta.text()

        let mensagemErro = textoErro

        try {
            const erroJson = JSON.parse(textoErro)

            mensagemErro =
                erroJson.mensagem ||
                textoErro
        } catch (err) {

            console.log(err)
            // A resposta não era JSON
        }

        return popup({
            mensagem: mensagemErro ||
                `Erro HTTP ${resposta.status}`
        })
    }

    const contentDisposition =
        resposta.headers.get(
            'Content-Disposition'
        )

    if (!contentDisposition) {
        return popup({
            mensagem:
                'A API não enviou o nome do ficheiro.'
        })
    }

    const resultado = contentDisposition.match(
        /filename="([^"]+)"/i
    )

    if (!resultado || !resultado[1]) {

        return popup({
            mensagem:
                'A API enviou um nome de ficheiro inválido.'
        })
    }

    const blob = await resposta.blob()

    if (!blob.size) {
        return popup({
            mensagem:
                'A API retornou um ficheiro vazio.'
        })
    }

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')

    link.href = url
    link.download = resultado[1]

    document.body.appendChild(link)
    link.click()
    link.remove()

    setTimeout(() => {
        URL.revokeObjectURL(url)
    }, 100)

    removerOverlay()

}
