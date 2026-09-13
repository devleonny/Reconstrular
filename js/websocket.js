let socket
let reconnectInterval = 30000
let reconnectTimeout = null
let reconectando = false
let priExe = true

connectWebSocket()

function connectWebSocket() {
    if (reconectando)
        return

    reconectando = true

    if (socket) {
        try {
            socket.onopen = null
            socket.onmessage = null
            socket.onerror = null
            socket.onclose = null
            socket.close()
        } catch {}
    }

    socket = new WebSocket(`${api}:8443`)

    comunicacao()

    socket.onopen = async () => {
        reconectando = false
        clearTimeout(reconnectTimeout)

        msgStatus('Conectado ao servidor...')

        const valido = await validarAcesso()

        if (!valido)
            return

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
        localStorage.removeItem('acesso')
        await telaLogin()
        return false
    }

    try {
        const resp = await fetch(`${api}/validar-token`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })

        if (!resp.ok)
            throw new Error('Token inválido')

        return true

    } catch (err) {
        console.error(err)

        localStorage.removeItem('acesso')

        await telaLogin()

        popup({
            mensagem: 'Sessão expirada, faça login novamente'
        })

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
            validado,
            tipo,
            usuario,
            status
        } = data

        if (desconectar) {
            localStorage.removeItem('acesso')

            await telaLogin()

            popup({
                mensagem: 'Usuário desconectado'
            })

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
            for (const [pag, dados] of Object.entries(controles)) {
                if (
                    dados.base === 'vw_objetivos' &&
                    tabela === 'cidades'
                ) {
                    await paginacao(pag)
                    continue
                }

                if (dados.base !== tabela)
                    continue

                await paginacao(pag)
            }

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