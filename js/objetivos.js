
async function telaObjetivos() {

    overlayAguarde()

    const tabela = await modTab({
        base: 'vw_objetivos',
        colunas: {
            'Distrito': { chave: 'distrito', op: '=', tipoPesquisa: 'select' },
            'Objetivo Distrito': {},
            'Realizado Distrito': {},
            '% Realizado Distrito': {},
            'Objetivo Obras Distrito': {},
            'Realizado Obras Distrito': {},
            '% Realizado Obras Distrito': {},
            'Cidades': { chave: 'nome' },
            'Objetivo Cidade': {},
            'Realizado Cidade': {},
            '% Realizado Cidade': {},
            'Objetivo Obras Cidade': {},
            'Realizado Obras Cidade': {},
            '% Realizado Obras Cidade': {}
        },
        ordenar: {
            path: 'distritos',
            direcao: 'desc'
        },
        criarLinha: 'criarLinhaObjetivos',
        body: 'objetivos',
        pag: 'objetivos'
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
        total_objetivo_valor,

        realizado_geral_obras_cidade,
        realizado_geral_valor_cidade,

        realizado_geral_obras_distrito,
        realizado_geral_valor_distrito
    } = dados || {}

    // Distrito
    const porcValorDistrito = realizado_geral_valor_distrito
        ? Number(((realizado_geral_valor_distrito / total_objetivo_valor) * 100).toFixed(0))
        : 0

    const porcQtdeDistrito = total_objetivo_obras
        ? Number(((realizado_geral_obras_distrito / total_objetivo_obras) * 100).toFixed(0))
        : 0

    // Cidade
    const porcValorCidade = realizado_geral_valor_cidade
        ? Number(((realizado_geral_valor_cidade / objetivo_valor) * 100).toFixed(0))
        : 0

    const porcQtdeCidade = realizado_geral_obras_cidade
        ? Number(((realizado_geral_obras_cidade / objetivo_obras) * 100).toFixed(0))
        : 0

    return `
        <tr>
            <td>${distrito}</td>
            <td>${dinheiro(total_objetivo_valor || 0)}</td>
            <td>${dinheiro(realizado_geral_valor_distrito)}</td>
            <td>${porcentagemHtml(porcValorDistrito)}</td>
            <td>${total_objetivo_obras || 0}</td>
            <td>${realizado_geral_obras_distrito}</td>

            <td>${porcentagemHtml(porcQtdeDistrito)}</td>

            <td>${nome ?? ''}</td>
            <td style="background-color: #00ffff; cursor: pointer;" onclick="gerenciarObjetivo(${objetivo_valor || 0}, '${nome}', ${id}, 'valor')">${dinheiro(objetivo_valor || 0)}</td>
            <td>${dinheiro(realizado_geral_valor_cidade)}</td>
            <td>${porcentagemHtml(porcValorCidade)}</td>
            <td style="background-color: #00ffff; cursor: pointer;" onclick="gerenciarObjetivo(${objetivo_obras || 0}, '${nome}', ${id}, 'obras')">${objetivo_obras || 0}</td>
            <td>${realizado_geral_obras_cidade}</td>
            <td>${porcentagemHtml(porcQtdeCidade)}</td>

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