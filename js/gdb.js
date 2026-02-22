const nomeBase = 'Reconstrular'
const versao = 1
let bloqSinc = false
let dbInstance = null

const basesAuxiliares = {
    'campos': { keyPath: 'id' },
    'cidades': { keyPath: 'id' },
    'dados_clientes': { keyPath: 'id' },
    'dados_colaboradores': { keyPath: 'id' },
    'dados_despesas': { keyPath: 'id' },
    'dados_obras': { keyPath: 'id' },
    'dados_orcamentos': { keyPath: 'id' },
    'dados_setores': { keyPath: 'usuario' },
    'ferramentas': { keyPath: 'id' },
    'fornecedores': { keyPath: 'id' },
    'funcoes': { keyPath: 'id' },
    'mao_obra': { keyPath: 'id' },
    'materiais': { keyPath: 'id' },
    'mensagens': { keyPath: 'id' }
}

async function verificarVersaoEsperada(versaoEsperada) {
    const dbs = await indexedDB.databases()
    const dbInfo = dbs.find(db => db.name === nomeBase)

    if (dbInfo && dbInfo.version !== versaoEsperada) {
        await resetarBanco()
    }
}

function resetarBanco() {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            dbInstance.close()
            dbInstance = null
        }

        const request = indexedDB.deleteDatabase(nomeBase)

        request.onsuccess = () => resolve(true)
        request.onerror = () => reject(request.error)
        request.onblocked = () => console.warn('Banco bloqueado')
    })
}

function criarBases(stores = null) {

    bloqSinc = true

    if (!stores)
        return

    const request = indexedDB.open(nomeBase, versao)

    request.onupgradeneeded = e => {
        const db = e.target.result

        Object.entries(stores).forEach(([nome, config]) => {
            if (!db.objectStoreNames.contains(nome)) {
                const store = db.createObjectStore(nome, config)

                store.createIndex(
                    'timestamp',
                    'timestamp',
                    { unique: false }
                )
            }
        })
    }

    bloqSinc = false
}

function getDB() {
    if (dbInstance) return Promise.resolve(dbInstance)

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(nomeBase, versao)

        request.onerror = () => reject(request.error)

        request.onsuccess = e => {
            dbInstance = e.target.result
            resolve(dbInstance)
        }
    })
}

async function atualizarSis(resetar) {

    if (emAtualizacao)
        return

    await verificarVersaoEsperada(versao)

    mostrarMenus(true)

    emAtualizacao = true
    sincronizarApp()

    criarBases(basesAuxiliares)

    const status = { total: Object.keys(basesAuxiliares).length + 1, atual: 1 }

    sincronizarApp(status)

    status.atual++

    for (const base of Object.keys(basesAuxiliares)) {

        sincronizarApp(status)

        await sincronizarDados({ base, resetar })

        status.atual++

    }

    sincronizarApp({ remover: true })
    emAtualizacao = false
    priExeGCS = false

}

async function verifBase() {
    const bases = await indexedDB.databases()
    const existe = bases.some(db => db.name === nomeBase)

    if (!existe)
        criarBases(basesAuxiliares)
}

async function sincronizarDados({ base, resetar = false }) {

    await verifBase()

    try {
        const db = await getDB()
        let timestamp = 0

        if (resetar) {

            await new Promise((resolve, reject) => {
                const tx = db.transaction(base, 'readwrite')
                const store = tx.objectStore(base)

                store.clear()

                tx.oncomplete = resolve
                tx.onerror = () => reject(tx.error)
            })

        } else {

            timestamp = await new Promise((resolve, reject) => {
                const tx = db.transaction(base, 'readonly')
                const store = tx.objectStore(base)
                const index = store.index('timestamp')

                const req = index.openCursor(null, 'prev')

                req.onsuccess = e => {
                    const cursor = e.target.result
                    resolve(cursor ? cursor.value.timestamp : 0)
                }

                req.onerror = () => reject(req.error)
            })

        }

        const response = await fetch(`${api}/dados`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chave: base, timestamp })
        })

        if (!response.ok) {
            throw new Error(`Erro ${response.status}`)
        }

        const data = await response.json()

        if (data?.mensagem) {
            console.log(data.mensagem)
            return {}
        }

        return inserirDados(data, base)

    } catch (err) {
        console.log(err.message)
        return {}
    }
}

// Regras SNAPSHOT; BUSCAS;
const regrasSnapshot = {
    dados_setores: {
        stores: ['funcoes', 'cidades'],
        snapshot: async ({ dado, stores }) => {

            const snap = {}

            let { nome } = await getStore(stores.funcoes, dado?.funcao) || ''
            snap.funcao = nome || ''

            nome = await getStore(stores.cidades, dado?.cidade) || ''
            snap.cidade = nome

            return snap
        }
    }
}

function getStore(store, key) {
    return new Promise(resolve => {

        if (key === undefined || key === null || key === '') {
            return resolve(null)
        }

        const req = store.get(key)

        req.onsuccess = () => resolve(req.result || null)
        req.onerror = () => resolve(null)
    })
}

async function inserirDados(dados, base) {

    const db = await getDB()

    return new Promise(async (resolve, reject) => {

        const regra = regrasSnapshot[base]
        const storesExtras = regra?.stores || []

        const tx = db.transaction([base, ...new Set(storesExtras)], 'readwrite')
        const storePrincipal = tx.objectStore(base)

        const stores = {}
        for (const nome of storesExtras)
            stores[nome] = tx.objectStore(nome)

        tx.onerror = () => reject(tx.error)

        tx.oncomplete = async () => {
            await paginacao()
            resolve(true)
        }

        for (const [id, d] of Object.entries(dados)) {

            const keyPath = storePrincipal.keyPath

            if (keyPath && d[keyPath] == undefined) {
                console.warn('Objeto sem chave')
                continue
            }

            if (d.excluido) {
                const key = isNaN(id) ? id : Number(id)
                storePrincipal.delete(key)
                continue
            }

            if (regra?.snapshot) {
                d.snapshots = await regra.snapshot({
                    dado: d,
                    stores
                })
            }

            storePrincipal.put(d)
        }
    })
}

async function recuperarDado(base, chave) {

    await verifBase()

    if (chave === undefined || chave === null)
        return null

    if (basesAuxiliares[base]?.tipo === 'NUMBER')
        chave = Number(chave)

    if (basesAuxiliares[base]?.tipo === 'STRING')
        chave = String(chave)

    const db = await getDB()

    return new Promise((resolve, reject) => {

        const tx = db.transaction(base, 'readonly')
        const store = tx.objectStore(base)

        const req = store.get(chave)

        req.onsuccess = () => resolve(req.result ?? null)
        req.onerror = () => reject(req.error)
    })
}

async function pesquisarDB({ filtros = {}, base, pagina = 1, limite = 50 }) {

    const offset = (pagina - 1) * limite
    let vistos = 0
    let total = 0
    const resultados = []

    // CASO 1: base é array ou objeto (memória)
    if (typeof base === 'object') {

        const lista = Array.isArray(base)
            ? base
            : Object.values(base)

        for (const reg of lista) {
            if (passaFiltro(reg, filtros)) {
                total++

                if (vistos >= offset && resultados.length < limite) {
                    resultados.push(reg)
                }
                vistos++
            }
        }

        return {
            resultados,
            total,
            paginas: Math.ceil(total / limite)
        }
    }

    // CASO 2: base é string → IndexedDB
    const db = await getDB()
    const tx = db.transaction(base, 'readonly')
    const store = tx.objectStore(base)
    const index = store.index('timestamp')

    return new Promise(resolve => {

        index.openCursor(null, 'prev').onsuccess = ev => {
            const cursor = ev.target.result
            if (!cursor) {
                resolve({
                    resultados,
                    total,
                    paginas: Math.ceil(total / limite)
                })
                return
            }

            const reg = cursor.value

            if (passaFiltro(reg, filtros)) {
                total++

                if (vistos >= offset && resultados.length < limite)
                    resultados.push(reg)

                vistos++
            }

            cursor.continue()
        }
    })
}

// Situações onde seja contado itens em objetos acoes.*.status com filtro no mesmo objeto 'acoes.*.responsavel;
function resolveWildcard(reg, path) {
    const parts = path.split('.')
    const idx = parts.indexOf('*')

    const basePath = parts.slice(0, idx).join('.')
    const restPath = parts.slice(idx + 1).join('.')

    const base = basePath ? getByPath(reg, basePath) : reg
    if (!base || typeof base !== 'object') return []

    const out = []

    for (const k in base) {
        out.push({
            ctx: base[k],
            valor: restPath ? getByPath(base[k], restPath) : base[k]
        })
    }

    return out
}

function getByPath(obj, path) {
    if (!path) return obj
    return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

function isVazio(v) {
    if (v === null || v === undefined) return true
    if (typeof v === 'string' && v.trim() === '') return true
    if (Array.isArray(v) && v.length === 0) return true
    if (typeof v === 'object' && Object.keys(v).length === 0) return true
    return false
}

function comparar(v, op, value) {

    const isStringV = typeof v === 'string'
    const isStringValue = typeof value === 'string'

    const vNorm = isStringV ? v.toLowerCase() : v
    const valueNorm = isStringValue ? value.toLowerCase() : value

    if (typeof op === 'string' && op.endsWith('d')) {
        const operador = op.slice(0, -1)
        const vT = toTimestamp(v)
        const valT = toTimestamp(value)
        if (vT == null || valT == null) return false

        switch (operador) {
            case '>': return vT > valT
            case '>=': return vT >= valT
            case '<': return vT < valT
            case '<=': return vT <= valT
        }
        return false
    }

    switch (op) {
        case 'IS_EMPTY': return isVazio(v)
        case 'NOT_EMPTY': return !isVazio(v)

        case '=': return vNorm === valueNorm
        case '!=': return vNorm !== valueNorm

        case '>': return v > value
        case '>=': return v >= value
        case '<': return v < value
        case '<=': return v <= value

        case 'NOT_ZERO':
            if (Array.isArray(v))
                return Number(v[0]) !== 0
            return Number(v) !== 0

        case 'includes':
            if (v == null) return false
            if (Array.isArray(v))
                return v.some(i =>
                    String(i).toLowerCase().includes(String(value).toLowerCase())
                )
            return String(v).toLowerCase().includes(String(value).toLowerCase())
    }

    return true
}

function multiplasRegras(valor, regra) {
    if (Array.isArray(regra)) {
        return regra.every(r => comparar(valor, r.op, r.value))
    }
    return comparar(valor, regra.op, regra.value)
}

function passaFiltro(reg, filtros) {

    const filtrosWildcard = {}
    const filtrosDiretos = {}

    for (const [path, regra] of Object.entries(filtros)) {
        if (!regra) continue
        if (path.includes('*')) filtrosWildcard[path] = regra
        else filtrosDiretos[path] = regra
    }

    // filtros diretos
    for (const [path, regra] of Object.entries(filtrosDiretos)) {
        const v = getByPath(reg, path)
        if (!multiplasRegras(v, regra)) return false
    }

    // sem wildcard → já passou
    if (!Object.keys(filtrosWildcard).length) return true

    // wildcard
    for (const [p, regra] of Object.entries(filtrosWildcard)) {

        const basePath = p.split('*')[0].replace(/\.$/, '')
        const base = getByPath(reg, basePath)

        if (!base || typeof base !== 'object') return false

        const sub = p.split('*').slice(1).join('.').replace(/^\./, '')

        const lista = Object.values(base)

        const existeMatch = lista.some(ctx => {
            const v = getByPath(ctx, sub)
            return multiplasRegras(v, regra)
        })

        // regra positiva: precisa existir
        if (regra.op !== '!=' && !existeMatch) {
            return false
        }

        // regra negativa: não pode existir
        if (regra.op === '!=' && !lista.every(ctx => {
            const v = getByPath(ctx, sub)
            return multiplasRegras(v, regra)
        })) {
            return false
        }
    }

    return true

}


async function contarPorCampo({ base, path, filtros = {} }) {

    const contagem = { todos: 0 }
    const hasWildcard = path?.includes('*')

    const db = await getDB()
    const tx = db.transaction(base, 'readonly')
    const store = tx.objectStore(base)

    return new Promise(resolve => {

        store.openCursor().onsuccess = ev => {
            const cursor = ev.target.result

            if (!cursor) {
                resolve(contagem)
                return
            }

            const reg = cursor.value

            if (!passaFiltro(reg, filtros)) {
                cursor.continue()
                return
            }

            if (!hasWildcard) {
                let v = getByPath(reg, path)
                if (v == null || v === '') v = 'EM BRANCO'

                contagem.todos++
                contagem[v] = (contagem[v] || 0) + 1

                cursor.continue()
                return
            }

            const items = resolveWildcard(reg, path)

            for (const { ctx, valor } of items) {

                let passou = true

                for (const fPath in filtros) {
                    if (!fPath.includes('*')) continue

                    const f = filtros[fPath]
                    const sub = fPath.split('*').slice(1).join('.').replace(/^\./, '')
                    const vFiltro = getByPath(ctx, sub)

                    if (!multiplasRegras(vFiltro, f)) {
                        passou = false
                        break
                    }
                }

                if (!passou) continue

                let v = valor
                if (v == null || v === '') v = 'EM BRANCO'

                contagem.todos++
                contagem[v] = (contagem[v] || 0) + 1
            }

            cursor.continue()
        }
    })
}

async function deletarDB(base, id) {

    const db = await getDB()

    return new Promise((resolve, reject) => {

        const tx = db.transaction(base, 'readwrite')
        const store = tx.objectStore(base)

        const key = isNaN(id) ? id : Number(id)
        store.delete(key)

        tx.oncomplete = async () => {
            await paginacao()
            resolve(true)
        }

        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
    })
}

// SERVIÇO DE ARMAZENAMENTO 
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
    const objeto = { caminho, valor: info };

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

function toTimestamp(d) {
    if (d == null || d === '') return null

    // Se já for número
    if (typeof d === 'number') return d

    const str = String(d).trim()

    // Formato ISO: 2026-02-09 ou com hora
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        const t = Date.parse(str.replace(',', ''))
        return isNaN(t) ? null : t
    }

    // Formato BR: 09/02/2026 ou 09/02/2026, 14:30
    const br = str.match(
        /^(\d{2})\/(\d{2})\/(\d{4})(?:,\s*(\d{2}):(\d{2}))?/
    )

    if (br) {
        const [, d, m, y, h = '00', min = '00'] = br
        const iso = `${y}-${m}-${d}T${h}:${min}:00`
        const t = Date.parse(iso)
        return isNaN(t) ? null : t
    }

    // fallback
    const t = Date.parse(str)
    return isNaN(t) ? null : t
}
