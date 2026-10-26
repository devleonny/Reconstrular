// Assiduidade: gestão do ponto (painel, registos, horas, ausências, locais com cerca virtual e funcionários).
// O trabalhador continua a marcar por PIN + reconhecimento facial (facial.js); aqui fica o controlo do gestor.
const Assiduidade = (() => {
    const ABAS = [
        ['painel', 'Painel'],
        ['folha', 'Folha de ponto'],
        ['registos', 'Registos'],
        ['horas', 'Horas trabalhadas'],
        ['ausencias', 'Férias e ausências'],
        ['locais', 'Locais de trabalho'],
        ['funcionarios', 'Funcionários']
    ]
    const TIPOS = { entrada: 'Entrada', saida_almoco: 'Saída almoço', retorno_almoco: 'Retorno almoço', saida: 'Saída' }
    const MOTIVOS_RECUSA = { fora_do_raio: 'Fora do raio', sem_localizacao: 'Sem localização', localizacao_imprecisa: 'Localização imprecisa', sem_local_autorizado: 'Sem local autorizado', rosto_diferente: 'Rosto não confere', sem_rosto_selfie: 'Rosto não detetado', sem_rosto_cadastro: 'Cadastro sem foto válida', sem_selfie: 'Sem imagem do rosto' }
    let aba = 'painel', equipa = null, locais = null, atualizacao = null, ultimaLista = []
    const folhaSel = { colaborador: '', ano: 0, mes: 0 }

    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const hoje = () => iso(new Date())
    const inicioMes = () => { const d = new Date(); return iso(new Date(d.getFullYear(), d.getMonth(), 1)) }
    const dataPt = v => v ? v.split('-').reverse().join('/') : ''
    const horas = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    const mapa = (lat, lng) => lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : null

    async function pedir(caminho, metodo = 'GET', corpo) {
        const { token } = JSON.parse(localStorage.getItem('acesso')) || {}
        const resposta = await fetchAutenticado(`${api}/assiduidade${caminho}`, {
            method: metodo,
            headers: { Authorization: `Bearer ${token}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
            ...(corpo ? { body: JSON.stringify(corpo) } : {})
        })
        if (!resposta) throw new Error('Sessão encerrada.')
        const dados = resposta.status === 204 ? null : await resposta.json().catch(() => ({}))
        if (!resposta.ok) throw new Error(dados?.mensagem || (resposta.status === 404 ? 'O ponto ainda não está disponível no servidor (atualize o backend).' : `Falha (${resposta.status}).`))
        return dados
    }
    const falha = erro => { removerOverlay?.(); popup({ mensagem: esc(erro.message), titulo: 'Ponto' }) }

    async function carregarEquipa(forcar) {
        if (!equipa || forcar) equipa = await pedir('/colaboradores')
        return equipa
    }
    async function carregarLocais(forcar) {
        if (!locais || forcar) locais = await pedir('/locais')
        return locais
    }

    // Estrutura da tela: a navegação entre secções fica no menu lateral (Assiduidade → …).
    async function abrir(qual = 'painel', opcoes = {}) {
        aba = qual
        if (opcoes.colaborador) folhaSel.colaborador = String(opcoes.colaborador)
        clearInterval(atualizacao)
        titulo.textContent = `Ponto · ${ABAS.find(([id]) => id === aba)?.[1] || ''}`
        tela.innerHTML = `<section class="asd">
            <div class="asd-conteudo"><div class="asd-vazio">A carregar…</div></div>
        </section>`
        try { await ({ painel, folha: folhaPonto, registos, horas: horasTrabalhadas, ausencias, locais: telaLocais, funcionarios }[aba])() }
        catch (erro) { conteudo().innerHTML = `<div class="asd-vazio asd-erro">${esc(erro.message)}</div>` }
    }
    const conteudo = () => tela.querySelector('.asd-conteudo')
    const ativa = qual => aba === qual && tela.querySelector('.asd')

    const cabecalho = (tituloAba, descricao, acoes = '') => `<header class="asd-cabecalho"><div><h2>${tituloAba}</h2><p>${descricao}</p></div><div class="asd-acoes">${acoes}</div></header>`
    const tabela = (colunas, linhas, vazio) => `<div class="asd-tabela-caixa"><table class="asd-tabela"><thead><tr>${colunas.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${linhas.length ? linhas.join('') : `<tr><td colspan="${colunas.length}" class="asd-vazio">${vazio}</td></tr>`}</tbody></table></div>`
    const etiquetaTipo = tipo => `<span class="asd-tipo asd-tipo-${esc(tipo)}">${esc(TIPOS[tipo] || 'Extra')}</span>`
    const estadoGps = r => r.origem === 'manual' ? '<span class="asd-gps asd-gps-manual">Lançada pelo gestor</span>'
        : r.distancia_m != null ? `<span class="asd-gps asd-gps-ok">Dentro do raio · ${Math.round(r.distancia_m)} m</span>`
            : '<span class="asd-gps asd-gps-sem">Sem cerca</span>'
    const linkMapa = (lat, lng) => { const url = mapa(lat, lng); return url ? `<a class="asd-mapa" href="${url}" target="_blank" rel="noopener noreferrer" title="Abrir no mapa">Mapa ↗</a>` : '—' }
    const opcoesEquipa = (selecionado, incluirTodos) => (incluirTodos ? '<option value="">Todos os funcionários</option>' : '<option value="">Selecione…</option>')
        + (equipa?.items || []).map(c => `<option value="${esc(c.id)}" ${c.id === selecionado ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')
    const filtros = (extra = '', inicio = inicioMes(), fim = hoje()) => `<form class="asd-filtros">
        <label>Funcionário<select name="colaborador">${opcoesEquipa('', true)}</select></label>${extra}
        <label>Data inicial<input type="date" name="inicio" value="${inicio}"></label>
        <label>Data final<input type="date" name="fim" value="${fim}"></label>
        <button type="submit" class="asd-primario">Filtrar</button>
        <button type="button" data-imprimir>Imprimir / PDF</button></form>`
    const lerFiltros = form => new URLSearchParams(Object.fromEntries(new FormData(form))).toString()

    // Impressão: abre só a tabela atual numa janela própria (o navegador oferece "Guardar como PDF").
    function imprimir(tituloDoc) {
        const caixa = conteudo().querySelector('.asd-resultado')
        const janela = window.open('', '_blank')
        if (!janela || !caixa) return
        janela.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(tituloDoc)}</title>
            <style>body{font-family:Arial,sans-serif;font-size:11px;color:#222;margin:24px}h1{font-size:16px;margin:0 0 4px}p{color:#666;margin:0 0 14px}
            table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f1f1f1}
            .asd-mapa,.asd-linha-acoes,[data-sem-impressao]{display:none}span{background:none!important;border:0!important;padding:0!important;color:inherit!important}</style>
            <h1>${esc(tituloDoc)}</h1><p>Emitido em ${new Date().toLocaleString('pt-PT')}</p>${caixa.innerHTML}`)
        janela.document.close(); janela.focus(); setTimeout(() => janela.print(), 250)
    }

    // ---------- Painel ----------
    async function painel() {
        const p = await pedir('/painel')
        if (!ativa('painel')) return
        const maximo = Math.max(100, ...p.semana.map(s => s.percentual))
        const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']
        const cartao = (rotulo, valor, classe, icone, detalhe) => `<div class="asd-cartao asd-${classe}"><div><span>${rotulo}</span><strong>${valor}</strong>${detalhe ? `<small>${detalhe}</small>` : ''}</div><i aria-hidden="true">${icone}</i></div>`
        conteudo().innerHTML = cabecalho('Painel de hoje', `${dataPt(hoje())} · atualiza a cada minuto · equipa ativa: ${p.equipa}`, '<button type="button" data-atualizar>↻ Atualizar</button>')
            + `<div class="asd-cartoes">
                ${cartao('Presentes agora', p.presentes, 'verde', '👷', 'com entrada ou retorno marcados')}
                ${cartao('Atrasos de hoje', p.atrasos.length, 'amarelo', '⏱', 'tolerância de 5 minutos')}
                ${cartao('Alertas de GPS', p.alertas.length, 'vermelho', '📍', 'marcações recusadas')}
                ${cartao('Ausentes hoje', p.ausentes.length, 'azul', '🗓', 'férias e faltas lançadas')}
            </div>
            <div class="asd-grade">
                <section class="asd-bloco"><h3>Atividade em tempo real</h3>${tabela(['Funcionário', 'Tipo', 'Hora', 'Local', 'Estado GPS', 'Mapa'],
                p.atividade.map(r => `<tr><td><b>${esc(r.nome)}</b></td><td>${etiquetaTipo(r.tipo)}</td><td class="asd-mono">${esc(r.hora.slice(0, 5))}</td><td>${esc(r.local_nome || '—')}</td><td>${estadoGps(r)}</td><td>${linkMapa(r.latitude, r.longitude)}</td></tr>`),
                'Nenhuma marcação registada hoje.')}</section>
                <section class="asd-bloco"><h3>Presença semanal</h3><div class="asd-barras">${p.semana.map((s, i) => `<div class="asd-barra" title="${s.presentes} de ${p.equipa} (${s.percentual}%)"><span style="height:${Math.round(s.percentual / maximo * 100)}%"></span><b>${s.percentual}%</b><small>${dias[i]}</small></div>`).join('')}</div></section>
            </div>
            <div class="asd-grade asd-grade-igual">
                <section class="asd-bloco"><h3>Alertas de GPS de hoje</h3>${tabela(['Hora', 'Funcionário', 'Motivo', 'Local mais próximo'],
                p.alertas.map(a => `<tr><td class="asd-mono">${esc(a.hora)}</td><td>${esc(a.nome)}</td><td><span class="asd-gps asd-gps-erro">${esc(MOTIVOS_RECUSA[a.motivo] || a.motivo)}</span></td><td>${esc(a.local_nome || '—')}${a.distancia_m != null ? ` · ${esc(a.distancia_m)} m` : ''}</td></tr>`),
                'Sem alertas hoje.')}</section>
                <section class="asd-bloco"><h3>Atrasos e ausências</h3>${tabela(['Funcionário', 'Situação'],
                [...p.atrasos.map(a => `<tr><td>${esc(a.nome)}</td><td><span class="asd-gps asd-gps-aviso">Entrada ${esc(a.hora)} (previsto ${esc(a.previsto)})</span></td></tr>`),
                ...p.ausentes.map(a => `<tr><td>${esc(a.nome)}</td><td><span class="asd-gps asd-gps-azul">${esc(a.tipo_rotulo)}</span></td></tr>`)],
                'Sem atrasos nem ausências hoje.')}</section>
            </div>`
        conteudo().querySelector('[data-atualizar]').onclick = () => painel().catch(falha)
        clearInterval(atualizacao)
        atualizacao = setInterval(() => { if (ativa('painel') && !document.hidden) painel().catch(() => {}); else if (!ativa('painel')) clearInterval(atualizacao) }, 60000)
    }

    // ---------- Registos (marcações e tentativas recusadas) ----------
    async function registos() {
        await carregarEquipa()
        const tipos = `<label>Tipo<select name="tipo"><option value="">Todos</option>${Object.entries(TIPOS).map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}<option value="recusadas">Recusadas (alertas GPS)</option></select></label>`
        conteudo().innerHTML = cabecalho('Registos de ponto', 'Marcações por reconhecimento facial e lançamentos do gestor (com motivo). As recusadas mostram as tentativas bloqueadas pelo GPS.',
            '<button type="button" class="asd-primario" data-nova>＋ Lançar marcação</button><button type="button" data-correcoes>Histórico de correções</button>')
            + filtros(tipos) + '<div class="asd-resultado"></div>'
        const form = conteudo().querySelector('.asd-filtros')
        const listar = async () => {
            const dados = await pedir(`/registos?${lerFiltros(form)}`)
            if (!ativa('registos')) return
            ultimaLista = dados.items
            conteudo().querySelector('.asd-resultado').innerHTML = dados.recusadas
                ? tabela(['Funcionário', 'Data e hora', 'Motivo', 'Local mais próximo', 'Distância', 'Mapa'], dados.items.map(t => `<tr><td><b>${esc(t.nome)}</b></td><td class="asd-mono">${dataPt(t.data)} ${esc(t.hora)}</td><td><span class="asd-gps asd-gps-erro">${esc(MOTIVOS_RECUSA[t.motivo] || t.motivo)}</span></td><td>${esc(t.local_nome || '—')}</td><td>${t.distancia_m != null ? `${esc(t.distancia_m)} m${t.raio_m ? ` (raio ${esc(t.raio_m)} m)` : ''}` : '—'}</td><td>${linkMapa(t.latitude, t.longitude)}</td></tr>`), 'Nenhuma tentativa recusada no período.')
                : tabela(['Funcionário', 'Tipo', 'Data e hora', 'Local', 'Estado GPS', 'Mapa', ''], dados.items.map((r, i) => `<tr><td><b>${esc(r.nome)}</b><small class="asd-sub">${esc(r.usuario || '')}</small></td><td>${etiquetaTipo(r.tipo)}</td><td class="asd-mono">${dataPt(r.data)} ${esc(r.hora)}</td><td>${esc(r.local_nome || '—')}</td><td>${estadoGps(r)}</td><td>${linkMapa(r.latitude, r.longitude)}</td><td class="asd-linha-acoes"><button type="button" data-editar="${i}" title="Corrigir hora">Corrigir</button><button type="button" data-excluir="${i}" title="Excluir marcação">Excluir</button></td></tr>`), 'Nenhuma marcação no período.')
        }
        form.addEventListener('submit', e => { e.preventDefault(); listar().catch(falha) })
        conteudo().querySelector('[data-imprimir]').onclick = () => imprimir('Registos de ponto')
        conteudo().querySelector('[data-nova]').onclick = () => formularioMarcacao()
        conteudo().querySelector('[data-correcoes]').onclick = () => historicoCorrecoes(form).catch(falha)
        conteudo().querySelector('.asd-resultado').addEventListener('click', e => {
            const editar = e.target.closest('[data-editar]'), excluir = e.target.closest('[data-excluir]')
            if (editar) formularioCorrecao(ultimaLista[Number(editar.dataset.editar)])
            if (excluir) formularioExclusao(ultimaLista[Number(excluir.dataset.excluir)])
        })
        await listar()
    }

    // ---------- Folha de ponto (mês a mês; antiga folha de Colaboradores) ----------
    const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    const ACOES_GESTOR = { criar: 'Lançada', alterar: 'Corrigida', excluir: 'Excluída' }
    let folhaAtual = null
    async function folhaPonto() {
        await carregarEquipa()
        const agora = new Date()
        folhaSel.ano ||= agora.getFullYear(); folhaSel.mes ||= agora.getMonth() + 1
        const { colaborador: eu } = JSON.parse(localStorage.getItem('acesso')) || {}
        if (!equipa.items.some(c => c.id === folhaSel.colaborador))
            folhaSel.colaborador = (equipa.items.find(c => c.id !== String(eu)) || equipa.items[0])?.id || ''
        const anos = [agora.getFullYear() - 2, agora.getFullYear() - 1, agora.getFullYear()]
        conteudo().innerHTML = cabecalho('Folha de ponto', 'Registo mensal por funcionário. Esquecimentos são lançados pelo gestor com motivo e ficam sinalizados com ✎ aqui, no PDF e no comprovativo do trabalhador na marcação seguinte.')
            + `<form class="asd-filtros">
                <label>Funcionário<select name="colaborador">${opcoesEquipa(folhaSel.colaborador)}</select></label>
                <label>Mês<select name="mes">${MESES.map((m, i) => `<option value="${i + 1}" ${i + 1 === folhaSel.mes ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
                <label>Ano<select name="ano">${anos.map(a => `<option ${a === folhaSel.ano ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
                <button type="button" data-pdf>Baixar PDF</button><button type="button" data-imprimir>Imprimir</button></form>
                <div class="asd-resultado"></div>`
        const form = conteudo().querySelector('.asd-filtros')
        const mostrar = () => {
            folhaSel.colaborador = form.elements.colaborador.value; folhaSel.mes = Number(form.elements.mes.value); folhaSel.ano = Number(form.elements.ano.value)
            return renderFolha().catch(falha)
        }
        form.addEventListener('change', mostrar)
        form.addEventListener('submit', e => { e.preventDefault(); mostrar() })
        conteudo().querySelector('[data-imprimir]').onclick = () => imprimir(`Folha de ponto · ${folhaAtual?.colaborador?.nome || ''} · ${MESES[folhaSel.mes - 1]} ${folhaSel.ano}`)
        conteudo().querySelector('[data-pdf]').onclick = async () => {
            try {
                overlayAguarde()
                await pedir('/folha/gerar', 'POST', { colaborador: folhaSel.colaborador, ano: folhaSel.ano, mes: folhaSel.mes })
                await baixarFolha({ idColaborador: folhaSel.colaborador, ano: String(folhaSel.ano), mes: String(folhaSel.mes).padStart(2, '0') })
            } catch (erro) { falha(erro) } finally { removerOverlay() }
        }
        conteudo().querySelector('.asd-resultado').addEventListener('click', e => {
            const marca = e.target.closest('[data-marca]'), esquecida = e.target.closest('[data-esquecida]')
            if (marca && folhaAtual?.podeLancar) {
                const [dia, i] = marca.dataset.marca.split(':').map(Number)
                const d = folhaAtual.dias[dia], m = d.marcas[i]
                const r = { id: m.id, nome: folhaAtual.colaborador.nome, tipo: m.tipo, data: d.data, hora: m.hora }
                popup({
                    titulo: 'Marcação', mensagem: `<b>${esc(r.nome)}</b> · ${esc(TIPOS[r.tipo] || '')} · ${dataPt(r.data)} ${esc(r.hora)}${m.correcao ? `<br><small>✎ ${esc(ACOES_GESTOR[m.correcao.acao])} por ${esc(m.correcao.autor)} em ${esc(m.correcao.momento)} — ${esc(m.correcao.motivo)}</small>` : ''}`,
                    botoes: [{ texto: 'Corrigir hora', img: 'lapis', funcao: `Assiduidade.corrigirDaFolha(${dia}, ${i})` }, { texto: 'Excluir', img: 'cancel', funcao: `Assiduidade.excluirDaFolha(${dia}, ${i})` }]
                })
            }
            if (esquecida) formularioMarcacao({ colaborador: folhaSel.colaborador, data: esquecida.dataset.esquecida })
        })
        await renderFolha()
    }
    async function renderFolha() {
        if (!folhaSel.colaborador) { conteudo().querySelector('.asd-resultado').innerHTML = '<div class="asd-vazio asd-caixa">Nenhum funcionário na sua equipa.</div>'; return }
        const f = await pedir(`/folha?colaborador=${encodeURIComponent(folhaSel.colaborador)}&ano=${folhaSel.ano}&mes=${folhaSel.mes}`)
        if (!ativa('folha')) return
        folhaAtual = f
        const hojeIso = hoje(), r = f.resumo
        const naoVistos = f.lancamentos.filter(l => !l.visto_em).length
        const celula = (d, di, tipo) => {
            const i = d.marcas.findIndex(m => m.tipo === tipo)
            if (i < 0) return '<span class="asd-falta">—</span>'
            const m = d.marcas[i]
            const dica = m.gestor ? `✎ ${ACOES_GESTOR[m.correcao?.acao] || 'Lançada'} pelo gestor${m.correcao ? ` (${m.correcao.autor}, ${m.correcao.momento}) — Motivo: ${m.correcao.motivo}` : ''}` : 'Marcação por reconhecimento facial'
            return `<button type="button" class="asd-marca asd-tipo-${tipo}${m.gestor ? ' asd-marca-gestor' : ''}" data-marca="${di}:${i}" title="${esc(dica)}" ${f.podeLancar ? '' : 'disabled'}>${esc(m.hora)}${m.gestor ? ' ✎' : ''}</button>`
        }
        const sinal = m => m === null ? '' : `<span class="${m < 0 ? 'asd-negativo' : 'asd-positivo'}">${m < 0 ? '−' : '+'}${horas(Math.abs(m))}</span>`
        conteudo().querySelector('.asd-resultado').innerHTML = `
            ${f.lancamentos.length ? `<div class="asd-alerta-gestor">✎ Este mês tem <b>${f.lancamentos.length}</b> intervenção(ões) do gestor — sinalizadas na folha e listadas abaixo com o motivo.${naoVistos ? ` <b>${naoVistos}</b> ainda não vista(s) pelo trabalhador (aparece no comprovativo da próxima marcação).` : ' Todas já vistas pelo trabalhador.'}</div>` : ''}
            <div class="asd-resumo-folha">
                <div><span>Funcionário</span><b>${esc(f.colaborador.nome)}</b><small>${esc(f.colaborador.funcao || '')}${f.colaborador.nif ? ` · NIF ${esc(f.colaborador.nif)}` : ''}</small></div>
                <div><span>Horas reais</span><b>${horas(r.minutos)}</b><small>previstas ${horas(r.esperados)}</small></div>
                <div><span>Saldo</span><b>${sinal(r.saldo)}</b><small>${r.horasDiarias}h por dia útil</small></div>
                <div><span>Dias trabalhados</span><b>${r.diasTrabalhados}</b><small>${r.diasUteis} dias úteis · ${r.diasAusencia} de ausência</small></div>
            </div>
            ${tabela(['Data', 'Dia', 'Entrada', 'Saída almoço', 'Retorno almoço', 'Saída', 'Horas', 'Diferença', ''],
                f.dias.map((d, di) => `<tr class="${d.fds ? 'asd-fds' : ''}${d.data === hojeIso ? ' asd-hoje' : ''}">
                    <td class="asd-mono">${dataPt(d.data).slice(0, 5)}</td><td>${esc(d.semana)}</td>
                    ${d.ausencia && !d.marcas.length ? `<td colspan="4"><span class="asd-gps asd-gps-azul">${esc(d.ausencia.rotulo)}</span>${d.ausencia.observacoes ? ` <small class="asd-sub" style="display:inline">${esc(d.ausencia.observacoes)}</small>` : ''}</td>`
                    : ['entrada', 'saida_almoco', 'retorno_almoco', 'saida'].map(t => `<td>${celula(d, di, t)}</td>`).join('')}
                    <td class="asd-mono">${d.marcas.length ? horas(d.minutos) : ''}${d.incompleto ? ' <span class="asd-gps asd-gps-aviso" title="Número ímpar de marcações">incompleto</span>' : ''}</td>
                    <td class="asd-mono">${sinal(d.diferenca)}</td>
                    <td class="asd-linha-acoes">${f.podeLancar && d.marcas.length < 4 && d.data <= hojeIso && (!d.fds || d.marcas.length) && !d.ausencia ? `<button type="button" data-esquecida="${d.data}" title="Lançar marcação esquecida">＋ Esquecimento</button>` : ''}</td></tr>`),
                'Sem dias.')}
            <section class="asd-bloco asd-intervencoes"><h3>✎ Intervenções do gestor neste mês</h3>${tabela(['Data', 'Hora', 'Tipo', 'Ação', 'Por', 'Quando', 'Motivo', 'Trabalhador'],
                f.lancamentos.map(l => `<tr><td class="asd-mono">${dataPt(l.data)}</td><td class="asd-mono">${esc(l.hora)}</td><td>${etiquetaTipo(l.tipo)}</td><td>${esc(ACOES_GESTOR[l.acao])}</td><td>${esc(l.autor)}</td><td class="asd-mono">${esc(l.momento)}</td><td>${esc(l.motivo)}</td><td>${l.visto_em ? `<span class="asd-gps asd-gps-ok">Visto ${esc(l.visto_em)}</span>` : '<span class="asd-gps asd-gps-aviso">Ainda não visto</span>'}</td></tr>`),
                'Nenhuma intervenção do gestor neste mês: todas as marcações são do próprio trabalhador.')}</section>`
    }
    function corrigirDaFolha(dia, i) {
        const d = folhaAtual.dias[dia], m = d.marcas[i]
        removerPopup(); formularioCorrecao({ id: m.id, nome: folhaAtual.colaborador.nome, tipo: m.tipo, data: d.data, hora: m.hora })
    }
    function excluirDaFolha(dia, i) {
        const d = folhaAtual.dias[dia], m = d.marcas[i]
        removerPopup(); formularioExclusao({ id: m.id, nome: folhaAtual.colaborador.nome, tipo: m.tipo, data: d.data, hora: m.hora })
    }

    const campoMotivo = '<textarea name="asd-motivo" rows="3" placeholder="Ex.: esqueceu de marcar o retorno do almoço" style="width:100%;box-sizing:border-box"></textarea>'
    const valor = nome => document.querySelector(`.painel-padrao [name="${nome}"]`)?.value?.trim() ?? ''
    function formularioMarcacao({ colaborador = '', data = hoje() } = {}) {
        popup({
            titulo: 'Lançar marcação esquecida', linhas: [
                { texto: 'Funcionário', elemento: `<select name="asd-colaborador">${opcoesEquipa(colaborador)}</select>` },
                { texto: 'Data', elemento: `<input type="date" name="asd-data" value="${esc(data)}" max="${hoje()}">` },
                { texto: 'Hora', elemento: '<input type="time" name="asd-hora">' },
                { texto: 'Motivo (obrigatório)', elemento: campoMotivo },
                { elemento: '<p class="asd-nota asd-nota-destaque">✎ A marcação fica sinalizada como <b>lançada pelo gestor</b> na folha e no PDF, com o seu nome e o motivo, e é mostrada ao trabalhador no comprovativo da próxima marcação. O tipo (entrada, almoço, saída) segue a ordem das marcações do dia.</p>' }
            ], botoes: [{ texto: 'Lançar', img: 'concluido', funcao: 'Assiduidade.salvarMarcacao()' }]
        })
    }
    async function salvarMarcacao() {
        try {
            await pedir('/registos', 'POST', { colaborador_id: valor('asd-colaborador'), data: valor('asd-data'), hora: valor('asd-hora'), motivo: valor('asd-motivo') })
            removerPopup(); abrir(aba)
        } catch (erro) { falha(erro) }
    }
    let emEdicao = null
    function formularioCorrecao(r) {
        emEdicao = r
        popup({
            titulo: 'Corrigir marcação', linhas: [
                { texto: 'Marcação', elemento: `<span>${esc(r.nome)} · ${esc(TIPOS[r.tipo] || '')} · ${dataPt(r.data)} ${esc(r.hora.slice(0, 5))}</span>` },
                { texto: 'Nova hora', elemento: `<input type="time" name="asd-hora" value="${esc(r.hora.slice(0, 5))}">` },
                { texto: 'Motivo (obrigatório)', elemento: campoMotivo }
            ], botoes: [{ texto: 'Guardar correção', img: 'concluido', funcao: 'Assiduidade.salvarCorrecao()' }]
        })
    }
    async function salvarCorrecao() {
        try {
            await pedir(`/registos/${encodeURIComponent(emEdicao.id)}`, 'PATCH', { hora: valor('asd-hora'), motivo: valor('asd-motivo') })
            removerPopup(); conteudo()?.querySelector('.asd-filtros')?.requestSubmit()
        } catch (erro) { falha(erro) }
    }
    function formularioExclusao(r) {
        emEdicao = r
        popup({
            titulo: 'Excluir marcação', linhas: [
                { texto: 'Marcação', elemento: `<span>${esc(r.nome)} · ${esc(TIPOS[r.tipo] || '')} · ${dataPt(r.data)} ${esc(r.hora.slice(0, 5))}</span>` },
                { texto: 'Motivo (obrigatório)', elemento: campoMotivo },
                { elemento: '<p class="asd-nota">A marcação excluída fica guardada no histórico de correções.</p>' }
            ], botoes: [{ texto: 'Excluir', img: 'cancel', funcao: 'Assiduidade.confirmarExclusao()' }]
        })
    }
    async function confirmarExclusao() {
        try {
            await pedir(`/registos/${encodeURIComponent(emEdicao.id)}`, 'DELETE', { motivo: valor('asd-motivo') })
            removerPopup(); conteudo()?.querySelector('.asd-filtros')?.requestSubmit()
        } catch (erro) { falha(erro) }
    }
    async function historicoCorrecoes(form) {
        const f = new FormData(form)
        const dados = await pedir(`/correcoes?inicio=${f.get('inicio')}&fim=${f.get('fim')}`)
        const acao = { criar: 'Lançou', alterar: 'Alterou', excluir: 'Excluiu' }
        const descr = c => c.acao === 'alterar' ? `${esc(c.antes?.hora?.slice(0, 5))} → ${esc(c.depois?.hora?.slice(0, 5))}`
            : c.acao === 'criar' ? `${dataPt(c.depois?.data)} ${esc(c.depois?.hora?.slice(0, 5))}` : `${esc(c.antes?.hora?.slice(0, 5))} (${dataPt([c.antes?.ano, String(c.antes?.mes).padStart(2, '0'), String(c.antes?.dia).padStart(2, '0')].join('-'))})`
        popup({
            titulo: 'Histórico de correções', elemento: `<div class="asd-popup-lista">${tabela(['Quando', 'Quem', 'Funcionário', 'Ação', 'Marcação', 'Motivo'],
                dados.items.map(c => `<tr><td class="asd-mono">${esc(c.momento)}</td><td>${esc(c.autor)}</td><td>${esc(c.nome)}</td><td>${acao[c.acao]}</td><td class="asd-mono">${descr(c)}</td><td>${esc(c.motivo)}</td></tr>`),
                'Nenhuma correção no período.')}</div>`
        })
    }

    // ---------- Horas trabalhadas ----------
    async function horasTrabalhadas() {
        await carregarEquipa()
        conteudo().innerHTML = cabecalho('Horas trabalhadas', 'Calculadas pelas marcações: (saída almoço − entrada) + (saída − retorno). Dias só com entrada e saída contam o intervalo inteiro.')
            + filtros() + '<div class="asd-resultado"></div>'
        const form = conteudo().querySelector('.asd-filtros')
        const listar = async () => {
            const dados = await pedir(`/horas?${lerFiltros(form)}`)
            if (!ativa('horas')) return
            const celula = (v, tipo) => v ? `<span class="asd-hora asd-tipo-${tipo}">${esc(v)}</span>` : '<span class="asd-falta">—</span>'
            conteudo().querySelector('.asd-resultado').innerHTML = tabela(['Funcionário', 'Data', 'Entrada', 'Saída almoço', 'Ret. almoço', 'Saída', 'Horas'],
                dados.items.map(l => `<tr><td><b>${esc(l.nome)}</b></td><td class="asd-mono">${dataPt(l.data)}</td><td>${celula(l.entrada, 'entrada')}</td><td>${celula(l.saida_almoco, 'saida_almoco')}</td><td>${celula(l.retorno_almoco, 'retorno_almoco')}</td><td>${celula(l.saida, 'saida')}</td><td class="asd-mono asd-direita"><b>${horas(l.minutos)}</b> h</td></tr>`),
                'Nenhuma marcação no período.')
                + (dados.items.length ? `<div class="asd-total">Total acumulado: <b>${horas(dados.totalMinutos)} h</b></div>` : '')
        }
        form.addEventListener('submit', e => { e.preventDefault(); listar().catch(falha) })
        conteudo().querySelector('[data-imprimir]').onclick = () => imprimir('Horas trabalhadas')
        await listar()
    }

    // ---------- Férias e ausências ----------
    async function ausencias() {
        await carregarEquipa()
        const fimAno = `${new Date().getFullYear()}-12-31`
        conteudo().innerHTML = cabecalho('Férias e ausências', 'Lançadas pelo gestor para a sua equipa. Os dias contam só os dias úteis (seg–sex).',
            '<button type="button" class="asd-primario" data-nova>＋ Lançar ausência</button>')
            + `<form class="asd-filtros"><label>Data inicial<input type="date" name="inicio" value="${inicioMes()}"></label><label>Data final<input type="date" name="fim" value="${fimAno}"></label><button type="submit" class="asd-primario">Filtrar</button><button type="button" data-imprimir>Imprimir / PDF</button></form>`
            + '<div class="asd-resultado"></div>'
        const form = conteudo().querySelector('.asd-filtros')
        let tipos = {}
        const listar = async () => {
            const dados = await pedir(`/ausencias?${lerFiltros(form)}`)
            if (!ativa('ausencias')) return
            tipos = dados.tipos; ultimaLista = dados.items
            const contagem = dados.items.reduce((acc, a) => (acc[a.tipo_rotulo] = (acc[a.tipo_rotulo] || 0) + a.dias, acc), {})
            conteudo().querySelector('.asd-resultado').innerHTML = `<div class="asd-resumo">${Object.entries(contagem).map(([t, d]) => `<span><b>${d}</b> dia(s) de ${esc(t.toLowerCase())}</span>`).join('') || '<span>Sem ausências no período.</span>'}</div>`
                + tabela(['Funcionário', 'Tipo', 'Período', 'Dias úteis', 'Observações', 'Lançado por', ''], dados.items.map((a, i) => `<tr><td><b>${esc(a.nome)}</b></td><td><span class="asd-gps asd-gps-azul">${esc(a.tipo_rotulo)}</span></td><td class="asd-mono">${dataPt(a.data_inicio)} – ${dataPt(a.data_fim)}</td><td class="asd-mono">${esc(a.dias)}</td><td>${esc(a.observacoes || '')}</td><td>${esc(a.criado_por)}<small class="asd-sub">${esc(a.criado_em)}</small></td><td class="asd-linha-acoes"><button type="button" data-cancelar="${i}">Cancelar</button></td></tr>`), 'Nenhuma ausência no período.')
        }
        form.addEventListener('submit', e => { e.preventDefault(); listar().catch(falha) })
        conteudo().querySelector('[data-imprimir]').onclick = () => imprimir('Férias e ausências')
        conteudo().querySelector('[data-nova]').onclick = () => popup({
            titulo: 'Lançar ausência', linhas: [
                { texto: 'Funcionário', elemento: `<select name="asd-colaborador">${opcoesEquipa('')}</select>` },
                { texto: 'Tipo', elemento: `<select name="asd-tipo">${Object.entries(tipos).map(([v, n]) => `<option value="${v}">${esc(n)}</option>`).join('')}</select>` },
                { texto: 'Início', elemento: `<input type="date" name="asd-inicio" value="${hoje()}">` },
                { texto: 'Fim', elemento: `<input type="date" name="asd-fim" value="${hoje()}">` },
                { texto: 'Observações', elemento: '<textarea name="asd-observacoes" rows="3" style="width:100%;box-sizing:border-box"></textarea>' }
            ], botoes: [{ texto: 'Lançar', img: 'concluido', funcao: 'Assiduidade.salvarAusencia()' }]
        })
        conteudo().querySelector('.asd-resultado').addEventListener('click', e => {
            const b = e.target.closest('[data-cancelar]'); if (!b) return
            emEdicao = ultimaLista[Number(b.dataset.cancelar)]
            popup({ titulo: 'Cancelar ausência', mensagem: `Cancelar ${esc(emEdicao.tipo_rotulo.toLowerCase())} de <b>${esc(emEdicao.nome)}</b> (${dataPt(emEdicao.data_inicio)} – ${dataPt(emEdicao.data_fim)})? Fica registado no histórico.`, botoes: [{ texto: 'Cancelar ausência', img: 'cancel', funcao: 'Assiduidade.cancelarAusencia()' }] })
        })
        await listar()
    }
    async function salvarAusencia() {
        try {
            await pedir('/ausencias', 'POST', { colaborador_id: valor('asd-colaborador'), tipo: valor('asd-tipo'), data_inicio: valor('asd-inicio'), data_fim: valor('asd-fim'), observacoes: valor('asd-observacoes') })
            removerPopup(); conteudo()?.querySelector('.asd-filtros')?.requestSubmit()
        } catch (erro) { falha(erro) }
    }
    async function cancelarAusencia() {
        try { await pedir(`/ausencias/${encodeURIComponent(emEdicao.id)}`, 'DELETE'); removerPopup(); conteudo()?.querySelector('.asd-filtros')?.requestSubmit() }
        catch (erro) { falha(erro) }
    }

    // ---------- Locais de trabalho (cercas virtuais) ----------
    async function telaLocais() {
        const dados = await carregarLocais(true)
        if (!ativa('locais')) return
        ultimaLista = dados.items
        conteudo().innerHTML = cabecalho('Locais de trabalho (cercas virtuais)', 'A marcação só é aceite dentro do raio de um local autorizado. Quem não tem locais alocados pode marcar em qualquer local ativo. A localização é sempre obrigatória; sem nenhum local cadastrado, ela é registada mas não limita onde se marca.',
            dados.podeEditar ? '<button type="button" class="asd-primario" data-novo>＋ Adicionar local</button>' : '')
            + `<div class="asd-resultado">${tabela(['Designação', 'Início do turno', 'Coordenadas', 'Raio', 'Alocados', ''],
                dados.items.map((l, i) => `<tr><td><b>${esc(l.nome)}</b></td><td><span class="asd-gps asd-gps-azul">🕗 ${esc(l.inicio_turno)}</span></td><td class="asd-mono">${Number(l.latitude).toFixed(6)}, ${Number(l.longitude).toFixed(6)}</td><td><span class="asd-gps asd-gps-azul">${esc(l.raio_m)} m</span></td><td>${l.alocados ? `${l.alocados} funcionário(s)` : 'Todos'}</td>
                    <td class="asd-linha-acoes">${linkMapa(l.latitude, l.longitude)}${dados.podeEditar ? `<button type="button" data-editar="${i}">Editar</button><button type="button" data-desativar="${i}">Desativar</button>` : ''}</td></tr>`),
                'Nenhum local cadastrado: as marcações registam a localização, mas ainda não há cerca que as limite.')}</div>`
        conteudo().querySelector('[data-novo]')?.addEventListener('click', () => formularioLocal())
        conteudo().querySelector('.asd-resultado').addEventListener('click', e => {
            const editar = e.target.closest('[data-editar]'), desativar = e.target.closest('[data-desativar]')
            if (editar) formularioLocal(ultimaLista[Number(editar.dataset.editar)])
            if (desativar) {
                emEdicao = ultimaLista[Number(desativar.dataset.desativar)]
                popup({ titulo: 'Desativar local', mensagem: `Desativar <b>${esc(emEdicao.nome)}</b>? As marcações antigas continuam associadas a ele.`, botoes: [{ texto: 'Desativar', img: 'cancel', funcao: 'Assiduidade.desativarLocal()' }] })
            }
        })
    }
    function formularioLocal(l = null) {
        emEdicao = l
        popup({
            titulo: l ? 'Editar local de trabalho' : 'Adicionar local de trabalho', linhas: [
                { texto: 'Designação', elemento: `<input name="asd-nome" maxlength="160" placeholder="Ex.: Obra - Rua do Ouro, 3" value="${esc(l?.nome || '')}">` },
                { texto: 'Coordenadas (latitude, longitude)', elemento: `<input name="asd-coordenadas" placeholder="38.656054, -9.027503" value="${l ? `${l.latitude}, ${l.longitude}` : ''}">` },
                { elemento: '<div class="asd-nota-acoes"><button type="button" onclick="Assiduidade.usarMinhaLocalizacao(this)">📍 Usar a minha localização atual</button><span class="asd-nota">No Google Maps, clique com o botão direito no local e copie as coordenadas.</span></div>' },
                { texto: 'Raio permitido (metros)', elemento: `<input type="number" name="asd-raio" min="20" max="5000" step="10" value="${l?.raio_m || 100}">` },
                { texto: 'Início do turno', elemento: `<input type="time" name="asd-turno" value="${esc(l?.inicio_turno || '08:00')}">` }
            ], botoes: [{ texto: 'Guardar', img: 'concluido', funcao: 'Assiduidade.salvarLocal()' }]
        })
    }
    function usarMinhaLocalizacao(botao) {
        if (!navigator.geolocation) return popup({ mensagem: 'Este aparelho não fornece localização.' })
        botao.disabled = true; botao.textContent = 'A obter localização…'
        navigator.geolocation.getCurrentPosition(p => {
            document.querySelector('.painel-padrao [name="asd-coordenadas"]').value = `${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`
            botao.disabled = false; botao.textContent = `📍 Localização obtida (precisão ${Math.round(p.coords.accuracy)} m)`
        }, () => { botao.disabled = false; botao.textContent = '📍 Não foi possível obter a localização' }, { enableHighAccuracy: true, timeout: 20000 })
    }
    async function salvarLocal() {
        try {
            const [latitude, longitude] = valor('asd-coordenadas').split(/[,;\s]+/).filter(Boolean).map(Number)
            const corpo = { nome: valor('asd-nome'), latitude, longitude, raio_m: Number(valor('asd-raio')), inicio_turno: valor('asd-turno') }
            await pedir(emEdicao ? `/locais/${emEdicao.id}` : '/locais', emEdicao ? 'PATCH' : 'POST', corpo)
            locais = null; removerPopup(); abrir('locais')
        } catch (erro) { falha(erro) }
    }
    async function desativarLocal() {
        try { await pedir(`/locais/${emEdicao.id}`, 'DELETE'); locais = null; removerPopup(); abrir('locais') }
        catch (erro) { falha(erro) }
    }

    // ---------- Funcionários (reconhecimento e alocação a locais) ----------
    async function funcionarios() {
        const [dados, lista] = await Promise.all([carregarEquipa(true), carregarLocais(true)])
        if (!ativa('funcionarios')) return
        ultimaLista = dados.items
        conteudo().innerHTML = cabecalho('Funcionários', 'Estado do reconhecimento facial (foto no cadastro) e locais onde cada um pode marcar. Para editar a ficha, use Colaboradores.')
            + `<form class="asd-filtros asd-busca" onsubmit="return false"><label>Pesquisar<input type="search" name="busca" placeholder="Nome, utilizador ou NIF"></label></form>`
            + `<div class="asd-resultado">${tabela(['Funcionário', 'NIF', 'Função', 'Reconhecimento', 'Estado', 'Locais autorizados', ''],
                dados.items.map((c, i) => `<tr data-busca="${esc(`${c.nome} ${c.usuario || ''} ${c.nif || ''}`.toLowerCase())}"><td><b>${esc(c.nome)}</b><small class="asd-sub">${esc(c.usuario || '')}</small></td><td class="asd-mono">${esc(c.nif || '—')}</td><td><span class="asd-funcao">${esc(c.funcao || '—')}</span></td>
                    <td>${c.facial ? '<span class="asd-gps asd-gps-ok">✓ Configurado</span>' : '<span class="asd-gps asd-gps-sem">Sem foto</span>'}</td>
                    <td>${c.ativo ? `<span class="asd-gps asd-gps-ok">${esc(c.estado || 'Ativo')}</span>` : '<span class="asd-gps asd-gps-erro">Bloqueado</span>'}</td>
                    <td>${c.locais.length ? c.locais.map(l => `<span class="asd-chip">${esc(l.nome)}</span>`).join('') : `<span class="asd-sub">${lista.items.length ? 'Todos os locais' : '—'}</span>`}</td>
                    <td class="asd-linha-acoes"><button type="button" data-alocar="${i}">📍 Alocar (${c.locais.length})</button></td></tr>`),
                'Nenhum funcionário na sua equipa.')}</div>`
        conteudo().querySelector('[name="busca"]').addEventListener('input', e => {
            const termo = e.target.value.trim().toLowerCase()
            conteudo().querySelectorAll('tr[data-busca]').forEach(tr => { tr.hidden = termo && !tr.dataset.busca.includes(termo) })
        })
        conteudo().querySelector('.asd-resultado').addEventListener('click', e => {
            const b = e.target.closest('[data-alocar]'); if (!b) return
            emEdicao = ultimaLista[Number(b.dataset.alocar)]
            const marcados = new Set(emEdicao.locais.map(l => l.id))
            popup({
                titulo: `Alocar · ${esc(emEdicao.nome)}`, linhas: [{
                    texto: 'Locais onde pode marcar (nenhum marcado = todos os locais ativos)',
                    elemento: lista.items.length ? `<div class="asd-checks">${lista.items.map(l => `<label><input type="checkbox" name="asd-local" value="${esc(l.id)}" ${marcados.has(l.id) ? 'checked' : ''}> ${esc(l.nome)} <small>(${esc(l.raio_m)} m)</small></label>`).join('')}</div>` : '<p class="asd-nota">Cadastre primeiro os locais de trabalho.</p>'
                }], botoes: lista.items.length ? [{ texto: 'Guardar', img: 'concluido', funcao: 'Assiduidade.salvarAlocacao()' }] : []
            })
        })
    }
    async function salvarAlocacao() {
        try {
            const ids = [...document.querySelectorAll('.painel-padrao [name="asd-local"]:checked')].map(c => c.value)
            await pedir(`/colaboradores/${encodeURIComponent(emEdicao.id)}/locais`, 'PUT', { locais: ids })
            removerPopup(); abrir('funcionarios')
        } catch (erro) { falha(erro) }
    }

    return { abrir, salvarMarcacao, salvarCorrecao, confirmarExclusao, corrigirDaFolha, excluirDaFolha, salvarAusencia, cancelarAusencia, salvarLocal, desativarLocal, usarMinhaLocalizacao, salvarAlocacao }
})()

// Atalhos do menu lateral (esquema_botoes.js chama funções globais sem argumentos).
function telaAssiduidade() { Assiduidade.abrir('painel') }
function telaAssiduidadeFolha() { Assiduidade.abrir('folha') }
function telaAssiduidadeRegistos() { Assiduidade.abrir('registos') }
function telaAssiduidadeHoras() { Assiduidade.abrir('horas') }
function telaAssiduidadeAusencias() { Assiduidade.abrir('ausencias') }
function telaAssiduidadeLocais() { Assiduidade.abrir('locais') }
function telaAssiduidadeFuncionarios() { Assiduidade.abrir('funcionarios') }
