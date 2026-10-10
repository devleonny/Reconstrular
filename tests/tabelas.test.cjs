const { test } = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

function ambiente() {
    class Observer { observe() {} unobserve() {} }
    const contexto = vm.createContext({
        window: { innerHeight: 900, addEventListener() {} },
        document: { documentElement: {} },
        ResizeObserver: Observer, MutationObserver: Observer,
        requestAnimationFrame() {}, getComputedStyle: elemento => elemento.estilo
    })
    vm.runInContext(readFileSync(join(__dirname, '../js/tabelas.js'), 'utf8'), contexto)
    return contexto
}

test('altura reserva espaço para o rodapé e o espaçamento do contêiner', () => {
    const c = ambiente()
    const pai = { parentElement: null, estilo: { display: 'flex', flexDirection: 'column', paddingBottom: '20px', rowGap: '10px', overflowY: 'visible' }, classList: { contains: () => false } }
    const rodape = { estilo: { display: 'flex', position: 'static' }, getBoundingClientRect: () => ({ height: 50 }) }
    const div = { parentElement: pai, nextElementSibling: rodape, getBoundingClientRect: () => ({ top: 200 }) }
    assert.equal(c.calcularAlturaDisponivelTabela(div), 620)
})

test('tabelas lado a lado não descontam a altura uma da outra', () => {
    const c = ambiente()
    const pai = { parentElement: null, estilo: { display: 'flex', flexDirection: 'row', overflowY: 'visible' }, classList: { contains: () => false } }
    const irmao = { estilo: { display: 'block', position: 'static' }, getBoundingClientRect: () => ({ height: 500 }) }
    const div = { parentElement: pai, nextElementSibling: irmao, getBoundingClientRect: () => ({ top: 200 }) }
    assert.equal(c.calcularAlturaDisponivelTabela(div), 700)
})

test('altura acompanha viewport móvel e nunca fica negativa', () => {
    const c = ambiente()
    c.window.visualViewport = { offsetTop: 0, height: 420 }
    assert.equal(c.calcularAlturaDisponivelTabela({ getBoundingClientRect: () => ({ top: 100 }) }), 320)
    assert.equal(c.calcularAlturaDisponivelTabela({ getBoundingClientRect: () => ({ top: 500 }) }), 0)
})

test('expansão mantém estado por registro e atualiza acessibilidade', () => {
    const c = ambiente()
    const atributos = {}
    const estado = new Map()
    const linha = { dataset: { id: 'servico-1' }, detalhesTabela: { hidden: true },
        estadoDetalhesTabela: estado, botaoDetalhesTabela: { setAttribute: (nome, valor) => { atributos[nome] = valor } } }
    c.definirDetalhesExpandidos(linha, true)
    assert.equal(linha.detalhesTabela.hidden, false)
    assert.equal(estado.get('servico-1'), true)
    assert.equal(atributos['aria-expanded'], 'true')
    c.definirDetalhesExpandidos(linha, false)
    assert.equal(linha.detalhesTabela.hidden, true)
    assert.equal(estado.get('servico-1'), false)
    assert.equal(atributos['aria-label'], 'Expandir detalhes')
})

test('modTab mantém tabelas antigas e adiciona detalhes somente quando configurados', async () => {
    const c = ambiente()
    c.vertical = 'display:flex'
    c.horizontal = 'display:flex'
    const config = { pag: 'teste', body: 'linhas', base: 'campos', criarLinha: 'renderizar', colunas: { Nome: { chave: 'nome' } } }
    const antigo = await c.modTab(config)
    assert.doesNotMatch(antigo, /data-expandir-todos/)
    const novo = await c.modTab({ ...config, detalhes: true, alturaMinima: 250 })
    assert.match(novo, /data-expandir-todos/)
    assert.match(novo, /data-detalhes="true"/)
    assert.match(novo, /--altura-minima-tabela: 250px/)
})
