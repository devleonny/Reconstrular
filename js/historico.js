// Traduz os eventos do histórico (logs_rotas) em frases que o usuário entende.
// Recebe uma linha de vw_historico_obras / vw_historico_colaboradores.

const ENTIDADES_HISTORICO = {
    dados_orcamentos: { nome: 'Orçamento / Obra', criado: 'Orçamento criado', excluido: 'Orçamento eliminado' },
    dados_despesas: { nome: 'Despesa', criado: 'Despesa criada', excluido: 'Despesa eliminada' },
    dados_colaboradores: { nome: 'Colaborador', criado: 'Colaborador registado', excluido: 'Colaborador eliminado' }
}

// Rótulos por tabela; caminhos aninhados usam o primeiro trecho que tiver rótulo.
const ROTULOS_HISTORICO = {
    dados_orcamentos: {
        cliente: 'Cliente', cidade: 'Cidade', status: 'Status', finalizado: 'Situação', contrato: 'Contrato',
        data_visita: 'Data da visita', data_contato: 'Data do contacto', em_obra: 'Obra', colaboradores: 'Equipa da obra',
        dt_inicio: 'Início da obra', documentos: 'Documentos', campos: 'Serviços', excluido: 'Eliminação'
    },
    dados_despesas: {
        tipo_despesa: 'Tipo da despesa', material: 'Materiais', fornecedor: 'Fornecedor', obra: 'Obra', data: 'Data',
        valor: 'Valor', fatura: 'Fatura', cidade: 'Cidade', excluido: 'Eliminação'
    },
    dados_colaboradores: {
        nome: 'Nome', nome_completo: 'Nome completo', data_nascimento: 'Data de nascimento', email: 'E-mail', morada: 'Morada',
        apolice: 'Apólice', telefone: 'Telefone', numero_documento: 'Número do documento', seguranca_social: 'Segurança social',
        numero_contribuinte: 'Número de contribuinte', status_disponivel: 'Disponibilidade', documento: 'Tipo de documento',
        especialidade: 'Especialidades', funcao: 'Função', pin: 'PIN', senha: 'Palavra-passe', cidade: 'Cidade', foto: 'Foto',
        epi: 'EPI', filtros: 'Filtros de acesso', contrato_obra: 'Contrato de obra', exame: 'Exame médico',
        acesso_bloqueado: 'Acesso', usuario: 'Utilizador', status: 'Status', excluido: 'Eliminação', remuneracao: 'Remuneração'
    }
}
const SUBROTULOS_HISTORICO = {
    quantidade: 'Quantidade', descricao: 'Descrição', unitario: 'Valor unitário', medida: 'Medida', especialidade: 'Especialidade',
    zona: 'Zonas', distrito: 'Distritos', area: 'Áreas', obra: 'Obras', equipamentos: 'Equipamentos', valor: 'Valor',
    periodicidade: 'Pagamento', vigencias: 'Diárias', ajustes: 'Complementos'
}
// Campos técnicos que não interessam ao usuário.
const IGNORAR_HISTORICO = /^(snapshots|timestamp|atualizado_em|id|empresa|empresa_id|id_empresa|_acao)(\.|$)/
// Campos que guardam o id de outro cadastro: exibidos pelo nome.
const REFERENCIAS_HISTORICO = { cidade: 'cidades', cliente: 'dados_clientes', fornecedor: 'fornecedores' }
const ANEXOS_HISTORICO = { documentos: 'Documento', fatura: 'Fatura', foto: 'Foto', contrato_obra: 'Contrato de obra', exame: 'Exame médico' }
// Concordância das frases curtas ("Senha alterada", "Fatura anexada").
const FEMININOS_HISTORICO = new Set(['senha', 'fatura', 'foto', 'morada', 'apolice', 'cidade', 'funcao', 'data', 'data_visita', 'data_contato', 'data_nascimento'])
const participioHistorico = (raiz, masculino) => FEMININOS_HISTORICO.has(raiz) ? masculino.replace(/o$/, 'a') : masculino

function textoValorHistorico(valor, campo = '') {
    if (valor === null || valor === undefined || valor === '') return 'vazio'
    if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não'
    if (Array.isArray(valor)) {
        if (!valor.length) return 'nenhum'
        return valor.every(v => typeof v !== 'object') ? valor.join(', ') : `${valor.length} ${valor.length === 1 ? 'item' : 'itens'}`
    }
    if (typeof valor === 'object') return valor.descricao || valor.nome || 'dados atualizados'
    if (/(^|_)valor$|^unitario$/.test(campo) && !Number.isNaN(Number(valor))) return dinheiro(Number(valor))
    const data = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (data) return `${data[3]}/${data[2]}/${data[1]}`
    return String(valor)
}

// Placeholder preenchido depois com o nome do cadastro (cidade, cliente, fornecedor, serviço).
function referenciaHistorico(tabela, id, caminho = 'nome') {
    if (id === null || id === undefined || id === '') return 'vazio'
    return `<span class="historico-ref" data-tabela="${escaparAtributo(tabela)}" data-id="${escaparAtributo(id)}" data-caminho="${escaparAtributo(caminho)}">…</span>`
}

function rotuloHistorico(tabela, partes) {
    const rotulos = ROTULOS_HISTORICO[tabela] || {}
    const base = rotulos[partes[0]] || inicialMaiuscula(String(partes[0]).replace(/_/g, ' '))
    const resto = partes.slice(1).filter(p => !/^[0-9a-f-]{8,}$/i.test(p) && !/^\d+$/.test(p))
        .map(p => SUBROTULOS_HISTORICO[p] || p.replace(/_/g, ' '))
    return [base, ...resto].join(' › ')
}

function frase(rotulo, anterior, novo) {
    return `<b>${escaparAtributo(rotulo)}</b>: <span class="historico-antes">${anterior}</span> → <span class="historico-depois">${novo}</span>`
}

// Uma alteração ({anterior, novo}) de um caminho ("campos.<id>.quantidade") vira uma frase.
function descreverAlteracaoHistorico(tabela, caminho, { anterior, novo } = {}, idRegistro) {
    const partes = caminho.split('.')
    const [raiz] = partes
    const rotulo = rotuloHistorico(tabela, partes)

    if (anterior === '[OCULTA]' || novo === '[OCULTA]')
        return `<b>${escaparAtributo(rotulo)}</b> ${participioHistorico(raiz, 'alterado')}`

    if (raiz === 'excluido')
        return novo ? 'Registo eliminado' : 'Eliminação desfeita'

    if (raiz === 'acesso_bloqueado')
        return `<b>Acesso</b>: ${novo ? 'bloqueado' : 'liberado'}`

    if (raiz === 'em_obra' && tabela === 'dados_orcamentos')
        return novo ? 'Orçamento ativado como obra' : 'Obra desativada'

    // Equipe da obra: quem entrou e quem saiu, em vez das duas listas inteiras.
    if (raiz === 'colaboradores' && tabela === 'dados_orcamentos' && partes.length === 1) {
        const antes = new Set(Array.isArray(anterior) ? anterior : []), depois = new Set(Array.isArray(novo) ? novo : [])
        const entrou = [...depois].filter(u => !antes.has(u)), saiu = [...antes].filter(u => !depois.has(u))
        const trechos = [entrou.length && `entrou <span class="historico-depois">${escaparAtributo(entrou.join(', '))}</span>`,
            saiu.length && `saiu <span class="historico-antes">${escaparAtributo(saiu.join(', '))}</span>`].filter(Boolean)
        return `<b>Equipa da obra</b>: ${trechos.join('; ') || 'sem mudanças'}`
    }

    // Serviços do orçamento: adicionado, removido ou um campo do serviço alterado.
    if (raiz === 'campos' && tabela === 'dados_orcamentos' && partes[1]) {
        if (partes.length === 2) {
            if (anterior == null && novo) return `Serviço adicionado: <b>${escaparAtributo(novo.descricao || 'sem descrição')}</b>`
            if (anterior && novo == null) return `Serviço removido: <b>${escaparAtributo(anterior.descricao || 'sem descrição')}</b>`
        }
        const servico = referenciaHistorico('dados_orcamentos', idRegistro, `campos.${partes[1]}.descricao`)
        const subcampo = partes.slice(2)
        const sub = subcampo.length ? rotuloHistorico(tabela, ['campos', ...subcampo]).replace(/^Serviços › /, '') : 'Dados'
        return `<b>${servico}</b> › ${frase(sub, escaparAtributo(textoValorHistorico(anterior, subcampo.at(-1))), escaparAtributo(textoValorHistorico(novo, subcampo.at(-1))))}`
    }

    if (ANEXOS_HISTORICO[raiz]) {
        const acao = anterior == null || anterior === '' ? 'anexado' : novo == null || novo === '' ? 'removido' : 'substituído'
        // O nome do arquivo pode ter pontos ("planta.pdf"): é tudo o que vem depois de "documentos.".
        const nome = partes.length > 1 && raiz === 'documentos' ? ` (${escaparAtributo(partes.slice(1).join('.'))})` : ''
        return `<b>${ANEXOS_HISTORICO[raiz]}</b>${nome} ${participioHistorico(raiz, acao)}`
    }

    if (REFERENCIAS_HISTORICO[raiz] && partes.length === 1)
        return frase(rotulo, referenciaHistorico(REFERENCIAS_HISTORICO[raiz], anterior), referenciaHistorico(REFERENCIAS_HISTORICO[raiz], novo))

    const campoFinal = partes.at(-1)
    return frase(rotulo, escaparAtributo(textoValorHistorico(anterior, campoFinal)), escaparAtributo(textoValorHistorico(novo, campoFinal)))
}

// Detalhes vêm como objeto {caminho: {anterior, novo}} ou, nas views, como lista {campo, anterior, novo}.
function entradasHistorico(his) {
    const { detalhes, alteracoes } = his || {}
    if (detalhes && typeof detalhes === 'object' && !Array.isArray(detalhes)) return Object.entries(detalhes)
    return (alteracoes || []).map(({ campo, anterior, novo }) => [campo, { anterior, novo }])
}

function tabelaHistorico(his, padrao) {
    return his?.tabela_alterada || String(his?.caminho || '').split('/')[0] || padrao
}

// Tipo do evento (criado, alterado, excluido) e as frases (HTML seguro) que o descrevem.
function classificarHistorico(his, tabelaPadrao) {
    const tabela = tabelaHistorico(his, tabelaPadrao)
    const entidade = ENTIDADES_HISTORICO[tabela] || { nome: 'Registo', criado: 'Registo criado', excluido: 'Registo eliminado' }
    const idRegistro = his?.id_registro || String(his?.caminho || '').split('/')[1]
    const entradas = entradasHistorico(his)

    // _acao só é gravado na criação do registro.
    if (entradas.some(([campo]) => campo === '_acao'))
        return { tipo: 'criado', frases: [entidade.criado] }

    if (String(his?.rota || '').startsWith('/deletar')) {
        const partes = String(his?.caminho || '').split('/').slice(2)
        // Remover um item de dentro do registro (ex.: um anexo) é alteração; sem partes, é o registro todo.
        return partes.length
            ? { tipo: 'alterado', frases: [`${escaparAtributo(rotuloHistorico(tabela, partes))} removido`] }
            : { tipo: 'excluido', frases: [entidade.excluido] }
    }

    const visiveis = entradas.filter(([campo]) => campo && !IGNORAR_HISTORICO.test(campo))

    // Logs antigos (antes do marcador _acao) registravam a criação como todos os campos saindo de vazio.
    const vazio = v => v === null || v === undefined || v === ''
    if (visiveis.length >= 3 && visiveis.every(([, v]) => vazio(v?.anterior)))
        return { tipo: 'criado', frases: [entidade.criado] }

    const excluiu = visiveis.some(([campo, v]) => campo === 'excluido' && v?.novo)
    const frases = visiveis.map(([campo, valores]) => descreverAlteracaoHistorico(tabela, campo, valores, idRegistro))

    return { tipo: excluiu ? 'excluido' : 'alterado', frases: frases.length ? frases : ['Registo guardado sem alterações visíveis'] }
}

function nomeEntidadeHistorico(his, tabelaPadrao) {
    const tabela = tabelaHistorico(his, tabelaPadrao)
    return ENTIDADES_HISTORICO[tabela]?.nome || inicialMaiuscula(String(tabela || '').replace(/_/g, ' '))
}

// Preenche os placeholders com o nome do cadastro; cada registro é buscado uma vez.
const cacheReferenciasHistorico = new Map()
let resolucaoHistoricoAgendada = false

function agendarReferenciasHistorico() {
    if (resolucaoHistoricoAgendada) return
    resolucaoHistoricoAgendada = true
    setTimeout(async () => {
        resolucaoHistoricoAgendada = false
        const pendentes = [...document.querySelectorAll('.historico-ref:not([data-resolvido])')]
        await Promise.all(pendentes.map(async el => {
            el.dataset.resolvido = '1'
            const chave = `${el.dataset.tabela}:${el.dataset.id}`
            if (!cacheReferenciasHistorico.has(chave))
                cacheReferenciasHistorico.set(chave, recuperarDado(el.dataset.tabela, el.dataset.id).catch(() => null))
            const registro = await cacheReferenciasHistorico.get(chave)
            const valor = el.dataset.caminho.split('.').reduce((obj, k) => obj?.[k], registro)
            el.textContent = valor || (registro ? 'sem nome' : 'indisponível')
        }))
    }, 0)
}

// ---------- Painel de histórico (obras e colaboradores): linha do tempo agrupada por dia ----------

const ICONES_HISTORICO = {
    criado: '<path d="M12 5v14M5 12h14"/>',
    alterado: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    excluido: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>'
}
const ACOES_HISTORICO = { criado: 'Criado', alterado: 'Alterado', excluido: 'Eliminado' }
const MUDANCAS_VISIVEIS_HISTORICO = 5

// Momento do evento: timestamp (ms) ou a data gravada no log ("30/10/2026, 21:30:00").
function momentoHistorico(his) {
    const ts = Number(his?.timestamp)
    if (Number.isFinite(ts) && ts > 0) return new Date(ts)
    const m = String(his?.data || '').match(/^(\d{2})\/(\d{2})\/(\d{4})[, ]+(\d{2}):(\d{2})(?::(\d{2}))?/)
    return m ? new Date(+m[3], m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0)) : null
}

function rotuloDiaHistorico(data) {
    if (!data) return 'Data desconhecida'
    const dia = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const dias = Math.round((dia(new Date()) - dia(data)) / 86400000)
    if (dias === 0) return 'Hoje'
    if (dias === 1) return 'Ontem'
    const texto = data.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', ...(dias > 300 ? { year: 'numeric' } : {}) })
    return inicialMaiuscula(texto)
}

function iniciaisHistorico(nome) {
    const partes = String(nome || '?').trim().split(/[\s._-]+/).filter(Boolean)
    return ((partes[0]?.[0] || '?') + (partes.length > 1 ? partes.at(-1)[0] : '')).toUpperCase()
}

function cartaoHistorico(his, { tabelaPadrao, mostrarPessoa }) {
    const { tipo, frases } = classificarHistorico(his, tabelaPadrao)
    const momento = momentoHistorico(his)
    const hora = momento ? momento.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : escaparAtributo(his?.data || '')
    const entidade = escaparAtributo(nomeEntidadeHistorico(his, tabelaPadrao))
    const pessoa = mostrarPessoa && his?.nome_colaborador ? `<span class="hist-pessoa">${escaparAtributo(his.nome_colaborador)}</span>` : ''
    const itens = frases.map(f => `<li>${f}</li>`)
    const extras = itens.length - MUDANCAS_VISIVEIS_HISTORICO
    const mudancas = extras > 1
        ? `${itens.slice(0, MUDANCAS_VISIVEIS_HISTORICO).join('')}<li class="hist-mais"><details><summary>ver mais ${extras} alterações</summary><ul>${itens.slice(MUDANCAS_VISIVEIS_HISTORICO).join('')}</ul></details></li>`
        : itens.join('')
    const autor = his?.usuario || 'Sistema'
    return `
        <article class="hist-evento hist-${tipo}">
            <span class="hist-marcador" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONES_HISTORICO[tipo]}</svg></span>
            <div class="hist-cartao">
                <header>
                    <span class="hist-acao">${ACOES_HISTORICO[tipo]}</span>
                    <span class="hist-entidade">${entidade}${pessoa ? ` · ${pessoa}` : ''}</span>
                    <time ${momento ? `datetime="${momento.toISOString()}"` : ''} title="${escaparAtributo(his?.data || '')}">${hora}</time>
                </header>
                <ul class="hist-mudancas">${mudancas}</ul>
                <footer>
                    <span class="hist-avatar" aria-hidden="true">${escaparAtributo(iniciaisHistorico(autor))}</span>
                    <span>por <b>${escaparAtributo(autor)}</b>${his?.funcao ? ` · ${escaparAtributo(his.funcao)}` : ''}</span>
                </footer>
            </div>
        </article>`
}

// Abre o painel: filtros no topo, eventos do mais recente ao mais antigo e "Carregar mais" no fim.
async function painelHistorico({ titulo, subtitulo = '', base, filtrosFixos = {}, tabelaPadrao, mostrarPessoa = true, buscarPessoa = false }) {
    const LIMITE = 30
    let pagina = 1, paginas = 1, ultimoDia = null, consulta = 0

    const idPopup = popup({ titulo, elemento: `
        <div class="hist">
            <div class="hist-filtros">
                ${buscarPessoa ? '<label class="hist-campo"><span>Colaborador</span><input type="search" data-filtro="nome_colaborador" placeholder="Nome do colaborador"></label>' : ''}
                <label class="hist-campo"><span>Alterado por</span><input type="search" data-filtro="usuario" placeholder="Utilizador"></label>
                <label class="hist-campo hist-data"><span>De</span><input type="date" data-de></label>
                <label class="hist-campo hist-data"><span>Até</span><input type="date" data-ate></label>
            </div>
            <div class="hist-resumo">${subtitulo ? `<span>${escaparAtributo(subtitulo)}</span>` : ''}<span class="hist-total" aria-live="polite"></span></div>
            <div class="hist-lista" role="feed" aria-busy="true"></div>
            <div class="hist-rodape"><button type="button" data-mais hidden>Carregar mais</button></div>
        </div>` })
    const modal = document.getElementById(idPopup)
    modal.classList.add('popup-historico')
    const lista = modal.querySelector('.hist-lista'), botaoMais = modal.querySelector('[data-mais]'), total = modal.querySelector('.hist-total')

    const filtros = () => {
        const f = { ...filtrosFixos }
        for (const input of modal.querySelectorAll('[data-filtro]'))
            if (input.value.trim()) f[input.dataset.filtro] = { op: 'includes', value: input.value.trim() }
        const de = modal.querySelector('[data-de]').value, ate = modal.querySelector('[data-ate]').value
        const datas = [de && { op: '>=d', value: de }, ate && { op: '<=d', value: ate }].filter(Boolean)
        if (datas.length) f.data = datas
        return f
    }

    async function carregar(reiniciar) {
        const n = ++consulta
        if (reiniciar) {
            pagina = 1; ultimoDia = null
            lista.innerHTML = '<div class="hist-estado"><img src="imagens/loading-claro.png" alt="A carregar" width="56"></div>'
        }
        botaoMais.disabled = true
        lista.setAttribute('aria-busy', 'true')
        try {
            const dados = await pesquisarDB({ base, pagina, limite: LIMITE, filtros: filtros(), ordenar: { path: 'timestamp', direcao: 'desc' } })
            if (n !== consulta || !modal.isConnected) return
            paginas = Number(dados?.paginas) || 1
            const resultados = dados?.resultados || []
            total.textContent = `${dados?.total ?? 0} ${dados?.total === 1 ? 'evento' : 'eventos'}`
            if (reiniciar) lista.innerHTML = ''
            if (!resultados.length && pagina === 1) {
                lista.innerHTML = '<div class="hist-estado"><strong>Nenhum evento encontrado</strong><span>Ajuste os filtros ou o período.</span></div>'
            }
            let html = ''
            for (const his of resultados) {
                const dia = rotuloDiaHistorico(momentoHistorico(his))
                if (dia !== ultimoDia) { html += `<h4 class="hist-dia">${escaparAtributo(dia)}</h4>`; ultimoDia = dia }
                html += cartaoHistorico(his, { tabelaPadrao, mostrarPessoa })
            }
            lista.insertAdjacentHTML('beforeend', html)
            agendarReferenciasHistorico()
            botaoMais.hidden = pagina >= paginas
        } catch (erro) {
            if (n !== consulta) return
            lista.innerHTML = `<div class="hist-estado hist-erro"><strong>Não foi possível carregar o histórico</strong><span>${escaparAtributo(erro.message)}</span></div>`
            botaoMais.hidden = true
        } finally {
            if (n === consulta) { botaoMais.disabled = false; lista.setAttribute('aria-busy', 'false') }
        }
    }

    // Pesquisa ao digitar (com pausa) e ao trocar as datas.
    let espera
    modal.querySelectorAll('[data-filtro]').forEach(input => input.addEventListener('input', () => {
        clearTimeout(espera); espera = setTimeout(() => carregar(true), 400)
    }))
    modal.querySelectorAll('[data-de], [data-ate]').forEach(input => input.addEventListener('change', () => carregar(true)))
    botaoMais.addEventListener('click', () => { pagina++; carregar(false) })

    await carregar(true)
}
