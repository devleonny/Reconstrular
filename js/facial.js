let usuarioAtual = {}
// Modelos servidos pelo próprio app (antes vinham de um site de terceiros); carregados uma vez por sessão.
let modelosFace = null
function loadModels() {
    const MODEL_URL = 'modelos-face';
    modelosFace ||= Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]).catch(erro => { modelosFace = null; throw erro })
    return modelosFace
}

async function computeDescriptorFromImage(img) {
    const det = await faceapi
        .detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptor();
    return det ? det.descriptor : null;
}

async function grabLiveDescriptor() {
    const video = document.getElementById('video');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const det = await faceapi
        .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptor();

    return det ? det.descriptor : null;
}

// ---------- Autorizações: sem câmera e localização não há marcação ----------
// O ponto é usado no telemóvel do trabalhador. Antes do PIN, o app pede as duas permissões;
// se alguma for recusada, explica como ativar e não deixa avançar.
const AJUDA_PERMISSAO = {
    negada: `<b>A permissão foi recusada.</b> Para marcar o ponto é obrigatório autorizar a câmera e a localização.
        <ul>
            <li><b>Android (Chrome):</b> toque no cadeado 🔒 ao lado do endereço → <i>Permissões</i> → ative <i>Câmera</i> e <i>Localização</i>.</li>
            <li><b>iPhone (Safari):</b> toque em <i>aA</i> na barra de endereço → <i>Definições do site</i> → permita <i>Câmera</i> e <i>Localização</i>. Confirme também em <i>Ajustes → Privacidade → Serviços de localização → Safari: Ao usar a app</i>.</li>
        </ul>
        Depois toque em <b>Tentar novamente</b>.`,
    gps: `<b>Não foi possível obter a localização.</b> Ligue a <i>Localização (GPS)</i> nas definições rápidas do telemóvel e tente de novo, de preferência ao ar livre ou junto a uma janela.`,
    indisponivel: `<b>Este navegador não permite câmera ou localização.</b> Abra o app pelo endereço <i>https://</i> no Chrome (Android) ou no Safari (iPhone), não dentro de outra aplicação.`
}
let autorizacaoPonto = { camera: null, localizacao: null, posicao: null }

async function pedirCameraPonto() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) return 'indisponivel'
    try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        s.getTracks().forEach(t => t.stop())
        return 'ok'
    } catch (e) { return ['NotAllowedError', 'SecurityError'].includes(e.name) ? 'negada' : 'indisponivel' }
}

async function telaRegistroPonto() {

    autorizacaoPonto = { camera: null, localizacao: null, posicao: null }
    tela.innerHTML = `
        <div id="acesso" class="loginBloco">

            <div class="botaoSuperiorLogin" onclick="telaLogin()">
                <img src="imagens/cracha.png">
                <span>Voltar para a tela de Acesso</span>
            </div>

            <div class="baixoLogin ponto-autorizacao">
                <h2>Registo de ponto</h2>
                <p>Para marcar o ponto, este telemóvel precisa de duas autorizações:</p>
                <ul class="ponto-permissoes">
                    <li data-permissao="camera"><span class="ponto-perm-icone">📷</span><div><b>Câmera</b><small>para o reconhecimento facial</small></div><span class="ponto-perm-estado">Pendente</span></li>
                    <li data-permissao="localizacao"><span class="ponto-perm-icone">📍</span><div><b>Localização (GPS)</b><small>para confirmar o local de trabalho</small></div><span class="ponto-perm-estado">Pendente</span></li>
                </ul>
                <div class="ponto-ajuda" hidden></div>
                <button type="button" data-autorizar onclick="autorizarPonto()">Autorizar e continuar</button>
            </div>

        </div>
    `

    // Já autorizado antes neste aparelho? Segue direto (o navegador não volta a perguntar).
    try {
        const [cam, geo] = await Promise.all(['camera', 'geolocation'].map(n => navigator.permissions?.query({ name: n }).then(p => p.state).catch(() => null)))
        if (cam === 'granted' && geo === 'granted') autorizarPonto()
        else if (cam === 'denied' || geo === 'denied') mostrarPermissoes({ camera: cam === 'denied' ? 'negada' : null, localizacao: geo === 'denied' ? 'negada' : null })
    } catch { }
}

function mostrarPermissoes(estado) {
    const rotulos = { ok: '✓ Autorizada', negada: '✕ Recusada', gps: '✕ GPS desligado', indisponivel: '✕ Indisponível', pedindo: 'A pedir…' }
    for (const chave of ['camera', 'localizacao']) {
        const li = document.querySelector(`[data-permissao="${chave}"]`)
        if (!li || !estado[chave]) continue
        li.dataset.estado = estado[chave]
        li.querySelector('.ponto-perm-estado').textContent = rotulos[estado[chave]] || estado[chave]
    }
    const problema = ['indisponivel', 'negada', 'gps'].find(p => estado.camera === p || estado.localizacao === p)
    const ajuda = document.querySelector('.ponto-ajuda')
    if (ajuda) { ajuda.hidden = !problema; ajuda.innerHTML = problema ? AJUDA_PERMISSAO[problema] : '' }
    const botao = document.querySelector('[data-autorizar]')
    if (botao && problema) botao.textContent = 'Tentar novamente'
}

async function autorizarPonto() {
    const botao = document.querySelector('[data-autorizar]')
    if (botao) botao.disabled = true
    mostrarPermissoes({ camera: 'pedindo', localizacao: 'pedindo' })
    // Um pedido de cada vez: alguns navegadores ignoram o segundo aviso se forem simultâneos.
    const camera = await pedirCameraPonto()
    mostrarPermissoes({ camera })
    const posicao = await obterLocalizacao()
    const localizacao = posicao.erro || 'ok'
    autorizacaoPonto = { camera, localizacao, posicao: posicao.erro ? null : posicao }
    mostrarPermissoes({ camera, localizacao })
    if (botao) botao.disabled = false
    if (camera === 'ok' && localizacao === 'ok') telaPinPonto()
}

function telaPinPonto() {
    const bloco = document.querySelector('.ponto-autorizacao')
    if (!bloco) return
    bloco.innerHTML = `
        <h2>Registo de ponto</h2>
        <p class="ponto-autorizado">✓ Câmera e localização autorizadas</p>
        <span>Informe o seu PIN de 4 dígitos</span>
        <input type="password" inputmode="numeric" autocomplete="off" maxlength="4" name="pin" placeholder="PIN de 4 dígitos" onkeydown="if (event.key === 'Enter') verificarColaborador()">
        <button type="button" onclick="verificarColaborador()">Avançar</button>`
    bloco.querySelector('[name="pin"]').focus()
}

async function verificarColaborador() {

    if (autorizacaoPonto.camera !== 'ok' || autorizacaoPonto.localizacao !== 'ok')
        return telaRegistroPonto()

    overlayAguarde()
    const pin = document.querySelector('[name="pin"]')
    const resposta = await colaboradorPin(pin.value)

    if (resposta.mensagem)
        return popup({ mensagem: resposta.mensagem })

    usuarioAtual = resposta
    // Posição atualizada já aqui, em paralelo com o reconhecimento facial.
    localizacaoPonto = obterLocalizacao()

    const fotoUrl = `${api}/uploads/RECONST/${resposta.foto}`

    removerOverlay()
    await validarFacial(fotoUrl)

}

async function colaboradorPin(pin) {
    try {

        const url = `${api}/colaborador`
        const requisicao = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ pin, servidor: 'RECONST' })
        };

        const response = await fetch(url, requisicao)

        // 429 (limite de tentativas) também traz { mensagem }.
        if (!response.ok && response.status !== 429) {
            throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (err) {
        return { err };
    }
}

let refDescriptor = null;

// GPS do telemóvel: obrigatório. O servidor recusa sem localização, imprecisa ou fora do raio do local.
// Resolve com { latitude, longitude, precisao } ou { erro: 'negada' | 'gps' | 'indisponivel' }.
let localizacaoPonto = null
function obterLocalizacao() {
    if (!window.isSecureContext || !navigator.geolocation) return Promise.resolve({ erro: 'indisponivel' })
    return new Promise(resolve => navigator.geolocation.getCurrentPosition(
        p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, precisao: p.coords.accuracy }),
        e => resolve({ erro: e.code === 1 ? 'negada' : 'gps' }),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 }
    ))
}

function mostrarStatus(msg, cls) {
    const liveStatus = document.getElementById('liveStatus');
    if (!liveStatus) return
    liveStatus.textContent = msg;
    liveStatus.className = 'status ' + (cls || '');
}

async function validarFacial(fotoUrl) {

    if (!usuarioAtual.nome)
        return popup({ mensagem: 'Não foi possível identificar o colaborador: Fale com o suporte.' })
    
    const acumulado = `
        
        <div class="card">
            <div style="${horizontal}; justify-content: space-between; margin-bottom: 2vw;">
                <span>Olá, ${usuarioAtual.nome}!</span>
                <img src="imagens/voltar.png" class="voltar" onclick="telaLogin(); pararCam()">
            </div>
            <video id="video" autoplay muted playsinline></video>
            <canvas style="display:none;"></canvas>
            <div id="liveStatus" class="status muted">Câmera parada</div>
        </div>

    `;
    tela.innerHTML = acumulado;

    mostrarStatus('A preparar o reconhecimento facial…', 'warn');
    try { await loadModels(); }
    catch { return mostrarStatus('Não foi possível carregar o reconhecimento facial. Verifique a internet e tente novamente.', 'err'); }
    await iniciarCam()

    const refImg = new Image();
    refImg.crossOrigin = "anonymous"; // garante que seja carregada sem problemas de CORS
    refImg.src = fotoUrl;

    refImg.onload = async () => {
        mostrarStatus('Processando referência…', 'warn');
        refDescriptor = await computeDescriptorFromImage(refImg);
        if (!refDescriptor) {
            mostrarStatus('A foto do seu cadastro não tem um rosto reconhecível. Peça ao encarregado para tirar outra foto.', 'err');
        } else {
            mostrarStatus('Referência pronta', 'ok');
            await baterPonto()
        }
    };

    refImg.onerror = () => {
        mostrarStatus('Erro ao carregar a foto de referência', 'err');
    };
}

async function iniciarCam() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        const video = document.getElementById('video');
        video.srcObject = stream;
        video.onloadedmetadata = () => video.play();
        mostrarStatus('Câmera ativa', 'ok');

        setTimeout(pararCam, 5 * 60 * 1000);
    } catch {
        mostrarStatus('Não foi possível abrir a câmera. Confirme a autorização da câmera e tente novamente.', 'err');
    }
}

function pararCam() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    const video = document.getElementById('video');
    if (!video) return
    video.srcObject = null;
    mostrarStatus('Câmera parada', 'warn');
}

async function baterPonto() {
    if (!refDescriptor)
        return mostrarStatus('Sem referência facial', 'err');

    if (!stream)
        return mostrarStatus('Câmera não iniciada', 'err');

    let tentativa = 60;

    while (0 < tentativa) {
        // Saiu da tela (voltou ao login): para de analisar a câmera.
        if (!document.getElementById('video') || !stream) return
        mostrarStatus(`Verificando… (${tentativa}s)`, 'warn');
        tentativa--

        const liveDesc = await grabLiveDescriptor();
        if (liveDesc) {
            const dist = faceapi.euclideanDistance(refDescriptor, liveDesc);
            const ok = dist <= 0.5;

            if (ok) {
                // A imagem deste momento vai para o servidor, que confere o rosto de novo (o telemóvel não é confiável).
                const selfie = capturarSelfie();
                pararCam();
                telaLogin();

                return enviarPonto(selfie);
            } else {
                mostrarStatus('Rosto não reconhecido: olhe de frente para a câmera.', 'err');
            }
        }

        await new Promise(r => setTimeout(r, 1000)); // espera 1s entre tentativas
    }

    mostrarStatus('Tempo esgotado para reconhecimento', 'err');
}

// Quadro atual da câmera em JPEG, com no máximo 640 px (suficiente para o reconhecimento e leve para enviar).
function capturarSelfie() {
    const video = document.getElementById('video')
    if (!video?.videoWidth) return null
    const escala = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * escala)
    canvas.height = Math.round(video.videoHeight * escala)
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
}

async function enviarPonto(selfie) {
    try {
        if (!selfie)
            return popup({ titulo: 'Câmera', mensagem: 'Não foi possível capturar a imagem da câmera. Tente marcar novamente.' })
        overlayAguarde()
        const data = new Date().toLocaleString()
        const posicao = await (localizacaoPonto || obterLocalizacao())
        localizacaoPonto = null
        // Sem localização não se envia nada (a autorização pode ter sido retirada a meio do processo).
        if (posicao.erro)
            return popup({ titulo: 'Localização necessária', mensagem: `Marcação não enviada.<br><br>${AJUDA_PERMISSAO[posicao.erro]}` })
        const response = await fetch(`${api}/ponto`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ticket: usuarioAtual.ticket, servidor, latitude: posicao.latitude, longitude: posicao.longitude, precisao: posicao.precisao, selfie })
        })

        const resposta = await response.json()
        if (resposta.mensagem)
            return popup({ mensagem: resposta.mensagem })

        // A hora oficial é a do servidor.
        const registrada = resposta.data || data


        // Comprovativo: hora em destaque, tipo com a cor da marcação, local e avisos do gestor.
        const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
        const [dataTexto, horaTexto = ''] = String(registrada).split(/,\s*/)
        const [hh = '', mm = '', ss = ''] = horaTexto.split(':')
        const classeTipo = { 'Entrada': 'entrada', 'Saída almoço': 'saida-almoco', 'Retorno almoço': 'retorno-almoco', 'Saída': 'saida' }[resposta.tipo] || 'neutro'
        const avisos = resposta.avisos?.length
            ? `<div class="ticket-avisos"><b>O seu gestor alterou o seu ponto</b><ul>${resposta.avisos.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>`
            : ''

        popup({
            titulo: 'Marcação realizada',
            elemento: `
                <div class="ticketPonto">
                    <div class="ticket-selo" aria-hidden="true"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></div>
                    <div class="ticket-estado">Ponto registado</div>
                    ${resposta.tipo ? `<span class="ticket-tipo ticket-${classeTipo}">${esc(resposta.tipo)}</span>` : ''}
                    <div class="ticket-hora">${esc(hh)}<span class="ticket-dois-pontos">:</span>${esc(mm)}${ss ? `<small>:${esc(ss)}</small>` : ''}</div>
                    <div class="ticket-data">${esc(dataTexto)}</div>
                    <div class="ticket-corte" aria-hidden="true"></div>
                    <dl class="ticket-detalhes">
                        <div><dt>Colaborador</dt><dd>${esc(usuarioAtual.nome)}</dd></div>
                        ${resposta.local ? `<div><dt>Local</dt><dd>📍 ${esc(resposta.local)}</dd></div>` : ''}
                    </dl>
                    <p class="ticket-nota">Hora oficial do servidor</p>
                    ${avisos}
                </div>`
        })

    } catch (err) {
        popup({ mensagem: `Erro na API: ${err}` })
        throw err
    }
}
