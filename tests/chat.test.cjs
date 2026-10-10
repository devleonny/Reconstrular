const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const source = readFileSync(require('node:path').join(__dirname, '../js/chat.js'), 'utf8')

function ambiente() {
    const contexto = vm.createContext({
        localStorage: { getItem: () => '{"token":"token-teste"}' },
        api: 'https://api.exemplo', acesso: { usuario: 'ana' },
        crypto: { randomUUID: () => 'envio-123' },
        document: { hidden: false },
        window: { matchMedia: () => ({ matches: false }) },
        setTimeout, clearTimeout, console
    })
    vm.runInContext(source, contexto)
    return contexto
}

test('anexos validam formato, quantidade e tamanho', () => {
    const c = ambiente()
    assert.doesNotThrow(() => c.chatValidarArquivos([{ name: 'obra.pdf', size: 1024 }]))
    assert.throws(() => c.chatValidarArquivos([{ name: 'pagina.html', size: 1024 }]), /Use JPG/)
    assert.throws(() => c.chatValidarArquivos([{ name: 'obra.pdf', size: 0 }]), /10 MB/)
    assert.throws(() => c.chatValidarArquivos([{ name: 'obra.pdf', size: 10485761 }]), /10 MB/)
    assert.throws(() => c.chatValidarArquivos(Array(6).fill({ name: 'obra.pdf', size: 1024 })), /5 anexos/)
})

test('edição de grupo é restrita aos administradores participantes', () => {
    const c = ambiente()
    const grupo = { tipo: 'grupo', criada_por: 'ana', participantes: [
        { usuario: 'ana', papel: 'administrador' }, { usuario: 'joao', papel: 'membro' }
    ] }
    assert.equal(c.chatPodeEditarGrupo(grupo, 'ana'), true)
    assert.equal(c.chatPodeEditarGrupo(grupo, 'joao'), false)
    assert.equal(c.chatPodeEditarGrupo(grupo, 'externo'), false)
    assert.equal(c.chatPodeEditarGrupo({ ...grupo, tipo: 'individual' }, 'ana'), false)
    grupo.participantes[0].papel = 'membro'
    assert.equal(c.chatPodeEditarGrupo(grupo, 'ana'), false)
})

test('contador conta conversas não lidas em todas as páginas e oculta zero', async () => {
    const c = ambiente()
    const contador = { style: {}, setAttribute() {} }
    c.document.getElementById = () => contador
    c.setTimeout = () => 0
    const paginas = []
    c.chatApi = async (rota, dados) => {
        paginas.push(dados.pagina)
        return { paginas: 2, resultados: dados.pagina === 1
            ? [{ id: '1', nao_lidas: 8 }, { id: '2', nao_lidas: 0 }]
            : [{ id: '3', nao_lidas: 1 }] }
    }
    await c.chatAtualizarContador()
    assert.deepEqual(paginas, [1, 2])
    assert.equal(contador.textContent, '2')
    assert.equal(contador.style.display, '')
    c.chatApi = async () => ({ resultados: [] })
    await c.chatAtualizarContador()
    assert.equal(contador.textContent, '0')
    assert.equal(contador.style.display, 'none')
})

test('mensagens e nomes são escapados como texto', () => {
    const c = ambiente()
    assert.equal(c.chatHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
    assert.equal(c.chatNome({ tipo: 'individual', participantes: [{ usuario: 'ana' }, { usuario: 'joao', nome_completo: 'João' }] }, 'ana'), 'João')
})

test('requisições usam o token e o contrato JSON', async () => {
    const c = ambiente()
    let chamada
    c.fetchAutenticado = async (url, opcoes) => {
        chamada = { url, opcoes }
        return { ok: true, status: 200, json: async () => ({ resultados: [] }) }
    }
    await c.chatApi('conversas/listar', { pagina: 1 })
    assert.equal(chamada.url, 'https://api.exemplo/chat/conversas/listar')
    assert.equal(chamada.opcoes.headers.Authorization, 'Bearer token-teste')
    assert.deepEqual(JSON.parse(chamada.opcoes.body), { pagina: 1 })
})

test('rota ainda não implementada e sessão encerrada não simulam sucesso', async () => {
    const c = ambiente()
    c.fetchAutenticado = async () => ({ status: 404 })
    await assert.rejects(c.chatApi('conversas/listar'), /configuração das rotas/)
    c.fetchAutenticado = async () => null
    await assert.rejects(c.chatApi('conversas/listar'), /sessão foi encerrada/)
})

test('envio com falha preserva rascunho e chave de idempotência para repetição', async () => {
    const c = ambiente()
    vm.runInContext(`
        const campoTeste = { value: 'Olá', style: {}, focus() {} }
        const botaoTeste = { disabled: false }
        const avisoTeste = { textContent: '' }
        const historicoTeste = { scrollTop: 0, scrollHeight: 100 }
        chatAtual = {
            usuario: 'ana', selecionada: { id: 'c1' }, mensagens: [],
            rascunhos: new Map(), raiz: { isConnected: true, querySelector(seletor) {
                return seletor === 'textarea' ? campoTeste : seletor === '.chat-aviso' ? avisoTeste :
                    seletor === '.chat-historico' ? historicoTeste : botaoTeste
            } }
        }
        chatRenderHistorico = () => {}
        chatRenderLista = () => {}
    `, c)
    const envios = []
    let falhar = true
    c.chatApi = async (rota, dados) => {
        envios.push(JSON.parse(JSON.stringify(dados)))
        if (falhar) throw new Error('Falha de rede')
        return { mensagem: { id: 'm1', texto: 'Olá', criada_em: 1000 } }
    }
    await c.enviarMensagem()
    assert.equal(vm.runInContext('campoTeste.value', c), 'Olá')
    assert.equal(vm.runInContext('botaoTeste.disabled', c), false)
    falhar = false
    await c.enviarMensagem()
    assert.equal(envios[0].cliente_id, envios[1].cliente_id)
    assert.equal(vm.runInContext('campoTeste.value', c), '')
    assert.equal(vm.runInContext('chatAtual.mensagens.length', c), 1)
})

test('resposta atrasada de outra conversa não entra no histórico atual', async () => {
    const c = ambiente()
    let resolver
    c.chatApi = () => new Promise(resolve => { resolver = resolve })
    vm.runInContext(`chatAtual = {
        usuario: 'ana', selecionada: { id: 'c1' }, versao: 1, mensagens: [],
        raiz: { isConnected: true }, carregandoHistorico: null
    }`, c)
    const estado = vm.runInContext('chatAtual', c)
    const carregamento = c.chatCarregarHistorico(estado)
    vm.runInContext("chatAtual.versao = 2; chatAtual.selecionada = { id: 'c2' }", c)
    resolver({ resultados: [{ id: 'm1', texto: 'Conversa antiga', criada_em: 1000 }] })
    await carregamento
    assert.equal(estado.mensagens.length, 0)
})

test('sincronização incremental usa último ID e não perde o cursor das mensagens antigas', async () => {
    const c = ambiente()
    let requisicao
    c.chatApi = async (rota, dados) => {
        requisicao = dados
        return { resultados: [{ id: '2', criada_em: 2000 }], proximo_cursor: null }
    }
    vm.runInContext(`
        chatAtual = {
            usuario: 'ana', selecionada: { id: 'c1' }, versao: 1,
            historicoInicializado: true, cursor: 'cursor-antigo',
            mensagens: [{ id: '1', criada_em: 1000 }],
            raiz: { isConnected: true, querySelector() { return {
                scrollHeight: 100, scrollTop: 0, clientHeight: 50, textContent: ''
            } } }
        }
        chatRenderHistorico = () => {}
        chatMarcarLidas = async () => {}
    `, c)
    const estado = vm.runInContext('chatAtual', c)
    await c.chatCarregarHistorico(estado)
    assert.equal(requisicao.depois_id, '1')
    assert.equal(estado.cursor, 'cursor-antigo')
    assert.equal(estado.mensagens.length, 2)
})
