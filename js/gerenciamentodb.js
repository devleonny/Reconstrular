// Utilitários de salvamento;
const isAndroid = typeof cordova !== "undefined" || typeof Capacitor !== "undefined";
const dadosJsonPath = "dados.json"; // no Android será no filesystem do app

async function lerArquivoJSON() {
    return new Promise((resolve, reject) => {
        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, (dir) => {
            dir.getFile(dadosJsonPath, { create: true }, (fileEntry) => {
                fileEntry.file((file) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        try {
                            resolve(reader.result ? JSON.parse(reader.result) : {});
                        } catch {
                            resolve({});
                        }
                    };
                    reader.readAsText(file);
                });
            });
        }, reject);
    });
}

async function salvarArquivoJSON(obj) {
    return new Promise((resolve, reject) => {
        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, (dir) => {
            dir.getFile(dadosJsonPath, { create: true }, (fileEntry) => {
                fileEntry.createWriter((writer) => {
                    writer.onwriteend = resolve;
                    writer.onerror = reject;
                    writer.write(JSON.stringify(obj));
                });
            });
        }, reject);
    });
}

async function inserirDados(dados, nomeBase, resetar) {

    if (isAndroid) {
        let banco = await lerArquivoJSON();
        banco[nomeBase] = banco[nomeBase] || {};

        let dadosMesclados = resetar
            ? dados
            : { ...banco[nomeBase], ...dados };

        // remove os marcados como excluído
        dadosMesclados = Object.fromEntries(
            Object.entries(dadosMesclados).filter(([_, v]) => !v?.excluido)
        );

        banco[nomeBase] = dadosMesclados;
        await salvarArquivoJSON(banco);
        return;
    }

    // ----- Navegador (IndexedDB) -----
    return await inserirDadosIndexedDB(dados, nomeBase, resetar);
}

async function recuperarDados(nomeBase) {
    if (isAndroid) {
        let banco = await lerArquivoJSON();
        return banco[nomeBase] || {};
    }
    return await recuperarDadosIndexedDB(nomeBase);
}

async function recuperarDado(nomeBase, id) {
    if (isAndroid) {
        let banco = await lerArquivoJSON();
        return banco[nomeBase]?.[id] || null;
    }
    return await recuperarDadoIndexedDB(nomeBase, id);
}

// Mecânicas para o navegador;
async function inserirDadosIndexedDB(dados, nomeBase, resetar) {

    const versao = await new Promise((resolve, reject) => {

        const req = indexedDB.open(nomeBaseCentral);
        req.onsuccess = () => {
            const db = req.result;
            const precisaCriar = !db.objectStoreNames.contains(nomeStore);
            const versaoAtual = db.version;
            db.close();
            resolve(precisaCriar ? versaoAtual + 1 : versaoAtual);
        };
        req.onerror = (e) => {
            reject(e.target.error);
        };
    });

    const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open(nomeBaseCentral, versao);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(nomeStore)) {
                db.createObjectStore(nomeStore, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => {
            resolve(req.result);
        };
        req.onerror = (e) => {
            reject(e.target.error);
        };
    });

    const tx = db.transaction(nomeStore, 'readwrite');
    const store = tx.objectStore(nomeStore);

    let dadosMesclados = {}

    if (!resetar) {
        const antigo = await new Promise((resolve, reject) => {
            const req = store.get(nomeBase);
            req.onsuccess = () => {
                resolve(req.result?.dados || {});
            };
            req.onerror = (e) => {
                reject(e.target.error);
            };
        });

        dadosMesclados = { ...antigo, ...dados };
    } else {
        dadosMesclados = dados
    }

    dadosMesclados = Object.fromEntries(
        Object.entries(dadosMesclados).filter(([_, valor]) => !valor?.excluido)
    );

    await store.put({ id: nomeBase, dados: dadosMesclados });

    await new Promise((resolve, reject) => {
        tx.oncomplete = () => {
            resolve();
        };
        tx.onerror = (e) => {
            reject(e.target.error);
        };
    });

    db.close();
}

async function recuperarDadosIndexedDB(nomeBase) {

    const getDadosPorBase = async (base) => {
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(nomeBaseCentral);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.mensagem);
        });

        if (!db.objectStoreNames.contains(nomeStore)) {
            return {};
        }

        const tx = db.transaction(nomeStore, 'readonly');
        const store = tx.objectStore(nomeStore);

        const item = await new Promise((resolve, reject) => {
            const req = store.get(base);
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e.target.mensagem);
        });

        db.close();

        return item?.dados || {};
    };

    return await getDadosPorBase(nomeBase);
}

async function recuperarDadoIndexedDB(nomeBase, id) {
    const abrirDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(nomeBaseCentral);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.mensagem);
        });
    };

    const buscar = async (db, base, id) => {
        if (!db.objectStoreNames.contains(nomeStore)) return null;

        const tx = db.transaction(nomeStore, 'readonly');
        const store = tx.objectStore(nomeStore);

        const registro = await new Promise((resolve, reject) => {
            const req = store.get(base);
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e.target.mensagem);
        });

        return registro?.dados?.[id] || null;
    };

    const db = await abrirDB();
    let resultado = await buscar(db, nomeBase, id);

    db.close();
    return resultado;
}

async function deletarDB(base, idInterno) {
    if (isAndroid) {
        return await deletarDBJson(base, idInterno);
    } else {
        return await deletarDBIndexedDB(base, idInterno);
    }
}

// ----- Android (JSON local) -----
async function deletarDBJson(base, idInterno) {
    let banco = await lerArquivoJSON();

    if (banco[base] && banco[base][idInterno]) {
        delete banco[base][idInterno];
        await salvarArquivoJSON(banco);
    }
}

// ----- Navegador (IndexedDB) -----
async function deletarDBIndexedDB(base, idInterno) {

    const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(nomeBaseCentral);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });

    if (!db.objectStoreNames.contains(nomeStore)) {
        db.close();
        return;
    }

    const tx = db.transaction(nomeStore, 'readwrite');
    const store = tx.objectStore(nomeStore);

    // Pega o objeto inteiro da base
    const registro = await new Promise((resolve, reject) => {
        const req = store.get(base);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
    });

    if (registro && registro.dados && registro.dados[idInterno]) {
        delete registro.dados[idInterno];

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

    db.close();
}
