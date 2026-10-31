// "O meu acesso": o que esta pessoa vê em cada módulo e quem vê o ponto dela (RECONST/SCRIPTS/acesso-resumo.js).
// Para a administração, "Ver como" mostra o mesmo resumo de outra pessoa (também a partir do Organizador Hierárquico).
const ESCADA_ACESSO = 'Diretor → Coordenador → Encarregado → Trabalhador'

async function pedirAcesso(caminho) {
    const resposta = await fetchAutenticado(`${api}/acesso${caminho}`, { headers: { Authorization: `Bearer ${acesso.token}` } })
    if (!resposta) throw new Error('Sessão encerrada.')
    const dados = await resposta.json().catch(() => ({}))
    if (!resposta.ok) throw new Error(dados.mensagem || (resposta.status === 404 ? 'Atualize o servidor para ver o resumo de acesso.' : `Falha (${resposta.status}).`))
    return dados
}

async function telaMeuAcesso(colaborador = '') {
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
    titulo.textContent = 'O meu acesso'
    tela.innerHTML = '<section class="acesso"><div class="acesso-vazio">A carregar…</div></section>'
    try {
        const r = await pedirAcesso(`/resumo${colaborador ? `?colaborador=${encodeURIComponent(colaborador)}` : ''}`)
        const eu = r.quem
        const pessoas = itens => itens.map(p => `<li><b>${esc(p.nome)}</b><small>${esc(p.funcao || '')}</small></li>`).join('')
        const cidades = itens => itens.map(c => `<li><b>${esc(c.nome)}</b><small>${esc(c.distrito || '')}</small></li>`).join('')
        const nomes = (lista, desenhar) => lista.itens.length
            ? `<details><summary>Ver ${lista.total === 1 ? 'o nome' : `os ${esc(lista.total)}`}</summary><ul>${desenhar(lista.itens)}</ul></details>` : ''
        // Um cartão por módulo: título, resposta curta em destaque, explicação da regra e a lista (fechada).
        const cartao = (icone, tituloCartao, resposta, explicacao, lista = '') => `<article class="acesso-cartao">
            <header><span class="acesso-icone" aria-hidden="true">${icone}</span><h3>${tituloCartao}</h3></header>
            <p class="acesso-resposta">${resposta}</p><p class="acesso-regra">${explicacao}</p>${lista}</article>`
        const contagem = (lista, singular, plural) => lista.itens.length ? `<b>${esc(lista.total)}</b> ${lista.total === 1 ? singular : plural}` : `<b>Ninguém</b>`
        const semModulo = 'Sem acesso a este módulo (a função Trabalhador só marca o próprio ponto).'

        const blocos = [
            cartao('🕒', 'Ponto — folhas que vê',
                !r.ponto ? semModulo : eu.administracao ? '<b>Toda a empresa</b>, incluindo a sua.' : contagem(r.ponto, 'pessoa', 'pessoas'),
                eu.administracao ? 'CEO e Diretor Programador veem o ponto de todos.'
                    : `Vê só o nível imediatamente abaixo do seu, na sua região (${ESCADA_ACESSO}). A sua própria folha não aparece: quem a vê é o seu superior.`,
                r.ponto && !eu.administracao ? nomes(r.ponto, pessoas) : ''),
            cartao('👤', 'Quem vê o seu ponto',
                r.quemVeOMeuPonto.length ? r.quemVeOMeuPonto.map(p => `<b>${esc(p.nome)}</b> <small>(${esc(p.funcao || '')})</small>`).join(', ') : '<b>Só a administração</b>',
                'O superior direto na hierarquia, e sempre a administração (CEO e Diretor Programador).'),
            cartao('👥', 'Colaboradores',
                !r.colaboradores ? semModulo : eu.leituraGlobal ? '<b>Todos</b> os colaboradores da empresa.' : contagem(r.colaboradores, 'pessoa', 'pessoas'),
                'Segue a hierarquia e a região definidas no Organizador Hierárquico.',
                r.colaboradores && !eu.leituraGlobal ? nomes(r.colaboradores, pessoas) : ''),
            cartao('📍', 'Cidades — orçamentos, obras, clientes, fornecedores e despesas',
                !r.cidades ? semModulo : eu.leituraGlobal ? '<b>Todas</b> as cidades.' : contagem(r.cidades, 'cidade', 'cidades'),
                'Só aparecem os registos destas cidades (pela cidade do cliente, do fornecedor ou da despesa).',
                r.cidades && !eu.leituraGlobal ? nomes(r.cidades, cidades) : ''),
            cartao('💬', 'Chat — pode conversar com',
                !r.chat ? semModulo : contagem(r.chat, 'pessoa', 'pessoas'),
                'Pessoas com quem a hierarquia permite trocar mensagens.',
                r.chat ? nomes(r.chat, pessoas) : '')
        ]

        // Administração: escolher outra pessoa para ver o acesso dela.
        let seletor = ''
        if (eu.administracao || r.verComo) {
            const { items = [] } = await pedirAcesso('/pessoas').catch(() => ({}))
            if (items.length) seletor = `<label class="acesso-ver-como">Ver como
                <select><option value="">— eu próprio —</option>${items.map(p => `<option value="${esc(p.id)}" ${p.id === eu.id && r.verComo ? 'selected' : ''}>${esc(p.nome)} · ${esc(p.funcao || '')}</option>`).join('')}</select></label>`
        }
        titulo.textContent = r.verComo ? `Acesso de ${eu.nome}` : 'O meu acesso'
        tela.innerHTML = `<section class="acesso">
            <header class="acesso-topo">
                <div><h2>${r.verComo ? `Acesso de ${esc(eu.nome)}` : 'O que pode ver'}</h2>
                    <p>${esc(eu.funcao || '')}${r.verComo ? ' · <span class="acesso-aviso">a ver como outra pessoa: é exatamente o que ela vê</span>' : ''}</p></div>
                ${seletor}
            </header>
            <div class="acesso-cartoes">${blocos.join('')}</div>
            <p class="acesso-nota">Este resumo é calculado com as mesmas regras que filtram os dados. Se algo não bater certo, verifique a posição da pessoa no Organizador Hierárquico.</p>
        </section>`
        tela.querySelector('.acesso-ver-como select')?.addEventListener('change', e => telaMeuAcesso(e.target.value))
    } catch (erro) {
        tela.innerHTML = `<section class="acesso"><div class="acesso-vazio">${esc(erro.message)}</div></section>`
    }
}
