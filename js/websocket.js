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

        const data = JSON.parse(event.data)

        console.log(data);

        if (data.tipo == 'exclusao') { // Só se for no nível
            await deletarDB(data.tabela, data.id)

        } else if (data.tipo == 'atualizacao') {

            if (data.tabela == 'dados_setores' && data?.id == acesso?.usuario && data?.dados?.excluído) {
                await removerAcesso()
            }

            await inserirDados({ [data.id]: data.dados }, data.tabela)

            if(data.tabela == 'mensagens') await alertaMensagens()

        } else if (data.tipo == 'status') {

            const user = await recuperarDado('dados_setores', data.usuario)
            if (user) {
                user.status = data.status
                await inserirDados({ [data.usuario]: user }, 'dados_setores')
            }

        }

    }

    socket.onclose = () => {
        console.log(`🔴🔴🔴 WS ${new Date().toLocaleString()} 🔴🔴🔴`);
        console.log(`Tentando reconectar em ${reconnectInterval / 1000} segundos...`)
        setTimeout(connectWebSocket, reconnectInterval);
    }

}