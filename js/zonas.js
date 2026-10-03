const modeloServico = ({ id, descricao, especialidade }) => `
    <div class="etiquetas-zonas">
        <img src="imagens/doubleCheck.png">
        <span name="servico" data-id="${id}"><i>${especialidade}</i> <b>></b> ${descricao}</span>
    </div>
`

async function telaZonas() {

    overlayAguarde()

    const pag = 'zonas'
    const tabela = await modTab({
        pag,
        btnExtras: `<button onclick="edicaoZona()">AdicionarZona</button>`,
        base: 'vw_zonas',
        criarLinha: 'criarLinhaZona',
        body: pag,
        colunas: {
            'Edição': {},
            'Zona': { chave: 'zona' },
            'ambiente': { chave: 'ambiente' },
            'Serviços': { chave: 'servicos.*.descricao' }
        }
    })

    tela.innerHTML = montarPagina({ tabela, titulo: 'Zonas', imagem: 'zona' })

    await paginacao(pag)

    removerOverlay()

}

function criarLinhaZona(dados) {

    const {
        id,
        ambiente,
        zona,
        servicos
    } = dados || {}

    const itens = (servicos || [])
        .map(servico => modeloServico(servico))
        .join('')

    return `
        <tr>
            <td>
                <img onclick="edicaoZona('${id}')" src="imagens/pesquisar.png">
            </td>
            <td>
                <span class="etiquetas">${zona}</span>
            </td>
            <td>
                <span class="etiquetas">${ambiente}</span>
            </td>
            <td>
                <div style="${vertical}; gap: 2px;">
                    ${itens}
                </div>
            </td>
        </tr>
    `
}

async function edicaoZona(id) {

    try {

        overlayAguarde()

        const dadosZona = id
            ? await recuperarDado('zonas', id)
            : null

        const {
            zona,
            ambiente,
            servicos
        } = dadosZona || {}

        const linhas = [
            {
                texto: 'Zona',
                elemento: `<input name="zona" value="${zona || ''}">`
            },
            {
                texto: 'Ambiente',
                elemento: `<textarea name="ambiente">${ambiente || ''}</textarea>`
            },
            {
                texto: `
                <div style="${horizontal}; gap: 5px;">
                    <img onclick="abrirPainelServicos('${id}')" src="imagens/baixar.png">
                    <span>Serviços</span>
                </div>
            `,
                elemento: `<div name="servicos" style="${vertical}; gap: 5px;"></div>`
            }
        ]

        const botoes = [
            {
                texto: 'Salvar',
                funcao: `salvarZona('${id}')`,
                img: 'concluido'
            }
        ]

        if (dadosZona)
            botoes.push({
                texto: 'Excluir',
                img: 'cancel',
                funcao: `confirmarExcluirZona('${id}')`
            })

        popup({
            linhas,
            botoes,
            titulo: 'Gerenciar Zona'
        })

        // Povoar serviços;
        controles.auxServicos ??= {}
        controles.auxServicos.servicos ??= []

        if (servicos)
            controles.auxServicos.servicos = servicos

        dispararServicos()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao abrir a Zona: Fale com o suporte.' })
    }

}

async function abrirPainelServicos(id) {

    try {
        overlayAguarde()

        const pag = 'auxServicos'
        const btnExtras = `
            <div id="tabAuxServicos" class="caixa-todos">
                <input onchange="toogleMarcacao(this)" type="checkbox">
                <span>Marcar todos</span>
            </div>
        ` 

        const tabela = await modTab({
            btnExtras,
            base: 'campos',
            pag,
            body: pag,
            criarLinha: 'criarLinhaAuxServicos',
            colunas: {
                'Incluir': {},
                'Especialidade': { chave: 'especialidade' },
                'Medida': { chave: 'medida' },
                'Descrição': { chave: 'descricao' }
            }
        })

        const botoes = [
            {
                texto: 'Salvar',
                funcao: 'dispararServicos()',
                img: 'concluido'
            }
        ]

        popup({
            botoes,
            titulo: 'Selecione os serviços',
            linhas: [
                {
                    elemento: tabela
                }
            ]
        })

        paginacao(pag)

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao abrir a tabela de serviços: Fale com o suporte.' })
    }

}

function criarLinhaAuxServicos(dado) {

    const {
        id,
        descricao,
        medida,
        especialidade
    } = dado || {}

    const existentes = controles?.auxServicos?.servicos || []

    return `
        <tr>
            <td>
                <input data-id="${id}" name="check-servico" ${existentes.includes(id) ? 'checked' : ''} onchange="gerenciarItensServico(this, '${id}')" type="checkbox">
            </td>
            <td>${especialidade}</td>
            <td>${medida}</td>
            <td>${descricao}</td>
        </tr>
    `

}

function toogleMarcacao(input) {

    [...document.querySelectorAll('[name="check-servico"]')].map(i => {
        i.checked = input.checked

        gerenciarItensServico(i, i.dataset.id)
    })

}

async function dispararServicos() {

    try {

        overlayAguarde()

        const tabAux = document.getElementById('tabAuxServicos')
        if (tabAux)
            removerPopup()

        const painel = [...document.querySelectorAll('.painel-padrao')].at(-1)
        const local = painel.querySelector('[name="servicos"]')
        local.innerHTML = ''

        await Promise.all(
            (controles?.auxServicos?.servicos || [])
                .map(async (s) => {

                    const servico = await recuperarDado('campos', s) || {}
                    local.insertAdjacentHTML('beforeend', modeloServico(servico))

                })
        )

        removerOverlay()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao disparar serviços: Fale com o suporte.' })
    }
}

async function gerenciarItensServico(input, id) {

    controles.auxServicos.servicos ??= []

    if (!input.checked)
        return controles.auxServicos.servicos = controles.auxServicos.servicos.filter(s => s !== id)

    if (!controles.auxServicos.servicos.includes(id))
        return controles.auxServicos.servicos.push(id)

}

async function salvarZona(id) {

    try {
        overlayAguarde()

        const painel = [...document.querySelectorAll('.painel-padrao')].at(-1)
        const servicos = [...painel.querySelectorAll('[name="servico"]')].map(span => span.dataset.id)

        const zona = {
            zona: obVal('zona'),
            ambiente: obVal('ambiente'),
            servicos
        }

        await enviar(`zonas/${id}`, zona)

        removerTodosPopups()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao salvar a zona: Fale com o suporte.' })
    }

}

function confirmarExcluirZona(id) {

    popup({
        mensagem: 'Tem certeza que deseja excluir esta zona?',
        botoes: [
            {
                texto: 'Confirmar',
                img: 'concluido',
                funcao: `excluirZona('${id}')`
            }
        ]
    })

}

async function excluirZona(id) {

    try {
        overlayAguarde()
        await deletar(`zonas/${id}`)
        removerTodosPopups()
    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao excluir a zona: Fale com o suporte.' })
    }
}