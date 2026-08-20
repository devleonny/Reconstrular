let menusAbertos = {}

function criarMenus(chave) {

    telaAtiva = chave
    const botoesMenu = document.querySelector('.botoesMenu')
    const { funcao } = JSON.parse(localStorage.getItem('acesso')) || {}
    const lista = esquemaBotoes[chave] || []

    const html = lista
        .map((item, i) => {

            const permitido = item.permitido || []
            const bloqueio = item.bloqueio || []

            if (permitido.length > 0 && !permitido.includes(funcao)) {
                return ''
            }

            if (permitido.length === 0 && bloqueio.includes(funcao)) {
                return ''
            }

            return renderMenuItem(item, `menu_${i}`, 0)
        })
        .join('')

    botoesMenu.innerHTML = html
}

function renderMenuItem(item, id, nivel) {
    const temFilhos = item.sub && item.sub.length

    return `
        <div class="menu-item">
            <div 
                class="menu-principal nivel-${nivel}" 
                onclick="acaoMenu('${id}', '${item.funcao || ''}', ${temFilhos})">
                ${criarAtalhoMenu(item, nivel)}
            </div>

            ${temFilhos ? `
                <div class="menu-secundario" id="${id}">
                    ${item.sub
                .map((sub, i) => renderMenuItem(sub, `${id}_${i}`, nivel + 1))
                .join('')
            }
                </div>
            ` : ''}
        </div>
    `
}

function criarAtalhoMenu({ nome, img, gif }, nivel) {

    const imagem = gif
        ? `gifs/${gif}.gif`
        : `imagens/${img}.png`

    return `
    <div class="botao-lateral nivel-${nivel}" 
        style="margin-left:${nivel * 12}px">
        <img src="${imagem}">
            <div>${nome}</div>
    </div>
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
            menusAbertos[n] = null
        }
    })

    if (temFilhos) {
        if (menusAbertos[nivel] && menusAbertos[nivel] !== el) {
            menusAbertos[nivel].style.display = 'none'
        }

        const aberto = el.style.display === 'flex'
        el.style.display = aberto ? 'none' : 'flex'

        menusAbertos[nivel] = aberto ? null : el
    }

    if (funcao && typeof window[funcao] === 'function') {
        window[funcao]()
    }
}

const esquemaBotoes = {
    inicial: [
        {
            nome: 'Início',
            funcao: 'telaInicial',
            img: 'home'
        },
        {
            nome: 'Níveis',
            img: 'niveis',
            bloqueio: ['Trabalhador'],
            sub: [
                { nome: 'Ver Parceiros', funcao: 'telaUsuarios', img: 'niveis' },
                { nome: 'Adicionar Parceiro', funcao: 'editarParceiros', img: 'baixar' }
            ]
        },
        {
            nome: 'Colaboradores',
            img: 'cracha',
            bloqueio: ['Trabalhador'],
            sub: [
                { nome: 'Ver Colaboradores', funcao: 'telaColaboradores', img: 'cracha' },
                { nome: 'Adicionar Parceiro', funcao: 'adicionarColaborador', img: 'baixar' },
                { nome: 'Baixar em Excel', funcao: 'excelColaboradores', img: 'planilha' },
                { nome: 'Baixar em PDF', funcao: 'gerarTodosPDFs', img: 'pdf' }
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
                { nome: 'Baixar em Excel', funcao: 'confirmarBaixarExcel', img: 'planilha' },
                { nome: 'Adicionar Despesa', funcao: 'formularioDespesa', img: 'baixar' },
                { nome: 'Fornecedores', funcao: 'telaFornecedores', img: 'fornecedor' },
                { nome: 'Materiais', funcao: 'telaMateriais', img: 'caixa' },
                { nome: 'Ferramentas', funcao: 'telaFerramentas', img: 'ferramentas' },
                { nome: 'Mão de Obra', funcao: 'telaMaoObra', img: 'colaborador' },
            ]
        },
        {
            nome: 'Orçamentos',
            bloqueio: ['Trabalhador'],
            img: 'orcamentos',
            sub: [
                { nome: 'Criar Orçamento', funcao: 'formularioOrcamento', img: 'baixar' },
                { nome: 'Em Aberto', funcao: 'orcamentosEmAberto', img: 'alerta' },
                { nome: 'Finalizados', funcao: 'orcamentosFinalizados', img: 'doublecheck' },
                { nome: 'Recusados', funcao: 'orcamentosRecusados', img: 'cancel' }
            ]
        },
        {
            nome: 'Composições',
            permitido: ['CEO', 'Diretor Operativo'],
            img: 'configuracoes',
            sub: [
                { nome: 'Criar Composição', funcao: 'edicaoItem', img: 'baixar' },
                { nome: 'Ativas', funcao: 'telaPrecos', img: 'preco' },
                { nome: 'Desativadas', funcao: 'telaPrecosDesativada', img: 'preco_neg' },
            ]
        },
        {
            nome: 'Objetivos',
            permitido: ['CEO'],
            img: 'objetivo',
            funcao: 'telaObjetivos'
        },
        {
            nome: 'Tarefas',
            permitido: ['CEO'],
            img: 'checklist',
            sub: [
                { nome: 'Ver Tarefas', funcao: 'telaTarefas', img: 'checklist' },
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
            nome: 'Desconectar',
            funcao: 'confirmarSaida',
            img: 'sair'
        }
    ]
}
