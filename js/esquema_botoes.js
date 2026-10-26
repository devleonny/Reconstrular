let menusAbertos = {}

function podeExibirMenu(item, funcao) {
    const permitido = Array.isArray(item?.permitido) ? item.permitido : []
    const bloqueio = Array.isArray(item?.bloqueio) ? item.bloqueio : []

    if (permitido.length > 0 && !permitido.includes(funcao)) {
        return false
    }

    if (bloqueio.includes(funcao)) {
        return false
    }

    return true
}

function criarMenus(chave) {

    const botoesMenu = document.querySelector('.botoesMenu')
    const { funcao } = JSON.parse(localStorage.getItem('acesso')) || {}
    const lista = esquemaBotoes[chave] || []

    const html = lista
        .filter((item) => podeExibirMenu(item, funcao))
        .map((item, i) => renderMenuItem(item, `menu_${i}`, 0, funcao))
        .join('')

    botoesMenu.innerHTML = html
    menusAbertos = {}
}

function renderMenuItem(item, id, nivel, funcao) {
    const subPermitidos = (item.sub || [])
        .filter((sub) => podeExibirMenu(sub, funcao))

    const temFilhos = subPermitidos.length > 0

    return `
        <div class="menu-item">
            <button type="button"
                class="menu-principal nivel-${nivel}"
                ${temFilhos ? `aria-expanded="false" aria-controls="${id}"` : ''}
                onclick="acaoMenu('${id}', '${item.funcao || ''}', ${temFilhos})">
                ${criarAtalhoMenu(item, nivel, temFilhos)}
            </button>

            ${temFilhos ? `
                <div class="menu-secundario" id="${id}">
                    ${subPermitidos
                .map((sub, i) => renderMenuItem(sub, `${id}_${i}`, nivel + 1, funcao))
                .join('')
            }
                </div>
            ` : ''}
        </div>
    `
}

function iconeMenu(img) {
    const desenhos = {
        home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
        cracha: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M9 5V3h6v2M8 17c0-3 8-3 8 0"/><circle cx="12" cy="11" r="2"/>',
        obras: '<path d="M3 21h18M5 21V7l7-4v18M12 9h7v12M8 8v1m0 3v1m0 3v1m8-4v1m0 3v1"/>',
        pessoas: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2"/>',
        contas: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2ZM9 7h6m-6 4h6m-6 4h3"/>',
        orcamentos: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8m-8 4h2m4 0h2m-8 4h2m4 0h2m-8 3h2m4 0h2"/>',
        configuracoes: '<path d="M4 7h16M4 17h16M8 4v6m8 4v6"/>',
        objetivo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
        checklist: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 10l1 1 2-2m2 1h3m-8 6 1 1 2-2m2 1h3"/>',
        chat: '<path d="M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4Z"/><path d="M8 10h8m-8 4h5"/>',
        sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
        baixar: '<path d="M12 5v14M5 12h14"/>',
        planilha: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 9v12"/>',
        pdf: '<path d="M14 3H5v18h14V8Zm0 0v5h5M8 13h8m-8 4h5"/>',
        relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        fornecedor: '<path d="M3 6h11v12H3Zm11 5h4l3 4v3h-7"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/>',
        zona: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16"/>',
        alerta: '<path d="m12 3 10 18H2ZM12 9v4m0 4h.01"/>',
        doublecheck: '<path d="m2 12 5 5L17 7m-5 10L22 7"/>',
        cancel: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
        preco: '<path d="M20 13 13 20 3 10V3h7ZM7 7h.01"/>',
        preco_neg: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
        caixa: '<path d="m12 3 9 5v10l-9 5-9-5V8Zm-9 5 9 5 9-5m-9 5v10M7 6l9 5"/>',
        ferramentas: '<path d="M14 6a5 5 0 0 0-6 6l-5 5a3 3 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-3 3-4-4Z"/>',
        colaborador: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
        carta: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>'
    }
    return `<svg class="menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${desenhos[img] || desenhos.home}</svg>`
}

function criarAtalhoMenu({ nome, img }, nivel, temFilhos = false) {

    return `
    <span class="botao-lateral nivel-${nivel}">
        ${iconeMenu(img)}
        <span class="menu-texto">${nome}</span>
        ${temFilhos ? '<svg class="menu-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>' : ''}
    </span>
    `
}

function acaoMenu(id, funcao, temFilhos) {
    const el = document.getElementById(id)
    const partes = id.split('_')
    const nivel = partes.length - 1

    // pega o pai (ex: menu_1_0 -> menu_1)
    const pai = partes.slice(0, -1).join('_')

    // fecha filhos desse pai
    Object.entries(menusAbertos).forEach(([n, aberto]) => {
        if (!aberto) return

        const idAberto = aberto.id

        // mesmo pai + mais profundo
        if (
            idAberto.startsWith(pai) &&
            idAberto !== pai &&
            idAberto !== id
        ) {
            aberto.style.display = 'none'
            aberto.previousElementSibling.setAttribute('aria-expanded', 'false')
            menusAbertos[n] = null
        }
    })

    if (temFilhos) {
        if (menusAbertos[nivel] && menusAbertos[nivel] !== el) {
            menusAbertos[nivel].style.display = 'none'
            menusAbertos[nivel].previousElementSibling.setAttribute('aria-expanded', 'false')
        }

        const aberto = el.style.display === 'flex'
        el.style.display = aberto ? 'none' : 'flex'
        el.previousElementSibling.setAttribute('aria-expanded', String(!aberto))

        menusAbertos[nivel] = aberto ? null : el
    }

    if (funcao && typeof window[funcao] === 'function') {
        document.querySelectorAll('.side-menu .menu-principal.is-active').forEach((botao) => {
            botao.classList.remove('is-active')
            botao.removeAttribute('aria-current')
        })
        const botao = document.querySelector(`.side-menu [onclick^="acaoMenu('${id}',"]`)
        if (botao && !temFilhos) {
            botao.classList.add('is-active')
            botao.setAttribute('aria-current', 'page')
        }
        window[funcao]()
    }
}

const esquemaBotoes = {
    inicial: [
        {
            nome: 'Início',
            funcao: 'telaInicial',
            bloqueio: ['Trabalhador'],
            img: 'home'
        },
        {
            nome: 'Colaboradores',
            img: 'cracha',
            bloqueio: ['Trabalhador'],
            sub: [
                { nome: 'Ver Colaboradores', funcao: 'telaColaboradores', img: 'cracha' },
                { nome: 'Organizador Hierárquico', funcao: 'telaMapaDelegacao', img: 'zona' },
                { nome: 'Adicionar Parceiro', funcao: 'adicionarColaborador', img: 'baixar' },
                { nome: 'Baixar em Excel', bloqueio: ['Encarregado de Obra'], funcao: 'excelColaboradores', img: 'planilha' },
                { nome: 'Baixar em PDF', bloqueio: ['Encarregado de Obra'], funcao: 'gerarTodosPDFs', img: 'pdf' },
                { nome: 'Histórico de Edições', bloqueio: ['Encarregado de Obra'], funcao: 'historicoColaborador', img: 'relogio' }
            ]
        },
        {
            nome: 'Ponto',
            img: 'relogio',
            bloqueio: ['Trabalhador'],
            sub: [
                { nome: 'Painel', funcao: 'telaAssiduidade', img: 'home' },
                { nome: 'Folha de Ponto', funcao: 'telaAssiduidadeFolha', img: 'pdf' },
                { nome: 'Registos', funcao: 'telaAssiduidadeRegistos', img: 'relogio' },
                { nome: 'Horas Trabalhadas', funcao: 'telaAssiduidadeHoras', img: 'planilha' },
                { nome: 'Férias e Ausências', funcao: 'telaAssiduidadeAusencias', img: 'checklist' },
                { nome: 'Locais de Trabalho', funcao: 'telaAssiduidadeLocais', img: 'zona' },
                { nome: 'Funcionários', funcao: 'telaAssiduidadeFuncionarios', img: 'cracha' }
            ]
        },
        {
            nome: 'Obras',
            bloqueio: ['Trabalhador'],
            img: 'obras',
            sub: [
                { nome: 'Ver Obras', funcao: 'telaObras', img: 'obras' },
                { nome: 'Adicionar Obra', funcao: 'adicionarObra', img: 'baixar' }
            ]
        },
        {
            nome: 'Clientes',
            bloqueio: ['Trabalhador'],
            img: 'pessoas',
            sub: [
                { nome: 'Ver Clientes', funcao: 'telaClientes', img: 'pessoas' },
                { nome: 'Adicionar Cliente', funcao: 'formularioCliente', img: 'baixar' }
            ]
        },
        {
            nome: 'Despesas',
            bloqueio: ['Trabalhador'],
            img: 'contas',
            sub: [
                { nome: 'Verificar Despesas', funcao: 'verificarDespesas', img: 'contas' },
                { nome: 'Baixar em Excel', permitido: ['CEO'], funcao: 'confirmarBaixarExcel', img: 'planilha' },
                { nome: 'Adicionar Despesa', funcao: 'formularioDespesa', img: 'baixar' },
                { nome: 'Fornecedores', funcao: 'telaFornecedores', img: 'fornecedor' },

            ]
        },
        {
            nome: 'Orçamentos',
            bloqueio: ['Trabalhador'],
            img: 'orcamentos',
            sub: [
                { nome: 'Ver Orçamentos', funcao: 'orcamentos', img: 'orcamentos' },
                { nome: 'Criar Orçamento', funcao: 'formularioOrcamento', img: 'baixar' },
                {
                    permitido: [
                        'CEO',
                        'Diretor Programador',
                        'Diretor Operativo',
                        'Coordenador Operativo'
                    ],
                    nome: 'Edição de Zonas',
                    funcao: 'telaZonas',
                    img: 'zona'
                },
            ]
        },
        {
            nome: 'Composições',
            permitido: ['CEO', 'Diretor Operativo', 'Diretor Programador'],
            img: 'configuracoes',
            sub: [
                { nome: 'Criar Composição', funcao: 'edicaoItem', img: 'baixar' },
                { nome: 'Ativas', funcao: 'telaPrecos', img: 'preco' },
                { nome: 'Desativadas', funcao: 'telaPrecosDesativada', img: 'preco_neg' },
                { nome: 'Materiais', funcao: 'telaMateriais', img: 'caixa' },
                { nome: 'Ferramentas', funcao: 'telaFerramentas', img: 'ferramentas' },
                { nome: 'Mão de Obra', funcao: 'telaMaoObra', img: 'colaborador' },
            ]
        },
        {
            nome: 'Objetivos',
            permitido: ['CEO', 'Diretor Programador'],
            img: 'objetivo',
            funcao: 'telaObjetivos'
        },
        {
            nome: 'Tarefas',
            img: 'checklist',
            bloqueio: ['Trabalhador'],
            sub: [
                { nome: 'Ver Tarefas', funcao: 'telaTarefas', img: 'checklist' },
                { nome: 'Histórico', funcao: 'historicoTarefas', img: 'relogio' },
                { nome: 'Adicionar Tarefa', funcao: 'gerenciarTarefa', img: 'baixar' }
            ]
        },
        {
            nome: 'Chat',
            img: 'chat',
            bloqueio: ['Trabalhador'],
            sub: [
                { nome: 'Ver Chats', funcao: 'painelChat', img: 'chat' },
                { nome: 'Enviar Mensagem', funcao: 'balaoMensagem', img: 'carta' }
            ]
        },
        {
            nome: 'E-mails',
            funcao: 'telaEmails',
            bloqueio: ['Trabalhador'],
            img: 'carta'
            
        },
        {
            nome: 'Desconectar',
            funcao: 'confirmarSaida',
            img: 'sair'
        }
    ]
}
