async function telaClientes() {

    try {
        overlayAguarde()

        const tabela = await modTab({
            btnExtras: '<button onclick="formularioCliente()">Adicionar Cliente</button>',
            base: 'dados_clientes',
            pag: 'clientes',
            body: 'bodyClientes',
            criarLinha: 'criarLinhaClientes',
            colunas: {
                'Data da Criação': {},
                'Nome': { chave: 'nome' },
                'Morada Fiscal': { chave: 'morada_fiscal' },
                'Morada de Execução': { chave: 'morada_execucao' },
                'Zona': { chave: 'snapshots.cidade.zona', tipoPesquisa: 'select' },
                'Distrito': { chave: 'snapshots.cidade.distrito', tipoPesquisa: 'select' },
                'Cidade': { chave: 'snapshots.cidade.nome', tipoPesquisa: 'select' },
                'E-mail': { chave: 'email' },
                'Telefone': { chave: 'telefone' },
                'Detalhes': {}
            }

        })

        titulo.textContent = 'Clientes'
        tela.innerHTML = tabela

        await paginacao()

        removerOverlay()

    } catch (err) {
        console.log(err)
        popup({ mensagem: 'Falha ao abrir o ecrã de Clientes: Fale com o suporte.' })
    }

}

function criarLinhaClientes(dados) {

    const {
        timestamp,
        snapshots,
        id,
        email,
        telefone,
        nome,
        morada_fiscal,
        morada_execucao
    } = dados || {}

    const cidade = snapshots?.cidade || {}

    tds = `
        <td>${new Date(timestamp).toLocaleString()}</td>
        <td>${nome || ''}</td>
        <td>${morada_fiscal || ''}</td>
        <td>${morada_execucao || ''}</td>
        <td>${cidade?.zona || ''}
        <td>${cidade?.distrito || ''}
        <td>${cidade?.nome || ''}
        <td>${email || ''}</td>
        <td>${telefone || ''}</td>
        <td>
            <img onclick="formularioCliente('${id}')" src="imagens/editar.svg" class="icone-editar" alt="Editar" title="Editar">
        </td>
    `
    return `<tr>${tds}</tr>`

}

async function formularioCliente(idCliente) {

    try {

        overlayAguarde()

        const editando = !!idCliente
        const dadosCliente = editando ? await recuperarDado('dados_clientes', idCliente) : {}
        idCliente ||= crypto.randomUUID()
        const {
            nome,
            telefone,
            cidade,
            email,
            morada_execucao,
            morada_fiscal,
            morada_fiscal_partes,
            morada_execucao_partes,
            numero_contribuinte
        } = dadosCliente || {}
        // Mesma morada: as duas partes iguais (ou, nos registos antigos, o mesmo texto).
        const mesmaMorada = !!morada_fiscal && (morada_fiscal_partes && morada_execucao_partes
            ? JSON.stringify(morada_fiscal_partes) === JSON.stringify(morada_execucao_partes)
            : morada_fiscal === morada_execucao)

        const botoes = [
            { texto: 'Guardar', img: 'concluido', funcao: `salvarCliente('${idCliente}')` }
        ]

        if (editando)
            botoes.push({ texto: 'Eliminar', img: 'cancel', funcao: `confirmarExclusaoCliente('${idCliente}')` })

        const { nome: nomeCidade } = await recuperarDado('cidades', cidade) || {}

        controlesCxOpcoes.cidade = {
            base: 'cidades',
            semPaginacao: true,
            retornar: ['nome'],
            funcaoAdicional: ['verificarRegras'],
            colunas: {
                'Distrito': { chave: 'distrito' },
                'Cidade': { chave: 'nome' },
                'Zona': { chave: 'zona' },
                'Área': { chave: 'area' }
            }
        }

        const linhas = [
            {
                texto: 'Nome',
                elemento: `<textarea oninput="verificarRegras()" placeholder="Nome do Cliente" name="nome">${nome || ''}</textarea>`
            },
            {
                texto: 'Morada Fiscal',
                elemento: blocoMorada('morada_fiscal', morada_fiscal_partes, morada_fiscal)
            },
            {
                elemento: `<label class="morada-mesma"><input type="checkbox" name="mesma_morada" ${mesmaMorada ? 'checked' : ''} onchange="sincronizarMoradaExecucao()">
                    A Morada Fiscal é a mesma da Morada de Execução?</label>`
            },
            {
                texto: 'Morada de Execução',
                elemento: blocoMorada('morada_execucao', morada_execucao_partes, morada_execucao)
            },
            {
                texto: 'Número de Contribuinte',
                elemento: `<input oninput="verificarRegras()" placeholder="Limite 9 Dígitos" name="numero_contribuinte" value="${numero_contribuinte || ''}">`
            },
            {
                texto: 'Telefone',
                elemento: `<input oninput="verificarRegras()" placeholder="Limite 9 Dígitos" name="telefone" value="${telefone || ''}">`
            },
            {
                texto: 'E-mail',
                elemento: `<input oninput="verificarRegras()" placeholder="E-mail" name="email" value="${email || ''}">`
            },
            {
                texto: 'Cidade',
                elemento: `<span name="cidade" ${cidade ? `id="${cidade}"` : ''} class="opcoes" onclick="cxOpcoes('cidade')">${nomeCidade || 'Selecionar'}</span>`
            }
        ]

        popup({ linhas, botoes, titulo: 'Formulário de Cliente' })

        for (const prefixo of ['morada_fiscal', 'morada_execucao']) atualizarMorada(prefixo)
        sincronizarMoradaExecucao()
        verificarRegras()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao abrir o registo do cliente: Fale com o suporte.' })
    }
}

function confirmarExclusaoCliente(idCliente) {

    const botoes = [
        { texto: 'Confirmar', img: 'concluido', funcao: `excluirCliente('${idCliente}')`, fechar: true }
    ]

    popup({ mensagem: 'Tem certeza?', botoes, titulo: 'Eliminação de Cliente', removerAnteriores: true })
}

async function excluirCliente(idCliente) {

    await deletar(`dados_clientes/${idCliente}`)

}

async function salvarCliente(idCliente) {

    try {

        overlayAguarde()

        const { campos } = await verificarRegras()
        // Morada por partes: campos em falta ou código postal fora do formato xxxx-xxx.
        campos.push(...['morada_fiscal', 'morada_execucao'].flatMap(validarMorada))

        if (campos.length)
            return popup({
                imagem: 'gifs/interrogacao.gif',
                mensagem: `
                    <div style="${vertical}; gap: 4px;">
                        <span>Verifique os campos inválidos:</span>
                        ${campos.map(c => `<span>• ${inicialMaiuscula(c)}</span>`).join('')}
                    </div>
            `
            })

        const cliente = {
            nome: obVal('nome'),
            morada_fiscal: obVal('morada_fiscal'),
            morada_execucao: obVal('morada_execucao'),
            morada_fiscal_partes: partesMorada('morada_fiscal'),
            morada_execucao_partes: partesMorada('morada_execucao'),
            numero_contribuinte: obVal('numero_contribuinte'),
            telefone: obVal('telefone'),
            email: obVal('email'),
            cidade: obVal('cidade')
        }

        // Se o servidor recusar, enviar() já mostra o motivo e o formulário continua aberto.
        if (!await enviar(`dados_clientes/${idCliente}`, cliente))
            return

        const { usuario } = acesso || {}
        const mensagem = {
            funcao: ['Coordenador Operativo'],
            assunto: 'Registo de Cliente Realizado',
            remetente: usuario,
            data: new Date().toLocaleString(),
            mensagem: `<i>Cadastro/Atualização de cliente <b>realizado</b>:</i> <br> <b>Nome</b>: ${cliente.nome}`
        }

        await enviar(`mensagens/${idCliente}`, mensagem)

        removerTodosPopups()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao guardar o cliente: Fale com o suporte.' })
    }
}

// ---------- Morada por partes ----------
// Primeiro o tipo de habitação; os campos mudam com ele e o sistema junta tudo numa linha, ex.:
// "Rua de Bruxelas nº9, 2835-695 Santo António da Charneca, Barreiro, Setúbal".
// A linha vai para morada_fiscal / morada_execucao (usada nas tabelas, obras e cronograma) e as partes para *_partes.
const LADOS_MORADA = ['Esquerdo', 'Frente', 'Direito', 'A', 'B', 'C', 'D']
const CAMPOS_MORADA = {
    Moradia: [['rua', 'Rua'], ['porta', 'Nº de porta'], ['codigo_postal', 'Código Postal'], ['freguesia', 'Freguesia'], ['cidade', 'Cidade'], ['distrito', 'Distrito']],
    Apartamento: [['rua', 'Rua'], ['predio', 'Nº do prédio'], ['andar', 'Andar'], ['lado', 'Lado'], ['codigo_postal', 'Código Postal'], ['freguesia', 'Freguesia'], ['cidade', 'Cidade'], ['distrito', 'Distrito']]
}

function blocoMorada(prefixo, partes, texto = '') {
    const p = partes || {}
    const tipo = ['Moradia', 'Apartamento'].includes(p.tipo) ? p.tipo : ''
    const campo = (chave, rotulo) => chave === 'lado'
        ? `<label data-campo="${chave}">${rotulo}<select name="${prefixo}__${chave}" onchange="atualizarMorada('${prefixo}')">
            <option value=""></option>${LADOS_MORADA.map(l => `<option ${p.lado === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`
        : `<label data-campo="${chave}">${rotulo}<input name="${prefixo}__${chave}" value="${escaparAtributo(p[chave] || '')}"
            ${chave === 'codigo_postal' ? 'placeholder="xxxx-xxx" maxlength="8" inputmode="numeric"' : ''} oninput="atualizarMorada('${prefixo}')"></label>`
    const todos = [...new Map([...CAMPOS_MORADA.Apartamento, ...CAMPOS_MORADA.Moradia]).entries()]
    return `
        <div class="morada-partes" data-morada="${prefixo}">
            <div class="morada-tipo">
                ${['Moradia', 'Apartamento'].map(t => `<label><input type="radio" name="${prefixo}__tipo" value="${t}" ${tipo === t ? 'checked' : ''} onchange="atualizarMorada('${prefixo}')"> ${t}</label>`).join('')}
            </div>
            <div class="morada-campos">${todos.map(([chave, rotulo]) => campo(chave, rotulo)).join('')}</div>
            <input type="hidden" name="${prefixo}" value="${escaparAtributo(texto || '')}" data-texto-antigo="${escaparAtributo(!partes && texto ? texto : '')}">
            <div class="morada-previa"></div>
        </div>`
}

function partesMorada(prefixo) {
    const bloco = document.querySelector(`[data-morada="${prefixo}"]`)
    if (!bloco) return null
    const tipo = bloco.querySelector(`[name="${prefixo}__tipo"]:checked`)?.value || ''
    if (!tipo) return null
    const partes = { tipo }
    for (const [chave] of CAMPOS_MORADA[tipo]) partes[chave] = bloco.querySelector(`[name="${prefixo}__${chave}"]`)?.value.trim() || ''
    return partes
}

function textoMorada(p) {
    if (!p) return ''
    const andar = p.andar ? (/^\d+$/.test(p.andar) ? `${p.andar}º` : p.andar) : ''
    const numero = p.tipo === 'Apartamento' ? p.predio : p.porta
    const inicio = [p.rua, numero ? `nº${numero}` : ''].filter(Boolean).join(' ')
    const fracao = p.tipo === 'Apartamento' ? [andar, p.lado].filter(Boolean).join(' ') : ''
    const local = [p.codigo_postal, p.freguesia].filter(Boolean).join(' ')
    return [inicio, fracao, local, p.cidade, p.distrito].filter(Boolean).join(', ')
}

// Mostra só os campos do tipo escolhido, junta a morada numa linha e mantém a de execução igual se pedido.
function atualizarMorada(prefixo) {
    const bloco = document.querySelector(`[data-morada="${prefixo}"]`)
    if (!bloco) return
    const tipo = bloco.querySelector(`[name="${prefixo}__tipo"]:checked`)?.value || ''
    const visiveis = new Set((CAMPOS_MORADA[tipo] || []).map(([chave]) => chave))
    bloco.querySelectorAll('[data-campo]').forEach(label => { label.hidden = !visiveis.has(label.dataset.campo) })
    const cp = bloco.querySelector(`[name="${prefixo}__codigo_postal"]`)
    if (cp) cp.value = cp.value.replace(/[^\d]/g, '').replace(/^(\d{4})(\d)/, '$1-$2').slice(0, 8)
    const oculto = bloco.querySelector(`input[type="hidden"][name="${prefixo}"]`)
    const partes = partesMorada(prefixo)
    // Registo antigo (morada em texto livre) sem partes preenchidas: mantém o texto até se escolher o tipo.
    oculto.value = partes ? textoMorada(partes) : oculto.dataset.textoAntigo || ''
    bloco.querySelector('.morada-previa').textContent = oculto.value ? `Morada: ${oculto.value}` : 'Escolha Moradia ou Apartamento e preencha a morada.'
    if (prefixo === 'morada_fiscal') sincronizarMoradaExecucao()
    if (typeof verificarRegras === 'function') verificarRegras()
}

// "Mesma morada": a de execução copia a fiscal (campos bloqueados enquanto a caixa estiver marcada).
function sincronizarMoradaExecucao() {
    const mesma = document.querySelector('[name="mesma_morada"]')?.checked
    const fiscal = document.querySelector('[data-morada="morada_fiscal"]')
    const execucao = document.querySelector('[data-morada="morada_execucao"]')
    if (!fiscal || !execucao) return
    execucao.classList.toggle('morada-copiada', !!mesma)
    execucao.querySelectorAll('input, select').forEach(el => { if (el.type !== 'hidden') el.disabled = !!mesma })
    if (!mesma) return
    const tipo = fiscal.querySelector('[name="morada_fiscal__tipo"]:checked')?.value
    execucao.querySelectorAll('[name="morada_execucao__tipo"]').forEach(r => { r.checked = r.value === tipo })
    fiscal.querySelectorAll('[name^="morada_fiscal__"]').forEach(el => {
        if (el.type === 'radio') return
        const destino = execucao.querySelector(`[name="${el.name.replace('morada_fiscal__', 'morada_execucao__')}"]`)
        if (destino) destino.value = el.value
    })
    const ocultoFiscal = fiscal.querySelector('input[type="hidden"][name="morada_fiscal"]')
    const ocultoExecucao = execucao.querySelector('input[type="hidden"][name="morada_execucao"]')
    ocultoExecucao.dataset.textoAntigo = ocultoFiscal.dataset.textoAntigo || ''
    const partes = partesMorada('morada_execucao')
    ocultoExecucao.value = partes ? textoMorada(partes) : ocultoFiscal.value
    const visiveis = new Set((CAMPOS_MORADA[tipo] || []).map(([chave]) => chave))
    execucao.querySelectorAll('[data-campo]').forEach(label => { label.hidden = !visiveis.has(label.dataset.campo) })
    execucao.querySelector('.morada-previa').textContent = ocultoExecucao.value ? `Morada: ${ocultoExecucao.value}` : ''
}

// Erros da morada: tipo por escolher, campos em falta ou código postal fora do formato xxxx-xxx.
// Um registo antigo, com a morada em texto livre, continua válido até se escolher o tipo.
function validarMorada(prefixo) {
    const nome = prefixo === 'morada_fiscal' ? 'Morada Fiscal' : 'Morada de Execução'
    const partes = partesMorada(prefixo)
    const oculto = document.querySelector(`input[type="hidden"][name="${prefixo}"]`)
    if (!partes) return oculto?.value ? [] : [`${nome}: escolha Moradia ou Apartamento`]
    const faltam = CAMPOS_MORADA[partes.tipo].filter(([chave]) => !partes[chave]).map(([, rotulo]) => rotulo)
    const erros = faltam.length ? [`${nome}: ${faltam.join(', ')}`] : []
    if (partes.codigo_postal && !/^\d{4}-\d{3}$/.test(partes.codigo_postal)) erros.push(`${nome}: código postal no formato xxxx-xxx`)
    return erros
}
