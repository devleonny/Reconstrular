const { test } = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
function ambiente(usuario, funcao) {
    let contador = 0
    const c = vm.createContext({ acesso: { usuario, funcao }, crypto: { randomUUID: () => `evento-${++contador}` } })
    vm.runInContext(readFileSync(join(__dirname, '../js/tarefas.js'), 'utf8'), c)
    return c
}
test('CEO não vê particulares de outro usuário', () => {
    const c = ambiente('ceo', 'CEO')
    assert.equal(c.podeVerTarefa({ criador: 'ana', destinatario: 'ana', particular: true }), false)
    assert.equal(c.podeVerTarefa({ criador: 'ana', destinatario: 'ana', particular: false }), false)
})
test('qualquer usuário pode editar novamente sua particular', () => {
    const c = ambiente('ana', 'Trabalhador')
    const t = { criador: 'ana', destinatario: 'ana', particular: true }
    assert.equal(c.podeVerTarefa(t), true)
    assert.equal(c.podeAtualizarTarefa(t), true)
    assert.equal(c.podeEditarTarefa(t), true)
})
test('destinatário recebe atualizações restritas sem edição geral', () => {
    const c = ambiente('ana', 'Encarregado de Obra')
    const t = { criador: 'coord', destinatario: 'ana', particular: false }
    assert.equal(c.podeVerTarefa(t), true)
    assert.equal(c.podeAtualizarTarefa(t), true)
    assert.equal(c.podeEditarTarefa(t), false)
})
test('apenas envolvidos veem compartilhadas, independentemente do nível inferior', () => {
    const c = ambiente('coord', 'Coordenador Operativo')
    assert.equal(c.podeVerTarefa({ destinatario: 'ana', destinatario_funcao: 'Encarregado de Obra' }), false)
    assert.equal(c.podeVerTarefa({ destinatario: 'ana', envolvidos: ['coord', 'ana'] }), true)
    assert.equal(c.podeVerTarefa({ destinatario: 'bia', destinatario_funcao: 'Coordenador Operativo' }), false)
    assert.equal(c.podeVerTarefa({ destinatario: 'diretor', destinatario_funcao: 'Diretor Operativo' }), false)
})

test('Diretor Programador vê compartilhadas de todos mas nunca particulares alheias', () => {
    const c = ambiente('diretor', 'Diretor Programador')
    assert.equal(c.podeVerTarefa({ usuario: 'ana', destinatario: 'bia', envolvidos: ['ana', 'bia'] }), true)
    assert.equal(c.podeVerTarefa({ usuario: 'ana', destinatario: 'ana', particular: true }), false)
})
test('criador pode editar compartilhada; terceiros não editam', () => {
    const c = ambiente('coord', 'Coordenador Operativo')
    assert.equal(c.podeEditarTarefa({ criador: 'coord', destinatario: 'ana' }), true)
    assert.equal(c.podeEditarTarefa({ criador: 'diretor', destinatario: 'ana', destinatario_funcao: 'Encarregado de Obra' }), false)
})
test('cargo desconhecido não recebe permissões amplas', () => {
    const c = ambiente('ana', 'Outro cargo')
    assert.equal(c.podeVerTarefa({ criador: 'bia', destinatario: 'joao' }), false)
    assert.equal(c.podeVerTarefa({ criador: 'bia', destinatario: 'ana' }), true)
})

test('histórico acumula alterações sem modificar registros anteriores', () => {
    const c = ambiente('ana', 'CEO')
    const atual = { prioridade: 'Baixa', historico: { antigo: { acao: 'Criou a tarefa' } } }
    const historico = c.historicoAlteracoesTarefa(atual, { prioridade: 'Alta' })
    assert.equal(Object.keys(historico).length, 2)
    assert.equal(Object.keys(atual.historico).length, 1)
    const registro = historico['evento-1']
    assert.equal(registro.usuario, 'ana')
    assert.equal(registro.anterior, 'Baixa')
    assert.equal(registro.novo, 'Alta')
    assert.equal(typeof registro.timestamp, 'number')
})

test('salvar sem mudanças não gera evento repetido', () => {
    const c = ambiente('ana', 'CEO')
    assert.equal(Object.keys(c.historicoAlteracoesTarefa({ estado: 'Em curso' }, { estado: 'Em curso' })).length, 0)
})

test('alteração de nota não revela seu conteúdo no histórico compartilhado', () => {
    const c = ambiente('ana', 'CEO')
    const h = c.historicoAlteracoesTarefa({}, { notas_usuario: { ana: 'Nota privada' } })
    assert.equal(h['evento-1'].campo, 'notas_usuario')
    assert.equal(h['evento-1'].novo, null)
})

test('prazo usa a data local e considera o dia de vencimento dentro do prazo', () => {
    const c = ambiente('ana', 'CEO')
    const hoje = new Date(2026, 9, 10, 23, 59)
    assert.equal(c.prazoTarefa('2026-10-09', 'Em curso', hoje).texto, 'Atrasado')
    assert.equal(c.prazoTarefa('2026-10-10', 'Em curso', hoje).texto, 'No prazo')
    assert.equal(c.prazoTarefa('2026-10-11', 'Em curso', hoje).texto, 'No prazo')
    assert.equal(c.prazoTarefa('2026-10-09', 'Concluído', hoje).texto, 'Concluído')
    assert.equal(c.prazoTarefa('', 'Em curso', hoje).texto, 'Sem prazo')
})
