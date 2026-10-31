// Ponto sem internet: a marcação fica guardada no telemóvel (IndexedDB) e é enviada a /ponto/offline
// quando a rede voltar. O servidor faz as mesmas verificações do ponto normal (PIN, rosto, GPS e limites);
// a hora gravada é a do momento da marcação, aceita até 72 h depois.
const PontoOffline = (() => {
    const BANCO = 'reconst-ponto', LOJA = 'fila', RECUSAS = 'ponto-offline-recusas'
    let banco = null, enviando = false

    function abrir() {
        banco ||= new Promise((ok, erro) => {
            const pedido = indexedDB.open(BANCO, 1)
            pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA, { keyPath: 'cliente_id' })
            pedido.onsuccess = () => ok(pedido.result)
            pedido.onerror = () => { banco = null; erro(pedido.error) }
        })
        return banco
    }
    async function operar(modo, fn) {
        const db = await abrir()
        return new Promise((ok, erro) => {
            const tx = db.transaction(LOJA, modo), pedido = fn(tx.objectStore(LOJA))
            tx.oncomplete = () => ok(pedido?.result)
            tx.onerror = () => erro(tx.error)
        })
    }
    const listar = () => operar('readonly', loja => loja.getAll())
    const remover = id => operar('readwrite', loja => loja.delete(id))

    // Recusadas na sincronização (PIN errado, rosto, fora do raio…): só hora e motivo, sem PIN nem imagem.
    function registrarRecusa(item, mensagem) {
        try {
            const lista = JSON.parse(localStorage.getItem(RECUSAS) || '[]')
            lista.unshift({ capturado_em: item.capturado_em, mensagem: mensagem || 'Recusada' })
            localStorage.setItem(RECUSAS, JSON.stringify(lista.slice(0, 20)))
        } catch { }
    }

    async function atualizarAviso() {
        let n = 0
        try { n = (await listar()).length } catch { }
        document.querySelectorAll('[data-ponto-pendentes]').forEach(el => {
            el.hidden = !n
            el.textContent = n === 1 ? '1 marcação por enviar' : `${n} marcações por enviar`
        })
    }

    // Envia a fila em ordem; para no primeiro erro de rede ou de servidor e tenta de novo depois.
    async function sincronizar() {
        if (enviando || !navigator.onLine) return
        enviando = true
        const recusadas = []
        try {
            const fila = (await listar()).sort((a, b) => String(a.capturado_em).localeCompare(String(b.capturado_em)))
            for (const item of fila) {
                let resposta
                try {
                    const r = await fetch(`${api}/ponto/offline`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) })
                    resposta = await r.json().catch(() => ({}))
                    if (!r.ok && !resposta.definitivo) break
                } catch { break }
                if (!resposta.success && !resposta.definitivo) break
                await remover(item.cliente_id)
                if (!resposta.success) {
                    registrarRecusa(item, resposta.mensagem)
                    recusadas.push({ capturado_em: item.capturado_em, mensagem: resposta.mensagem, invalidada: !!resposta.invalidada })
                }
            }
        } catch (erro) {
            console.warn('Ponto offline: sincronização adiada.', erro?.message)
        } finally {
            enviando = false
            atualizarAviso()
        }
        if (recusadas.length) avisarRecusas(recusadas)
    }

    // Sem este aviso a marcação não aceite simplesmente sumia da fila e o trabalhador julgava que tinha marcado.
    // "Por validar" não se perdeu (o encarregado decide); só a recusada de vez (ex.: PIN inexistente) pede para marcar de novo.
    function avisarRecusas(recusadas) {
        const lista = itens => `<ul style="text-align: left; margin: 10px 0; padding-left: 18px;">${itens.map(r => {
            const momento = new Date(r.capturado_em)
            const quando = `${momento.toLocaleDateString('pt-PT')} às ${momento.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
            return `<li><b>${quando}</b> — ${escaparAtributo(r.mensagem || 'Recusada')}</li>`
        }).join('')}</ul>`
        const porValidar = recusadas.filter(r => r.invalidada), recusadasDeVez = recusadas.filter(r => !r.invalidada)
        popup({
            titulo: recusadasDeVez.length ? 'Marcação offline não aceite' : 'Marcação offline por validar',
            mensagem: [
                porValidar.length ? `A rede voltou, mas ${porValidar.length === 1 ? 'esta marcação não passou' : 'estas marcações não passaram'} nas verificações automáticas:
                    ${lista(porValidar)}Ficou registada e o seu encarregado vai validar ou descartar. <b>Não precisa de marcar de novo.</b>` : '',
                recusadasDeVez.length ? `${porValidar.length ? '<br><br>' : ''}O servidor não aceitou:${lista(recusadasDeVez)}Marque o ponto novamente ou fale com o seu encarregado.` : ''
            ].join('')
        })
    }

    async function guardar({ pin, selfie, posicao }) {
        const item = {
            cliente_id: crypto.randomUUID(), pin, selfie, capturado_em: new Date().toISOString(),
            latitude: posicao.latitude, longitude: posicao.longitude, precisao: posicao.precisao
        }
        await operar('readwrite', loja => loja.put(item))
        atualizarAviso()
        return item
    }

    function comprovante(item) {
        const momento = new Date(item.capturado_em)
        const [hh, mm] = [momento.getHours(), momento.getMinutes()].map(n => String(n).padStart(2, '0'))
        popup({
            titulo: 'Marcação guardada',
            elemento: `
                <div class="ticketPonto ticket-offline">
                    <div class="ticket-selo" aria-hidden="true"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18h10a4 4 0 0 0 .7-7.94A6 6 0 0 0 6.3 9.2 4.5 4.5 0 0 0 7 18z"/><path d="M12 11v5M9.5 13.5 12 11l2.5 2.5"/></svg></div>
                    <div class="ticket-estado">Guardada no telemóvel</div>
                    <div class="ticket-hora">${hh}<span class="ticket-dois-pontos">:</span>${mm}</div>
                    <div class="ticket-data">${momento.toLocaleDateString('pt-PT')}</div>
                    <div class="ticket-corte" aria-hidden="true"></div>
                    <p class="ticket-nota">Sem internet: a marcação será enviada automaticamente quando a rede voltar.
                        O PIN, o rosto e o local são confirmados nesse momento.</p>
                </div>`
        })
    }

    // Captura sem internet: câmera, selfie e GPS (que funciona sem rede); sem reconhecimento no aparelho.
    async function marcar(pin) {
        removerOverlay()
        tela.innerHTML = `
            <div class="card ponto-offline">
                <div style="${horizontal}; justify-content: space-between; margin-bottom: 2vw;">
                    <span><b>Sem internet</b> · a marcação fica guardada no telemóvel</span>
                    <img src="imagens/voltar.png" class="voltar" onclick="telaLogin(); pararCam()">
                </div>
                <video id="video" autoplay muted playsinline></video>
                <div id="liveStatus" class="status muted">A abrir a câmara…</div>
                <button type="button" data-marcar-offline disabled>Registar ponto</button>
            </div>`
        await iniciarCam()
        const botao = tela.querySelector('[data-marcar-offline]')
        if (!stream) return
        botao.disabled = false
        mostrarStatus('Olhe de frente para a câmara e toque em "Registar ponto".', 'ok')
        botao.onclick = async () => {
            botao.disabled = true
            const selfie = capturarSelfie()
            if (!selfie) { botao.disabled = false; return mostrarStatus('Não foi possível capturar a imagem. Tente novamente.', 'err') }
            mostrarStatus('A obter a localização…', 'warn')
            const posicao = await obterLocalizacao()
            if (posicao.erro) {
                botao.disabled = false
                return popup({ titulo: 'Localização necessária', mensagem: `Marcação não guardada.<br><br>${AJUDA_PERMISSAO[posicao.erro]}` })
            }
            pararCam()
            try {
                const item = await guardar({ pin, selfie, posicao })
                telaLogin()
                comprovante(item)
            } catch {
                popup({ mensagem: 'Não foi possível guardar a marcação neste telemóvel (armazenamento bloqueado ou cheio).' })
            }
        }
    }

    window.addEventListener('online', sincronizar)
    setInterval(sincronizar, 60 * 1000)
    setTimeout(sincronizar, 3000)

    return { marcar, guardar, comprovante, sincronizar, atualizarAviso }
})()
