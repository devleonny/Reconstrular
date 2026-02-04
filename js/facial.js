let usuarioAtual = {}
async function loadModels() {
    const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
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

async function telaRegistroPonto() {

    const acumulado = `
        <div id="acesso" class="loginBloco">

            <div class="botaoSuperiorLogin" onclick="telaLogin()">
                <img src="imagens/cracha.png">
                <span>Voltar para a tela de Acesso</span>
            </div>

            <div class="baixoLogin">
            <span>Informe o seu PIN de 4 dígitos</span>
            <input type="text" maxlength="4" name="pin" placeholder="Máximo de 4 dígitos">
            <button onclick="verificarColaborador()">Avançar</butto>
            </div>

        </div>
    `

    tela.innerHTML = acumulado

}

async function verificarColaborador() {

    overlayAguarde()
    const pin = document.querySelector('[name="pin"]')
    const resposta = await colaboradorPin(pin.value)

    if (resposta.mensagem)
        return popup({ mensagem: resposta.mensagem })

    usuarioAtual = resposta

    const fotoUrl = `${api}/uploads/RECONST/${resposta.foto}`

    removerOverlay()
    await validarFacial(fotoUrl)

}

async function colaboradorPin(pin, idColaborador) {
    try {

        const url = `${api}/colaborador`
        const requisicao = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ idColaborador, pin, servidor: 'RECONST' })
        };

        const response = await fetch(url, requisicao)

        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (err) {
        return { err };
    }
}

let refDescriptor = null;

function mostrarStatus(msg, cls) {
    const liveStatus = document.getElementById('liveStatus');
    if (!liveStatus) return
    liveStatus.textContent = msg;
    liveStatus.className = 'status ' + (cls || '');
}

async function validarFacial(fotoUrl) {
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

    await loadModels();
    await iniciarCam()

    const refImg = new Image();
    refImg.crossOrigin = "anonymous"; // garante que seja carregada sem problemas de CORS
    refImg.src = fotoUrl;

    refImg.onload = async () => {
        mostrarStatus('Processando referência…', 'warn');
        refDescriptor = await computeDescriptorFromImage(refImg);
        if (!refDescriptor) {
            mostrarStatus('Nenhum rosto detectado na foto', 'err');
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
        mostrarStatus('Falha ao iniciar câmera', 'err');
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
    if (!refDescriptor) return mostrarStatus('Sem referência facial', 'err');
    if (!stream) return mostrarStatus('Câmera não iniciada', 'err');

    let tentativa = 60;

    while (0 < tentativa) {
        mostrarStatus(`Verificando… (${tentativa}s)`, 'warn');
        tentativa--

        const liveDesc = await grabLiveDescriptor();
        if (liveDesc) {
            const dist = faceapi.euclideanDistance(refDescriptor, liveDesc);
            const ok = dist <= 0.5;

            if (ok) {
                pararCam();
                telaLogin();

                return enviarPonto();
            } else {
                mostrarStatus(`Negado (dist ${dist.toFixed(4)})`, 'err');
            }
        }

        await new Promise(r => setTimeout(r, 1000)); // espera 1s entre tentativas
    }

    mostrarStatus('Tempo esgotado para reconhecimento', 'err');
}

async function enviarPonto() {
    try {
        overlayAguarde()
        const data = new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })
        const response = await fetch(`${api}/ponto`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ idColaborador: usuarioAtual.idColaborador, data, servidor })
        })

        const resposta = await response.json()
        if (resposta.mensagem)
            return popup({ mensagem: resposta.mensagem })

        const elemento = `
            <div class="ticketPonto">
                <span>${usuarioAtual.nome}</span>
                <span><strong>${data}</strong></span>
                <span>Realizado</span>
            </div>
        `
        popup({ elemento, titulo: 'Marcação realizada' })

    } catch (err) {
        popup({ mensagem: `Erro na API: ${err}` })
        throw err
    }
}
