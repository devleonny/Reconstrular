// Extrai a classificação informativa do Excel, sem alterar permissões territoriais.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const arquivo = process.argv[2]
if (!arquivo) throw Error('Informe o caminho de Organização de Funções Nacional.xlsx')
const ExcelJS = require('C:/Users/Grupo Costa Silva/Desktop/RECONST/node_modules/exceljs')
;(async () => {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(arquivo)
    const sheet = wb.worksheets[0]
    const legenda = {}
    const porCor = new Map()
    for (const linha of [39,40,41]) {
        const celula = sheet.getCell(`A${linha}`)
        const tipo = celula.text.slice(0,3)
        assert(['APU','AMU','APR'].includes(tipo))
        const cor = celula.fill.fgColor.argb.slice(-6)
        legenda[tipo] = { descricao: celula.text, cor: `#${cor}` }
        porCor.set(cor,tipo)
    }
    const cidades = {}
    for (let linha=3;linha<=37;linha+=2) {
        const distrito = sheet.getCell(linha,5).text
        for(let coluna=6;coluna<=sheet.columnCount;coluna++) {
            const celula = sheet.getCell(linha,coluna)
            if (!celula.text.trim()) continue
            const cor = celula.fill?.fgColor?.argb?.slice(-6)
            assert(porCor.has(cor), `Cor sem legenda em ${celula.address}: ${cor}`)
            const id = ['cidade',distrito,celula.text].map(encodeURIComponent).join('/')
            assert(!cidades[id], `Cidade repetida: ${id}`)
            cidades[id] = porCor.get(cor)
        }
    }
    assert(Object.keys(cidades).length > 0, 'Nenhuma cidade encontrada no Excel')
    fs.writeFileSync(path.join(__dirname,'delegacao-tipologia.json'),JSON.stringify({origem:path.basename(arquivo),legenda,cidades},null,2)+'\n')
    console.log(JSON.stringify({cidades:Object.keys(cidades).length,tipos:Object.fromEntries(Object.keys(legenda).map(t=>[t,Object.values(cidades).filter(v=>v===t).length]))}))
})().catch(e=>{console.error(e.message);process.exitCode=1})
