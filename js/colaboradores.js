const meses = {
    '01': 'Janeiro',
    '02': 'Fevereiro',
    '03': 'Março',
    '04': 'Abril',
    '05': 'Maio',
    '06': 'Junho',
    '07': 'Julho',
    '08': 'Agosto',
    '09': 'Setembro',
    '10': 'Outubro',
    '11': 'Novembro',
    '12': 'Dezembro'
}

const semana = {
    0: 'Domingo',
    1: 'Segunda',
    2: 'Terça',
    3: 'Quarta',
    4: 'Quinta',
    5: 'Sexta',
    6: 'Sábado'
}

const anos = {
    '2026': 2026,
    '2026': 2026
}

let esquema = null
let cidades = null

async function telaColaboradores() {

    overlayAguarde()

    telaAtiva = 'colaboradores'
    titulo.textContent = 'Colaboradores'

    const colunas = {
        'Usuário': { chave: 'usuario' },
        'Função': { chave: 'funcao', tipoPesquisa: 'select' },
        'Nome Completo': { chave: 'nome' },
        'Telefone': { chave: 'telefone' },
        'Distrito': { chave: 'snapshots.cidade.distrito', tipoPesquisa: 'select' },
        'Cidade': { chave: 'snapshots.cidade.nome', tipoPesquisa: 'select' },
        'Status': { chave: 'status_disponivel', tipoPesquisa: 'select' },
        'Especialidade': { chave: 'especialidade' },
        'Folha de Ponto': {},
        'Ficha de EPI': {},
        'Editar': {}
    }

    const tabela = await modTab({
        colunas,
        pag: 'colaboradores',
        btnExtras: '<button data-acao="editavel" onclick="adicionarColaborador()">Adicionar Colaborador</button>',
        base: 'dados_colaboradores',
        body: 'bodyColaboradores',
        criarLinha: 'criarLinhaColaboradores'
    })

    tela.innerHTML = montarPagina({ titulo: 'Colaboradores', imagem: 'colaborador', tabela })

    await paginacao()

    removerOverlay()

}

function labelStatus(st) {

    switch (st) {
        case 'Baixa Médica':
            return 'baixa-medica'
        case 'Ativo':
            return 'ativo'
        case 'Não Ativo':
            return 'invalido'
        default:
            return 'impedido'
    }

}
async function criarLinhaColaboradores(colaborador) {

    const {
        id,
        epi,
        funcao,
        snapshots,
        usuario,
        telefone,
        nome,
        status_disponivel,
        especialidade
    } = colaborador || {}
    const { distrito, nome: nomeCidade } = snapshots?.cidade || {}

    const especialidades = (especialidade || [])
        .map(op => `<span class="tag-especialidade">${op}</span>`)
        .join('')

    const estilo = labelStatus(status_disponivel)

    let qtdeEPIs = 0

    Object.values(epi?.equipamentos || {}).forEach(e => {
        qtdeEPIs += e.quantidade
    })

    const formEpi = `
            <div data-acao="editavel" style="${vertical}; align-items: center;" onclick="abrirEPI('${id}')">
                <img src="imagens/colaborador.png">
                ${qtdeEPIs ? `<div class="labelQuantidade">${qtdeEPIs}</div>` : ''}
            </div>
        `

    const tds = `
        <td>
            ${usuario ? `<span class="tag-usuario">${usuario}</td>` : ''}
        </td>
        <td>
            ${funcao || ''}
        </td>
        <td>
            ${nome}
        </td>
        <td>${telefone || ''}</td>
        <td>${distrito || ''}</td>
        <td>${nomeCidade || ''}</td>
        <td>
            <span class="${estilo}">${status_disponivel || ''}</span>
        </td>
        <td>
            ${especialidades ? `<div style="${vertical}; gap: 2px;">${especialidades}</div>` : 'Não se aplica'}
        </td>
        <td>
            <img data-acao="editavel" src="imagens/relogio.png" onclick="mostrarFolha('${id}')">
        </td>
        <td>
            ${formEpi}
        </td>
        <td>
            <img src="imagens/pesquisar.png" data-acao="editavel" onclick="adicionarColaborador('${id}')">
        </td>
    `

    return `<tr>${tds}</tr>`
}

async function adicionarColaborador(id) {

    try {
        overlayAguarde()

        const colaborador = await recuperarDado('dados_colaboradores', id) || {}

        const {
            cidade,
            nome,
            funcao,
            filtros,
            morada,
            pin,
            data_nascimento,
            epi,
            usuario,
            email,
            especialidade,
            numero_documento,
            telefone,
            foto,
            seguranca_social,
            numero_contribuinte,
            snapshots
        } = colaborador

        const { equipamentos } = epi || {}
        const campoCidade = snapshots?.cidade?.nome || 'Selecione'

        const listas = {
            status_disponivel: ['Ativo', 'Baixa Médica', 'Não Ativo', 'Impedido'],
            documento: ['Cartão de Cidadão', 'Passaporte', 'Título de residência'],
            especialidade: ['Pedreiros', 'Ladrilhadores', 'Pintor', 'Estucador', 'Pavimento Laminado', 'Eletricista Certificado', 'Ajudante', 'Teto Falso e Paredes em Gesso Cartonado', 'Canalizador', 'Carpinteiro']
        }

        function retornarCaixas(name) {

            const espc = name == 'especialidade'

            const opcoesStatus = (listas?.[name] || [])
                .map(op => {

                    let checked = false

                    const valor = colaborador?.[name]
                    const especialidades = especialidade || []
                    if ((espc && especialidades.includes(op)) || valor == op) {
                        checked = true
                    }

                    // Se status, se valor null e op seja Ativo; Default marcado;
                    if (name == 'status_disponivel' && !valor && op == 'Ativo')
                        checked = true

                    return `
                        <div class="opcaoStatus">
                            <input ${regras} value="${op}" 
                            type="${espc ? 'checkbox' : 'radio'}" 
                            name="${name}" 
                            ${checked ? 'checked' : ''}>
                            <span style="text-align: left;">${op}</span>
                        </div>
                    `
                })
                .join('')

            return `
            <div name="${name}_bloco" class="opcoes-formulario">
                ${opcoesStatus}
            </div>`

        }

        // Formulário de EPI;
        const opcoes = (ini, fim, valorAtual) => {
            let stringOpcoes = '<option></option>'
            for (let i = ini; i <= fim; i++) stringOpcoes += `<option ${valorAtual == i ? 'selected' : ''}>${i}</option>`
            return stringOpcoes
        }

        const tr = (texto, value) => {

            const equipamento = equipamentos?.[value]
            const visibilidade = `style="display: ${equipamento ? '' : 'none'}"`
            return `
                <tr>
                    <td style="text-align: left;">${texto}</td>
                    <td>
                        <input onchange="visibilidade(this, '${value}')" 
                        type="checkbox" 
                        class="input-colaboradores" 
                        value="${value}" 
                        name="camposEpi"
                        ${equipamentos?.[value] ? 'checked' : ''}>
                    </td>
                    <td><select ${visibilidade} name="${value}_quantidade">${opcoes(1, 10, equipamento?.quantidade)}</select></td>
                    <td><select ${visibilidade} name="${value}_tamanho">${opcoes(37, 47, equipamento?.tamanho)}</select></td>
                </tr>
                `
        }

        const regras = `oninput="verificarRegras()"`
        const caixaStatus = retornarCaixas('status_disponivel')
        const caixaEspecialidades = retornarCaixas('especialidade')
        const caixaDocumentos = `
        <div style="${vertical}; gap: 1rem;">
            ${retornarCaixas('documento')} 
            <input ${regras} value="${numero_documento || ''}" name="numero_documento" placeholder="Número do documento">
        </div>
        `
        const divAnexos = (chave) => {
            const anexos = colaborador?.[chave] || {}
            let anexoString = ''
            for (const [, anexo] of Object.entries(anexos)) {
                anexoString += criarAnexoVisual(anexo)
            }
            return `<div id="anexos_${chave}" style="${vertical}">${anexoString}</div>`
        }

        controlesCxOpcoes.cidade = {
            base: 'cidades',
            funcaoAdicional: ['verificarRegras'],
            colunas: {
                'Cidade': { chave: 'nome' },
                'Distrito': { chave: 'distrito' },
                'Zona': { chave: 'zona' },
                'Area': { chave: 'area' }
            },
            retornar: ['nome']
        }

        const cabEpi = ['Equipamento', '', 'Quantidade', 'Tamanho']
            .map(op => `<th>${op}</th>`)
            .join('')

        const linhas = [
            {
                texto: 'Nome Completo',
                elemento: `<textarea ${regras} name="nome" placeholder="Nome Completo">${nome || ''}</textarea>`
            },
            {
                texto: 'Usuário',
                elemento: `
                    <div style="${vertical}; gap: 5px;">
                        <input name="usuario" placeholder="Usuário" ${regras} value="${usuario || ''}" ${usuario ? 'readOnly="true"' : ''}>
                        ${usuario ? '' : `<div data-valido="N" id="status_usuario"></div>`}
                    </div>
                `
            },
            {
                elemento: `
                    <div style="${vertical}; gap: 5px;">
                        <span>Função</span>
                        <div class="campo-funcoes"></div>
                        <span>Cidades</span>
                        <div class="local-cidades"></div>
                    </div>
                `
            },
            {
                texto: 'Data de Nascimento',
                elemento: `<input ${regras} value="${data_nascimento || ''}" type="date" name="data_nascimento">`
            },
            {
                texto: 'Morada',
                elemento: `<textarea ${regras} name="morada" placeholder="Morada">${morada || ''}</textarea>`
            },
            {
                texto: 'Cidade',
                elemento: `
                <span class="opcoes" ${cidade ? `id="${cidade}"` : ''} name="cidade" onclick="cxOpcoes('cidade')">${campoCidade}</span>`
            },
            {
                texto: 'Apólice de Seguro',
                elemento: `<input value="0010032495" name="apolice" placeholder="Número da Apólice" readOnly>`
            },
            {
                texto: 'Telefone',
                elemento: `<input ${regras} value="${telefone || ''}" name="telefone" placeholder="Telefone">`
            },
            {
                texto: 'E-mail',
                elemento: `<textarea ${regras} name="email" placeholder="E-mail">${email || ''}</textarea>`
            },
            { texto: 'Documento', elemento: caixaDocumentos },
            {
                texto: 'Número de Contribuinte',
                elemento: `<input ${regras} value="${numero_contribuinte || ''}" name="numero_contribuinte" placeholder="Máximo de 9 dígitos">`
            },
            {
                texto: 'Segurança Social',
                elemento: `<input ${regras} value="${seguranca_social || ''}" name="seguranca_social" placeholder="Máximo de 11 dígitos">`
            },
            { texto: 'Especialidade', elemento: caixaEspecialidades },
            { texto: 'Status', elemento: caixaStatus },

            // EXAMES
            {
                texto: 'Contrato de Obra',
                elemento: `
                    <div style="${vertical}; gap: 2px;">
                        <input ${regras} name="contrato_obra" type="file">
                        ${divAnexos('contrato_obra')}
                    </div>
                `
            },
            {
                texto: 'Exame médico',
                elemento: `
                    <div style="${vertical}; gap: 2px;">
                        <input ${regras} name="exame" type="file">
                        ${divAnexos('exame')}
                    </div>
                `
            },
            {
                elemento: `
                    <div class="bloco-form-epi">
                        <span>Formulário de EPI</span>
                        <table class="tabela">
                            <thead style="position: static;">${cabEpi}</thead>
                            <tbody>
                                ${tr('Botas de segurança com biqueira reforçada', 'botas')}
                                ${tr('Capacete de proteção', 'capacete')}
                                ${tr('Colete fluorescente', 'colete')}
                                ${tr('Luvas (par)', 'luvas')}
                                ${tr('Mascara com filtro de particulas', 'mascara')}
                                ${tr('Óculos de protecção', 'oculos')}
                                ${tr('Proteção auditiva', 'protecaoAuditiva')}
                            </tbory>
                        </table>
                    </div>
            `
            },

            // FOTO
            {
                texto: 'Foto do Colaborador',
                elemento: `
                    <div style="${vertical}; gap: 5px;">
                        <img src="imagens/camera.png" class="cam" onclick="abrirCamera()">
                        <div class="cameraDiv">
                            <button onclick="tirarFoto()">Tirar Foto</button>
                            <video autoplay playsinline></video>
                            <canvas style="display: none;"></canvas>
                        </div>
                        <img name="foto" ${foto
                        ? `src="${api}/uploads/RECONST/${foto}"`
                        : ''
                    } style="width: 7rem; border-radius: 3px;">
                    </div>
                `
            },

            // PIN
            {
                texto: 'Forma de Acesso [PIN / Senha]',
                elemento: `
                    <div class="painel-pin">
                        <input ${regras} type="password" value="${pin || ''}" ${pin ? `data-existente="${pin}"` : ''} name="pin" placeholder="Máximo de 4 números">
                        <input ${regras} name="pinEspelho" value="${pin}" type="password" placeholder="Repita o PIN">
                        
                        <div class="rodape-alerta"></div>
                        <button onclick="resetarPin()">Novo Pin</button>
                    </div>
                    <div class="painel-senha">
                        <input type="password" placeholder="Senha" name="senha">
                    </div>
                `
            }
        ]

        const botoes = [
            { funcao: id ? `salvarColaborador('${id}')` : 'salvarColaborador()', texto: 'Salvar', img: 'concluido' }
        ]

        if (id)
            botoes.push({ img: 'cancel', texto: 'Excluir', funcao: `confirmarExclusaoColaborador('${id}')` })

        popup({ linhas, botoes, titulo: 'Cadastro de Colaborador' })

        await carregarTabelaFuncoes(funcao, filtros)

        verificarRegras()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao abrir o formulário de Colaborador: Fale com o suporte.' })
    }

}

function confirmarExclusaoColaborador(id) {

    const botoes = [
        { texto: 'Confirmar', img: 'concluido', funcao: `excluirColaborador('${id}')`, fechar: true }
    ]

    popup({ mensagem: 'Tem certeza?', botoes, titulo: 'Excluir colaborador', removerAnteriores: true })
}

async function excluirColaborador(id) {

    overlayAguarde()

    await deletar(`dados_colaboradores/${id}`)

    removerOverlay()
}

async function salvarColaborador(idColaborador = crypto.randomUUID()) {

    try {

        overlayAguarde()

        const { campos } = await verificarRegras()

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

        const colaborador = {}

        const camposFixos = [
            'nome',
            'data_nascimento',
            'email',
            'morada',
            'apolice',
            'telefone',
            'numero_documento',
            'seguranca_social',
            'numero_contribuinte'
        ]

        for (const campo of camposFixos)
            colaborador[campo] = obVal(campo)

        const camposRatio = ['status_disponivel', 'documento']
        for (const campo of camposRatio) {
            colaborador[campo] = document.querySelector(`input[name="${campo}"]:checked`)?.value || ''
        }

        const especialidades = document.querySelectorAll(`input[name="especialidade"]:checked`)
        colaborador.especialidade = []
        for (const especialidade of especialidades) {
            colaborador.especialidade.push(especialidade.value)
        }

        // Função;
        colaborador.funcao = [...document.querySelectorAll('[name="funcao"]:checked')]?.[0]?.dataset?.valor

        if (colaborador.funcao == 'Trabalhador') {
            // Verificação do PIN;
            const inputPin = document.querySelector('[name="pin"]')
            const pinExistente = inputPin.dataset.existente

            if (pinExistente && pinExistente !== inputPin.value) {

                const resposta = await colaboradorPin(colaborador.pin, idColaborador)

                if (resposta?.mensagem) {
                    inputPin.classList.add('invalido')
                    return popup({ mensagem: resposta?.mensagem })
                }

            }

            colaborador.pin = inputPin.value

        } else {

            const verificador = document.getElementById('status_usuario')

            if (verificador && verificador.dataset.valido == 'N')
                return popup({ mensagem: 'O campo Usuário não é válido, por favor verifique!' })

            colaborador.usuario = obVal('usuario')

            const possivelSenha = obVal('senha')

            if (possivelSenha) // Se existir, salva;
                colaborador.senha = possivelSenha

        }

        const camposAnexos = ['contrato_obra', 'exame']
        for (const campo of camposAnexos) {
            const input = document.querySelector(`[name="${campo}"]`)
            if (!input || !input.files || input.files.length === 0) continue

            const anexos = await importarAnexos({ input })

            if (!colaborador[campo])
                colaborador[campo] = {}

            for (const anexo of anexos) {
                let idAnexo
                do {
                    idAnexo = crypto.randomUUID()
                } while (colaborador[campo][idAnexo])

                colaborador[campo][idAnexo] = anexo
            }
        }

        // Cidade;
        colaborador.cidade = obVal('cidade')

        const foto = document.querySelector('[name="foto"]')
        if (foto.src && !foto.src.includes(api)) {
            const resposta = await importarAnexos({ foto: foto.src })

            if (resposta[0].link) {
                colaborador.foto = resposta[0].link
            } else {
                return popup({ mensagem: 'Falha no envio da Foto: tente novamente.' })
            }

        }

        const coletarMarcados = (campo) => {
            return [...(document.querySelectorAll(`[name="${campo}"]:checked`) || [])]
                .map(input => {
                    return ['zona', 'area'].includes(campo)
                        ? Number(input.dataset.valor)
                        : input.dataset.valor
                })
                .filter(Boolean)
        }

        // EPI
        const inputsAtivos = document.querySelectorAll('input[name="camposEpi"]:checked')
        const equipamentos = {}

        for (const input of inputsAtivos) {
            const campo = input.value
            equipamentos[campo] = {
                quantidade: Number(document.querySelector(`[name="${campo}_quantidade"]`).value),
                tamanho: Number(document.querySelector(`[name="${campo}_tamanho"]`).value)
            }
        }

        colaborador.epi = {
            data: Date.now(),
            equipamentos
        }

        if (!['CEO', 'Diretor Programador'].includes(colaborador.funcao)) {

            // Filtros;
            const zona = coletarMarcados('zona')
            const distrito = coletarMarcados('distrito')
            const area = coletarMarcados('area')
            const obra = coletarMarcados('obra')

            colaborador.filtros = {
                zona,
                distrito,
                area,
                obra
            }

        } else {
            colaborador.filtros = null
        }

        await enviar(`dados_colaboradores/${idColaborador}`, colaborador)

        removerPopup()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao salvar o colaborador: Fale com o suporte.' })
    }
}


async function excelColaboradores() {

    try {
        overlayAguarde()

        const dados = {
            base: "dados_colaboradores",
            titulo: `Colaboradores_${Date.now()}`,
            formatacao: {
                datas: ['data_nascimento'],
            }
        }

        await baixarRelatorioExcel(dados)

        removerOverlay()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao gerar o arquivo Excel: Fale com o suporte.' })
    }

}

async function carregarTabelaFuncoes(funcaoUsuario, filtros) {

    const campoFuncoes = document.querySelector('.campo-funcoes')

    campoFuncoes.innerHTML = '<img src="gifs/loading.gif" style="width: 5rem;">'

    const [{ resultados: cidadesPesquisa }, { resultados: funcoesPesquisa }] = await Promise.all([
        cidades
            ? { resultados: cidades }
            : pesquisarDB({
                base: 'vw_cidades',
                limite: 9999,
            }),
        esquema
            ? { resultados: esquema }
            : pesquisarDB({
                base: 'funcoes'
            })
    ])

    const { funcao } = acesso

    // Se existir pesquisa anterior, então usa a base que existe;
    cidades = cidadesPesquisa
    esquema = funcoesPesquisa

    const filtrosUsuario = esquema.filter(f => f.titulo == funcao) // Funções que o usuário pode definir;

    const opcoesHTML = (filtrosUsuario?.[0]?.funcoes_editaveis || [])
        .map(titulo => {
            return `
        <div style="${horizontal}; justify-content: start; gap: 1rem;">
          <input ${titulo == funcaoUsuario ? 'checked' : ''} onclick="mostrarFiltros('${titulo}')" data-valor="${titulo}" style="width: 1.5rem; height: 1.5rem;" type="radio" name="funcao">
          <span>${titulo}</span>
        </div>
      `
        })
        .join('')

    campoFuncoes.innerHTML = `
        ${opcoesHTML}
        <br>
        <span>Filtros por Zona, Distrito, Área e Obra:</span>
        <div class="campo-filtros"></div>
  `

    mostrarFiltros(funcaoUsuario, filtros) // A nível linha, não do usuário logado;
}

function mostrarFiltros(titulo, filtros) {

    const campoFiltros = document.querySelector('.campo-filtros')

    const modelo = (campo, opcoes) => {

        const ehCampoNumerico = ['zona', 'area'].includes(campo)

        const lista = opcoes
            .sort((a, b) =>
                ehCampoNumerico
                    ? Number(a.valor) - Number(b.valor)
                    : String(a.rotulo).localeCompare(String(b.rotulo))
            )
            .map(o => {

                const valorFiltro = ['zona', 'area'].includes(campo)
                    ? Number(o.valor)
                    : o.valor

                const marcado = (filtros?.[campo] || []).includes(valorFiltro)



                return `
                    <div class="caixa-opcao">
                        <input ${marcado ? 'checked' : ''} name="${campo}" data-valor="${o.valor}" onclick="filtrarCidades({campo: '${campo}'})" type="checkbox">
                        <span ${campo == 'obra' ? `onmouseenter="tooltipObra(this, '${o.rotulo}')"` : ''}>${o.rotulo}</span>
                    </div>
                `
            })
            .join('')

        return `
            <div class="caixa-filtros">
                <span style="font-size: 1.1rem;">${inicialMaiuscula(campo)}</span>
                <div class="caixa-opcoes">
                ${lista}
                </div>
            </div>
        `
    }

    const esqFuncao = esquema
        .filter(c => c.titulo == titulo)

    const caixas = (esqFuncao?.[0]?.campos || [])
        .map(campo => {

            let opcoes

            if (campo === 'obra') {
                // cidades.obras: array de ordens ["O_1", "O_2", ...]
                const todasOrdens = cidades
                    .map(c => c.obras || [])
                    .flat()
                    .filter(o => o) // só valores não vazios

                const valoresUnicos = [...new Set(todasOrdens)]

                opcoes = valoresUnicos.map(ordem => ({
                    valor: ordem,
                    rotulo: ordem
                }))
            } else {
                const valores = [
                    ...new Set(cidades.map(c => c[campo]).flat())
                ]

                opcoes = valores.map(v => ({
                    valor: v,
                    rotulo: v
                }))
            }

            return modelo(campo, opcoes)
        })
        .join('')

    campoFiltros.innerHTML = caixas || `
        <div style="${horizontal}; gap: 5px;">
            <img src="gifs/alerta.gif">
            <span>Não se aplica</span>
        </div>
        `

    filtrarCidades({ filtros })
    verificarRegras()
}

async function tooltipObra(elemento, ordem) {
    document.getElementById('tooltip')?.remove()

    const tooltip = document.createElement('div')
    tooltip.id = 'tooltip'
    tooltip.className = 'tooltip-colaboradores'

    Object.assign(tooltip.style, {
        position: 'fixed',
        transform: 'translate(-50%, -100%)',
        zIndex: '99999',
        pointerEvents: 'none',
        visibility: 'hidden'
    })

    document.body.appendChild(tooltip)

    elemento.addEventListener('mouseleave', () => tooltip.remove(), {
        once: true
    })

    try {
        const pesquisa = await pesquisarDB({
            base: 'dados_obras',
            filtros: {
                op: '=',
                value: ordem
            }
        })

        if (!tooltip.isConnected) return

        const { snapshots } = pesquisa.resultados?.[0] || {}

        tooltip.textContent = snapshots?.morada_execucao || 'Sem informação'

        const rect = elemento.getBoundingClientRect()

        Object.assign(tooltip.style, {
            left: `${rect.left + rect.width / 2}px`,
            top: `${rect.top - 8}px`,
            visibility: 'visible'
        })
    } catch (erro) {
        tooltip.remove()
        console.error(erro)
    }
}

async function filtrarCidades({ filtros = null, campo = null }) {

    const funcao = document.querySelectorAll('[name="funcao"]:checked')?.[0]?.dataset?.valor

    // Zona
    if (filtros) {

        for (const input of [...document.querySelectorAll('[name="zona"]')]) {
            const zona = Number(input.dataset.valor)
            input.checked = (filtros?.zona || []).includes(zona)
        }

    }

    const zonasMarcadas = [...document.querySelectorAll('[name="zona"]:checked')]
        .map(input => Number(input.dataset.valor))

    // Distritos
    const distritos = cidades
        .filter(c => zonasMarcadas.includes(c.zona))
        .map(c => c.distrito)

    for (const input of [...document.querySelectorAll('[name="distrito"]')]) {

        const div = input.parentElement

        const distrito = input.dataset.valor

        if (distritos.includes(distrito)) {

            if (filtros)
                input.checked = (filtros?.distrito || []).includes(distrito)

            div.style.display = 'flex'
        } else {
            input.checked = false
            div.style.display = 'none'
        }

    }

    // Areas
    const distritosMarcados = [...document.querySelectorAll('[name="distrito"]:checked')]
        .map(input => input.dataset.valor)

    const areas = cidades
        .filter(c => distritosMarcados.includes(c.distrito))
        .map(c => c.area)

    for (const input of [...document.querySelectorAll('[name="area"]')]) {

        const div = input.parentElement

        const area = Number(input.dataset.valor)

        if (areas.includes(area)) {

            if (filtros)
                input.checked = (filtros?.area || []).includes(area)
            else if (campo == 'distrito' && funcao == 'Encarregado de Obra')
                input.checked = true

            div.style.display = 'flex'

        } else {
            input.checked = false
            div.style.display = 'none'
        }

    }

    // Obras: ordens de obra por área
    const areasMarcadas = [...document.querySelectorAll('[name="area"]:checked')]
        .map(input => input.dataset.valor)

    const ordensDisponiveis = new Set(
        cidades
            .filter(c => areasMarcadas.includes(String(c.area)))
            .map(c => c.obras || [])
            .flat()
            .map(o => String(o))
    )

    for (const input of [...document.querySelectorAll('[name="obra"]')]) {

        const div = input.parentElement

        const ordem = String(input.dataset.valor)

        if (ordensDisponiveis.has(ordem)) {

            if (filtros)
                input.checked = (filtros?.obra || []).map(String).includes(ordem)
            else if (campo == 'area' && funcao == 'Trabalhador')
                input.checked = true

            div.style.display = 'flex'

        } else {
            input.checked = false
            div.style.display = 'none'
        }

    }

    exibirCidades()

}

function exibirCidades() {

    const local = document.querySelector('.local-cidades')

    const areas = [...document.querySelectorAll('[name="area"]:checked')].map(inp => Number(inp.dataset.valor))

    const cidadesPorArea = cidades
        .filter(c => areas.includes(c.area))
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map(c => `<span class="tag-cidade">${c.nome}</span>`)
        .join('')

    local.innerHTML = cidadesPorArea || `
        <div style="${horizontal}; gap: 5px;">
            <img src="gifs/alerta.gif">
            <span>Não se aplica</span>
        </div>
    `

}