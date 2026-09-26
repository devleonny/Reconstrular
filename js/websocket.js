let socket
let reconnectInterval = 30000
let reconnectTimeout = null
let reconectando = false
let priExe = true
let encerrandoAcesso = false

connectWebSocket()

async function encerrarAcesso(mensagem) {
    clearTimeout(reconnectTimeout)

    localStorage.removeItem('acesso')

    if (acesso && typeof acesso === 'object') {
        for (const chave of Object.keys(acesso))
            delete acesso[chave]
    }

    if (socket?.readyState === WebSocket.OPEN)
        socket.close()

    await telaLogin()

    const info = `<span id="bloqueio_acesso">${mensagem}</span>`
    const existente = document.getElementById('bloqueio_acesso')
    if (!existente)
        popup({ mensagem: info })

}

function connectWebSocket() {
    if (reconectando || !localStorage.getItem('acesso'))
        return

    reconectando = true

    if (socket) {
        try {
            socket.onopen = null
            socket.onmessage = null
            socket.onerror = null
            socket.onclose = null
            socket.close()
        } catch { }
    }

    socket = new WebSocket(`${api}:8443`)

    comunicacao()

    socket.onopen = async () => {
        reconectando = false
        clearTimeout(reconnectTimeout)

        msgStatus('Conectado ao servidor...')

        const valido = await validarAcesso()

        if (!valido) {
            socket.close()
            return
        }

        msg({
            tipo: 'validar',
            usuario: acesso.usuario
        })
    }

    socket.onerror = () => {
        socket.close()
    }

    socket.onclose = () => {
        reconectando = false

        if (!localStorage.getItem('acesso'))
            return

        msgStatus('Servidor offline', 3)

        clearTimeout(reconnectTimeout)
        reconnectTimeout = setTimeout(connectWebSocket, reconnectInterval)
    }
}

async function validarAcesso() {
    const dadosAcesso = JSON.parse(localStorage.getItem('acesso')) || {}
    const { token } = dadosAcesso

    msgStatus('Validando acesso...')

    if (!token) {
        await encerrarAcesso('Sessão inválida')
        return false
    }

    try {
        const resp = await fetch(`${api}/validar-token`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        if (!resp.ok) {
            const dadosErro = await resp.json().catch(() => ({}))

            await encerrarAcesso(
                dadosErro.erro ||
                dadosErro.mensagem ||
                'Sessão expirada, faça login novamente'
            )

            return false
        }

        return true
    } catch (err) {
        console.error(err)

        await encerrarAcesso(
            err.message === 'Acesso bloqueado'
                ? 'Seu acesso foi bloqueado'
                : 'Sessão expirada, faça login novamente'
        )

        return false
    }
}

function msg(dados) {
    if (socket?.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify(dados))
}

function msgStatus(msg, s = 2) {
    const simbolos = {
        1: '🟢🟢🟢',
        2: '🟠🟠🟠',
        3: '🔴🔴🔴'
    }

    msg = `${simbolos[s]} ${msg} ${new Date().toLocaleString()}`

    const divMensagem = document.querySelector('.div-mensagem')

    if (divMensagem)
        divMensagem.insertAdjacentHTML('beforeend', `<span>${msg}</span>`)

    console.log(msg)
}

function comunicacao() {
    socket.onmessage = async event => {
        let data

        try {
            data = JSON.parse(event.data)
        } catch {
            return
        }

        const {
            tabela,
            desconectar,
            resetarAcesso,
            erro,
            validado,
            tipo,
            usuario,
            status
        } = data

        if (desconectar || resetarAcesso) {
            await encerrarAcesso(
                erro === 'Acesso bloqueado'
                    ? 'Seu acesso foi bloqueado'
                    : erro || 'Usuário desconectado'
            )

            return
        }

        if (validado) {
            if (validado === 'Sim') {
                msgStatus('Acesso validado', 1)

                if (priExe) {
                    priExe = false
                    await telaPrincipal()
                }
            } else {
                overlayAguarde()

                msgStatus('Offline', 3)
                msgStatus('Alteração no acesso recebida...')

                await telaPrincipal()

                msg({
                    tipo: 'confirmado',
                    usuario: acesso.usuario
                })

                msgStatus('Tudo certo', 1)
            }

            acesso.status = 'online'
            await usuariosToolbar()
            removerOverlay()
        }

        if (tipo === 'atualizacao') {
            await paginacao()

            if (tabela === 'mensagens')
                await verificarMensagens()
        }

        if (tipo === 'status') {
            await usuariosToolbar()
            balaoUsuario(status, usuario)
        }
    }
}

async function verificarMensagens() {

}