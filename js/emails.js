/* Contrato de API e implantação: EMAILS_BACKEND.md. Sem credenciais Brevo no navegador. */
(() => {
    const folders = { inbox:'Caixa de entrada', starred:'Favoritos', sent:'Enviados', drafts:'Rascunhos', archive:'Arquivo', spam:'Spam', trash:'Lixeira' };
    const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const address = value => typeof value === 'string' ? value : value?.email || '';
    const addresses = values => (values || []).map(address).join(', ');
    // Situação de envio/entrega gravada pelo servidor (email-api / email-worker).
    const statusTexto = { draft:'Rascunho', queued:'Na fila de envio', sending:'Enviando…', sent:'Enviado', delivered:'Entregue',
        deferred:'Entrega adiada (nova tentativa)', bounced:'Devolvido: endereço não aceitou', blocked:'Bloqueado pelo provedor',
        spam:'Marcado como spam', error:'Falha no envio', received:'Recebido' };
    const status = value => statusTexto[value] || value || '';
    // Motivo da falha gravado pelo email-worker (error) e, quando houver, a resposta da Brevo (providerError).
    const motivoFalha = m => {
        const http = /^provider_http_(\d+)$/.exec(m.error || '')?.[1];
        const base = m.error === 'invalid_attachment_content' ? 'Um anexo está vazio ou corrompido.'
            : m.error === 'provider_uncertain' ? 'Sem resposta confirmada da Brevo; a mensagem não foi reenviada para evitar duplicidade.'
            : http === '401' ? 'A Brevo recusou a chave de API (BREVO_API_KEY inválida ou revogada).'
            : http === '400' ? 'A Brevo recusou a mensagem (remetente não verificado ou dados inválidos).'
            : http === '403' ? 'A Brevo bloqueou o envio (conta ou remetente sem permissão).'
            : http ? `A Brevo recusou o envio (HTTP ${http}).` : 'Falha no envio.';
        const detalhe = m.providerError?.message || m.providerError?.code;
        return detalhe ? `${base} Brevo: ${detalhe}` : base;
    };
    const date = value => value && !isNaN(Date.parse(value)) ? new Date(value).toLocaleString('pt-BR') : '';
    // Editor de mensagem: só estas tags sobrevivem à colagem e ao rascunho; o servidor repete a limpeza (email-html.js).
    const TAGS_EDITOR = new Set(['P','DIV','BR','SPAN','B','STRONG','I','EM','U','S','STRIKE','UL','OL','LI','BLOCKQUOTE','A','H1','H2','H3','HR']);
    const DESCARTAR_EDITOR = new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','TEMPLATE','SVG','MATH','HEAD','TITLE','META','LINK','NOSCRIPT']);
    function limparHtml(html, manterEstilo) {
        const origem = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html').body;
        const saida = document.createElement('div');
        const copiar = (de, para) => {
            for (const no of de.childNodes) {
                if (no.nodeType === Node.TEXT_NODE) { para.append(no.textContent); continue; }
                const tag = no.nodeType === Node.ELEMENT_NODE ? no.tagName.toUpperCase() : '';
                if (!tag || DESCARTAR_EDITOR.has(tag)) continue;
                if (!TAGS_EDITOR.has(tag)) { copiar(no, para); continue; } // desembrulha, mantendo o texto
                const el = document.createElement(tag.toLowerCase());
                if (manterEstilo && no.getAttribute('style')) el.setAttribute('style', no.getAttribute('style'));
                const href = tag === 'A' ? no.getAttribute('href') || '' : '';
                if (/^(https?:\/\/|mailto:)/i.test(href)) el.setAttribute('href', href);
                copiar(no, el); para.append(el);
            }
        };
        copiar(origem, saida);
        return saida.innerHTML;
    }
    const textoHtml = texto => escape(texto).replace(/\r?\n/g, '<br>');
    const svg = d => `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
    const FERRAMENTAS = [
        [['undo','Desfazer (Ctrl+Z)',svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>')], ['redo','Refazer (Ctrl+Y)',svg('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>')]],
        ['tamanho'],
        [['bold','Negrito (Ctrl+B)','<b>N</b>'], ['italic','Itálico (Ctrl+I)','<i>I</i>'], ['underline','Sublinhado (Ctrl+U)','<u>S</u>'], ['strikeThrough','Tachado','<s>T</s>']],
        ['cores'],
        [['justifyLeft','Alinhar à esquerda',svg('<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>')], ['justifyCenter','Centralizar',svg('<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>')], ['justifyRight','Alinhar à direita',svg('<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>')]],
        [['insertUnorderedList','Lista com marcadores',svg('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="3.2"/>')], ['insertOrderedList','Lista numerada',svg('<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 4.5h1.2V9M3.8 9h2.6M3.8 14.2c.2-.8.8-1.2 1.4-1.2.7 0 1.2.5 1.2 1.1 0 1.1-2.6 1.9-2.6 3.4h2.7" stroke-width="1.5"/>')], ['outdent','Diminuir recuo',svg('<path d="M11 6h9M11 12h9M11 18h9M4 6h3M4 18h3"/><path d="m8 9-3 3 3 3"/>')], ['indent','Aumentar recuo',svg('<path d="M11 6h9M11 12h9M11 18h9M4 6h3M4 18h3"/><path d="m5 9 3 3-3 3"/>')]],
        [['blockquote','Citação',svg('<path d="M6 17c2-1 3-3 3-5V7H5v5h4M15 17c2-1 3-3 3-5V7h-4v5h4"/>')], ['link','Inserir link',svg('<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 1 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 1 0 5.66 5.66l1-1"/>')], ['unlink','Remover link',svg('<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 1 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 1 0 5.66 5.66l1-1"/><path d="m4 4 16 16"/>')], ['insertHorizontalRule','Linha divisória',svg('<path d="M4 12h16"/><path d="M8 7h8M8 17h8" stroke-width="1.2" opacity=".5"/>')], ['removeFormat','Limpar formatação',svg('<path d="M6 5h12M12 5l-3.5 14"/><path d="m15 14 5 5m0-5-5 5"/>')]]
    ];
    const ESTADOS_EDITOR = ['bold','italic','underline','strikeThrough','justifyLeft','justifyCenter','justifyRight','insertUnorderedList','insertOrderedList'];
    function editorHtml() {
        const grupos = FERRAMENTAS.map(grupo => {
            if (grupo[0] === 'tamanho') return `<select data-tamanho aria-label="Tamanho do texto" title="Tamanho do texto"><option value="2">Pequeno</option><option value="3" selected>Normal</option><option value="5">Grande</option><option value="6">Título</option></select>`;
            if (grupo[0] === 'cores') return `<label class="em-cor" title="Cor do texto"><span class="em-cor-a">A</span><input type="color" data-cor="foreColor" value="#c53030" aria-label="Cor do texto"></label><label class="em-cor" title="Cor de destaque"><span class="em-cor-marca">${svg('<path d="m9 11-5 5v4h4l5-5"/><path d="m13 7 4 4"/><path d="M11 9l5-5 4 4-5 5z"/>')}</span><input type="color" data-cor="hiliteColor" value="#fff59d" aria-label="Cor de destaque"></label>`;
            return grupo.map(([cmd, titulo, icone]) => `<button type="button" data-cmd="${cmd}" title="${titulo}" aria-label="${titulo}">${icone}</button>`).join('');
        });
        return `<div class="em-editor-campo"><span class="em-dest-rotulo">Mensagem</span><div class="em-editor"><div class="em-toolbar" role="toolbar" aria-label="Formatação">${grupos.map(g => `<div class="em-toolbar-grupo">${g}</div>`).join('')}</div><div class="em-link-bar" hidden><input type="text" data-link-url placeholder="https://site.com ou nome@email.com" aria-label="Endereço do link"><button type="button" data-link-ok class="em-primary">Aplicar</button><button type="button" data-link-cancelar>Cancelar</button></div><div class="em-editor-area" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Mensagem"></div></div><div class="em-assinatura-titulo">Assinatura incluída automaticamente no envio</div><div class="em-assinatura-previa" aria-label="Prévia da assinatura">Carregando assinatura…</div></div>`;
    }
    let assinaturaCache = null;
    // Liga a barra de ferramentas ao editor; devolve leitores do conteúdo para o salvamento.
    function montarEditor(form, draft, { notice, ocupado }) {
        const area = form.querySelector('.em-editor-area'), barra = form.querySelector('.em-toolbar');
        const linkBar = form.querySelector('.em-link-bar'), linkUrl = form.querySelector('[data-link-url]');
        area.innerHTML = draft.html ? limparHtml(draft.html, true) : textoHtml(draft.text || '');
        try { document.execCommand('styleWithCSS', false, true); document.execCommand('defaultParagraphSeparator', false, 'div'); } catch {}
        let faixa = null;
        const guardar = () => { const s = getSelection(); if (s.rangeCount && area.contains(s.anchorNode)) faixa = s.getRangeAt(0).cloneRange(); };
        const restaurar = () => { area.focus(); if (faixa) { const s = getSelection(); s.removeAllRanges(); s.addRange(faixa); } };
        const executar = (cmd, valor = null) => { restaurar(); document.execCommand(cmd, false, valor); guardar(); atualizar(); area.dispatchEvent(new Event('input', { bubbles: true })); };
        const atualizar = () => {
            if (!form.isConnected) { document.removeEventListener('selectionchange', aoSelecionar); return; }
            for (const cmd of ESTADOS_EDITOR) {
                let ativo = false; try { ativo = document.queryCommandState(cmd); } catch {}
                barra.querySelector(`[data-cmd="${cmd}"]`)?.setAttribute('aria-pressed', String(ativo));
            }
        };
        const aoSelecionar = () => { if (area.contains(getSelection().anchorNode)) { guardar(); atualizar(); } };
        document.addEventListener('selectionchange', aoSelecionar);
        // mousedown sem foco: a seleção do texto continua no editor ao clicar nos botões.
        barra.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
        barra.addEventListener('click', e => {
            const cmd = e.target.closest('[data-cmd]')?.dataset.cmd; if (!cmd || ocupado()) return;
            if (cmd === 'link') { linkBar.hidden = false; linkUrl.value = ''; linkUrl.focus(); return; }
            if (cmd === 'blockquote') return executar('formatBlock', document.queryCommandValue('formatBlock') === 'blockquote' ? 'div' : 'blockquote');
            executar(cmd);
        });
        barra.querySelector('[data-tamanho]').addEventListener('change', e => { executar('fontSize', e.target.value); e.target.value = '3'; });
        barra.querySelectorAll('[data-cor]').forEach(cor => cor.addEventListener('input', () => executar(cor.dataset.cor, cor.value)));
        const aplicarLink = () => {
            let url = linkUrl.value.trim(); linkBar.hidden = true;
            if (!url) return restaurar();
            url = /^(https?:\/\/|mailto:)/i.test(url) ? url : emailValido(url) ? `mailto:${url}` : `https://${url}`;
            if (!faixa || faixa.collapsed) { restaurar(); document.execCommand('insertHTML', false, `<a href="${escape(url)}">${escape(url.replace(/^mailto:/i, ''))}</a>`); area.dispatchEvent(new Event('input', { bubbles: true })); }
            else executar('createLink', url);
        };
        form.querySelector('[data-link-ok]').addEventListener('click', aplicarLink);
        form.querySelector('[data-link-cancelar]').addEventListener('click', () => { linkBar.hidden = true; restaurar(); });
        linkUrl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); aplicarLink(); } else if (e.key === 'Escape') { linkBar.hidden = true; restaurar(); } });
        // Colagem entra limpa (sem fontes, classes e scripts de outros programas); arquivos soltos não viram imagem embutida.
        area.addEventListener('paste', e => {
            const html = e.clipboardData?.getData('text/html'), texto = e.clipboardData?.getData('text/plain');
            e.preventDefault();
            if (html || texto) document.execCommand('insertHTML', false, html ? limparHtml(html, false) : textoHtml(texto));
        });
        area.addEventListener('drop', e => { if (e.dataTransfer?.files?.length) { e.preventDefault(); notice('Para enviar arquivos, use o campo Anexos.'); } });
        // Assinatura obrigatória: prévia do cartão que o servidor monta com os dados do seu cadastro.
        const previa = form.querySelector('.em-assinatura-previa');
        (assinaturaCache ||= request('/signature').catch(erro => { assinaturaCache = null; throw erro; }))
            .then(a => { if (form.isConnected) previa.innerHTML = a?.html || 'Assinatura vazia: confira nome e função no seu cadastro.'; })
            .catch(erro => { if (form.isConnected) { previa.classList.add('em-assinatura-erro'); previa.textContent = `Prévia indisponível: ${erro.message}`; } });
        return {
            html: () => limparHtml(area.innerHTML, true),
            texto: () => area.innerText.replace(/\n{3,}/g, '\n\n').trim(),
            focar: () => area.focus()
        };
    }
    async function request(path, method = 'GET', data) {
        const { token } = JSON.parse(localStorage.getItem('acesso') || '{}');
        if (!token) throw new Error('Entre novamente para acessar seus e-mails.');
        const multipart = data instanceof FormData;
        const response = await fetchAutenticado(`${api}/emails${path}`, {
            method, headers: { Authorization:`Bearer ${token}`, ...(!multipart && data ? {'Content-Type':'application/json'} : {}) },
            ...(data ? {body:multipart ? data : JSON.stringify(data)} : {})
        });
        if (!response) throw new Error('Sessão encerrada.');
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            // Motivo do servidor primeiro; o aviso genérico vale só para 404/501 sem explicação (rota inexistente).
            const motivo = error.message || error.mensagem || error.erro;
            throw new Error(motivo || (response.status === 404 || response.status === 501 ? 'Esta função de e-mail não existe no servidor. Atualize o backend (git pull) e reinicie (pm2 restart server).' : `Falha no serviço (${response.status}).`));
        }
        return response.status === 204 ? null : response.json();
    }
    window.telaEmails = async function () {
        titulo.textContent = 'E-mails';
        tela.innerHTML = `<section class="emails" aria-label="E-mails"><div class="em-shell">
            <div class="em-top"><div class="em-account">${iconeMenu('carta')}<span class="em-identity">Carregando sua conta…</span></div><div class="em-notice" role="status" aria-live="polite"></div></div>
            <aside class="em-sidebar"><button class="em-primary" data-new disabled>＋ Escrever e-mail</button><nav class="em-folders" aria-label="Pastas de e-mail">${Object.entries(folders).map(([key,name]) => `<button data-folder="${key}" aria-current="${key === 'inbox'}">${name}</button>`).join('')}</nav></aside>
            <div class="em-column"><form class="em-tools em-search" role="search"><div class="em-query"><input name="q" aria-label="Pesquisar e-mails" placeholder="Pesquisar nesta pasta…" maxlength="200"><button type="submit" data-refresh aria-label="Pesquisar e atualizar mensagens" title="Pesquisar e atualizar mensagens"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></button></div><div class="em-filters"><select name="unread" aria-label="Filtrar leitura"><option value="">Todos os e-mails</option><option value="true">Não lidos</option></select></div></form><div class="em-list" aria-label="Mensagens"></div><div class="em-pagination"><button data-prev disabled aria-label="Página anterior">‹</button><span class="em-page"></span><button data-next disabled aria-label="Próxima página">›</button></div></div>
            <article class="em-reader" aria-label="Leitura e composição"><div class="em-empty">${iconeMenu('carta')}<strong>Suas mensagens, em um só lugar</strong><span>Selecione um e-mail para ler ou escreva uma nova mensagem.</span></div></article>
        </div></section>`;
        const root = tela.querySelector('.emails');
        const list = root.querySelector('.em-list'), reader = root.querySelector('.em-reader');
        let account, folder = 'inbox', page = 1, pages = 1, messages = [], current, compose = null, serial = 0, detailSerial = 0, busy = false;
        const notice = (text = '', error = false) => { if (!root.isConnected) return; const el = root.querySelector('.em-notice'); el.textContent = text; el.dataset.error = error; };
        const guarded = fn => async (...args) => { try { await fn(...args); } catch (error) { notice(error.message, true); } };
        // Confirmação no popup do app; fechar no × conta como "não".
        const confirmar = (mensagem, titulo, texto) => new Promise(resolve => {
            const chave = crypto.randomUUID();
            const respostas = window.respostasEmail ??= {};
            respostas[chave] = resolve;
            const id = popup({ mensagem, titulo, removerAnteriores: false, botoes: [
                { texto, img: 'concluido', funcao: `respostasEmail['${chave}']?.(true)`, fechar: true },
                { texto: 'Continuar editando', img: 'voltar-escuro.svg', fechar: true }
            ] });
            const fim = new MutationObserver(() => { if (!document.getElementById(id)) { fim.disconnect(); delete respostas[chave]; resolve(false); } });
            fim.observe(document.body, { childList: true });
        });
        const canLeave = async () => !compose || !compose.dirty || await confirmar('Descartar o e-mail em edição? As alterações não salvas serão perdidas.', 'Descartar e-mail', 'Descartar');
        async function load() {
            const id = ++serial;
            const params = new URLSearchParams({folder, page, limit:25, q:root.querySelector('[name=q]').value, unread:root.querySelector('[name=unread]').value});
            if (account?.supportsThreads) params.set('groupBy', 'thread');
            notice('Carregando mensagens…');
            try {
                const data = await request(`/messages?${params}`);
                if (id !== serial || !root.isConnected) return;
                if (!Array.isArray(data.items)) throw new Error('Resposta de mensagens inválida.');
                messages = data.items; pages = Math.max(1, Number(data.pages) || 1);
                window.atualizarContadorEmails(); // leitura/movimentação muda os não lidos
                list.innerHTML = messages.length ? messages.map(m => `<button class="em-row ${!m.read ? 'unread' : ''}${m.status === 'error' ? ' falhou' : ''}" data-message="${escape(m.id)}" aria-current="${current?.id === m.id}"><span>${m.status === 'error' ? '<mark class="em-badge-erro" title="Abra a mensagem para ver o motivo">Falha no envio</mark>' : ''}${m.starred ? '★ ' : ''}${escape(folder === 'sent' || folder === 'drafts' ? addresses(m.to) : m.from?.name || address(m.from))}</span><span>${escape(m.subject || '(Sem assunto)')}</span><small>${escape(m.preview || '')}</small><small>${escape(date(m.date))}${m.hasAttachments ? ' · Anexos' : ''}${Number(m.threadCount) > 1 ? ` · ${escape(m.threadCount)} mensagens` : ''}</small></button>`).join('') : '<div class="em-empty">Nenhum e-mail nesta pesquisa.</div>';
                root.querySelector('.em-page').textContent = `${page} / ${pages}`;
                root.querySelector('[data-prev]').disabled = page <= 1;
                root.querySelector('[data-next]').disabled = page >= pages;
                notice();
            } catch (error) { if (id === serial) { list.innerHTML = '<div class="em-empty">Não foi possível carregar. Use Atualizar para tentar novamente.</div>'; notice(error.message, true); } }
        }
        async function open(id) {
            if (!await canLeave()) return;
            const n = ++detailSerial;
            const m = await request(`/messages/${encodeURIComponent(id)}`);
            if (n !== detailSerial || !root.isConnected) return;
            let conversation = [];
            let threadError = false;
            if (account.supportsThreads && m.threadId && m.folder !== 'drafts') {
                try {
                    const thread = await request(`/messages/${encodeURIComponent(id)}/thread`);
                    if (!Array.isArray(thread.items)) throw new Error('Conversa inválida.');
                    conversation = thread.items.filter(item => item.id !== m.id);
                } catch { threadError = true; }
                if (n !== detailSerial || !root.isConnected) return;
            }
            current = m; compose = null;
            if (m.folder === 'drafts') { edit(m); return; }
            reader.innerHTML = `<h3>${escape(m.subject || '(Sem assunto)')}</h3><div class="em-meta">De: ${escape(m.from?.name || '')} &lt;${escape(address(m.from))}&gt;<br>Para: ${escape(addresses(m.to))}${m.cc?.length ? `<br>Cc: ${escape(addresses(m.cc))}` : ''}<br>${escape(date(m.date))}${m.status ? ` · ${escape(status(m.status))}` : ''}${m.status === 'error' ? `<div class="em-falha"><span>${escape(motivoFalha(m))}</span><button type="button" data-act="retry"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 4v7h-7"/></svg>Tentar novamente</button></div>` : ''}</div><div class="em-actions"><button data-act="reply">Responder</button><button data-act="replyAll">Responder a todos</button><button data-act="forward">Encaminhar</button><button data-act="star">${m.starred ? '★ Remover favorito' : '☆ Favoritar'}</button><button data-act="unread">Marcar não lido</button><select aria-label="Mover mensagem" data-move><option value="">Mover para…</option>${['inbox','archive','spam','trash'].filter(f => f !== m.folder).map(f => `<option value="${f}">${folders[f]}</option>`).join('')}</select></div><div class="em-body"></div><div class="em-attachments">${(m.attachments || []).map(a => `<button data-download="${escape(a.id)}">↓ ${escape(a.name)} (${Math.ceil((a.size || 0)/1024)} KB)</button>`).join('')}</div>`;
            // Texto puro: HTML externo nunca é inserido no documento, evitando scripts e pixels de rastreamento.
            const corpo = reader.querySelector('.em-body');
            if (m.html) {
                // Só mensagens enviadas por aqui têm HTML (limpo no servidor). O iframe sem allow-scripts não executa nada;
                // allow-same-origin serve apenas para medir a altura do conteúdo.
                const quadro = document.createElement('iframe');
                quadro.className = 'em-html'; quadro.title = 'Conteúdo da mensagem';
                quadro.setAttribute('sandbox', 'allow-same-origin allow-popups allow-popups-to-escape-sandbox');
                quadro.setAttribute('referrerpolicy', 'no-referrer');
                quadro.addEventListener('load', () => { const doc = quadro.contentDocument; if (doc) quadro.style.height = `${doc.documentElement.scrollHeight + 4}px`; });
                quadro.srcdoc = `<!doctype html><meta charset="utf-8"><base target="_blank"><style>body{margin:0;overflow:hidden}blockquote{margin:6px 0 6px 4px;padding-left:12px;border-left:3px solid #d5dbd7;color:#555}</style>${m.html}`;
                corpo.classList.add('em-body-html'); corpo.append(quadro);
            } else corpo.textContent = m.text || 'Esta mensagem não possui versão em texto.';
            if (conversation.length) {
                const history = document.createElement('section');
                history.className = 'em-thread';
                history.setAttribute('aria-label', 'Outras mensagens desta conversa');
                history.innerHTML = `<div class="em-thread-heading">Conversa · ${conversation.length + 1} mensagens</div>` + conversation.map(item => `<details class="em-thread-item"><summary><span>${escape(item.from?.name || address(item.from))}</span><time>${escape(date(item.date))}</time></summary><div class="em-meta">Para: ${escape(addresses(item.to))}</div><div class="em-body">${escape(item.text || item.preview || '')}</div><button data-thread-message="${escape(item.id)}">Abrir mensagem${item.hasAttachments || item.attachments?.length ? ' e anexos' : ''}</button></details>`).join('');
                reader.querySelector('h3').after(history);
            }
            if (!m.read) { await request(`/messages/${encodeURIComponent(m.id)}`, 'PATCH', {read:true}); m.read = true; }
            await load();
            if (threadError) notice('Mensagem carregada. Não foi possível carregar o restante da conversa.', true);
        }
        function edit(draft = {}) {
            ++detailSerial;
            compose = {...draft, attachments:[...(draft.attachments || [])], files:[], dirty:false, key:crypto.randomUUID()};
            reader.innerHTML = `<form class="em-compose"><h3>${draft.id ? 'Editar rascunho' : 'Nova mensagem'}</h3><div class="em-meta">De: ${escape(account.senderEmail)}</div>${[['to','Para'],['cc','Cc'],['bcc','Cco']].map(([name,label]) => `<div class="em-dest" data-dest="${name}"><span class="em-dest-rotulo">${label}</span><div class="em-chips"><input class="em-chip-input" aria-label="${label}" placeholder="Digite um e-mail e tecle Enter ou vírgula" autocomplete="off"></div><input type="hidden" name="${name}"><span class="opcoes em-dest-contato" name="contato_${name}" onclick="cxOpcoes('contato_${name}')" title="Escolher cliente, fornecedor ou colaborador">Contatos</span></div>`).join('')}<label>Assunto<input name="subject" value="${escape(draft.subject || '')}" maxlength="998"></label>${editorHtml()}<label>Anexos (até 15 MB no total)<input type="file" multiple name="files"></label><div class="em-attachments"></div><div class="em-actions"><button type="submit" class="em-primary">Enviar</button><button type="button" data-save>Salvar rascunho</button><button type="button" data-cancel>Fechar</button></div></form>`;
            const form = reader.querySelector('form');
            form.querySelector('[type=submit]').disabled = !account.canSend;
            const showFiles = () => { form.querySelector('.em-attachments').innerHTML = [...compose.attachments, ...compose.files].map((f,i) => `<button type="button" data-remove-file="${i}" aria-label="Remover ${escape(f.name)}">${escape(f.name)} ×</button>`).join(''); };
            showFiles();
            // Para/Cc/Cco: cada endereço completo vira um bloco com ×; o campo oculto guarda a lista separada por vírgula.
            const sujo = () => form.dispatchEvent(new Event('input'));
            const destinatarios = {};
            for (const bloco of form.querySelectorAll('[data-dest]')) {
                const caixa = bloco.querySelector('.em-chips'), digitado = caixa.querySelector('input'), oculto = bloco.querySelector('input[type=hidden]');
                const chips = () => [...caixa.querySelectorAll('.em-chip')];
                const sincronizar = () => { oculto.value = [...chips().map(c => c.dataset.email), digitado.value.trim()].filter(Boolean).join(', '); };
                const adicionar = texto => {
                    for (const email of String(texto).split(/[,;\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean)) {
                        if (chips().some(c => c.dataset.email === email)) continue;
                        const chip = document.createElement('span');
                        const invalido = !emailValido(email);
                        chip.className = `em-chip${invalido ? ' invalido' : ''}`; chip.dataset.email = email;
                        chip.title = invalido ? 'Endereço incompleto: clique duas vezes para corrigir' : email;
                        chip.innerHTML = `<span>${escape(email)}</span><button type="button" aria-label="Remover ${escape(email)}">×</button>`;
                        digitado.before(chip);
                    }
                    sincronizar();
                };
                const fechar = () => { if (digitado.value.trim()) { adicionar(digitado.value); digitado.value = ''; sincronizar(); } };
                digitado.addEventListener('input', () => {
                    // Separador digitado ou colado (vírgula, ponto e vírgula, espaço) fecha o que veio antes dele.
                    const partes = digitado.value.split(/[,;\s]+/);
                    if (partes.length > 1) { digitado.value = partes.pop(); adicionar(partes.join(',')); }
                    sincronizar();
                });
                digitado.addEventListener('keydown', e => {
                    // Enter fecha o endereço e nunca envia o formulário por engano.
                    if (e.key === 'Enter') { e.preventDefault(); fechar(); }
                    else if (e.key === 'Backspace' && !digitado.value && chips().length) { chips().at(-1).remove(); sincronizar(); sujo(); }
                });
                digitado.addEventListener('blur', fechar);
                caixa.addEventListener('click', e => {
                    const remover = e.target.closest('.em-chip button');
                    if (remover) { if (!busy) { remover.parentElement.remove(); sincronizar(); sujo(); } return; }
                    if (!e.target.closest('.em-chip')) digitado.focus();
                });
                // Duplo clique devolve o endereço para edição.
                caixa.addEventListener('dblclick', e => {
                    const chip = e.target.closest('.em-chip'); if (!chip || busy) return;
                    fechar(); digitado.value = chip.dataset.email; chip.remove(); sincronizar(); digitado.focus();
                });
                adicionar(addresses(draft[bloco.dataset.dest]));
                destinatarios[bloco.dataset.dest] = { adicionar };
            }
            // Contatos vêm de vw_contatos_email, já recortada no servidor pelo que o usuário pode ver.
            for (const name of ['to','cc','bcc']) controlesCxOpcoes[`contato_${name}`] = {
                base: 'vw_contatos_email', usarLinha: true, retornar: ['nome'], armazenarDataset: { email: 'email' },
                funcaoAdicional: [['adicionarContatoEmail', name]],
                colunas: { 'Nome': { chave: 'nome' }, 'E-mail': { chave: 'email' }, 'Origem': { chave: 'origem' } }
            };
            window.adicionarContatoEmail = name => {
                const picker = form.querySelector(`[name=contato_${name}]`);
                const email = picker?.dataset.email;
                if (!email || !form.isConnected) return;
                const nome = picker.textContent;
                picker.textContent = 'Contatos'; picker.removeAttribute('id');
                destinatarios[name].adicionar(email); sujo();
                notice(`${nome} adicionado.`);
            };
            compose.editor = montarEditor(form, draft, { notice, ocupado: () => busy });
            form.addEventListener('input', () => { if (compose) { compose.dirty = true; compose.key = crypto.randomUUID(); } });
            form.elements.files.addEventListener('change', () => {
                const incoming = [...form.elements.files.files];
                const size = [...compose.attachments, ...compose.files, ...incoming].reduce((sum,f) => sum + (f.size || 0), 0);
                if (size > 15 * 1024 * 1024) notice('Os anexos excedem o limite de 15 MB.', true);
                else { compose.files.push(...incoming); compose.dirty = true; compose.key = crypto.randomUUID(); showFiles(); }
                form.elements.files.value = '';
            });
            form.addEventListener('click', e => { const b = e.target.closest('[data-remove-file]'); if (!b || busy) return; const i = Number(b.dataset.removeFile); if (i < compose.attachments.length) compose.attachments.splice(i,1); else compose.files.splice(i-compose.attachments.length,1); compose.dirty = true; compose.key = crypto.randomUUID(); showFiles(); });
            form.addEventListener('submit', e => { e.preventDefault(); guarded(() => save(true))(); });
            form.querySelector('[data-save]').onclick = guarded(() => save(false));
            form.querySelector('[data-cancel]').onclick = async () => { if (!busy && await canLeave()) { compose = null; reader.innerHTML = '<div class="em-empty">Selecione uma mensagem para ler.</div>'; } };
            form.querySelector('.em-chip-input').focus();
        }
        async function save(send) {
            if (busy || !compose) return;
            if (send && !account.canSend) throw new Error('Envio ainda não habilitado para sua conta.');
            const form = reader.querySelector('form');
            const payload = {subject:form.elements.subject.value, text:compose.editor.texto(), html:compose.editor.html(), attachmentIds:compose.attachments.map(a => a.id), inReplyTo:compose.inReplyTo || null, references:compose.references || [], draftId:compose.id || null};
            for (const field of ['to','cc','bcc']) {
                payload[field] = form.elements[field].value.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
                if (payload[field].some(s => !emailValido(s))) throw new Error(`Há endereço incompleto em ${{to:'Para',cc:'Cc',bcc:'Cco'}[field]} (marcado em vermelho).`);
            }
            if (send && !payload.to.length) throw new Error('Informe ao menos um destinatário em Para.');
            if (send && !payload.subject.trim() && !await confirmar('Este e-mail está sem assunto. Deseja enviar mesmo assim?', 'Enviar sem assunto', 'Enviar')) return;
            busy = true; form.querySelectorAll('button,input,textarea').forEach(el => el.disabled = true);
            const previousFocus = document.activeElement;
            const previousScroll = reader.scrollTop;
            reader.scrollTop = 0;
            const overlay = document.createElement('div');
            overlay.className = 'em-editor-overlay';
            overlay.setAttribute('role', 'status');
            overlay.setAttribute('aria-live', 'polite');
            overlay.innerHTML = `<span class="em-spinner" aria-hidden="true"></span><strong>${send ? 'Enviando mensagem…' : 'Salvando rascunho…'}</strong><span>Aguarde a confirmação do servidor.</span>`;
            form.setAttribute('aria-busy', 'true');
            form.inert = true;
            reader.classList.add('em-reader-busy');
            reader.append(overlay);
            try {
                // Upload incremental: preserva IDs bem-sucedidos para uma tentativa posterior.
                while (compose.files.length) {
                    const file = compose.files[0], data = new FormData(); data.append('file', file);
                    const uploaded = await request('/attachments', 'POST', data);
                    compose.attachments.push(uploaded); compose.files.shift();
                }
                payload.attachmentIds = compose.attachments.map(a => a.id);
                payload.idempotencyKey = compose.key;
                const result = await request(send ? '/send' : '/drafts', 'POST', payload);
                if (send) { compose = null; current = null; reader.innerHTML = '<div class="em-empty">Mensagem aceita para envio. A entrega será confirmada pelo serviço.</div>'; }
                else { compose.id = result.id; compose.dirty = false; compose.key = crypto.randomUUID(); }
                await load(); notice(send ? 'Mensagem aceita para envio.' : 'Rascunho salvo.');
            } finally {
                busy = false;
                overlay.remove();
                reader.classList.remove('em-reader-busy');
                form.removeAttribute('aria-busy');
                form.inert = false;
                if (form.isConnected) {
                    reader.scrollTop = previousScroll;
                    form.querySelectorAll('button,input,textarea').forEach(el => el.disabled = false);
                    form.querySelector('[type=submit]').disabled = !account.canSend;
                    if (previousFocus?.isConnected && !previousFocus.disabled) previousFocus.focus({preventScroll:true});
                }
            }
        }
        root.querySelector('[data-new]').onclick = async () => { if (!busy && await canLeave()) edit(); };
        root.querySelectorAll('[data-folder]').forEach(b => b.onclick = guarded(async () => {
            if (busy || !await canLeave()) return;
            ++detailSerial; compose = null; current = null; folder = b.dataset.folder; page = 1;
            reader.innerHTML = '<div class="em-empty">Selecione uma mensagem para ler.</div>';
            root.querySelectorAll('[data-folder]').forEach(el => el.setAttribute('aria-current', String(el === b)));
            await load();
        }));
        root.querySelector('.em-tools').onsubmit = e => { e.preventDefault(); page = 1; load(); };
        root.querySelector('[name=unread]').onchange = () => { page = 1; load(); };
        for (const [name,delta] of [['prev',-1],['next',1]]) root.querySelector(`[data-${name}]`).onclick = () => { page += delta; load(); };
        list.onclick = guarded(async e => { const b = e.target.closest('[data-message]'); if (b && !busy) await open(b.dataset.message); });
        reader.addEventListener('click', guarded(async e => {
            const threadMessage = e.target.closest('[data-thread-message]');
            if (threadMessage && !busy) { await open(threadMessage.dataset.threadMessage); return; }
            const download = e.target.closest('[data-download]');
            if (download && current) {
                const {token} = JSON.parse(localStorage.getItem('acesso') || '{}');
                const response = await fetchAutenticado(`${api}/emails/messages/${encodeURIComponent(current.id)}/attachments/${encodeURIComponent(download.dataset.download)}`, {headers:{Authorization:`Bearer ${token}`}});
                if (!response?.ok) throw new Error('Não foi possível baixar o anexo.');
                const url = URL.createObjectURL(await response.blob()), a = document.createElement('a'); a.href = url; a.download = current.attachments.find(x => String(x.id) === download.dataset.download)?.name || 'anexo'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); return;
            }
            const action = e.target.closest('[data-act]')?.dataset.act;
            if (!action || !current || busy) return;
            if (['reply','replyAll','forward'].includes(action)) {
                const m = current, forward = action === 'forward';
                const own = [account.senderEmail,account.inboundEmail].map(s => s.toLowerCase());
                const target = address(m.replyTo || m.from);
                const to = forward ? [] : [target].filter(s => s && !own.includes(s.toLowerCase()));
                const cc = action === 'replyAll' ? [...new Set([...(m.to || []).map(address),...(m.cc || []).map(address)])].filter(s => !own.includes(s.toLowerCase()) && !to.includes(s)) : [];
                const cabecalho = forward ? '---------- Mensagem encaminhada ----------' : `Em ${date(m.date)}, ${address(m.from)} escreveu:`;
                // Original citado em bloco: o espaço para escrever fica acima, como nos clientes de e-mail.
                const html = `<div><br></div><div><br></div><div style="color:#666666">${escape(cabecalho)}</div><blockquote>${textoHtml(m.text || '')}</blockquote>`;
                edit({to,cc,subject:`${forward ? 'Enc: ' : /^re:/i.test(m.subject || '') ? '' : 'Re: '}${m.subject || ''}`,html,text:`\n\n${cabecalho}\n${m.text || ''}`,inReplyTo:forward ? null : m.messageId,references:forward ? [] : [...(m.references || []), m.messageId].filter(Boolean)});
                if (forward && m.attachments?.length) notice('O encaminhamento inclui o texto. Baixe e adicione os anexos que desejar encaminhar.');
                return;
            }
            if (action === 'retry') {
                // Sem resposta confirmada, a Brevo pode ter entregue: reenviar pode duplicar.
                if (current.error === 'provider_uncertain' && !await confirmar('A Brevo não confirmou se esta mensagem foi enviada. Se ela chegou, o destinatário receberá uma cópia. Reenviar mesmo assim?', 'Reenviar mensagem', 'Reenviar')) return;
                const id = current.id;
                await request(`/messages/${encodeURIComponent(id)}/retry`, 'POST');
                notice('Mensagem devolvida à fila de envio.');
                await load(); await open(id);
                return;
            }
            await request(`/messages/${encodeURIComponent(current.id)}`, 'PATCH', action === 'star' ? {starred:!current.starred} : {read:false});
            if (action === 'star') { current.starred = !current.starred; e.target.textContent = current.starred ? '★ Remover favorito' : '☆ Favoritar'; }
            await load();
        }));
        reader.addEventListener('change', guarded(async e => {
            if (!e.target.matches('[data-move]') || !e.target.value || !current) return;
            await request(`/messages/${encodeURIComponent(current.id)}`, 'PATCH', {folder:e.target.value});
            ++detailSerial; current = null; reader.innerHTML = '<div class="em-empty">Mensagem movida.</div>'; await load();
        }));
        // Remove o aviso de saída ao abandonar este painel por outro menu.
        const unload = e => { if (compose?.dirty) { e.preventDefault(); e.returnValue = ''; } };
        const navigation = e => {
            if (!e.target.closest('.side-menu .menu-principal')) return;
            if (!busy && !compose?.dirty) return;
            e.preventDefault(); e.stopImmediatePropagation();
            if (busy) return;
            // Após confirmar, repete o clique no menu já sem alterações pendentes.
            const alvo = e.target;
            canLeave().then(ok => { if (ok) { compose.dirty = false; alvo.click(); } });
        };
        document.addEventListener('click', navigation, true);
        window.addEventListener('beforeunload', unload);
        const observer = new MutationObserver(() => { if (!root.isConnected) { ++serial; ++detailSerial; window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigation, true); observer.disconnect(); } });
        observer.observe(tela, {childList:true});
        try {
            account = await request('/account');
            if (!root.isConnected) return;
            if (!account.senderEmail || !account.inboundEmail) throw new Error('Seu endereço de e-mail ainda não foi atribuído pelo administrador.');
            root.querySelector('.em-identity').textContent = account.senderEmail;
            root.querySelector('[data-new]').disabled = !account.canSend;
            await load();
            if (!account.canSend) notice('Envio ainda não habilitado para sua conta.');
        } catch (error) { root.querySelector('.em-identity').textContent = 'Conta de e-mail indisponível'; notice(error.message, true); }
    };

    // Ícone do topo: não lidos da caixa de entrada. Sem conta de e-mail, o ícone some.
    let contadorConsulta = 0, contadorTimer = null;
    window.atualizarContadorEmails = async function () {
        const contador = document.getElementById('contadorEmails');
        if (!contador) return;
        const botao = contador.parentElement, consulta = ++contadorConsulta;
        try {
            const data = await request('/messages?folder=inbox&unread=true&page=1&limit=1');
            if (consulta !== contadorConsulta || !contador.isConnected) return;
            const total = Number(data?.total);
            if (!Number.isFinite(total) || total < 0) throw new Error('Contagem inválida.');
            botao.hidden = false;
            contador.textContent = total > 99 ? '99+' : String(total);
            contador.hidden = total === 0;
            botao.title = total ? `${total} e-mail(s) não lido(s)` : 'E-mails';
            botao.setAttribute('aria-label', total ? `${total} e-mails não lidos. Abrir e-mails` : 'Abrir e-mails');
        } catch (error) {
            if (consulta !== contadorConsulta) return;
            // Conta não provisionada/serviço indisponível: esconde o atalho em vez de mostrar um contador errado.
            if (/provisionad|atribuído|não está disponível|Entre novamente/i.test(error.message)) botao.hidden = true;
            console.warn('Não foi possível atualizar o contador de e-mails:', error.message);
        }
    };
    // Novos e-mails chegam pelo webhook da Brevo: confere a cada minuto com a aba visível.
    window.iniciarContadorEmails = function () {
        clearInterval(contadorTimer);
        window.atualizarContadorEmails();
        contadorTimer = setInterval(() => { if (!document.hidden) window.atualizarContadorEmails(); }, 60000);
    };
    document.addEventListener('visibilitychange', () => { if (!document.hidden && contadorTimer) window.atualizarContadorEmails(); });
})();
