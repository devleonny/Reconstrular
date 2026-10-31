// Versiona os css/js locais referenciados no index.html com um hash do conteúdo (como no GCS):
//   <script src="js/assiduidade.js?v=3fa9c21b">
// Só muda a versão de quem mudou; o navegador mantém o cache do resto.
//
// Uso:
//   node scripts/versionar.js            usa os ficheiros da pasta (rodar à mão)
//   node scripts/versionar.js --staged   usa o conteúdo que vai no commit (pre-commit)
//
// No modo --staged só as versões entram no commit; outras alterações ainda não adicionadas
// (git add) continuam fora.
//
// Também carimba a versão do site:
//   - index.html (const versaoAtual) e versao.json: o app compara os dois e avisa "Nova versão disponível";
//   - sw.js (const CACHE): o Service Worker muda e o PWA instalado descarrega a interface nova.

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execFileSync } = require('child_process')

const RAIZ = path.resolve(__dirname, '..')
const PAGINAS = ['index.html']
const REFERENCIA = /((?:src|href)=")((?:css|js)\/[^"?#]+)(\?v=[^"#]*)?(")/g
// Versão do site: carimbada no index.html e publicada em versao.json para o aviso de nova versão.
const PAGINA_VERSAO = 'index.html'
const ARQUIVO_VERSAO = 'versao.json'
const VERSAO_PAGINA = /(const versaoAtual = )[^\n;]*/
// Cache do PWA: nome com a versão do site (antes era subido à mão).
const SERVICE_WORKER = 'sw.js'
const VERSAO_SW = /(const CACHE = `\$\{CACHE_PREFIX\}v)[^`]*(`)/

const staged = process.argv.includes('--staged')

function git(args, entrada) {
    // stderr capturado: "não está no índice" é esperado e tratado; falhas reais lançam erro.
    return execFileSync('git', args, { cwd: RAIZ, input: entrada, maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] })
}

// Conteúdo que vai no commit; ficheiro fora do índice (novo, sem git add) cai no da pasta.
function lerArquivo(relativo) {
    if (staged) {
        try { return git(['show', `:${relativo}`]) } catch { foraDoCommit.add(relativo) }
    }
    const absoluto = path.join(RAIZ, relativo)
    return fs.existsSync(absoluto) ? fs.readFileSync(absoluto) : null
}

// CRLF e LF dão o mesmo hash: com core.autocrlf a pasta e o índice diferem só nisso.
function hashConteudo(conteudo) {
    const normalizado = conteudo.toString('utf8').replace(/\r\n/g, '\n')
    return crypto.createHash('sha1').update(normalizado).digest('hex').slice(0, 8)
}

const hashes = new Map()
const ausentes = new Set()
const foraDoCommit = new Set()

function versao(relativo) {
    if (!hashes.has(relativo)) {
        const conteudo = lerArquivo(relativo)
        if (!conteudo) ausentes.add(relativo)
        hashes.set(relativo, conteudo ? hashConteudo(conteudo) : null)
    }
    return hashes.get(relativo)
}

function carimbar(html) {
    let alteracoes = 0
    const novo = html.replace(REFERENCIA, (trecho, inicio, arquivo, versaoAtual, fim) => {
        const hash = versao(arquivo)
        if (!hash) return trecho
        const nova = `?v=${hash}`
        if (versaoAtual === nova) return trecho
        alteracoes++
        return `${inicio}${arquivo}${nova}${fim}`
    })
    return { novo, alteracoes }
}

function versionarPasta(pagina) {
    const absoluto = path.join(RAIZ, pagina)
    if (!fs.existsSync(absoluto)) return 0
    const { novo, alteracoes } = carimbar(fs.readFileSync(absoluto, 'utf8'))
    if (alteracoes) fs.writeFileSync(absoluto, novo)
    return alteracoes
}

// Grava conteúdo direto no índice, sem passar pela pasta (não leva outras alterações junto).
function gravarNoIndice(relativo, conteudo, modo = '100644') {
    const blob = git(['hash-object', '-w', '--stdin'], conteudo).toString().trim()
    git(['update-index', '--add', '--cacheinfo', `${modo},${blob},${relativo}`])
}

const modoNoIndice = relativo => git(['ls-files', '-s', '--', relativo]).toString().split(' ')[0] || '100644'

// Grava no índice só a versão carimbada do HTML que já estava no índice.
function versionarIndice(pagina) {
    let indexado
    try { indexado = git(['show', `:${pagina}`]).toString('utf8') } catch { return 0 }

    const { novo, alteracoes } = carimbar(indexado)
    if (!alteracoes) return 0

    gravarNoIndice(pagina, novo, modoNoIndice(pagina))
    return alteracoes
}

let total = 0

for (const pagina of PAGINAS) {
    const alteracoes = staged ? versionarIndice(pagina) : 0
    // A pasta acompanha o commit, para o HTML local não ficar com versões antigas.
    const naPasta = versionarPasta(pagina)
    const quantidade = staged ? alteracoes : naPasta
    if (quantidade) console.log(`versionar: ${pagina} — ${quantidade} referência(s) atualizada(s)`)
    total += quantidade
}

// Hash das páginas já carimbadas: muda com qualquer css/js referenciado ou com o próprio HTML.
// O valor de versaoAtual fica de fora, senão a versão dependeria dela mesma.
function versaoSite(lerPagina) {
    const hash = crypto.createHash('sha1')
    for (const pagina of PAGINAS) {
        const conteudo = lerPagina(pagina)
        if (conteudo)
            hash.update(conteudo.toString('utf8').replace(/\r\n/g, '\n').replace(VERSAO_PAGINA, '$1'))
    }
    // O próprio sw.js também conta (sem o nome do cache, que é a saída disto).
    const sw = lerPagina(SERVICE_WORKER)
    if (sw) hash.update(sw.toString('utf8').replace(/\r\n/g, '\n').replace(VERSAO_SW, '$1$2'))
    return hash.digest('hex').slice(0, 8)
}

function lerIndexado(relativo) {
    try { return git(['show', `:${relativo}`]) } catch { return null }
}

function lerPasta(relativo) {
    const absoluto = path.join(RAIZ, relativo)
    return fs.existsSync(absoluto) ? fs.readFileSync(absoluto) : null
}

// Aplica "carimbar" num ficheiro no índice (se estiver lá) e na pasta.
function carimbarFicheiro(relativo, carimbarConteudo) {
    let alterou = false
    if (staged) {
        const indexado = lerIndexado(relativo)?.toString('utf8')
        if (indexado && carimbarConteudo(indexado) !== indexado) {
            gravarNoIndice(relativo, carimbarConteudo(indexado), modoNoIndice(relativo))
            alterou = true
        }
    }
    // A pasta acompanha o commit.
    const naPasta = lerPasta(relativo)?.toString('utf8')
    if (naPasta && carimbarConteudo(naPasta) !== naPasta) {
        fs.writeFileSync(path.join(RAIZ, relativo), carimbarConteudo(naPasta))
        alterou ||= !staged
    }
    return alterou
}

function carimbarVersaoSite() {
    const versaoNova = versaoSite(staged ? lerIndexado : lerPasta)
    const json = `${JSON.stringify({ versao: versaoNova })}\n`
    let alterou = carimbarFicheiro(PAGINA_VERSAO, conteudo => conteudo.replace(VERSAO_PAGINA, `$1'${versaoNova}'`))
    alterou = carimbarFicheiro(SERVICE_WORKER, conteudo => conteudo.replace(VERSAO_SW, `$1${versaoNova}$2`)) || alterou

    if (staged && lerIndexado(ARQUIVO_VERSAO)?.toString('utf8') !== json) {
        gravarNoIndice(ARQUIVO_VERSAO, json)
        alterou = true
    }
    if (lerPasta(ARQUIVO_VERSAO)?.toString('utf8') !== json) {
        fs.writeFileSync(path.join(RAIZ, ARQUIVO_VERSAO), json)
        alterou ||= !staged
    }

    if (alterou)
        console.log(`versionar: versão do site ${versaoNova}`)
    return alterou
}

if (carimbarVersaoSite())
    total++

for (const arquivo of ausentes)
    console.warn(`versionar: aviso — ${arquivo} não encontrado; versão mantida`)

// Página publicada a apontar para ficheiro que não subiu = 404 no site.
for (const arquivo of foraDoCommit)
    if (!ausentes.has(arquivo))
        console.warn(`versionar: aviso — ${arquivo} é usado pelo index.html mas não está no commit (faltou git add?)`)

if (!total) console.log('versionar: versões já atualizadas')
