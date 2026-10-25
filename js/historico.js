// Traduz os eventos do histórico (logs_rotas) em frases que o usuário entende.
// Recebe uma linha de vw_historico_obras / vw_historico_colaboradores.

const ENTIDADES_HISTORICO = {
    dados_orcamentos: { nome: 'Orçamento / Obra', criado: 'Orçamento criado', excluido: 'Orçamento excluído' },
    dados_despesas: { nome: 'Despesa', criado: 'Despesa criada', excluido: 'Despesa excluída' },
    dados_colaboradores: { nome: 'Colaborador', criado: 'Colaborador cadastrado', excluido: 'Colaborador excluído' }
}

// Rótulos por tabela; caminhos aninhados usam o primeiro trecho que tiver rótulo.
const ROTULOS_HISTORICO = {
    dados_orcamentos: {
        cliente: 'Cliente', cidade: 'Cidade', status: 'Status', finalizado: 'Situação', contrato: 'Contrato',
        data_visita: 'Data da visita', data_contato: 'Data do contato', em_obra: 'Obra', colaboradores: 'Equipe da obra',
        dt_inicio: 'Início da obra', documentos: 'Documentos', campos: 'Serviços', excluido: 'Exclusão'
    },
    dados_despesas: {
        tipo_despesa: 'Tipo da despesa', material: 'Materiais', fornecedor: 'Fornecedor', obra: 'Obra', data: 'Data',
        valor: 'Valor', fatura: 'Fatura', cidade: 'Cidade', excluido: 'Exclusão'
    },
    dados_colaboradores: {
        nome: 'Nome', nome_completo: 'Nome completo', data_nascimento: 'Data de nascimento', email: 'E-mail', morada: 'Morada',
        apolice: 'Apólice', telefone: 'Telefone', numero_documento: 'Número do documento', seguranca_social: 'Segurança social',
        numero_contribuinte: 'Número de contribuinte', status_disponivel: 'Disponibilidade', documento: 'Tipo de documento',
        especialidade: 'Especialidades', funcao: 'Função', pin: 'PIN', senha: 'Senha', cidade: 'Cidade', foto: 'Foto',
        epi: 'EPI', filtros: 'Filtros de acesso', contrato_obra: 'Contrato de obra', exame: 'Exame médico',
        acesso_bloqueado: 'Acesso', usuario: 'Usuário', status: 'Status', excluido: 'Exclusão'
    }
}
const SUBROTULOS_HISTORICO = {
    quantidade: 'Quantidade', descricao: 'Descrição', unitario: 'Valor unitário', medida: 'Medida', especialidade: 'Especialidade',
    zona: 'Zonas', distrito: 'Distritos', area: 'Áreas', obra: 'Obras', equipamentos: 'Equipamentos', valor: 'Valor'
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
        return novo ? 'Registro excluído' : 'Exclusão desfeita'

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
        return `<b>Equipe da obra</b>: ${trechos.join('; ') || 'sem mudanças'}`
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

// Lista de frases (HTML seguro) para a linha do histórico.
function traduzirHistorico(his, tabelaPadrao) {
    const tabela = tabelaHistorico(his, tabelaPadrao)
    const entidade = ENTIDADES_HISTORICO[tabela] || { nome: 'Registro', criado: 'Registro criado', excluido: 'Registro excluído' }
    const idRegistro = his?.id_registro || String(his?.caminho || '').split('/')[1]
    const entradas = entradasHistorico(his)

    // _acao só é gravado na criação do registro.
    if (entradas.some(([campo]) => campo === '_acao'))
        return [entidade.criado]

    if (String(his?.rota || '').startsWith('/deletar')) {
        const partes = String(his?.caminho || '').split('/').slice(2)
        return [partes.length ? `${escaparAtributo(rotuloHistorico(tabela, partes))} removido` : entidade.excluido]
    }

    const visiveis = entradas.filter(([campo]) => campo && !IGNORAR_HISTORICO.test(campo))

    // Logs antigos (antes do marcador _acao) registravam a criação como todos os campos saindo de vazio.
    const vazio = v => v === null || v === undefined || v === ''
    if (visiveis.length >= 3 && visiveis.every(([, v]) => vazio(v?.anterior)))
        return [entidade.criado]

    const frases = visiveis.map(([campo, valores]) => descreverAlteracaoHistorico(tabela, campo, valores, idRegistro))

    return frases.length ? frases : ['Registro salvo sem alterações visíveis']
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

function linhasAlteracoesHistorico(his, tabelaPadrao) {
    agendarReferenciasHistorico()
    return traduzirHistorico(his, tabelaPadrao).map(f => `<span class="tag-alteracao">${f}</span>`).join('')
}
