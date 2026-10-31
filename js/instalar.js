// Instalação do app (PWA) a partir do QR code: o QR abre o site com ?instalar=1 e aqui aparece logo o convite.
// O navegador exige sempre um toque para instalar; no Android é o botão "Instalar" (beforeinstallprompt),
// no iPhone o Safari não permite botão e mostramos os passos de "Adicionar ao ecrã principal".
let instalarEvento = null
window.addEventListener('beforeinstallprompt', evento => { instalarEvento = evento })
window.addEventListener('appinstalled', () => {
    instalarEvento = null
    popup({ titulo: 'App instalado', imagem: 'imagens/concluido.png', mensagem: 'Abra o Reconstrular pelo ícone no ecrã inicial. Ao entrar, pode ativar as notificações de mensagens.' })
})

const instalarJaInstalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
const instalarIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

async function instalarApp() {
    if (!instalarEvento) return instalarMostrarPassos()
    const evento = instalarEvento
    instalarEvento = null // cada evento só pode ser usado uma vez
    await evento.prompt()
}

function instalarMostrarPassos() {
    const passos = instalarIos()
        ? `<li>Abra este endereço no <b>Safari</b>.</li><li>Toque em <b>Partilhar</b> (o quadrado com a seta ⬆).</li><li>Escolha <b>Adicionar ao ecrã principal</b> e confirme.</li>`
        : `<li>Abra este endereço no <b>Chrome</b>.</li><li>Toque no menu <b>⋮</b> (canto superior direito).</li><li>Escolha <b>Instalar app</b> (ou <b>Adicionar ao ecrã principal</b>) e confirme.</li>`
    popup({ titulo: 'Instalar o Reconstrular', mensagem: `<ol style="text-align: left; margin: 8px 0; padding-left: 20px; line-height: 1.6;">${passos}</ol>` })
}

// Veio do QR code: convida a instalar e limpa o parâmetro do endereço.
async function instalarDoQr() {
    const url = new URL(location.href)
    if (!url.searchParams.has('instalar')) return
    url.searchParams.delete('instalar')
    history.replaceState(null, '', url)
    if (instalarJaInstalado()) return
    // O Chrome só dispara beforeinstallprompt alguns instantes depois de carregar.
    for (let i = 0; i < 10 && !instalarEvento && !instalarIos(); i++) await new Promise(r => setTimeout(r, 300))
    if (!instalarEvento) return instalarMostrarPassos()
    popup({
        titulo: 'Instalar o Reconstrular',
        mensagem: 'Instale o app neste telemóvel para o abrir pelo ícone, como uma aplicação, e receber notificações das mensagens.',
        botoes: [
            { texto: 'Instalar', img: 'concluido', funcao: 'instalarApp()', fechar: true },
            { texto: 'Agora não', img: 'cancel', fechar: true }
        ]
    })
}

window.addEventListener('load', () => { instalarDoQr() })
