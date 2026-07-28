
async function telaObjetivos() {

    overlayAguarde()

    const tabela = await modTab({
        base: 'vw_objetivos',
        colunas: {
            'Distrito': { chave: 'distrito' },
            'Objetivo Geral': {},
            'Realizado Geral': {},
            '% Realizado Geral': {},
            'Objetivo Obras Geral': {},
            'Realizado Obras Geral': {},
            '% Por Realizar vs Tempo Geral': {},
            'Cidades': { chave: 'nome' },
            'Objetivo': {},
            'Realizado': {},
            '% Realizado': {},
            'Objetivo Obras': {},
            'Realizado Obras': {},
            '% Realizado Obras': {},
            '% Por Realizar vs Tempo': {}
        },
        ordenar: {
            path: 'distritos',
            direcao: 'desc'
        },
        criarLinha: 'criarLinhaObjetivos',
        body: 'objetivos',
        pag: 'objetivos',

    })

    tela.innerHTML = tabela

    await paginacao()

    removerOverlay()
}


async function criarLinhaObjetivos(dados) {

    const { 
        nome,
        distrito,
        id, 
        objetivo_valor, 
        objetivo_obras, 
        zona,
        total_objetivo_obras,
        total_objetivo_valor
    } = dados || {}

    return `
        <tr>
            <td>${distrito}</td>
            <td>${dinheiro(total_objetivo_valor || 0)}</td>
            <td></td>
            <td>${porcentagemHtml(30)}</td>
            <td>${total_objetivo_obras || 0}</td>
            <td></td>
            <td>${porcentagemHtml(30)}</td>
            <td>${nome ?? ''}</td>
            <td style="cursor: pointer;" onclick="gerenciarObjetivo(${objetivo_valor || 0}, '${nome}', ${id}, 'valor')">${dinheiro(objetivo_valor || 0)}</td>
            <td></td>
            <td>${porcentagemHtml(30)}</td>
            <td></td>
            <td style="cursor: pointer;" onclick="gerenciarObjetivo(${objetivo_obras || 0}, '${nome}', ${id}, 'obras')">${objetivo_obras || 0}</td>
            <td>${porcentagemHtml(30)}</td>
            <td>${porcentagemHtml(30)}</td>
        </tr>
        `

}

function gerenciarObjetivo(valorAtual = 0, cidade, id, objetivo) {

    const titulo = objetivo == 'valor'
        ? 'Deseja alterar o valor objetivo?'
        : 'Deseja alterar a quantidade de obras?'

    popup({
        imagem: 'imagens/objetivo.png',
        mensagem: `
            <div style="${vertical}; text-align: left; gap: 5px;">
                <span>[<b>${cidade}</b>] <br>${titulo}</span>
                <div style="${horizontal}; gap: 5px;">
                    ${objetivo == 'valor' ? '<span>€</span>' : ''}
                    <input id="objetivo" value="${valorAtual}">
                </div>
            </div>
        `,
        botoes: [
            {
                texto: 'Salvar',
                funcao: `alterarObjetivo(${id}, '${objetivo}')`,
                img: 'concluido'
            }
        ]
    })


}


async function alterarObjetivo(id, objetivo) {


    overlayAguarde()

    const valorObjetivo = document.getElementById('objetivo')?.value || 0

    await enviar(`cidades/${id}/objetivo_${objetivo}`, valorObjetivo)

    removerTodosPopups()


}