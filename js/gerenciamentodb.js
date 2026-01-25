const nomeBaseCentral = 'Reconstrular'
const nomeStore = 'Bases'

async function deletarDB(base, idInterno) {

    const dbGCS = await new Promise((resolve, reject) => {
        const request = indexedDB.open(nomeBaseCentral);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });

    if (!dbGCS.objectStoreNames.contains(nomeStore)) {
        dbGCS.close();
        return;
    }

    const tx = dbGCS.transaction(nomeStore, 'readwrite');
    const store = tx.objectStore(nomeStore);

    // Pega o objeto inteiro da base
    const registro = await new Promise((resolve, reject) => {
        const req = store.get(base);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
    });

    if (registro && registro.dados && registro.dados[idInterno]) {
        delete registro.dados[idInterno]; // remove o item interno

        // Salva de volta com o mesmo id
        await new Promise((resolve, reject) => {
            const putReq = store.put(registro);
            putReq.onsuccess = resolve;
            putReq.onerror = (e) => reject(e.target.error);
        });
    }

    await new Promise((resolve) => {
        tx.oncomplete = resolve;
    });

    dbGCS.close()
}

async function resetarTudo() {

    // Limpar variáveis;
    db = {}

    const dbGCS = await new Promise((resolve, reject) => {
        const req = indexedDB.open(nomeBaseCentral)
        req.onsuccess = () => resolve(req.result)
        req.onerror = e => reject(e.target.error)
    })

    const stores = [...dbGCS.objectStoreNames]

    if (!stores.length) {
        dbGCS.close()
        return
    }

    const tx = dbGCS.transaction(stores, 'readwrite')

    for (const nomeStore of stores) {
        tx.objectStore(nomeStore).clear()
    }

    await new Promise((resolve, reject) => {
        tx.oncomplete = resolve
        tx.onerror = reject
    })

    dbGCS.close()

}

async function inserirDados(dados, nomeBase, resetar) {

    const versao = await new Promise((resolve, reject) => {
        const req = indexedDB.open(nomeBaseCentral);
        req.onsuccess = () => {
            const dbGCS = req.result;
            const precisaCriar = !dbGCS.objectStoreNames.contains(nomeStore);
            const versaoAtual = dbGCS.version;
            dbGCS.close();
            resolve(precisaCriar ? versaoAtual + 1 : versaoAtual);
        };
        req.onerror = (e) => reject(e.target.error);
    });

    const dbGCS = await new Promise((resolve, reject) => {
        const req = indexedDB.open(nomeBaseCentral, versao);
        req.onupgradeneeded = (e) => {
            const dbGCS = e.target.result;
            if (!dbGCS.objectStoreNames.contains(nomeStore)) {
                dbGCS.createObjectStore(nomeStore, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
    });

    const tx = dbGCS.transaction(nomeStore, 'readwrite');
    const store = tx.objectStore(nomeStore);

    let dadosMesclados = {}

    if (!resetar) {

        const antigo = await new Promise((resolve, reject) => {
            const req = store.get(nomeBase);
            req.onsuccess = () => resolve(req.result?.dados || {});
            req.onerror = (e) => reject(e.target.error);
        });

        dadosMesclados = { ...antigo, ...dados };

    } else {
        dadosMesclados = dados
    }

    for (let [id, objeto] of Object.entries(dadosMesclados)) {
        if (objeto.excluido) {
            const trExistente = document.getElementById(id)
            if (trExistente) trExistente.remove()
            delete dadosMesclados[id]
        }
    }

    await store.put({ id: nomeBase, dados: dadosMesclados });

    await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = reject;
    });

    dbGCS.close();
}

async function recuperarDados(nomeBase) {

    const getDadosPorBase = async (base) => {
        const dbGCS = await new Promise((resolve, reject) => {
            const request = indexedDB.open(nomeBaseCentral);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });

        if (!dbGCS.objectStoreNames.contains(nomeStore)) {
            return {};
        }

        const tx = dbGCS.transaction(nomeStore, 'readonly');
        const store = tx.objectStore(nomeStore);

        const item = await new Promise((resolve, reject) => {
            const req = store.get(base);
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e.target.error);
        });

        dbGCS.close();

        return item?.dados || {};
    };

    return await getDadosPorBase(nomeBase);
}

async function recuperarDado(nomeBase, id) {
    const abrirDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(nomeBaseCentral);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    };

    const buscar = async (dbGCS, base, id) => {
        if (!dbGCS.objectStoreNames.contains(nomeStore)) return null;

        const tx = dbGCS.transaction(nomeStore, 'readonly');
        const store = tx.objectStore(nomeStore);

        const registro = await new Promise((resolve, reject) => {
            const req = store.get(base);
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e.target.error);
        });

        return registro?.dados?.[id] || null;
    };

    const dbGCS = await abrirDB();
    let resultado = await buscar(dbGCS, nomeBase, id);

    dbGCS.close();
    return resultado;
}

/* Funções auxiliares de filtro nos objetos;

    "teste" → igual

    "!teste" → diferente

    "~teste" → contém

    "!~teste" → não contém

*/

function comparar(valorAtual, valorFiltro) {
    if (typeof valorFiltro === 'string') {
        if (valorFiltro.startsWith('!~'))
            return !String(valorAtual ?? '').includes(valorFiltro.slice(2))

        if (valorFiltro.startsWith('!'))
            return valorAtual !== valorFiltro.slice(1)

        if (valorFiltro.startsWith('~'))
            return String(valorAtual ?? '').includes(valorFiltro.slice(1))
    }

    return valorAtual === valorFiltro
}

function buscarCampo(obj, campo, valorFiltro, negativo = false) {
    if (!obj || typeof obj !== 'object') return negativo

    if (campo in obj) {
        const ok = comparar(obj[campo], valorFiltro)
        return negativo ? !ok : ok
    }

    return Object.values(obj).some(v =>
        buscarCampo(v, campo, valorFiltro, negativo)
    )
}

function contemCampoValor(obj, campo, valorFiltro) {
    const negativo =
        typeof valorFiltro === 'string' && valorFiltro.startsWith('!')

    if (negativo) {
        return !buscarCampo(obj, campo, valorFiltro.slice(1), false)
    }

    return buscarCampo(obj, campo, valorFiltro, false)
}

async function sincronizarDados(base, overlay = false, resetar = false, filtro = {}) {

    if (overlay) overlayAguarde()

    let nuvem = await receber(base, resetar) || {}

    nuvem = Object.fromEntries(
        Object.entries(nuvem).filter(([_, obj]) => !obj?.excluido)
    )

    if (Object.keys(filtro).length) {
        combinado = Object.fromEntries(
            Object.entries(combinado).filter(([_, obj]) =>
                Object.entries(filtro).every(([campo, valor]) =>
                    contemCampoValor(obj, campo, valor)
                )
            )
        )
    }

    await inserirDados(nuvem, base, resetar)

    if (overlay) removerOverlay()

    return await recuperarDados(base)
}

// SERVIÇO DE ARMAZENAMENTO 
async function receber(chave, resetar = false) {
    try {

        let timestamp = 0

        if (!resetar) {
            const chavePartes = chave.split('/')
            const dados = await recuperarDados(chavePartes[0]) || {}
            for (const objeto of Object.values(dados)) {
                if (objeto.timestamp > timestamp) timestamp = objeto.timestamp
            }
        }

        const response = await fetch(`${api}/dados`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario: acesso.usuario, chave, servidor, timestamp })
        })

        if (!response.ok) {
            throw new Error(`Erro ${response.status}`)
        }

        const data = await response.json()

        if (data?.mensagem) {
            console.log(data.mensagem)
            return {}
        }

        return data
    } catch (err) {
        console.log(err.message)
        return {}
    }
}

async function deletar(caminho, idEvento) {

    const url = `${api}/deletar`

    const objeto = {
        caminho,
        usuario: acesso.usuario
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(objeto)
        })

        if (!response.ok) {
            console.error(`Falha ao deletar: ${response.status} ${response.statusText}`)
            const erroServidor = await response.text()
            console.error(`Resposta do servidor:`, erroServidor)
            throw new Error(`Erro HTTP ${response.status}`)
        }

        const data = await response.json()

        if (idEvento) removerOffline('deletar', idEvento)

        return data
    } catch (erro) {
        console.error(`Erro ao tentar deletar '${caminho}':`, erro.message || erro)
        salvarOffline(objeto, 'deletar', idEvento)
        removerOverlay()
        return null
    }
}

function removerOffline(operacao, idEvento) {
    let dados_offline = JSON.parse(localStorage.getItem('dados_offline'))
    delete dados_offline?.[operacao]?.[idEvento]
    localStorage.setItem('dados_offline', JSON.stringify(dados_offline))
}

async function enviar(caminho, info, idEvento) {
    const url = `${api}/salvar`
    const objeto = { caminho, servidor, valor: info };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(objeto)
        });

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            // Erro ao tentar interpretar como JSON;
            console.error("Resposta não é JSON válido:", parseError);
            salvarOffline(objeto, 'enviar', idEvento);
            return null;
        }

        if (!response.ok) {
            // Se a API respondeu erro (ex: 400, 500);
            console.error("Erro HTTP:", response.status, data);
            salvarOffline(objeto, 'enviar', idEvento);
            return null;
        }

        if (idEvento) removerOffline('enviar', idEvento);

        return data;
    } catch (erro) {
        console.error("Erro na requisição:", erro);
        salvarOffline(objeto, 'enviar', idEvento);
        return null;
    }
}

function salvarOffline(objeto, operacao, idEvento) {
    let dados_offline = JSON.parse(localStorage.getItem('dados_offline')) || {}
    idEvento = idEvento || ID5digitos()

    if (!dados_offline[operacao]) dados_offline[operacao] = {}
    dados_offline[operacao][idEvento] = objeto

    localStorage.setItem('dados_offline', JSON.stringify(dados_offline))
}

function msgQuedaConexao(msg = '<b>Falha na atualização:</b> tente novamente em alguns minutos.') {

    const elemento = `
        <div class="msg-queda-conexao">
            <img src="gifs/alerta.gif" style="width: 2rem;">
            <span>${msg}</span>
        </div>
    `
    const msgAtiva = document.querySelector('.msg-queda-conexao')
    if (msgAtiva) return
    popup({ elemento })
}