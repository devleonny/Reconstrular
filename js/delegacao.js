let delegacaoModelo = null
let tipologiaDelegacao = null
async function carregarTipologiaDelegacao() {
    if (tipologiaDelegacao) return tipologiaDelegacao
    try {
        const resposta = await fetch('dados/delegacao-tipologia.json?v=1')
        if (!resposta.ok) return null
        tipologiaDelegacao = await resposta.json()
        return tipologiaDelegacao
    } catch { return null }
}
async function requisicaoDelegacao(caminho = '', dados) {
    const resposta = await fetchAutenticado(`${api}/delegacao${caminho}`, {
        method: dados ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${acesso.token}` },
        ...(dados ? { body: JSON.stringify(dados) } : {})
    })
    if (!resposta) throw new Error('Sessão encerrada.')
    const resultado = await resposta.json()
    if (!resposta.ok) throw new Error(resultado.erro || 'Não foi possível consultar o Organizador Hierárquico.')
    return resultado
}
async function dadosMapaDelegacao() {
    // Sem cache de permissões entre aberturas: o servidor pode alterar a posição.
    const [modelo, tipologia] = await Promise.all([requisicaoDelegacao(), carregarTipologiaDelegacao()])
    delegacaoModelo = modelo
    delegacaoModelo.tipologia = tipologia
    // Exceção administrativa já reconhecida pela API, fora da árvore territorial.
    const nacional = delegacaoModelo.regioes.find(r => r.tipo === 'nacional')
    if (nacional && delegacaoModelo.administrador) {
        const programador = { id: 'administracao/diretor-programador', titulo: 'Diretor Programador',
            regiao_id: nacional.id, nome: nacional.nome, tipo: 'administrativo' }
        delegacaoModelo.posicoes.push(programador)
        if (delegacaoModelo.administrador) delegacaoModelo.permitidas.push(programador.id)
    }
    return delegacaoModelo
}
function rotuloRegiaoDelegacao(regiao, contexto) {
    if (regiao.tipo !== 'grupo' || !/^nome\d+$/i.test(regiao.nome)) return regiao.nome
    return `Grupo ${Number(regiao.nome.slice(4))}`
}
function rotuloPosicaoDelegacao(posicao, contexto) {
    const regiao = contexto.regioes.find(r => r.id === posicao.regiao_id)
    const nome = regiao ? rotuloRegiaoDelegacao(regiao, contexto) : posicao.nome
    return `${posicao.titulo} · ${nome}${posicao.distrito ? ' · ' + posicao.distrito : ''}`
}
function aplicarPosicaoDelegacao(formulario, posicao, contexto) {
    const campo = formulario.querySelector('.campo-funcoes')
    const radios = [...campo.querySelectorAll('[name="funcao"]')]
    let radio = radios.find(el => el.dataset.valor === posicao.titulo)
    if (!radio) {
        radio = document.createElement('input')
        radio.type = 'radio'; radio.name = 'funcao'; radio.hidden = true
        radio.dataset.valor = posicao.titulo
        campo.append(radio)
    }
    radio.checked = true
    if (posicao.tipo === 'administrativo') delete campo.dataset.posicaoDelegacao
    else campo.dataset.posicaoDelegacao = posicao.id
    campo.querySelector('.delegacao-selecao').textContent = rotuloPosicaoDelegacao(posicao, contexto)
    // Cidade de responsabilidade não altera a alocação, salvo seleção individual.
    if (posicao.tipo === 'cidade') {
        const cidade = (contexto.cidadesCadastro || []).find(c => c.regiao_id === posicao.regiao_id)
        const input = formulario.querySelector('[name="cidade"]')
        if (cidade && input) { input.id = cidade.cidade_cadastro_id; input.textContent = posicao.nome }
    }
    verificarRegras()
}
async function telaMapaDelegacao() { return abrirMapaDelegacao(false) }
// Índices montados uma vez por contexto: o mapa consulta filhos/cargos/ocupantes a cada célula.
function agruparDelegacao(lista = [], chave) {
    const mapa = new Map()
    for (const item of lista) {
        const k = item[chave]
        if (!mapa.has(k)) mapa.set(k, [])
        mapa.get(k).push(item)
    }
    return mapa
}
function indicesDelegacao(contexto) {
    if (contexto.indices?.ocupantes === contexto.ocupantes) return contexto.indices
    return contexto.indices = {
        ocupantes: contexto.ocupantes,
        filhos: agruparDelegacao(contexto.regioes, 'pai_id'),
        cargos: agruparDelegacao(contexto.posicoes, 'regiao_id'),
        nomes: agruparDelegacao((contexto.ocupantes || []).filter(p => p.nome), 'posicao_id')
    }
}
function ocupantesPosicaoDelegacao(contexto, id) {
    return (indicesDelegacao(contexto).nomes.get(id) || []).map(p => p.nome)
}
// "Coordenador Operativo Norte e Este": o cargo fica normal e a região em negrito.
function rotuloCoordenacaoDelegacao(nome) {
    const partes = String(nome).match(/^(Coordenador(?:a)? Operativ[oa])\s+(.+)$/i)
    return partes ? `${escaparAtributo(partes[1])} <strong>${escaparAtributo(partes[2])}</strong>`
        : `<strong>${escaparAtributo(nome)}</strong>`
}
// "APU – Área Predominantemente Urbana" → "Área Predominantemente Urbana": na tela só a descrição.
function descricaoTipoAreaDelegacao(contexto, tipo) {
    return String(contexto.tipologia?.legenda?.[tipo]?.descricao || tipo).replace(/^[A-Z]{2,5}\s*[–-]\s*/, '')
}
function representacaoMapaDelegacao(contexto, selecionar) {
    const permitidas = new Set(contexto.permitidas)
    const indices = indicesDelegacao(contexto)
    const filhos = id => indices.filhos.get(id) || []
    const cargos = id => indices.cargos.get(id) || []
    const botao = (p, texto, classe = '', rotulo = escaparAtributo(texto)) => {
        const nomes = ocupantesPosicaoDelegacao(contexto, p.id)
        const tipo = contexto.tipologia?.cidades?.[p.regiao_id]
        const ocupado = nomes.length > 0
        if (!ocupado && Array.isArray(contexto.ocupantes)) classe += ' delegacao-vazio'
        const titulo = [texto, ocupado ? `Atribuídos: ${nomes.join(', ')}` : 'Sem atribuições visíveis',
            tipo ? descricaoTipoAreaDelegacao(contexto, tipo) : '',
            selecionar && !permitidas.has(p.id) ? 'Sua posição não permite atribuir este cargo nesta região.' : ''].filter(Boolean).join(' · ')
        return `<div class="delegacao-posicao"><button type="button" class="${classe}${ocupado ? ' delegacao-preenchido' : ''}${tipo ? ' delegacao-tipo-' + tipo.toLowerCase() : ''}" data-posicao="${escaparAtributo(p.id)}" title="${escaparAtributo(titulo)}" ${selecionar && !permitidas.has(p.id) ? 'disabled' : ''}><span>${rotulo}</span></button>${ocupado ? `<small class="delegacao-ocupantes">${nomes.map(escaparAtributo).join('<br>')}</small>` : ''}</div>`
    }
    const nacional = contexto.regioes.filter(r => r.tipo === 'nacional')
        .flatMap(r => cargos(r.id))
        .sort((a,b) => Number(b.titulo === 'CEO') - Number(a.titulo === 'CEO'))
        .map(p => botao(p, p.titulo)).join('')
    const linhas = contexto.regioes.filter(r => r.tipo === 'coordenacao').map(coord => {
        const distritos = filhos(coord.id).filter(r => r.tipo === 'distrito')
        const gruposCoord = distritos.flatMap(d => filhos(d.id).filter(r => r.tipo === 'grupo'))
        return distritos.map((distrito, i) => {
            const grupos = filhos(distrito.id).filter(r => r.tipo === 'grupo')
                .sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }))
            const coordenacao = i === 0 ? `<td rowspan="${distritos.length}" class="delegacao-coordenacao">${cargos(coord.id).map(p => botao(p, coord.nome, '', rotuloCoordenacaoDelegacao(coord.nome))).join('') || rotuloCoordenacaoDelegacao(coord.nome)}<small>${distritos.length} distritos · ${gruposCoord.length} grupos</small></td>` : ''
            return `<tr>${coordenacao}<th scope="row">${escaparAtributo(distrito.nome)}<small>${grupos.length} encarregados</small></th><td><div class="delegacao-grupos">${grupos.map((grupo,j) => {
                const cidades = filhos(grupo.id).filter(r => r.tipo === 'cidade')
                const numero = rotuloRegiaoDelegacao(grupo, contexto).replace(/^Grupo /, '')
                return `<section class="delegacao-grupo">${cargos(grupo.id).map(p => botao(p, `Encarregado ${numero}`, 'delegacao-grupo-titulo')).join('')}<small>${cidades.length} cidades</small><div class="delegacao-cidades">${cidades.map(cidade => cargos(cidade.id).map(p => botao(p, cidade.nome)).join('') || `<span>${escaparAtributo(cidade.nome)}</span>`).join('')}</div></section>`
            }).join('')}</div></td></tr>`
        }).join('')
    }).join('')
    const legenda = contexto.tipologia ? `<div class="delegacao-legenda" hidden>${Object.entries(contexto.tipologia.legenda).map(([tipo, item]) => `<span class="delegacao-legenda-item delegacao-tipo-${tipo.toLowerCase()}">${escaparAtributo(descricaoTipoAreaDelegacao(contexto, tipo))}</span>`).join('')}</div>` : ''
    const aviso = Array.isArray(contexto.ocupantes) ? '' : '<p class="delegacao-instrucao">A consulta de ocupantes ainda não está disponível nesta versão do servidor.</p>'
    return `<div class="delegacao-painel"><div class="delegacao-toolbar"><div class="delegacao-nacional">${nacional}</div><button type="button" data-tipologia aria-pressed="false" ${contexto.tipologia ? '' : 'disabled title="Classificação indisponível."'}>Tipo de área</button><input type="search" placeholder="Pesquisar pessoa, cidade, distrito ou coordenação…" aria-label="Pesquisar mapa"></div>${legenda}${aviso}<div class="delegacao-tabela"><table><thead><tr><th>Coordenação</th><th>Distrito</th><th>Encarregados e cidades</th></tr></thead><tbody>${linhas}</tbody></table></div></div>`
}
async function abrirMapaDelegacao(selecionar = true) {
    const formulario = selecionar ? document.querySelector('.campo-funcoes')?.closest('.popup') : null
    if (selecionar && !formulario) return
    overlayAguarde()
    try {
        const contexto = await dadosMapaDelegacao()
        if (!contexto.administrador && !Array.isArray(contexto.regioes_visiveis)) {
            throw new Error('Atualize o servidor para consultar o Organizador Hierárquico da sua região.')
        }
        const permitidas = new Set(contexto.permitidas)
        const regioes = new Map(contexto.regioes.map(r => [r.id,r]))
        const posicoes = new Map(contexto.posicoes.map(p => [p.id,p]))
        const idModal = popup({ titulo: selecionar ? 'Escolher função e região' : 'Organizador Hierárquico', elemento:
            representacaoMapaDelegacao(contexto, selecionar) })
        const modal = document.getElementById(idModal)
        modal.classList.add('popup-delegacao')
        modal.querySelector('[data-tipologia]').addEventListener('click', e => {
            const botao = e.currentTarget
            const ativo = botao.getAttribute('aria-pressed') !== 'true'
            botao.setAttribute('aria-pressed', String(ativo))
            modal.querySelector('.delegacao-painel').classList.toggle('delegacao-mostrar-tipos', ativo)
            modal.querySelector('.delegacao-legenda').hidden = !ativo
        })
        modal.querySelector('.delegacao-painel').addEventListener('click', e => {
            const botao = e.target.closest('[data-posicao]')
            if (!botao) return
            const p = posicoes.get(botao.dataset.posicao)
            if (!p || (selecionar && !permitidas.has(p.id))) return
            const pais = []; let regiao = regioes.get(p.regiao_id)
            while (regiao) { pais.unshift(rotuloRegiaoDelegacao(regiao, contexto)); regiao = regioes.get(regiao.pai_id) }
            const nomes = ocupantesPosicaoDelegacao(contexto,p.id)
            const tipo = contexto.tipologia?.cidades?.[p.regiao_id]
            const idConfirmacao = popup({ titulo: p.titulo, elemento:
                `<div class="delegacao-confirmacao"><p>${p.tipo === 'administrativo' ? 'Acesso administrativo total.' : pais.map(n => escaparAtributo(/^nome\d+$/i.test(n) ? 'Grupo ' + n.slice(4) : n)).join(' → ')}</p><p>Atribuídos: ${nomes.length ? nomes.map(escaparAtributo).join(', ') : Array.isArray(contexto.ocupantes) ? 'nenhum colaborador visível nesta posição' : 'consulta indisponível'}.</p>${tipo ? `<p>${escaparAtributo(descricaoTipoAreaDelegacao(contexto, tipo))}</p>` : ''}${selecionar ? '<button type="button" class="delegacao-aplicar">Aplicar ao colaborador</button>' : ''}</div>` })
            document.getElementById(idConfirmacao).querySelector('.delegacao-aplicar')?.addEventListener('click', () => {
                if (!formulario.isConnected) return
                aplicarPosicaoDelegacao(formulario,p,contexto)
                removerPopup(idConfirmacao); removerPopup(idModal)
            })
        })
        modal.querySelector('input[type="search"]').addEventListener('input', e => {
            const normalizar = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
            const busca = normalizar(e.target.value.trim())
            let coordenacao = ''
            let primeiro = null
            for (const linha of modal.querySelectorAll('tbody tr')) {
                const coord = linha.querySelector('.delegacao-coordenacao')
                if (coord) coordenacao = coord.textContent
                const corresponde = !busca || normalizar(linha.textContent + coordenacao).includes(busca)
                linha.classList.toggle('delegacao-sem-destaque', !corresponde)
                if (corresponde && !primeiro) primeiro = linha
            }
            if (busca && primeiro) primeiro.scrollIntoView({ block: 'nearest' })
        })
    } catch (e) { popup({ mensagem: escaparAtributo(e.message) }) }
    finally { removerOverlay() }
}
