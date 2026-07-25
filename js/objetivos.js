
async function telaObjetivos() {

    const tabela = await modTab({
        base: 'vw_objetivos',
        colunas: {
            'Distrito': { chave: 'distrito' },
            'Objetivo Geral': {},
            'Realizado Geral': {},
            '% Realizado Geral': {},
            'Objetivo Obras Geral': {},
            '% Realizado Obras Geral': {},
            '% Por Realizar vs Tempo Geral': {},
            'Cidades': { chave: 'cidades.*.nome' },
            'Objetivo': {},
            'Realizado': {},
            '% Realizado': {},
            'Objetivo Obras': {},
            'Realizado Obras': {},
            '% Realizado Obras': {},
            '% Por Realizar vs Tempo': {}
        },
        criarLinha: 'criarLinhaObjetivos',
        body: 'objetivos',
        pag: 'objetivos',

    })

    tela.innerHTML = tabela

    await paginacao()
}


async function criarLinhaObjetivos(dados) {

    const { distrito, cidades = {} } = dados || {}

    const listaCidades = Object.values(cidades)
    const rowspan = listaCidades.length

    const td1 = (valor) => `<td style="padding: 0px;" rowspan="${rowspan}">${valor}</td>`

    const tdsIniciais = `
        ${td1(distrito)}
        ${td1('')}
        ${td1('')}
        ${td1('')}
        ${td1('')}
        ${td1('')}
        ${td1('')}
    `

    return listaCidades
        .map(({ nome, id, objetivo_valor, objetivo_obras, zona }, index) => `
            <tr>
                ${index === 0 ? tdsIniciais : ''}
                <td style="padding: 0px;">${nome ?? ''}</td>
                <td style="padding: 0px;" onclick="alterarValorObjetivo()">${dinheiro(objetivo_valor)}</td>
                <td style="padding: 0px;">${objetivo_obras || ''}</td>
                <td style="padding: 0px;"></td>
                <td style="padding: 0px;"></td>
                <td style="padding: 0px;"></td>
                <td style="padding: 0px;"></td>
                <td style="padding: 0px;"></td>
            </tr>
        `)
        .join('');
}