let socket;
let reconnectInterval = 30000;
connectWebSocket();

async function connectWebSocket() {
    socket = new WebSocket(`${api}:8443`)
    socket.onopen = () => {
        if (acesso) {
            socket.send(JSON.stringify({
                tipo: 'autenticar',
                usuario: acesso.usuario,
                servidor
            }))
        }
        console.log(`🟢🟢🟢 WS ${new Date().toLocaleString()} 🟢🟢🟢`)
    }

    socket.onmessage = async (event) => {

        const { tabela } = JSON.parse(event.data)

        if (tabela == 'dados_setores') {
            const { usuario, timestamp = 0 } = JSON.parse(localStorage.getItem('acesso')) || {}
            const us = await recuperarDado('dados_setores', usuario)

            if (us?.timestamp !== timestamp) {
                localStorage.setItem('acesso', JSON.stringify(us))
            }
        }

        if (tabela)
            await sincronizarDados({ base: tabela })

        if (tabela == 'mensagens')
            await alertaMensagens()


    }

    socket.onclose = () => {
        console.log(`🔴🔴🔴 WS ${new Date().toLocaleString()} 🔴🔴🔴`)
        console.log(`Tentando reconectar em ${reconnectInterval / 1000} segundos...`)
        setTimeout(connectWebSocket, reconnectInterval)
    }

}
