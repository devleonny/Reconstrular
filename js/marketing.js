// Marketing: ligar a conta de Instagram da empresa, criar vagas de parceiros (imagem gerada no servidor),
// publicar direto no Instagram e acompanhar as métricas de cada publicação.
const Marketing = (() => {
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
    const estado = { conta: null, publicacoes: [], editando: null, ultimaGerada: '' }
    const ESTADOS = { rascunho: 'Rascunho', a_publicar: 'A publicar…', publicada: 'Publicada', erro: 'Erro ao publicar' }
    const METRICAS = [['views', 'Visualizações'], ['reach', 'Alcance'], ['likes', 'Gostos'], ['comments', 'Comentários'], ['saved', 'Guardados'], ['shares', 'Partilhas']]
    const IG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg>'

    async function pedir(caminho, metodo = 'GET', corpo) {
        const resposta = await fetchAutenticado(`${api}/marketing${caminho}`, {
            method: metodo,
            headers: { Authorization: `Bearer ${acesso.token}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
            ...(corpo ? { body: JSON.stringify(corpo) } : {})
        })
        if (!resposta) throw new Error('Sessão encerrada.')
        const dados = await resposta.json().catch(() => ({}))
        if (!resposta.ok) throw new Error(dados?.mensagem || (resposta.status === 404 ? 'O Marketing ainda não está disponível no servidor.' : `Falha (${resposta.status}).`))
        return dados
    }
    const falha = erro => { removerOverlay(); popup({ titulo: 'Marketing', mensagem: esc(erro.message) }) }
    const data = v => v ? new Date(v).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
    const numero = v => Number(v || 0).toLocaleString('pt-PT')

    // ---------- Tela principal ----------
    async function tela() {
        try {
            overlayAguarde()
            document.querySelector('[name="titulo"]').textContent = 'Marketing'
            const [conta, publicacoes] = await Promise.all([pedir('/instagram/conta'), pedir('/publicacoes')])
            estado.conta = conta
            estado.publicacoes = publicacoes
            tela_render()
        } catch (erro) { falha(erro) } finally { removerOverlay() }
    }

    function cartaoConta() {
        const { configurado, conta } = estado.conta || {}
        if (!configurado) return `
            <section class="mkt-conta mkt-conta-aviso">
                <div class="mkt-conta-icone">${IG}</div>
                <div><b>Instagram ainda não configurado no servidor</b>
                <p>Falta indicar no servidor o ID e a chave secreta da app de Instagram (Meta for Developers). Fale com o suporte.</p></div>
            </section>`
        if (!conta) return `
            <section class="mkt-conta">
                <div class="mkt-conta-icone">${IG}</div>
                <div class="mkt-conta-texto"><b>Ligue a conta do Instagram da empresa</b>
                <p>Clique no botão, entre no Instagram e carregue em <b>Permitir</b>. Depois disso, as publicações saem daqui diretamente.</p></div>
                <button type="button" class="mkt-botao-ig" onclick="Marketing.ligar()">${IG}<span>Ligar Instagram</span></button>
            </section>`
        return `
            <section class="mkt-conta mkt-conta-ligada">
                ${conta.foto ? `<img class="mkt-avatar" src="${esc(conta.foto)}" alt="">` : `<div class="mkt-conta-icone">${IG}</div>`}
                <div class="mkt-conta-texto"><b>@${esc(conta.username)}</b>
                <p>Instagram ligado${conta.ligado_por ? ` por ${esc(conta.ligado_por)}` : ''} em ${esc(data(conta.ligado_em))}.</p></div>
                <span class="mkt-etiqueta mkt-ok">Ligada</span>
                <button type="button" class="mkt-botao-sec" onclick="Marketing.desligar()">Desligar</button>
            </section>`
    }

    function cartaoPublicacao(p) {
        const d = p.dados || {}
        const m = p.metricas || {}
        const metricas = p.estado === 'publicada'
            ? `<div class="mkt-metricas">${METRICAS.filter(([k]) => m[k] !== undefined).map(([k, n]) => `<span><b>${numero(m[k])}</b><small>${n}</small></span>`).join('')
            || '<small class="mkt-cinza">As métricas aparecem algumas horas depois de publicar.</small>'}</div>
               ${p.metricas_em ? `<small class="mkt-cinza">Atualizadas em ${esc(data(p.metricas_em))}</small>` : ''}`
            : ''
        const acoes = p.estado === 'publicada'
            ? `${p.permalink ? `<a class="mkt-botao-sec" href="${esc(p.permalink)}" target="_blank" rel="noopener">Ver no Instagram</a>` : ''}
               <button type="button" class="mkt-botao-sec" onclick="Marketing.metricas('${p.id}')">Atualizar métricas</button>`
            : `<button type="button" class="mkt-botao-sec" onclick="Marketing.editar('${p.id}')">Editar</button>
               <button type="button" class="mkt-botao-sec mkt-perigo" onclick="Marketing.eliminar('${p.id}')">Eliminar</button>`
        return `
            <article class="mkt-pub">
                ${p.imagem ? `<img src="${esc(p.imagem)}" alt="Imagem da vaga" loading="lazy" onclick="Marketing.editar('${p.id}')">` : '<div class="mkt-pub-sem"></div>'}
                <div class="mkt-pub-corpo">
                    <div class="mkt-pub-topo"><b>${esc(d.especialidade || 'Sem título')}</b><span class="mkt-etiqueta mkt-${esc(p.estado)}">${esc(ESTADOS[p.estado] || p.estado)}</span></div>
                    ${d.zona ? `<small class="mkt-cinza">${esc(d.zona)}</small>` : ''}
                    ${p.estado === 'erro' && p.erro ? `<small class="mkt-erro">${esc(p.erro)}</small>` : ''}
                    <small class="mkt-cinza">${p.publicado_em ? `Publicada em ${esc(data(p.publicado_em))}` : `Criada em ${esc(data(p.criado_em))}`}</small>
                    ${metricas}
                    <div class="mkt-pub-acoes">${acoes}</div>
                </div>
            </article>`
    }

    function tela_render() {
        const pubs = estado.publicacoes
        const publicadas = pubs.filter(p => p.estado === 'publicada')
        const soma = k => publicadas.reduce((s, p) => s + Number(p.metricas?.[k] || 0), 0)
        tela.innerHTML = `
            <div class="mkt">
                ${cartaoConta()}
                <div class="mkt-barra">
                    <button type="button" class="mkt-botao" onclick="Marketing.nova()">+ Nova vaga de parceiro</button>
                    ${publicadas.length ? `<button type="button" class="mkt-botao-sec" onclick="Marketing.metricas()">Atualizar métricas</button>` : ''}
                    ${publicadas.length ? `<div class="mkt-resumo"><span><b>${publicadas.length}</b> publicadas</span><span><b>${numero(soma('views') || soma('reach'))}</b> ${soma('views') ? 'visualizações' : 'alcance'}</span><span><b>${numero(soma('likes'))}</b> gostos</span></div>` : ''}
                </div>
                ${pubs.length ? `<div class="mkt-lista">${pubs.map(cartaoPublicacao).join('')}</div>`
                : '<p class="mkt-vazio">Ainda não há publicações. Crie a primeira vaga de parceiro.</p>'}
            </div>`
    }

    // ---------- Ligar / desligar conta ----------
    let janelaLigacao = null, vigia = null
    async function ligar() {
        // A janela abre já no clique (os navegadores bloqueiam janelas abertas depois de um pedido ao servidor).
        janelaLigacao = window.open('', 'instagram-ligacao', 'width=520,height=720')
        try {
            const { url } = await pedir('/instagram/ligar')
            if (janelaLigacao && !janelaLigacao.closed) janelaLigacao.location.href = url
            else window.location.href = url
            clearInterval(vigia)
            vigia = setInterval(() => { if (!janelaLigacao || janelaLigacao.closed) { clearInterval(vigia); tela() } }, 1000)
        } catch (erro) { janelaLigacao?.close(); falha(erro) }
    }
    window.addEventListener('message', evento => {
        if (evento.data?.tipo !== 'instagram-ligacao') return
        clearInterval(vigia)
        if (document.querySelector('.mkt')) tela()
        if (evento.data.ok) balaoNotificacao({ imagem: 'imagens/concluido.png', usuario: 'Instagram', status: 'Conta ligada com sucesso', tempo: 6 })
    })

    function desligar() {
        popup({
            titulo: 'Desligar Instagram',
            mensagem: 'O Reconstrular deixa de poder publicar e de ler as métricas desta conta. As publicações já feitas continuam no Instagram.',
            botoes: [{ texto: 'Desligar', img: 'cancel', funcao: 'Marketing.confirmarDesligar()', fechar: true }]
        })
    }
    async function confirmarDesligar() {
        try { await pedir('/instagram/conta', 'DELETE'); await tela() } catch (erro) { falha(erro) }
    }

    // ---------- Editor da vaga ----------
    function legendaPadrao(d) {
        const tag = String(d.especialidade || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]/g, '').toLowerCase()
        const requisitos = String(d.requisitos || '').split('\n').map(l => l.replace(/^[-•*\s]+/, '').trim()).filter(Boolean)
        return [
            `🔨 Procuramos parceiros: ${d.especialidade || ''}`,
            d.zona ? `📍 ${d.zona}` : '',
            d.descricao ? `\n${d.descricao}` : '',
            requisitos.length ? `\n${requisitos.map(r => `✅ ${r}`).join('\n')}` : '',
            `\n📩 Candidate-se: ${d.contacto || 'envie-nos mensagem'}`,
            `\n#reconstrular #obras #remodelacao #parceiros #trabalho #portugal${tag ? ` #${tag}` : ''}`
        ].filter(Boolean).join('\n')
    }

    function nova() { editor(null) }
    function editar(id) {
        const p = estado.publicacoes.find(x => x.id === id)
        if (!p) return
        if (p.estado === 'publicada') { if (p.permalink) window.open(p.permalink, '_blank', 'noopener'); return }
        editor(p)
    }

    async function editor(p) {
        if (!estado.conta) return tela().then(() => estado.conta && editor(p))
        if (!especialidades) {
            try { especialidades = (await pesquisarDB({ base: 'especialidades' }))?.resultados || [] } catch { especialidades = [] }
        }
        estado.editando = p ? { ...p } : null
        const d = p?.dados || {}
        const legendaManual = p && p.legenda && p.legenda !== legendaPadrao(d)
        estado.ultimaGerada = p ? JSON.stringify({ dados: d, legenda: p.legenda }) : ''
        document.querySelector('[name="titulo"]').textContent = 'Marketing · Vaga de parceiro'
        const campo = (rotulo, html, ajuda = '') => `<label class="mkt-campo"><span>${rotulo}</span>${html}${ajuda ? `<small>${ajuda}</small>` : ''}</label>`
        const nomes = [...new Set((especialidades || []).map(e => e.nome).filter(Boolean))].sort((a, b) => a.localeCompare(b))
        tela.innerHTML = `
            <div class="mkt mkt-editor">
                <button type="button" class="mkt-voltar" onclick="Marketing.tela()">← Voltar às publicações</button>
                <div class="mkt-editor-grade">
                    <form class="mkt-form" oninput="Marketing.alterado(this)" onsubmit="event.preventDefault()">
                        ${campo('Especialidade *', `<input name="especialidade" list="mkt-especialidades" maxlength="60" value="${esc(d.especialidade)}" placeholder="Ex.: Canalizador" required>
                            <datalist id="mkt-especialidades">${nomes.map(n => `<option value="${esc(n)}">`).join('')}</datalist>`)}
                        ${campo('Zona', `<input name="zona" maxlength="80" value="${esc(d.zona)}" placeholder="Ex.: Setúbal e Lisboa">`)}
                        ${campo('Descrição', `<textarea name="descricao" rows="2" maxlength="260" placeholder="Uma frase sobre o trabalho">${esc(d.descricao)}</textarea>`)}
                        ${campo('Requisitos', `<textarea name="requisitos" rows="4" maxlength="600" placeholder="Um por linha (até 5 aparecem na imagem)">${esc(d.requisitos)}</textarea>`)}
                        ${campo('Contacto para candidatura', `<input name="contacto" maxlength="80" value="${esc(d.contacto)}" placeholder="Telefone, e-mail ou 'Envie-nos mensagem'">`)}
                        ${campo('Legenda do Instagram', `<textarea name="legenda" rows="9" maxlength="2200" data-manual="${legendaManual ? 1 : 0}">${esc(p?.legenda || legendaPadrao(d))}</textarea>`,
                            'Preenchida automaticamente; pode editar à vontade.')}
                    </form>
                    <div class="mkt-previa">
                        <div class="mkt-previa-imagem">${p?.imagem ? `<img src="${esc(p.imagem)}" alt="Pré-visualização">` : '<p>Carregue em <b>Gerar pré-visualização</b> para ver a imagem que vai ser publicada.</p>'}</div>
                        <div class="mkt-previa-acoes">
                            <button type="button" class="mkt-botao-sec" onclick="Marketing.gerar()">Gerar pré-visualização</button>
                            <button type="button" class="mkt-botao-ig" onclick="Marketing.publicar()" ${estado.conta?.conta ? '' : 'disabled title="Ligue primeiro o Instagram"'}>${IG}<span>Publicar no Instagram</span></button>
                        </div>
                        ${estado.conta?.conta ? `<small class="mkt-cinza">Vai ser publicada em @${esc(estado.conta.conta.username)}.</small>` : '<small class="mkt-erro">Ligue a conta do Instagram na página de Marketing para poder publicar.</small>'}
                    </div>
                </div>
            </div>`
    }

    function lerForm() {
        const f = document.querySelector('.mkt-form')
        const v = n => f.querySelector(`[name="${n}"]`).value.trim()
        return { dados: { especialidade: v('especialidade'), zona: v('zona'), descricao: v('descricao'), requisitos: v('requisitos'), contacto: v('contacto') }, legenda: v('legenda') }
    }

    // A legenda acompanha os campos até a pessoa a editar à mão.
    function alterado(form) {
        const legenda = form.querySelector('[name="legenda"]')
        if (document.activeElement === legenda) { legenda.dataset.manual = '1'; return }
        if (legenda.dataset.manual !== '1') legenda.value = legendaPadrao(lerForm().dados)
    }

    async function guardar() {
        const corpo = lerForm()
        if (!corpo.dados.especialidade) throw new Error('Indique a especialidade da vaga.')
        const chave = JSON.stringify(corpo)
        if (estado.editando && chave === estado.ultimaGerada) return estado.editando
        const p = await pedir('/publicacoes', 'POST', { ...corpo, id: estado.editando?.id })
        estado.editando = p
        estado.ultimaGerada = chave
        const imagem = document.querySelector('.mkt-previa-imagem')
        if (imagem) imagem.innerHTML = `<img src="${esc(p.imagem)}" alt="Pré-visualização">`
        return p
    }

    async function gerar() {
        try { overlayAguarde(); await guardar() } catch (erro) { falha(erro) } finally { removerOverlay() }
    }

    async function publicar() {
        try {
            overlayAguarde()
            const p = await guardar()
            removerOverlay()
            popup({
                titulo: 'Publicar no Instagram',
                elemento: `<div class="mkt-confirmar"><img src="${esc(p.imagem)}" alt=""><p>Publicar esta vaga em <b>@${esc(estado.conta?.conta?.username)}</b>? Depois de publicada já não pode ser alterada aqui.</p></div>`,
                botoes: [{ texto: 'Publicar agora', img: 'concluido', funcao: `Marketing.confirmarPublicar('${p.id}')`, fechar: true }]
            })
        } catch (erro) { falha(erro) }
    }

    async function confirmarPublicar(id) {
        try {
            overlayAguarde()
            await pedir(`/publicacoes/${id}/publicar`, 'POST')
            balaoNotificacao({ imagem: 'imagens/concluido.png', usuario: 'Instagram', status: 'Vaga publicada com sucesso', tempo: 6 })
            await tela()
        } catch (erro) { await tela(); falha(erro) } finally { removerOverlay() }
    }

    function eliminar(id) {
        popup({
            titulo: 'Eliminar rascunho',
            mensagem: 'Eliminar esta publicação? Esta ação não pode ser desfeita.',
            botoes: [{ texto: 'Eliminar', img: 'cancel', funcao: `Marketing.confirmarEliminar('${id}')`, fechar: true }]
        })
    }
    async function confirmarEliminar(id) {
        try { await pedir(`/publicacoes/${id}`, 'DELETE'); await tela() } catch (erro) { falha(erro) }
    }

    async function metricas(id) {
        try {
            overlayAguarde()
            estado.publicacoes = await pedir('/publicacoes/metricas', 'POST', id ? { id } : {})
            tela_render()
        } catch (erro) { falha(erro) } finally { removerOverlay() }
    }

    return { tela, ligar, desligar, confirmarDesligar, nova, editar, alterado, gerar, publicar, confirmarPublicar, eliminar, confirmarEliminar, metricas }
})()

function telaMarketing() { return Marketing.tela() }
function novaVagaParceiro() { return Marketing.nova() }
