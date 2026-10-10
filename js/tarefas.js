const prioridades = ['Alta', 'Média', 'Baixa']
const estados = ['Não iniciado', 'Em curso', 'Stand By', 'Dependente', 'Finalizado', 'Concluído']
const hierarquiaTarefas = {
    'CEO': 0,
    'Diretor Programador': 1,
    'Diretor Operativo': 1,
    'Coordenador Operativo': 2,
    'Encarregado de Obra': 3,
    'Trabalhador': 4
}
let formularioTarefaAtual = null
let contextoTarefas = null

function cargosSubordinadosTarefa(funcao = acesso?.funcao) {
    const nivel = hierarquiaTarefas[funcao]
    return Object.keys(hierarquiaTarefas).filter(cargo => hierarquiaTarefas[cargo] > nivel)
}

function tarefaParticular(tarefa) {
    const autor = tarefa.criador || tarefa.usuario
    return tarefa.particular === true || !!autor && autor === tarefa.destinatario
}

function envolvidosTarefa(tarefa) {
    return [...new Set([...(Array.isArray(tarefa.envolvidos) ? tarefa.envolvidos : []), tarefa.criador || tarefa.usuario, tarefa.destinatario].filter(Boolean))]
}

function acessoGlobalTarefas() { return ['CEO', 'Diretor Programador'].includes(acesso?.funcao) }

function podeVerTarefa(tarefa) {
    const { usuario, funcao } = acesso || {}
    if (!usuario) return false
    if (tarefaParticular(tarefa)) return (tarefa.criador || tarefa.usuario || tarefa.destinatario) === usuario
    return acessoGlobalTarefas() || envolvidosTarefa(tarefa).includes(usuario)
}

function podeEditarTarefa(tarefa) {
    if (!podeVerTarefa(tarefa)) return false
    if (tarefaParticular(tarefa)) return true
    if (tarefa.destinatario === acesso.usuario) return false
    return (tarefa.criador || tarefa.usuario) === acesso.usuario || acessoGlobalTarefas()
}

function podeAtualizarTarefa(tarefa) {
    return podeVerTarefa(tarefa) && (tarefa.destinatario === acesso.usuario || podeEditarTarefa(tarefa))
}

// Conserva formatação simples dos editores sem aceitar atributos executáveis.
function htmlSeguroTarefa(html) {
    const modelo = document.createElement('template')
    modelo.innerHTML = String(html || '')
    const permitidas = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'DIV', 'SPAN'])
    for (const elemento of [...modelo.content.querySelectorAll('*')]) {
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG'].includes(elemento.tagName)) { elemento.remove(); continue }
        if (!permitidas.has(elemento.tagName)) { elemento.replaceWith(...elemento.childNodes); continue }
        for (const atributo of [...elemento.attributes]) elemento.removeAttribute(atributo.name)
    }
    return modelo.innerHTML
}

async function destinatariosTarefas() {
    const cargos = cargosSubordinadosTarefa()
    const usuarios = new Set([acesso.usuario])
    if (!cargos.length || acesso.funcao === 'CEO') return usuarios
    let pagina = 1, paginas = 1
    do {
        const resposta = await pesquisarDB({ base: 'dados_colaboradores', pagina, limite: 100,
            filtros: { funcao: { modo: 'OR', regras: cargos.map(value => ({ op: '=', value })) } } })
        for (const pessoa of resposta?.resultados || []) if (pessoa.usuario) usuarios.add(pessoa.usuario)
        paginas = resposta?.paginas || 1
        pagina++
    } while (pagina <= paginas)
    return usuarios
}

async function telaTarefas(historico = false) {
    try {
        overlayAguarde()
        const usuario = acesso.usuario
        const publicas = { modo: 'AND', regras: [
            { path: 'particular', op: '!=', value: true },
            ...(acessoGlobalTarefas() ? [] : [{ modo: 'OR', regras: [
                { path: 'envolvidos', op: 'includes', value: usuario },
                { path: 'criador', op: '=', value: usuario },
                { path: 'usuario', op: '=', value: usuario },
                { path: 'destinatario', op: '=', value: usuario }
            ] }])
        ] }
        const filtros = { estado: { op: historico ? '=' : '!=', value: 'Concluído' }, modo: 'AND', regras: [
            { path: 'estado', op: historico ? '=' : '!=', value: 'Concluído' },
            { modo: 'OR', regras: [publicas, { modo: 'AND', regras: [
                { path: 'particular', op: '=', value: true },
                { modo: 'OR', regras: [
                    { path: 'criador', op: '=', value: usuario },
                    { path: 'usuario', op: '=', value: usuario }
                ] }
            ] }] }
        ] }
        const pag = historico ? 'tarefas_historico' : 'tarefas'
        const tabela = await modTab({
            btnExtras: '<button type="button" onclick="gerenciarTarefa()">Adicionar tarefa</button>',
            base: 'tarefas', body: pag, pag, criarLinha: 'criarLinhaTarefa', filtros,
            detalhes: true,
            colunas: {
                'Tarefa': { chave: 'tarefa' },
                'Destinatário': { chave: 'destinatario' },
                'Descrição da tarefa': { chave: 'notas' },
                'Prioridade': { chave: 'prioridade' },
                'Estado': { chave: 'estado' },
                'Prazo': {},
                'Data de início': { chave: 'data_inicio', tipoPesquisa: 'data' },
                'Data de fim': { chave: 'data_fim', tipoPesquisa: 'data' },
                'Edição': {}
            }
        })
        titulo.textContent = historico ? 'Histórico de tarefas' : 'Tarefas'
        tela.innerHTML = tabela
        await paginacao(pag)
    } catch (erro) {
        console.error(erro)
        popup({ mensagem: 'Não foi possível carregar as tarefas.' })
    } finally { removerOverlay() }
}

function historicoTarefas() { return telaTarefas(true) }

function opcoesTarefa(opcoes, selecionada) {
    return opcoes.map(op => `<option value="${escaparAtributo(op)}" ${selecionada === op ? 'selected' : ''}>${op}</option>`).join('')
}

function prazoTarefa(dataFim, estado, hoje = new Date()) {
    if (estado === 'Concluído') return { texto: 'Concluído', classe: 'concluido' }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataFim || '')) return { texto: 'Sem prazo', classe: 'sem-prazo' }
    const dataHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
    return dataFim < dataHoje ? { texto: 'Atrasado', classe: 'atrasado' } : { texto: 'No prazo', classe: 'no-prazo' }
}

function criarLinhaTarefa(dados) {
    if (!podeVerTarefa(dados)) return ''
    const { id, destinatario, prioridade = 'Média', estado = 'Não iniciado' } = dados
    const podeAlterar = podeAtualizarTarefa(dados)
    const idSeguro = escaparAtributo(encodeURIComponent(id).replace(/'/g, '%27'))
    const dropdown = (campo, opcoes, valor) => `<select class="tarefa-dropdown" aria-label="${campo === 'estado' ? 'Estado' : 'Prioridade'} da tarefa" data-valor="${escaparAtributo(valor)}" data-anterior="${escaparAtributo(valor)}" ${podeAlterar ? '' : 'disabled'} onchange="alterarCampoTarefa(decodeURIComponent('${idSeguro}'), '${campo}', this)">${opcoesTarefa(opcoes, valor)}</select>`
    const anotacao = dados.notas_usuario?.[encodeURIComponent(acesso.usuario)] || ''
    const prazo = prazoTarefa(dados.data_fim, estado)
    const linha = `<tr>
        <td class="tarefa-texto">${htmlSeguroTarefa(dados.tarefa)}${tarefaParticular(dados) ? '<small class="tarefa-particular">Particular</small>' : ''}</td>
        <td><div class="tarefa-destinatario"><span>${escaparAtributo(destinatario)}</span><em>${escaparAtributo(dados.destinatario_funcao || 'Não informado')}</em></div></td>
        <td class="tarefa-texto">${htmlSeguroTarefa(dados.notas)}</td>
        <td>${dropdown('prioridade', prioridades, prioridade)}</td>
        <td>${dropdown('estado', estados, estado)}</td>
        <td><span class="tarefa-prazo tarefa-prazo-${prazo.classe}">${prazo.texto}</span></td>
        <td>${dt(dados.data_inicio)}</td><td>${dt(dados.data_fim)}</td>
        <td>${podeEditarTarefa(dados) ? `<button type="button" class="tarefa-nota" onclick="gerenciarTarefa(decodeURIComponent('${idSeguro}'))">Editar</button>` : '—'}</td>
    </tr>`
    const registros = Object.values(dados.historico || {}).sort((a, b) => a.timestamp - b.timestamp)
    const anexos = Object.values(dados.anexos || {}).map(criarAnexoVisual).join('')
    const notasVisiveis = Object.entries(dados.notas_usuario || {}).map(([chave, texto]) => {
        let usuarioNota = chave
        try { usuarioNota = decodeURIComponent(chave) } catch {}
        return `<div class="tarefa-nota-conteudo"><strong>${escaparAtributo(usuarioNota)}</strong>${htmlSeguroTarefa(texto)}</div>`
    }).join('')
    const detalhes = `<div class="tarefa-detalhes-resumo">
        <section><h3>Notas</h3>${notasVisiveis || '<p>Nenhuma nota adicionada.</p>'}<button type="button" class="tarefa-nota" onclick="editarNotaTarefa(decodeURIComponent('${idSeguro}'))">${anotacao ? 'Editar minha nota' : 'Adicionar minha nota'}</button></section>
        <section><h3>Imagens / Documentos</h3><div class="tarefa-anexos">${anexos || '<p>Nenhum anexo.</p>'}</div></section>
    </div><section class="tarefa-historico"><h3>Histórico de alterações</h3>${registros.length ? `
        <div class="tarefa-historico-recorte"><table class="tabela">
            <thead><tr><th>Data e hora</th><th>Usuário</th><th>Alteração</th></tr></thead>
            <tbody>${registros.map(registro => `<tr><td class="tarefa-historico-data">${escaparAtributo(new Date(registro.timestamp).toLocaleString('pt-BR'))}</td><td>${escaparAtributo(registro.usuario)}</td><td>${escaparAtributo(registro.acao)}</td></tr>`).join('')}</tbody>
        </table></div>` : '<p>Nenhuma alteração registrada.</p>'}</section>`
    return { linha, detalhes }
}

function historicoAlteracoesTarefa(atual, alteracoes, criacao = false) {
    const historico = { ...atual.historico }
    const nomes = {
        tarefa: 'Alterou a tarefa', notas: 'Alterou a descrição da tarefa',
        prioridade: 'Alterou a prioridade', estado: 'Alterou o estado',
        destinatario: 'Alterou o destinatário', data_inicio: 'Alterou a data de início',
        data_fim: 'Alterou a data de fim', anexos: 'Alterou os anexos', notas_usuario: 'Alterou sua nota'
    }
    const adicionar = (campo, acao, anterior = null, novo = null) => {
        const timestamp = Date.now()
        historico[crypto.randomUUID()] = { timestamp, data_hora: new Date(timestamp).toISOString(), usuario: acesso.usuario, campo, acao, anterior, novo }
    }
    if (criacao) adicionar('criacao', 'Criou a tarefa')
    else for (const [campo, acao] of Object.entries(nomes)) {
        if (!(campo in alteracoes) || JSON.stringify(atual[campo] ?? '') === JSON.stringify(alteracoes[campo] ?? '')) continue
        // Notas individuais não expõem seu conteúdo no histórico compartilhado.
        if (['tarefa', 'notas', 'notas_usuario', 'anexos'].includes(campo)) adicionar(campo, acao)
        else adicionar(campo, `${acao}: ${atual[campo] || 'Não informado'} → ${alteracoes[campo] || 'Não informado'}`, atual[campo] ?? null, alteracoes[campo] ?? null)
    }
    return historico
}

async function gravarAlteracoesTarefa(id, atual, alteracoes, criacao = false) {
    const atualizado = { ...atual, ...alteracoes, historico: historicoAlteracoesTarefa(atual, alteracoes, criacao) }
    const resultado = await enviar(`tarefas/${id}`, atualizado)
    if (!resultado || resultado.success === false) throw new Error('Não foi possível salvar a tarefa e seu histórico.')
    return resultado
}

async function registroTarefaAutorizado(id, modo = 'ver') {
    const tarefa = await recuperarDado('tarefas', id)
    if (!tarefa || !(modo === 'editar' ? podeEditarTarefa(tarefa) : modo === 'atualizar' ? podeAtualizarTarefa(tarefa) : podeVerTarefa(tarefa)))
        throw new Error('Você não tem permissão para esta alteração.')
    return tarefa
}

async function alterarCampoTarefa(id, campo, input) {
    const anterior = input.dataset.anterior
    input.dataset.valor = input.value
    try {
        input.disabled = true
        const opcoes = campo === 'estado' ? estados : campo === 'prioridade' ? prioridades : []
        if (!opcoes.includes(input.value)) throw new Error('Opção inválida.')
        const atual = await registroTarefaAutorizado(id, 'atualizar')
        const resposta = await gravarAlteracoesTarefa(id, atual, { [campo]: input.value })
        if (!resposta || resposta.success === false) throw new Error('Não foi possível salvar a alteração.')
        input.dataset.anterior = input.value
        await paginacao(document.getElementById('tarefas_historico') ? 'tarefas_historico' : 'tarefas')
    } catch (erro) { input.value = anterior; input.dataset.valor = anterior; popup({ mensagem: escaparAtributo(erro.message) }) }
    finally { input.disabled = false }
}

async function gerenciarTarefa(id) {
    try {
        const dados = id ? await registroTarefaAutorizado(id, 'editar') : {}
        controlesCxOpcoes.destinatario = {
            base: 'dados_colaboradores', retornar: ['usuario'], filtros: {},
            armazenarDataset: { funcaoDestinatario: 'funcao' },
            colunas: { 'Usuário': { chave: 'usuario' }, 'Nome': { chave: 'nome' }, 'Função': { chave: 'funcao', bloquearPesquisa: true } }
        }
        const destinatario = dados.destinatario || acesso.usuario
        const linhas = [
            { texto: 'Tarefa', editor: htmlSeguroTarefa(dados.tarefa) },
            { texto: 'Destinatário', elemento: `<span id="${escaparAtributo(destinatario)}" data-funcao-destinatario="${escaparAtributo(dados.destinatario_funcao || (destinatario === acesso.usuario ? acesso.funcao : ''))}" class="opcoes" name="destinatario" onclick="cxOpcoes('destinatario')">${escaparAtributo(destinatario)}</span>` },
            { texto: 'Descrição da tarefa', editor: htmlSeguroTarefa(dados.notas) },
            { elemento: '<p class="tarefa-ajuda">Tarefas criadas para você são particulares. Ao escolher outra pessoa, a tarefa segue as regras da hierarquia.</p>' },
            { texto: 'Prioridade', elemento: `<select name="prioridade">${opcoesTarefa(prioridades, dados.prioridade || 'Média')}</select>` },
            { texto: 'Estado', elemento: `<select name="estado">${opcoesTarefa(estados, dados.estado || 'Não iniciado')}</select>` },
            { texto: 'Data de início', elemento: `<input name="data_inicio" type="date" value="${escaparAtributo(dados.data_inicio || '')}">` },
            { texto: 'Data de fim', elemento: `<input name="data_fim" type="date" value="${escaparAtributo(dados.data_fim || '')}">` },
            { texto: 'Imagem / Documento', elemento: `<input name="anexos_tarefa" type="file" multiple><div class="tarefa-anexos">${Object.values(dados.anexos || {}).map(criarAnexoVisual).join('')}</div>` }
        ]
        const idPopup = popup({ titulo: id ? 'Editar tarefa' : 'Nova tarefa', linhas,
            botoes: [{ texto: 'Salvar', img: 'concluido', funcao: 'salvarTarefa()' }] })
        formularioTarefaAtual = { id, idPopup, usuario: acesso.usuario }
    } catch (erro) { popup({ mensagem: escaparAtributo(erro.message) }) }
}

async function salvarTarefa() {
    const contexto = formularioTarefaAtual
    const modal = contexto && document.getElementById(contexto.idPopup)
    if (!modal || contexto.usuario !== acesso.usuario || contexto.salvando) return
    contexto.salvando = true
    try {
        const atual = contexto.id ? await registroTarefaAutorizado(contexto.id, 'editar') : {}
        const destinatario = modal.querySelector('[name="destinatario"]')?.textContent.trim()
        if (!destinatario) throw new Error('Selecione um destinatário.')
        const editores = modal.querySelectorAll('.editor-conteudo')
        if (!editores[0].textContent.trim()) throw new Error('Informe a tarefa.')
        const data_inicio = modal.querySelector('[name="data_inicio"]').value
        const data_fim = modal.querySelector('[name="data_fim"]').value
        if (data_inicio && data_fim && data_fim < data_inicio) throw new Error('A data de fim deve ser posterior à data de início.')
        const arquivos = modal.querySelector('[name="anexos_tarefa"]')
        const anexosNovos = arquivos.files.length ? await importarAnexos({ input: arquivos }) : []
        if (arquivos.files.length && (!Array.isArray(anexosNovos) || anexosNovos.length !== arquivos.files.length))
            throw new Error('Não foi possível enviar todos os anexos.')
        const atualizado = {
            ...atual, criador: atual.criador || atual.usuario || acesso.usuario,
            usuario: atual.criador || atual.usuario || acesso.usuario, destinatario,
            envolvidos: [...new Set([atual.criador || atual.usuario || acesso.usuario, destinatario])],
            destinatario_funcao: modal.querySelector('[name="destinatario"]').dataset.funcaoDestinatario || (destinatario === acesso.usuario ? acesso.funcao : null),
            particular: (atual.criador || atual.usuario || acesso.usuario) === destinatario,
            tarefa: htmlSeguroTarefa(editores[0].innerHTML), notas: htmlSeguroTarefa(editores[1].innerHTML),
            prioridade: modal.querySelector('[name="prioridade"]').value,
            estado: modal.querySelector('[name="estado"]').value,
            data_inicio, data_fim,
            anexos: { ...atual.anexos, ...Object.fromEntries((anexosNovos || []).map(a => [crypto.randomUUID(), a])) }
        }
        const id = contexto.id || crypto.randomUUID()
        if (contexto.usuario !== acesso.usuario || !modal.isConnected) throw new Error('O formulário ou a sessão foi encerrado.')
        const resultado = await gravarAlteracoesTarefa(id, atual, atualizado, !contexto.id)
        if (!resultado || resultado.success === false) throw new Error('Não foi possível salvar a tarefa.')
        removerPopup(contexto.idPopup)
        formularioTarefaAtual = null
        await paginacao(document.getElementById('tarefas_historico') ? 'tarefas_historico' : 'tarefas')
    } catch (erro) { popup({ mensagem: escaparAtributo(erro.message) }) }
    finally { contexto.salvando = false }
}

async function editarNotaTarefa(id) {
    try {
        const tarefa = await registroTarefaAutorizado(id)
        const usuario = acesso.usuario
        const chave = encodeURIComponent(usuario)
        const idPopup = popup({ titulo: 'Minha nota', linhas: [{ texto: 'Nota pessoal', editor: htmlSeguroTarefa(tarefa.notas_usuario?.[chave]) }],
            botoes: [{ texto: 'Salvar nota', img: 'concluido', funcao: 'salvarNotaTarefa()' }] })
        const modal = document.getElementById(idPopup)
        modal.dataset.tarefa = id
        modal.dataset.usuarioNota = usuario
        modal.classList.add('popup-nota-tarefa')
    } catch (erro) { popup({ mensagem: escaparAtributo(erro.message) }) }
}

async function salvarNotaTarefa() {
    const modal = [...document.querySelectorAll('.popup-nota-tarefa')].at(-1)
    if (!modal || modal.dataset.usuarioNota !== acesso.usuario || modal.dataset.salvando) return
    modal.dataset.salvando = 'true'
    try {
        const atual = await registroTarefaAutorizado(modal.dataset.tarefa)
        const nota = htmlSeguroTarefa(modal.querySelector('.editor-conteudo').innerHTML)
        const resultado = await gravarAlteracoesTarefa(modal.dataset.tarefa, atual, {
            notas_usuario: { ...atual.notas_usuario, [encodeURIComponent(acesso.usuario)]: nota }
        })
        if (!resultado || resultado.success === false) throw new Error('Não foi possível salvar a nota.')
        removerPopup(modal.id)
        await paginacao(document.getElementById('tarefas_historico') ? 'tarefas_historico' : 'tarefas')
    } catch (erro) { popup({ mensagem: escaparAtributo(erro.message) }) }
    finally { delete modal.dataset.salvando }
}
