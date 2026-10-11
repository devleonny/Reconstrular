let objetivosDados = []
let objetivosConsulta = 0

function objetivoNumero(valor) {
    const numero = Number(valor)
    return Number.isFinite(numero) ? numero : 0
}

function objetivoPercentual(realizado, meta) {
    return objetivoNumero(meta) > 0 ? objetivoNumero(realizado) / objetivoNumero(meta) * 100 : 0
}

function objetivoPorcentagem(valor) {
    return `${objetivoNumero(valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}

function objetivoTempo(valor) {
    return valor === null || valor === undefined || !Number.isFinite(Number(valor))
        ? '<span title="O servidor ainda não informou o cálculo por período">—</span>'
        : objetivoPorcentagem(valor)
}

async function telaObjetivos() {
    const consulta = ++objetivosConsulta
    titulo.textContent = 'Objetivos'
    const tabela = await modTab({ base: 'vw_objetivos', pag: 'objetivosDistritos', body: 'objetivosDistritos',
        criarLinha: 'criarLinhaObjetivosDistrito', detalhes: true, ocultarPesquisa: true, atualizacaoManual: true,
        colunas: { 'Distrito': {}, 'Objetivo': {}, 'Realizado': {}, '% Realizado': {},
            'Objetivo obras': {}, 'Realizado obras': {}, '% Realizado obras': {}, '% Por realizar vs tempo': {} } })
    tela.innerHTML = `<section class="objetivos-painel">
        <header class="objetivos-controles"><div><h2>Objetivos por distrito</h2><p>Metas e resultados de cada cidade.</p></div>
        <label>Distrito<select class="objetivos-filtro"><option value="">Todos os distritos</option></select></label>
        </header>
        <div class="objetivos-grupos" aria-live="polite">${tabela}</div></section>`
    const painel = tela.querySelector('.objetivos-painel')
    painel.querySelector('.objetivos-filtro').addEventListener('change', () => renderObjetivos(painel))
    painel.addEventListener('click', event => {
        const botao = event.target.closest('[data-objetivo]')
        if (!botao) return
        const cidade = objetivosDados.find(c => String(c.id) === botao.dataset.cidade)
        if (cidade) gerenciarObjetivo(objetivoNumero(cidade[`objetivo_${botao.dataset.objetivo}`]), cidade.nome, cidade.id, botao.dataset.objetivo)
    })
    try {
        const cidades = new Map()
        let pagina = 1, paginas = 1
        do {
            const resposta = await pesquisarDB({ base: 'vw_objetivos', limite: 100, pagina,
                ordenar: { path: 'distrito', direcao: 'asc' } })
            if (!resposta || !Array.isArray(resposta.resultados)) throw new Error('Resposta inválida de objetivos.')
            if (consulta !== objetivosConsulta || !painel.isConnected) return
            for (const cidade of resposta.resultados) cidades.set(cidade.id, cidade)
            paginas = resposta.paginas || 1
            pagina++
        } while (pagina <= paginas)
        objetivosDados = [...cidades.values()]
        const distritos = [...new Set(objetivosDados.map(c => c.distrito || 'Sem distrito'))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
        painel.querySelector('.objetivos-filtro').innerHTML += distritos.map(d => `<option value="${escaparAtributo(d)}">${escaparAtributo(d)}</option>`).join('')
        await renderObjetivos(painel)
    } catch (erro) {
        if (consulta === objetivosConsulta && painel.isConnected)
            painel.querySelector('.objetivos-grupos').textContent = 'Não foi possível carregar os objetivos. Abra novamente esta tela para tentar.'
        console.error(erro)
    }
}

async function renderObjetivos(painel) {
    const filtro = painel.querySelector('.objetivos-filtro').value
    const grupos = new Map()
    for (const cidade of objetivosDados) {
        const distrito = cidade.distrito || 'Sem distrito'
        if (filtro && distrito !== filtro) continue
        if (!grupos.has(distrito)) grupos.set(distrito, [])
        grupos.get(distrito).push(cidade)
    }
    const cabecalho = local => `<th>${local}</th><th>Objetivo</th><th>Realizado</th><th>% Realizado</th><th>Objetivo obras</th><th>Realizado obras</th><th>% Realizado obras</th><th>% Por realizar vs tempo</th>`
    const corpo = painel.querySelector('#objetivosDistritos')
    const estadoDetalhes = new Map([...corpo.children].filter(linha => linha.detalhesTabela)
        .map(linha => [linha.dataset.id, !linha.detalhesTabela.hidden]))
    const recortes = [...painel.querySelectorAll('.objetivos-recorte')].map(el => el.scrollLeft)
    const rolagem = [...new Set([tela, ...painel.querySelectorAll('.div-tabela')])]
        .map(el => ({ el, top: el.scrollTop, left: el.scrollLeft }))
    const fragmento = document.createDocumentFragment()
    for (const [distrito, cidades] of [...grupos].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))) {
        const linha = await criarElementoLinha({ id: distrito, distrito, cidades }, 'criarLinhaObjetivosDistrito', 'vw_objetivos', 0, true, estadoDetalhes)
        adicionarLinhaTabela(fragmento, linha)
    }
    corpo.replaceChildren(fragmento)
    if (!grupos.size) corpo.innerHTML = '<tr><td colspan="9">Nenhum objetivo encontrado.</td></tr>'
    atualizarBotaoTodosDetalhes(corpo)
    painel.querySelectorAll('.objetivos-recorte').forEach((el, i) => { el.scrollLeft = recortes[i] || 0 })
    for (const { el, top, left } of rolagem) { el.scrollTop = top; el.scrollLeft = left }
}

async function atualizarDadosObjetivos() {
    const painel = tela.querySelector('.objetivos-painel')
    if (!painel) return
    const consulta = objetivosConsulta
    const cidades = new Map()
    let pagina = 1, paginas = 1
    do {
        const resposta = await pesquisarDB({ base: 'vw_objetivos', limite: 100, pagina,
            ordenar: { path: 'distrito', direcao: 'asc' } })
        if (!resposta || !Array.isArray(resposta.resultados)) throw new Error('A meta foi salva, mas não foi possível atualizar os dados.')
        if (consulta !== objetivosConsulta || !painel.isConnected) return
        for (const cidade of resposta.resultados) cidades.set(cidade.id, cidade)
        paginas = resposta.paginas || 1
        pagina++
    } while (pagina <= paginas)
    objetivosDados = [...cidades.values()]
    await renderObjetivos(painel)
}

function criarLinhaObjetivosDistrito({ distrito, cidades }) {
        cidades.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
        const dados = cidades[0]
        const soma = chave => cidades.reduce((total, c) => total + objetivoNumero(c[chave]), 0)
        const meta = dados.total_objetivo_valor ?? soma('objetivo_valor')
        const obras = dados.total_objetivo_obras ?? soma('objetivo_obras')
        const realizado = dados.realizado_geral_valor_distrito ?? soma('realizado_geral_valor_cidade')
        const realizadas = dados.realizado_geral_obras_distrito ?? soma('realizado_geral_obras_cidade')
        const totais = [escaparAtributo(distrito), dinheiro(meta), dinheiro(realizado), objetivoPorcentagem(objetivoPercentual(realizado, meta)), objetivoNumero(obras), objetivoNumero(realizadas), objetivoPorcentagem(objetivoPercentual(realizadas, obras)), objetivoTempo(dados.por_realizar_vs_tempo_distrito)]
    return {
        linha: `<tr>${totais.map((v, i) => `<td class="objetivo-total ${i === 0 ? 'objetivo-distrito-nome' : ''}">${v}</td>`).join('')}</tr>`,
        detalhes: `<section class="objetivos-distrito"><h3>Cidades de ${escaparAtributo(distrito)} <small>${cidades.length} cidades</small></h3>
        <div class="objetivos-recorte"><table class="tabela objetivos-tabela"><thead><tr><th>Cidade</th><th>Objetivo</th><th>Realizado</th><th>% Realizado</th><th>Objetivo obras</th><th>Realizado obras</th><th>% Realizado obras</th><th>% Por realizar vs tempo</th></tr></thead>
        <tbody>${cidades.map(c => `<tr>
                <td class="objetivo-cidade">${escaparAtributo(c.nome || '')}</td>
                <td>${botaoObjetivo(c, 'valor', dinheiro(c.objetivo_valor || 0))}</td>
                <td>${dinheiro(c.realizado_geral_valor_cidade || 0)}</td>
                <td>${objetivoPorcentagem(objetivoPercentual(c.realizado_geral_valor_cidade, c.objetivo_valor))}</td>
                <td>${botaoObjetivo(c, 'obras', objetivoNumero(c.objetivo_obras))}</td>
                <td>${objetivoNumero(c.realizado_geral_obras_cidade)}</td>
                <td>${objetivoPorcentagem(objetivoPercentual(c.realizado_geral_obras_cidade, c.objetivo_obras))}</td>
                <td>${objetivoTempo(c.por_realizar_vs_tempo_cidade)}</td></tr>`).join(' ')}</tbody></table></div></section>`
    }
}

function botaoObjetivo(cidade, tipo, valor) {
    return `<button type="button" class="objetivo-editar" data-cidade="${escaparAtributo(cidade.id)}" data-objetivo="${tipo}" title="Editar meta de ${escaparAtributo(cidade.nome || '')}">${valor}</button>`
}

function gerenciarObjetivo(valorAtual = 0, cidade, id, objetivo) {

    const titulo = objetivo == 'valor'
        ? 'Deseja alterar o valor objetivo?'
        : 'Deseja alterar a quantidade de obras?'

    popup({
        imagem: 'imagens/objetivo.png',
        mensagem: `
            <div style="${vertical}; text-align: left; gap: 5px;">
                <span>[<b>${escaparAtributo(cidade)}</b>] <br>${titulo}</span>
                <div style="${horizontal}; gap: 5px;">
                    ${objetivo == 'valor' ? '<span>€</span>' : ''}
                    <input id="objetivo" type="number" min="0" step="${objetivo === 'obras' ? '1' : '0.01'}" value="${valorAtual}">
                </div>
            </div>
        `,
        botoes: [
            {
                texto: 'Salvar',
                funcao: `alterarObjetivo(${escaparAtributo(JSON.stringify(id))}, '${objetivo}')`,
                img: 'concluido'
            }
        ]
    })


}


async function alterarObjetivo(id, objetivo) {


    overlayAguarde()

    const valorObjetivo = Number(document.getElementById('objetivo')?.value || 0)
    if (!Number.isFinite(valorObjetivo) || valorObjetivo < 0 || (objetivo === 'obras' && !Number.isInteger(valorObjetivo))) {
        removerOverlay()
        return popup({ mensagem: 'Informe uma meta válida, positiva ou zero. A quantidade de obras deve ser inteira.' })
    }

    try {
        await enviar(`cidades/${id}/objetivo_${objetivo}`, valorObjetivo)
        removerTodosPopups()
        await atualizarDadosObjetivos()
    } catch (erro) {
        popup({ mensagem: escaparAtributo(erro.message || 'Não foi possível salvar a meta.') })
    } finally { removerOverlay() }


}
