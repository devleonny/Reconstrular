const tela = document.getElementById('tela')
const toolbar = document.querySelector('.toolbar')
const titulo = toolbar.querySelector('span')
const horizontal = `display: flex; align-items: center; justify-content: center;`
const vertical = `display: flex; align-items: start; justify-content: start; flex-direction: column`
const nomeBaseCentral = 'Reconstrular'
const nomeStore = 'Bases'
const api = `https://leonny.dev.br`
const servidor = 'RECONST'
let dados_distritos = {}
let dados_colaboradores = {}
let dados_obras = {}
let funcoes = {}
let materiais = {}
let fornecedores = {}
let ferramentas = {}
let etapasProvisorias = {}
let mensagens = {}
let stream;
let telaInterna = null
let emAtualizacao = false
let acesso = {}
let telaAtiva = null

function obVal(name) {
    const el = document.querySelector(`[name="${name}"]`);
    return el ? el.value : '';
}

const modelo = (texto, valor, name) => `
    <div style="${vertical};">
        <span>${texto}</span>
        <input name="${name}" placeholder="${texto}" value="${valor || ''}">
    </div>
`
const modeloLivre = (texto, elemento) => `
    <div style="${vertical}; padding: 10px;">
        <span>${texto}</span>
        <div style="width: 90%;">${elemento}</div>
    </div>
`
const dtFormatada = (data) => {
    if (!data) return '--'
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
}

const modeloTabela = ({ body, linhas, colunas, base, btnExtras, removerPesquisa }) => {

    const ths = colunas
        .map(col => `<th>${col}</th>`).join('')

    const thead = (colunas && colunas.length > 0) ? `<thead>${ths}</thead>` : ''

    const pesquisa = removerPesquisa ? '' : `
        <div class="pesquisa">
            <input oninput="pesquisar(this, 'body')" placeholder="Pesquisar" style="width: 100%;">
            <img src="imagens/pesquisar2.png">
        </div>
    `

    return `
    <div class="blocoTabela">
        <div class="painelBotoes">
            <div class="botoes">
                ${pesquisa}
                ${btnExtras || ''}
            </div>
            ${base ? `<img class="atualizar" src="imagens/atualizar.png" onclick="atualizarDados('${base}')">` : ''}
        </div>
        <div class="recorteTabela">
            <table class="tabela">
                ${thead}
                <tbody id="${body || 'body'}">
                    ${linhas || ''}
                </tbody>
            </table>
        </div>
        <div class="rodapeTabela"></div>
    </div>
`}

const mensagem = (mensagem, imagem) => `
    <div class="mensagem">
        <img src="${imagem || 'gifs/alerta.gif'}">
        <label>${mensagem}</label>
    </div>
    `
const btnRodape = (texto, funcao) => `
    <button class="btnRodape" onclick="${funcao}">${texto}</button>
`
const btnPadrao = (texto, funcao) => `
        <span class="btnPadrao" onclick="${funcao}">${texto}</span>
`
const btn = (img, valor, funcao) => `
    <div class="btnLateral" onclick="${funcao}">
        <img src="imagens/${img}.png">
        <div>${valor}</div>
    </div>
`

document.addEventListener('keydown', function (event) {
    if (event.key === 'F8') resetarBases()
})

async function resetarBases() {

    overlayAguarde(true)

    const divMensagem = document.querySelector('.div-mensagem')

    divMensagem.innerHTML = `
        <div style="${vertical}; gap: 1vh;">
            <label><b>Reconstrular</b>: Por favor, aguarde...</label>
            <br>
            
            <div id="logs" style="${vertical}; gap: 1vh;"></div>
        </div>
    `

    const logs = document.getElementById('logs')

    logs.insertAdjacentHTML('beforeend', '<label>Criando uma nova Base, 0km, novíssima...</label>')

    const bases = [
        'mensagens',
        'funcoes',
        'campos',
        'dados_distritos',
        'dados_clientes',
        'fornecedores',
        'materiais',
        'mao_obra',
        'dados_obras',
        'ferramentas',
        'dados_colaboradores',
        'dados_despesas',
        'dados_orcamentos',
        'dados_setores'
    ]

    for (const base of bases) {
        await sincronizarDados(base, true, true) // Nome base, overlay off e resetar bases;
        logs.insertAdjacentHTML('beforeend', `<label>Sincronizando: ${base}</label>`)
    }

    telaPrincipal()
    removerOverlay()

}

telaLogin()

setInterval(async function () {
    await reprocessarOffline()
}, 30 * 1000)

function exibirSenha(img) {

    let inputSenha = img.previousElementSibling
    const atual = inputSenha.type == 'password'
    inputSenha.type = atual ? 'text' : 'password'
    img.src = `imagens/${atual ? 'olhoAberto' : 'olhoFechado'}.png`

}

function cadastrar() {

    const campos = ['Nome Completo', 'Usuário', 'Senha', 'E-mail', 'Telefone']

    const acumulado = `
        <div class="camposCadastro">
            ${campos.map(campo => `${modelo(campo)}`).join('')}
            <hr style="width: 100%;">
            ${btnPadrao('Criar acesso', 'salvarCadastro()')}
        </div>
        `

    popup(acumulado, 'Cadastro')

}

async function acessoLogin() {

    overlayAguarde()
    const divAcesso = document.getElementById('acesso')
    divAcesso.style.display = 'none'

    const inputs = divAcesso.querySelectorAll('input')
    const url = `${api}/acesso`

    if (inputs[0].value == '' || inputs[1].value == '') {
        popup(mensagem('Senha e/ou usuário não informado(s)'), 'ALERTA', true)
        divAcesso.style.display = 'flex'

    } else {

        const requisicao = {
            tipoAcesso: 'login',
            servidor,
            dados: {
                usuario: inputs[0].value,
                senha: inputs[1].value
            }
        }

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requisicao)
            })
            if (!response.ok) {
                const err = await response.json()
                throw err
            }

            const data = await response.json()

            if (data.mensagem) {
                divAcesso.style.display = 'flex'
                return popup(mensagem(data.mensagem), 'Alerta', true);

            } else {
                localStorage.setItem('acesso', JSON.stringify(data));
                telaPrincipal()
                removerOverlay()
            }

            divAcesso.style.display = 'flex'

        } catch (e) {
            popup(mensagem(e), 'Alerta', true);
        }

    }
}

async function verificarSupervisor(usuario, senha) {

    const url = `${api}/acesso`
    const requisicao = {
        tipoAcesso: 'login',
        servidor,
        dados: { usuario, senha }
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requisicao)
        })

        if (!response.ok) {
            const err = await response.json()
            throw err
        }

        const data = await response.json()

        if (data.funcao) {
            return 'Senha válida'
        } else {
            return 'Senha Supervisão inválida'
        }
    } catch (e) {
        console.log(e);
        return 'Não foi possível no momento'
    }
}

// NOVO USUÁRIO ; 

function salvarCadastro() {

    overlayAguarde()

    let camposCadastro = document.querySelector('.camposCadastro')
    let campos = camposCadastro.querySelectorAll('input')
    let nome_completo = campos[0].value
    let usuario = campos[1].value
    let senha = campos[2].value
    let email = campos[3].value
    let telefone = campos[4].value

    if (usuario == "" || senha == "" || email == "") {

        popup(mensagem('Senha, usuário ou e-mail não informado(s)'), 'AVISO', true)

    } else {

        const payload = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                servidor,
                tipoAcesso: 'cadastro',
                dados: {
                    usuario,
                    senha,
                    email,
                    nome_completo,
                    telefone
                }
            })
        }

        fetch(`${api}/acesso`, payload)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw err; });
                }
                return response.json();
            })
            .then(data => {
                return popup(mensagem(data.mensagem || 'Falha... tente novamente.'), 'Aviso', true);
            })
            .catch(error => {
                popup(mensagem(error.mensagem), 'Aviso', true);
            })

    }

}

function popup(elementoHTML, titulo, naoRemoverAnteriores) {

    const acumulado = `
        <div id="tempPop" class="overlay">

            <div class="janela_fora">
                
                <div class="toolbarPopup">

                    <div class="title">${titulo || 'Popup'}</div>
                    <span class="close" onclick="removerPopup()">×</span>

                </div>
                
                <div class="janela">

                    ${elementoHTML}

                </div>

            </div>

        </div>`

    removerPopup(naoRemoverAnteriores)
    removerOverlay()
    document.body.insertAdjacentHTML('beforeend', acumulado);

}

async function removerPopup(naoRemoverAnteriores) {

    const popUps = document.querySelectorAll('#tempPop')

    if (naoRemoverAnteriores) return

    if (popUps.length > 1) {
        popUps[popUps.length - 1].remove()

    } else {
        popUps.forEach(pop => {
            pop.remove()
        })
    }

    const aguarde = document.querySelector('.aguarde')
    if (aguarde) aguarde.remove()

}

function removerOverlay() {
    let aguarde = document.querySelector('.aguarde')
    if (aguarde) aguarde.remove()
}

function overlayAguarde() {

    const aguarde = document.querySelector('.aguarde')
    if (aguarde) aguarde.remove()

    const elemento = `
        <div class="aguarde">
            <div class="div-mensagem"></div>
            <img src="gifs/loading.gif">
        </div>
    `
    document.body.insertAdjacentHTML('beforeend', elemento)

    let pageHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
    );

    document.querySelector('.aguarde').style.height = `${pageHeight}px`;

}

async function telaPrincipal() {

    toolbar.style.display = 'flex'
    acesso = JSON.parse(localStorage.getItem('acesso'))
    funcoes = await recuperarDados('funcoes')
    const acumulado = `

    <div class="menu-container">

        <div class="side-menu" id="sideMenu">

            <br>

            <div class="nomeUsuario">
                <span><strong>${funcoes?.[acesso?.funcao]?.nome || '...'}</strong> ${acesso.usuario}</span>
            </div>

            ${btn('atualizar', 'Sincronizar App', 'atualizarApp()')}
            ${btn('perfil', 'Parceiros', 'telaUsuarios()')}
            ${btn('colaborador', 'Colaboradores', 'telaColaboradores()')}
            ${btn('obras', 'Obras', 'telaObras()')}
            ${btn('pessoas', 'Clientes', 'telaClientes()')}
            ${btn('contas', 'Despesas', 'telaDespesas()')}
            ${btn('orcamentos', 'Orçamentos', 'telaOrcamentos()')}
            ${btn('configuracoes', 'Configurações', 'telaConfiguracoes()')}
            ${btn('chat',
        `<div style="${horizontal}; justify-content: space-between; width: 100%; margin-right: 1rem;">
                    <span>Chat</span>
                    <div id="msg"></div>
                </div>
                `,
        'painelUsuarios()')}
            ${btn('sair', 'Desconectar', 'confirmarSaida()')}

        </div>

        <div class="telaInterna">
            <div class="plano-fundo">
                <h1>Reconstrular</h1>
                <p>Seja bem vindo!</p>
            </div>
        </div>
    </div>
    `

    tela.innerHTML = acumulado
    telaInterna = document.querySelector('.telaInterna')

    atualizarApp()

}

async function atualizarApp() {

    if (emAtualizacao) return

    emAtualizacao = true

    mostrarMenus(true)
    sincronizarApp()
    let status = { total: 14, atual: 1 }

    const basesAuxiliares = [
        'mensagens',
        'funcoes',
        'campos',
        'dados_distritos',
        'dados_clientes',
        'fornecedores',
        'materiais',
        'dados_obras',
        'ferramentas',
        'mao_obra',
        'dados_colaboradores',
        'dados_despesas',
        'dados_orcamentos',
        'dados_setores'
    ]

    for (const base of basesAuxiliares) {
        sincronizarApp(status)
        await sincronizarDados(base, true)
        status.atual++
    }

    funcoes = await recuperarDados('funcoes')
    dados_distritos = await recuperarDados('dados_distritos')
    dados_setores = await recuperarDados('dados_setores')
    acesso = dados_setores[acesso.usuario]

    if (acesso.excluído) await removerAcesso()

    localStorage.setItem('acesso', JSON.stringify(acesso))

    sincronizarApp({ remover: true })

    emAtualizacao = false
}

async function removerAcesso() {
    await inserirDados({}, 'dados_setores', true)
    acesso = {}
    localStorage.removeItem('acesso')
    await telaLogin()
    removerOverlay()
}

function sincronizarApp({ atual, total, remover } = {}) {

    if (remover) {

        setTimeout(() => {
            const loader = document.querySelector('.circular-loader')
            if (loader) loader.remove()
            return
        }, 2000)

        return

    } else if (atual) {

        const circumference = 2 * Math.PI * 50;
        const percent = (atual / total) * 100;
        const offset = circumference - (circumference * percent / 100);
        progressCircle.style.strokeDasharray = circumference;
        progressCircle.style.strokeDashoffset = offset;
        percentageText.textContent = `${percent.toFixed(0)}%`;

        return

    } else {

        const carregamentoHTML = `
        <div class="circular-loader">
            <svg>
                <circle class="bg" cx="60" cy="60" r="50"></circle>
                <circle class="progress" cx="60" cy="60" r="50"></circle>
            </svg>
            <div class="percentage">0%</div>
        </div>
        `
        const botoesMenu = document.querySelector('.side-menu')
        botoesMenu.insertAdjacentHTML('afterbegin', carregamentoHTML)

        progressCircle = document.querySelector('.circular-loader .progress');
        percentageText = document.querySelector('.circular-loader .percentage');
    }

}

function pesquisarGenerico(coluna, texto, filtro, id) {

    filtro[coluna] = String(texto).toLowerCase().replace('.', '')

    let tbody = document.getElementById(id);
    let trs = tbody.querySelectorAll('tr');
    let contador = 0

    trs.forEach(function (tr) {
        let tds = tr.querySelectorAll('td');
        let mostrarLinha = true;

        for (var col in filtro) {
            let filtroTexto = filtro[col];

            if (filtroTexto && col < tds.length) {
                let element = tds[col].querySelector('input') || tds[col].querySelector('textarea') || tds[col].querySelector('select') || tds[col].textContent
                let conteudoCelula = element.value ? element.value : element
                let texto_campo = String(conteudoCelula).toLowerCase().replace('.', '')

                if (!texto_campo.includes(filtroTexto)) {
                    mostrarLinha = false;
                    break;
                }
            }
        }

        mostrarLinha ? contador++ : ''

        tr.style.display = mostrarLinha ? '' : 'none';
    });

    let contagem = document.getElementById('contagem')
    if (contagem) {
        contagem.textContent = contador
    }

}

function telaConfiguracoes() {

    telaAtiva = 'configurações'

    mostrarMenus(false)

    titulo.textContent = 'Configurações'

    const acumulado = `
        <div class="painel-despesas">
            <br>
            ${btn('preco', 'Configuração da Tarefas', `desativado = 'N'; telaPrecos()`)}
            ${btn('preco_neg', 'Tarefas Desativadas', `desativado = 'S'; telaPrecos()`)}
            ${btn('niveis', 'Níveis de Acesso', 'telaNiveis()')}
        </div>
    `

    telaInterna.innerHTML = acumulado

}

async function configuracoesEmails() {

    mostrarMenus()
    titulo.innerHTML = 'Configurações de E-mails'
    const configuracoes = await recuperarDados('configuracoes')

    const acumulado = `
        <div class="configuracoes">
            <h1 style="color: #222;">Configurações</h1>
            <span>Informe os e-mails para receber as informações abaixo: </span>
            <hr style="width: 100%;">

            <span>Folhas de Ponto</span>
            <input id="emailFolha" placeholder="digite o e-mail" value="${configuracoes?.emailFolha || ''}">

            <span>Recebimento de alertas [<b>Colaboradores preenchidos</b>]</span>
            <input id="emailAlertas" placeholder="digite o e-mail" value="${configuracoes?.emailAlertas || ''}">

            <br> 

            <div style="${horizontal}; gap: 1rem;">
                <button onclick="salvarConfigs()">Salvar</button>
                <button onclick="telaConfiguracoes()" style="background-color: #3131ab;">Voltar</button>
            </div>
        
        </div>
    `

    telaInterna.innerHTML = acumulado

}

async function telaNiveis() {

    titulo.innerHTML = 'Níveis de Acesso'
    const nomeBase = 'funcoes'
    const colunas = [
        'Função',
        'Regras',
        'Colaboradores',
        'Obras',
        'Clientes',
        'Despesas',
        'Parceiros',
        'Orçamentos',
        'Configurações',
        'Registo de Ponto'
    ]

    const btnExtras = `
        <button data-controle="inserir" onclick="adicionarFuncao()">Adicionar Função</button>
    `

    const acumulado = modeloTabela({ colunas, nomeBase, btnExtras })

    telaInterna.innerHTML = acumulado

    funcoes = await recuperarDados('funcoes')

    for (const [idFuncao, dados] of Object.entries(funcoes || {})) {
        criarLinhaFuncao(idFuncao, dados)
    }

    // Regras de validação;
    validarRegrasAcesso()

}

function validarRegrasAcesso() {

    const coluna = telaAtiva
    const permissao = funcoes?.[acesso.funcao]?.[coluna]
    const [uCidade, uZona, uDistrito] = [acesso.cidade, acesso.zona, acesso.distrito]

    if (!permissao) return

    const { regra, filtros = {} } = permissao
    const trs = document.querySelectorAll('tr')

    for (const tr of trs) {

        const cidade = tr.querySelector('[name="cidade"]')?.dataset?.cod
        const distrito = tr.querySelector('[name="distrito"]')?.dataset?.cod
        const zona = tr.querySelector('[name="zona"]')?.dataset?.cod

        let permitir = false

        // regra base
        switch (regra) {
            case '✅ Total acesso':
            case '🟢 Permissão Parcial (Apaga, insere e edita)':
            case '✏️ Pode Editar/Inserir':
            case '👁️ Visualizador':
                permitir = true
                break
            default:
                permitir = false
        }

        // filtros hierárquicos
        if (permitir && filtros.zona === 'S' && zona && zona !== uZona) {
            permitir = false
        }

        if (permitir && filtros.distrito === 'S' && distrito && distrito !== uDistrito) {
            permitir = false
        }

        if (permitir && filtros.cidade === 'S' && cidade && cidade !== uCidade) {
            permitir = false
        }

        if (!permitir) tr.remove()
    }

    validarControlesAcesso()
}

function validarControlesAcesso() {

    // Tela Ativa precisa ser chamada em cada tela;
    const coluna = telaAtiva
    const permissao = funcoes?.[acesso.funcao]?.[coluna]

    if (!permissao) return

    const { regra } = permissao

    const controles = document.querySelectorAll('[data-controle]')

    for (const el of controles) {

        const acao = el.dataset.controle // inserir | editar | apagar
        let permitir = false

        switch (regra) {

            case '✅ Total acesso':
            case '🟢 Permissão Parcial (Apaga, insere e edita)':
                permitir = true
                break

            case '✏️ Pode Editar/Inserir':
                permitir = acao === 'inserir' || acao === 'editar'
                break

            case '👁️ Visualizador':
            case '❌ Sem acesso':
            default:
                permitir = false
        }

        el.style.display = permitir ? '' : 'none'
    }
}

function criarLinhaFuncao(idFuncao, dados) {

    let autorizados = ''
    for (const id of dados?.regras || []) {
        autorizados += `<span>• ${funcoes?.[id]?.nome || '...'}</span>`
    }

    const filtrosPorColuna = {
        obras: ['distrito', 'cidade', 'zona', 'autorizado'],
        clientes: ['distrito', 'cidade', 'zona', 'autorizado'],
        despesas: ['zona', 'distrito'],
        parceiros: ['zona', 'distrito'],
        orcamentos: ['distrito', 'autorizado']
    }

    // Modelo
    function montarFiltros({ idFuncao, dados, coluna }) {

        const filtros = filtrosPorColuna[coluna]
        if (!filtros) return ''

        return filtros.map(chave => `
        <div style="${horizontal}; gap: 2px;">
            <input
                type="checkbox"
                ${dados?.[coluna]?.filtros?.[chave] === 'S' ? 'checked' : ''}
                onchange="alterarFiltro(this, '${idFuncao}', '${coluna}', '${chave}')"
            >
            <span>Apenas ${inicialMaiuscula(chave)}</span>
        </div>
    `).join('')
    }

    // Esquemas (2)
    const colunas = ['colaboradores', 'obras', 'clientes', 'despesas', 'parceiros', 'orçamentos', 'configurações', 'registro_de_ponto']
    const opcoes = [
        '',
        '✅ Total acesso',
        '🟢 Permissão Parcial (Apaga, insere e edita)',
        '👁️ Visualizador',
        '✏️ Pode Editar/Inserir',
        '❌ Sem acesso'
    ]

    // Lançamentos
    const tdsExtras = colunas.map(col => `
    <td style="text-align: left; min-width: 200px;">
        <div style="${vertical}; gap: 2px;">
            <select onchange="atualizarRegra(this, '${col}', '${idFuncao}')">
                ${opcoes.map(op =>
        `<option ${dados?.[col]?.regra === op ? 'selected' : ''}>${op}</option>`
    ).join('')}
            </select>
            ${montarFiltros({ idFuncao, dados, coluna: col })}
        </div>
    </td>`).join('')


    const tds = `
        <td>${dados?.nome || ''}</td>
        <td>
            <div style="${horizontal}; justify-content: space-between; align-items: start; gap: 0.5rem;"> 
                <div style="${vertical}; gap: 2px;"> 
                    ${autorizados}
                </div>
                <img onclick="adicionarFuncao('${idFuncao}')" src="imagens/pesquisar.png">
            </div>
        </td>
        ${tdsExtras}
    `

    const trExistente = document.getElementById(idFuncao)

    if (trExistente) return trExistente.innerHTML = tds

    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${idFuncao}">${tds}</tr>`)

}

async function alterarFiltro(input, idFuncao, coluna, chave) {

    const valor = input.checked ? 'S' : 'N'

    funcoes[idFuncao] ||= {}

    if (typeof funcoes[idFuncao][coluna] !== 'object' || !funcoes[idFuncao][coluna]) {
        funcoes[idFuncao][coluna] = {}
    }

    funcoes[idFuncao][coluna].filtros ||= {}
    funcoes[idFuncao][coluna].filtros[chave] = valor

    await inserirDados({ [idFuncao]: funcoes[idFuncao] }, 'funcoes')
    enviar(`funcoes/${idFuncao}/${coluna}/filtros/${chave}`, valor)

}

async function atualizarRegra(select, coluna, idFuncao) {

    const funcao = funcoes[idFuncao]
    funcao[coluna] ??= {}
    funcao[coluna].regra = select.value
    await inserirDados({ [idFuncao]: funcao }, 'funcoes')
    enviar(`funcoes/${idFuncao}/${coluna}/regra`, select.value)

}

async function adicionarFuncao(idFuncao) {

    const funcao = funcoes?.[idFuncao] || {}

    const opcoes = Object.entries(funcoes)
        .map(([id, f]) => {
            if (id == idFuncao) return ''
            return `
            <div style="${horizontal}; gap: 5px;">
                <input name="funcoes" type="checkbox" id="${id}" ${funcao?.regras?.includes(id) ? 'checked' : ''}>
                <span>${f.nome}</span>
            </div>
            `
        })
        .join('')

    const linhas = [
        { texto: 'Função', elemento: `<textarea name="nomeFuncao" placeholder="Nome da Função">${funcao.nome || ''}</textarea>` },
        {
            texto: 'Poderá cadastrar',
            elemento: `<div style="${vertical}; gap: 2px;">${opcoes}</div>`
        }
    ]

    const botoes = [
        { funcao: idFuncao ? `salvarFuncao('${idFuncao}')` : 'salvarFuncao()', img: 'concluido', texto: 'Salvar' }
    ]

    if (idFuncao) botoes.push({ texto: 'Excluir', img: 'cancel', funcao: '' })

    const titulo = idFuncao ? 'Editar Função' : 'Adicionar Função'
    const form = new formulario({ linhas, botoes, titulo })
    form.abrirFormulario()

}

async function salvarFuncao(idFuncao = ID5digitos()) {

    overlayAguarde()

    const funcao = funcoes[idFuncao] || {}
    const nomeFuncao = document.querySelector('[name="nomeFuncao"]')

    funcao.nome = nomeFuncao.value
    funcao.regras = []

    const inputs = document.querySelectorAll('[name="funcoes"]')

    for (const input of inputs) {
        if (input.checked) funcao.regras.push(input.id)
    }

    await inserirDados({ [idFuncao]: funcao }, 'funcoes')
    enviar(`funcoes/${idFuncao}`, funcao)

    removerPopup()

    await telaNiveis()

}

async function salvarConfigs() {

    overlayAguarde()

    const emailFolha = document.getElementById('emailFolha').value
    const emailAlertas = document.getElementById('emailAlertas').value

    const configuracoes = {
        emailFolha,
        emailAlertas
    }

    await enviar('configuracoes', configuracoes)
    await inserirDados(configuracoes, 'configuracoes')

    popup(mensagem('Configurações Salvas', 'imagens/concluido.png'), 'Sucesso', true)
}

function verificarClique(event) {
    const menu = document.querySelector('.side-menu');
    if (menu && menu.classList.contains('active') && !menu.contains(event.target)) menu.classList.remove('active')
}

async function sincronizarDados(base, overlayOff, resetar) {

    if (!overlayOff) overlayAguarde()

    let nuvem = await receber(base) || {}
    await inserirDados(nuvem, base, resetar)

    if (!overlayOff) removerOverlay()
}

async function atualizarDados(base) {

    overlayAguarde()
    await sincronizarDados(base)

    const dados = await recuperarDados(base)
    for (const [id, objeto] of Object.entries(dados).reverse()) criarLinha(objeto, id, base)
    removerOverlay()

}

async function buscarDados() {
    const select = document.querySelector('[name="cliente"]')
    const idCliente = select.options[select.selectedIndex].id

    const cliente = await recuperarDado('dados_clientes', idCliente)

    if (!cliente) return

    document.querySelector('[name="telefone"]').textContent = cliente.telefone
    document.querySelector('[name="email"]').textContent = cliente.email

}

async function carregarSelects({ select, painel = false, cidade, distrito } = {}) {

    // Se painel existir, então busca-se do painel de formulario, do contrário do documento mesmo;
    const local = painel ? document.querySelector('.painel-padrao') : document
    const selectDistrito = local.querySelector('[name="distrito"]')
    const selectCidade = local.querySelector('[name="cidade"]')

    if (!select) {
        const opcoesDistrito = Object.entries(dados_distritos).reverse()
            .map(([idDistrito, objDistrito]) => `<option value="${idDistrito}" ${distrito == idDistrito ? 'selected' : ''}>${objDistrito.nome}</option>`)
            .join('');
        selectDistrito.innerHTML = `<option></option>${opcoesDistrito}`
    }

    const selectAtual = select ? select.value : selectDistrito.value
    const cidades = dados_distritos?.[selectAtual]?.cidades || {};
    const opcoesCidade = Object.entries(cidades).reverse()
        .map(([idCidade, objCidade]) => `<option value="${idCidade}" ${cidade == idCidade ? 'selected' : ''}>${objCidade.nome}</option>`)
        .join('');

    selectCidade.innerHTML = `<option></option>${opcoesCidade}`
}

function confirmarSaida() {
    const acumulado = `
        <div style="${horizontal}; padding: 1rem; gap: 0.5rem; background-color: #d2d2d2;">
            <span>Tem certeza?</span>
            <button onclick="deslogar(); removerPopup();">Confirmar</button>
        </div>
    `
    popup(acumulado, 'Sair', true)
}

function deslogar() {
    localStorage.removeItem('acesso')
    telaLogin()
}

function mostrarMenus(operacao) {
    const menu = document.querySelector('.side-menu').classList

    if (operacao === 'toggle' || operacao === undefined) {
        return menu.toggle('active')
    }

    operacao ? menu.add('active') : menu.remove('active')
}

function visibilidade(input, value) {
    const campos = ['quantidade', 'tamanho']
    for (const campo of campos) {
        document.querySelector(`[name="${value}_${campo}"]`).style.display = input.checked ? '' : 'none'
    }
}

async function formularioEPI(idColaborador) {

    const colaborador = await recuperarDado('dados_colaboradores', idColaborador)
    const equipamentos = colaborador?.epi?.equipamentos || {}

    const opcoes = (ini, fim, valorAtual) => {
        let stringOpcoes = '<option></option>'
        for (let i = ini; i <= fim; i++) stringOpcoes += `<option ${valorAtual == i ? 'selected' : ''}>${i}</option>`
        return stringOpcoes
    }

    const senhas = (texto, limite) => `
        <div style="${vertical}; gap: 5px;">
            <label>${texto}</label>
            <input type="password" ${limite ? `maxlenght="${limite}" id="pin" data-pin="${colaborador.pin}" placeholder="Limite de ${limite} dígitos"` : 'id="supervisor" placeholder="Senha de acesso ao App"'}>
        </div>
    `

    const tr = (texto, value) => {

        const equipamento = equipamentos[value] || false
        const visibilidade = `style="display: ${equipamento ? '' : 'none'}"`
        return `
        <tr>
            <td style="text-align: left;">${texto}</td>
            <td>
                <input onchange="visibilidade(this, '${value}')" 
                type="checkbox" 
                class="megaInput" 
                value="${value}" 
                name="camposEpi"
                ${equipamentos[value] ? 'checked' : ''}>
            </td>
            <td><select ${visibilidade} name="${value}_quantidade">${opcoes(1, 10, equipamento?.quantidade)}</select></td>
            <td><select ${visibilidade} name="${value}_tamanho">${opcoes(37, 47, equipamento?.tamanho)}</select></td>
        </tr>
    `}

    const cab = ['Equipamento', '', 'Quantidade', 'Tamanho']
        .map(op => `<th>${op}</th>`)
        .join('')

    const acumulado = `
        <div class="painel-cadastro">

            <table>
                <thead>${cab}</thead>
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
            <br>

            ${senhas('Pin Colaborador', 4)}

            ${senhas('Senha Supervisor')}

        </div>
        <div class="rodape-formulario">
            <button onclick="salvarEpi('${idColaborador}')">Inserir</button>
        </div>
    `

    popup(acumulado, 'Formulário de EPI', true)
}

async function salvarEpi(idColaborador) {

    overlayAguarde()

    const pinInput = document.getElementById('pin')

    if (pinInput.dataset.pin !== pinInput.value) return popup(mensagem('Pin do colaborador não confere'), 'Alerta', true)

    let colaborador = await recuperarDado('dados_colaboradores', idColaborador)
    const inputsAtivos = document.querySelectorAll('input[name="camposEpi"]:checked')
    let epi = {
        data: new Date().getTime(),
        equipamentos: {}
    }

    for (const input of inputsAtivos) {
        const campo = input.value
        epi.equipamentos[campo] = {
            quantidade: Number(document.querySelector(`[name="${campo}_quantidade"]`).value),
            tamanho: Number(document.querySelector(`[name="${campo}_tamanho"]`).value)
        }
    }

    colaborador.epi = epi

    // Verificar acesso do supervisor
    const senhaSupervisor = document.getElementById('supervisor')
    const acesso = JSON.parse(localStorage.getItem('acesso'))
    const resposta = await verificarSupervisor(acesso.usuario, senhaSupervisor.value)

    if (resposta !== 'Senha válida') return popup(mensagem(resposta), 'Alerta', true)

    await enviar(`dados_colaboradores/${idColaborador}/epi`, epi)
    await inserirDados({ [idColaborador]: colaborador }, 'dados_colaboradores')
    await adicionarColaborador(idColaborador)

    removerPopup()

    await enviarAlerta(idColaborador)

}

function infoObra(dados) {

    const obra = dados_obras[dados.obra]
    let dadosObra = '<span>Sem Obra</span>'
    if (obra && obra.distrito) {

        const cliente = dados_clientes[obra?.cliente]
        const distrito = dados_distritos[obra?.distrito]
        const cidade = distrito?.cidades[obra?.cidade]
        dadosObra = `<span>${cliente?.nome || '--'} / ${distrito?.nome || '--'} / ${cidade?.nome || '--'}</span>`
    }

    return dadosObra
}

function dinheiro(valor) {
    if (!valor) return '€ 0,00';

    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'EUR'
    });
}

function resetarPin() {
    document.querySelector('[name="pin"]').value = ''
    document.querySelector('[name="pinEspelho"]').value = ''
    verificarRegras()
}

async function abrirCamera() {
    const cameraDiv = document.querySelector('.cameraDiv');
    const video = cameraDiv.querySelector('video');
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        cameraDiv.style.display = 'flex';
        setTimeout(pararCam, 5 * 60 * 1000);

    } catch (err) {
        popup(mensagem('Erro ao acessar a câmera: ' + err.message), 'Alerta', true);
    }
}

function encerrarCam() {

    if (stream) stream.getTracks().forEach(track => track.stop());
    const cameraDiv = document.querySelector('.cameraDiv');
    if (cameraDiv) cameraDiv.style.display = 'none'

}

async function tirarFoto() {
    const cameraDiv = document.querySelector('.cameraDiv');
    const canvas = cameraDiv.querySelector('canvas');
    const fotoFinal = document.querySelector('[name="foto"]');
    const video = cameraDiv.querySelector('video');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    fotoFinal.src = canvas.toDataURL('image/png');
    fotoFinal.style.display = 'block';

    encerrarCam()

    setTimeout(() => {

        encerrarCam()

    }, 2 * 60 * 1000)

}

function verificarRegras() {
    // REGRAS
    const input = (name) => document.querySelector(`[name="${name}"]`)
    let liberado = true
    const limites = {
        'nome': { tipo: 'A' },
        'numeroContribuinte': { limite: 9, tipo: 1 },
        'segurancaSocial': { limite: 11, tipo: 1 },
        'pin': { limite: 4, tipo: 1 },
        'pinEspelho': { limite: 4, tipo: 1 },
        'telefone': { limite: 9, tipo: 1 },
    }

    //Aplicar regras
    for (let [name, regra] of Object.entries(limites)) {
        const campo = input(name)
        if (!campo) continue;

        //Tipo
        if (regra.tipo === 1) {
            campo.value = campo.value.replace(/\D/g, '');
        } else if (regra.tipo === 'A') {
            campo.value = campo.value.replace(/[0-9]/g, '');
        }

        if (!regra.limite) continue

        //Limite
        if (campo.value.length > regra.limite) {
            campo.value = campo.value.slice(0, regra.limite);
        }

        //Limite === ao tamanho atual
        regra.liberado = campo.value.length === regra.limite
        if (regra.liberado) {
            campo.classList.remove('invalido')
        } else {
            campo.classList.add('invalido')
        }

        if (!regra.liberado) liberado = false
    }

    //Pins
    const pin = document.querySelector('[name="pin"]')
    const pinEspelho = document.querySelector('[name="pinEspelho"]')
    const rodapeAlerta = document.querySelector('.rodape-alerta')
    const mensagem = (img, msg) => `
        <div class="rodape-alerta">
            <img src="imagens/${img}.png">
            <span>${msg}</span>
        </div>
        `

    if (pin.value !== pinEspelho.value || pin.value == '') {
        rodapeAlerta.innerHTML = mensagem('cancel', 'Os Pins não são iguais')
        pin.classList.add('invalido')
        pinEspelho.classList.add('invalido')
    } else {
        pin.classList.remove('invalido')
        pinEspelho.classList.remove('invalido')
        rodapeAlerta.innerHTML = mensagem('concluido', 'Pins iguais')
    }

    //Campos Fixos
    const camposFixos = ['documento', 'especialidade', 'status']
    for (const campo of camposFixos) {
        const ativo = document.querySelector(`input[name="${campo}"]:checked`)
        const bloco = document.querySelector(`[name="${campo}_bloco"]`)
        if (!ativo) {
            bloco.classList.add('invalido')
            liberado = false
        } else {
            bloco.classList.remove('invalido')
        }
    }

    //Campos Flexíveis
    const camposFlex = ['nome', 'dataNascimento', 'email', 'morada', 'numeroDocumento', 'apolice']
    for (const campo of camposFlex) {
        const el = input(campo)
        if (el.value == '') {
            el.classList.add('invalido')
            liberado = false
        } else {
            el.classList.remove('invalido')
        }
    }

    //Documento
    const numeroDocumento = input('numeroDocumento')
    const docAtivo = document.querySelector('input[name="documento"]:checked')
    if (docAtivo && docAtivo.value == 'Cartão de Cidadão') {
        if (numeroDocumento.value.length > 8) numeroDocumento.value = numeroDocumento.value.slice(0, 8)
        numeroDocumento.value = numeroDocumento.value.replace(/\D/g, '')
        if (numeroDocumento.value.length !== 8) {
            liberado = false
            numeroDocumento.classList.add('invalido')
        } else {
            numeroDocumento.classList.remove('invalido')
        }
    }

    return liberado

}

function unicoID() {
    var d = new Date().getTime();
    if (window.performance && typeof window.performance.now === "function") {
        d += performance.now();
    }
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
}

function telaLogin() {

    const acesso = JSON.parse(localStorage.getItem('acesso'))
    if (acesso) return telaPrincipal()

    toolbar.style.display = 'none'

    const acumulado = `
        
        <div id="acesso" class="loginBloco">

            <div class="botaoSuperiorLogin" onclick="telaRegistroPonto()">
                <img src="imagens/relogio.png">
                <span>Registo de Ponto</span>
            </div>

            <div class="baixoLogin">

                <br>
                <img src="imagens/acesso.png" class="cadeado">

                <div style="padding: 20px; display: flex; flex-direction: column; align-items: start; justify-content: center;">

                    <label>Usuário</label>
                    <input type="text" placeholder="Usuário">

                    <label>Senha</label>
                    <div style="${horizontal}; gap: 10px;">
                        <input type="password" placeholder="Senha">
                        <img src="imagens/olhoFechado.png" class="olho" onclick="exibirSenha(this)">
                    </div>
                    
                    <br>
                    <span onclick="recuperarSenha()" style="text-decoration: underline; cursor: pointer;">Esqueceu a senha?</span>

                </div>

                <button onclick="acessoLogin()">Entrar</button>

            </div>

        </div>
    `

    tela.innerHTML = acumulado
}

function recuperarSenha() {

    const acumulado = `
        <div class="painel-recuperacao">
            <span>Digite o Usuário</span>
            <input name="identificador">
            <hr>
            <button onclick="solicitarCodigo()">Solicitar</button>
        </div>
    `

    popup(acumulado, 'Recuperar acesso', true)

}

async function solicitarCodigo() {

    const identificador = document.querySelector('[name="identificador"]')

    if (!identificador) return

    overlayAguarde()

    const resposta = await recAC(identificador.value)

    if (resposta.sucess) {

        const acumulado = `
            <div class="painel-recuperacao">
                <span>Preencha com os números recebidos no e-mail</span>
                <hr>
                <div style="${horizontal}; gap: 0.5rem;">
                    <input id="identificador" style="display: none;" value="${identificador.value}">
                    <input id="codigo" placeholder="Código" class="camp-1" type="number">
                    <input id="novaSenha" placeholder="Nova Senha" class="camp-1">
                    <button onclick="salvarSenha()">Confirmar</button>
                </div>
            </div>
        `
        popup(acumulado, 'Informe o código')
    } else {
        popup(mensagem(resposta.mensagem || 'Falha na solicitação'), 'Alerta')
    }

}

async function salvarSenha() {

    overlayAguarde()

    const identificador = document.getElementById('identificador').value
    const novaSenha = document.getElementById('novaSenha').value
    const codigo = document.getElementById('codigo').value

    const resposta = await salvarNovaSenha({ identificador, novaSenha, codigo })

    if (resposta.sucess) {
        return popup(mensagem(resposta.mensagem), 'Alerta')
    }

    if (resposta.mensagem) popup(mensagem(resposta.mensagem), 'Alerta', true)

}

async function enviar(caminho, info, idEvento) {
    const url = `${api}/salvar`
    const objeto = { caminho, valor: info, servidor }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(objeto)
        })

        let data
        try {
            data = await response.json()
        } catch (parseError) {
            // Erro ao tentar interpretar como JSON;
            console.error("Resposta não é JSON válido:", parseError)
            salvarOffline(objeto, 'enviar', idEvento)
            return null;
        }

        if (!response.ok) {
            // Se a API respondeu erro (ex: 400, 500);
            console.error("Erro HTTP:", response.status, data)
            salvarOffline(objeto, 'enviar', idEvento)
            return null
        }

        if (idEvento) removerOffline('enviar', idEvento)

        return data;
    } catch (erro) {
        console.error("Erro na requisição:", erro)
        salvarOffline(objeto, 'enviar', idEvento)
        return null
    }
}

function erroConexao(mensagem) {
    const acumulado = `
        <div id="erroConexao" style="${horizontal}; gap: 1rem; background-color: #d2d2d2; padding: 1rem;">
            <img src="gifs/alerta.gif" style="width: 2rem;">
            <span>${mensagem || `<b>Tente novamente em minutos</b>`}</span>
        </div>
    `
    const erroConexao = document.getElementById('erroConexao')
    if (!erroConexao) popup(acumulado, 'Sincronização', true)

    sincronizarApp({ remover: true })
    emAtualizacao = false

}

async function receber(chave) {

    const chavePartes = chave.split('/')
    let timestamp = 0
    const dados = await recuperarDados(chavePartes[0]) || {}

    for (const [, objeto] of Object.entries(dados)) {
        if (objeto.timestamp && objeto.timestamp > timestamp) timestamp = objeto.timestamp
    }

    const obs = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            usuario: acesso.usuario,
            servidor,
            chave,
            timestamp
        })
    }

    return new Promise((resolve, reject) => {
        fetch(`${api}/dados`, obs)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.mensagem) {
                    erroConexao(data?.mensagem || `<b>Falha ao carregar</b>: ${chave}`)
                    reject()
                }
                resolve(data)
            })
            .catch(err => {
                const msg = (err && err.message) ? err.message : `<b>Falha ao carregar</b>: ${chave}`
                erroConexao(msg)
                reject()
            })
    })
}

async function deletar(caminho, idEvento) {

    const url = `${api}/deletar`

    const objeto = {
        caminho,
        usuario: acesso.usuario,
        servidor
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

async function cxOpcoes(name, nomeBase, campos, funcaoAux) {

    function getValorPorCaminho(obj, caminho) {
        const partes = caminho.split('/')
        const ultima = partes[partes.length - 1]
        let func = null

        // Se o último pedaço tiver [funcao]
        if (/\[.*\]$/.test(ultima)) {
            const [chave, nomeFunc] = ultima.match(/^([^\[]+)\[(.+)\]$/).slice(1)
            partes[partes.length - 1] = chave
            func = nomeFunc
        }

        // percorre o caminho
        let valor = partes.reduce((acc, chave) => acc?.[chave], obj)

        // aplica a função se existir
        if (valor != null && func && typeof window[func] === 'function') {
            valor = window[func](valor)
        }

        return valor
    }

    const base = await recuperarDados(nomeBase)
    let opcoesDiv = ''

    for (const [cod, dado] of Object.entries(base)) {

        if (dado.origem && origem !== dado?.origem) continue

        const labels = campos
            .map(campo => {
                const valor = getValorPorCaminho(dado, campo)
                return valor ? `<div>${valor}</div>` : ''
            })
            .join('')

        const descricao = campos
            .map(c => getValorPorCaminho(dado, c))
            .find(v => v !== undefined && v !== null && v !== '')

        opcoesDiv += `
        <div 
            name="camposOpcoes" 
            class="atalhos-opcoes" 
            onclick="selecionar('${name}', '${cod}', '${encodeURIComponent(descricao)}', ${funcaoAux ? `'${funcaoAux}'` : false})">
            <img src="${dado.imagem || 'imagens/visitar.png'}" style="width: 3rem;">
            <div style="${vertical}; gap: 2px;">
                ${labels}
            </div>
        </div>`
    }

    const acumulado = `
        <div style="${vertical}; justify-content: left; background-color: #b1b1b1;">

            <div style="${horizontal}; padding-left: 0.5rem; padding-right: 0.5rem; margin: 5px; background-color: white; border-radius: 10px;">
                <input oninput="pesquisarCX(this)" placeholder="Pesquisar itens" style="border: none; width: 100%;">
                <img src="imagens/pesquisar2.png" style="padding: 0.5rem;"> 
            </div>

            <div style="padding: 1rem; gap: 5px; ${vertical}; background-color: #d2d2d2; width: 30vw; max-height: 40vh; height: max-content; overflow-y: auto; overflow-x: hidden;">
                ${opcoesDiv}
            </div>

        </div>
    `

    popup(acumulado, 'Selecione o item', true)
}

async function selecionar(name, id, termo, funcaoAux) {
    termo = decodeURIComponent(termo)
    const elemento = document.querySelector(`[name='${name}']`)
    elemento.textContent = termo || id
    elemento.id = id
    removerPopup()

    if (funcaoAux) await eval(funcaoAux)
}

function pesquisarCX(input) {
    const termoPesquisa = String(input.value)
        .toLowerCase()
        .replace(/[./-]/g, ''); // remove ponto, traço e barra

    const divs = document.querySelectorAll(`[name='camposOpcoes']`);

    for (const div of divs) {
        const termoDiv = String(div.textContent)
            .toLowerCase()
            .replace(/[./-]/g, ''); // mesma limpeza no conteúdo

        div.style.display = (termoDiv.includes(termoPesquisa) || termoPesquisa === '') ? '' : 'none';
    }
}

function inicialMaiuscula(string) {
    if (string == undefined) {
        return ''
    }
    string.includes('_') ? string = string.split('_').join(' ') : ''

    if (string.includes('lpu')) return string.toUpperCase()
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

async function configuracoes(usuario, campo, valor) {
    try {
        const response = await fetch(`${api}/configuracoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, campo, valor, servidor })
        })

        const data = await response.json()

        if (!response.ok) {
            return {
                ok: false,
                mensagem: data?.mensagem || `Erro ${response.status}`
            }
        }

        return {
            ok: true,
            mensagem: data?.mensagem || null
        }

    } catch (err) {
        console.error(err)
        return {
            ok: false,
            mensagem: 'Erro de conexão'
        }
    }
}


function pesquisar(input, idTbody) {
    const termo = input.value.trim().toLowerCase();
    const tbody = document.getElementById(idTbody);
    const trs = tbody.querySelectorAll('tr');

    trs.forEach(tr => {
        const tds = tr.querySelectorAll('td');
        let encontrou = false;

        tds.forEach(td => {
            let texto = td.textContent.trim().toLowerCase();

            const inputInterno = td.querySelector('input, textarea, select');
            if (inputInterno) {
                texto += ' ' + inputInterno.value.trim().toLowerCase();
            }

            if (termo && texto.includes(termo)) {
                encontrou = true;
            }
        });

        if (!termo || encontrou) {
            tr.style.display = ''; // mostra
        } else {
            tr.style.display = 'none'; // oculta
        }
    });
}

async function enviarAlerta(idColaborador) {
    const url = `${api}/enviar-alerta`
    const resposta = await fetch(url, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idColaborador, servidor })
    });

    const dados = await resposta.json();

    popup(mensagem(dados.mensagem), 'Aviso', true);
}

async function enviarExcel(idObra) {
    const input = document.querySelector('#arquivoExcel');
    if (!input.files.length) return popup(mensagem('Você ainda não selecionou nenhum arquivo'), 'Alerta')

    const formData = new FormData();
    formData.append('arquivo', input.files[0]);

    try {
        const resposta = await fetch(`${api}/processar-tarefas/${idObra}`, {
            method: 'POST',
            body: formData
        });

        const dados = await resposta.json();
        if (resposta.ok) {
            await sincronizarDados('dados_obras')
            await verAndamento(idObra)
        } else {
            popup(mensagem(`Erro: ${dados.mensagem}`), 'Alerta')
        }
    } catch (err) {
        popup(mensagem(`Erro de conexão: ${err}`), 'Alerta')
    }
}

function conversor(stringMonetario) {
    if (typeof stringMonetario === 'number') {
        return stringMonetario;
    } else if (!stringMonetario || stringMonetario.trim() === "") {
        return 0;
    } else {
        stringMonetario = stringMonetario.trim();
        stringMonetario = stringMonetario.replace(/[^\d,]/g, '');
        stringMonetario = stringMonetario.replace(',', '.');
        var valorNumerico = parseFloat(stringMonetario);

        if (isNaN(valorNumerico)) {
            return 0;
        }

        return valorNumerico;
    }
}

function ID5digitos() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 5; i++) {
        const indiceAleatorio = Math.floor(Math.random() * caracteres.length);
        id += caracteres.charAt(indiceAleatorio);
    }
    return id;
}

function base64ToFile(base64, filename = 'foto.png') {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

async function importarAnexos({ input, foto }) {
    const formData = new FormData();

    if (foto) {
        const imagem = base64ToFile(foto);
        formData.append('arquivos', imagem);
    } else {
        for (const file of input.files) {
            formData.append('arquivos', file);
        }
    }

    try {
        const response = await fetch(`${api}/upload/RECONST`, {
            method: 'POST',
            body: formData
        });
        return await response.json();
    } catch (err) {
        popup(mensagem(`Erro na API: ${err}`));
        throw err;
    }
}

function criarAnexoVisual({ nome, link, funcao }) {

    let displayExcluir = 'flex'

    if (!funcao) displayExcluir = 'none'

    return `
        <div class="contornoAnexos" name="${link}">
            <div onclick="abrirArquivo('${link}')" class="contornoInterno">
                <img src="imagens/anexo2.png">
                <label>Arquivo</label>
            </div>
            <img src="imagens/cancel.png" style="display: ${displayExcluir};" onclick="${funcao}">
        </div>`
}

function abrirArquivo(link) {
    link = `${api}/uploads/RECONST/${link}`;
    const imagens = ['png', 'jpg', 'jpeg'];

    const extensao = link.split('.').pop().toLowerCase(); // pega sem o ponto

    if (imagens.includes(extensao)) {
        const acumulado = `
            <div class="fundoImagens">
                <img src="${link}">
            </div>
        `
        return popup(acumulado, 'Arquivo', true);
    }

    window.open(link, '_blank');
}

async function blocoAuxiliarFotos(fotos) {

    if (fotos) {

        const imagens = Object.entries(fotos)
            .map(([link, foto]) => `<img name="foto" data-salvo="sim" id="${link}" src="${api}/uploads/${servidor}/${link}" class="foto" onclick="ampliarImagem(this, '${link}')">`)
            .join('')

        const painel = `
            <div style="${vertical}; gap: 5px;">
                <div class="capturar" onclick="blocoAuxiliarFotos()">
                    <img src="imagens/camera.png" class="olho">
                    <span>Abrir Câmera</span>
                </div>
                <div class="fotos">${imagens}</div>
            </div>
        `
        return painel

    } else {

        const popupCamera = `
            <div style="${vertical}; align-items: center; gap: 3px; background-color: #d2d2d2;">
                <div class="capturar" style="position: fixed; bottom: 10px; left: 10px; z-index: 10003;" onclick="fotoTarefa()">
                    <img src="imagens/camera.png" class="olho">
                    <span>Capturar Imagem</span>
                </div>

                <div class="cameraDiv">
                    <video autoplay playsinline></video>
                    <canvas style="display: none;"></canvas>
                </div>
            </div>
            `
        popup(popupCamera, 'Registrar Fotos', true)
        await abrirCamera()
    }

}

function visibilidadeFotos() {
    const fotos = document.querySelector('.fotos')
    const qtd = fotos.querySelectorAll('img')
    fotos.style.display = qtd.length == 0 ? 'none' : 'grid'
}

async function fotoTarefa() {

    const fotos = document.querySelector('.fotos')
    const cameraDiv = document.querySelector('.cameraDiv');
    const canvas = cameraDiv.querySelector('canvas');
    const video = cameraDiv.querySelector('video');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const idFoto = ID5digitos()
    const foto = `<img name="foto" id="${idFoto}" src="${canvas.toDataURL('image/png')}" class="foto" onclick="ampliarImagem(this, '${idFoto}')">`
    fotos.insertAdjacentHTML('beforeend', foto)

    removerPopup()
    visibilidadeFotos()

}

function salvarOffline(objeto, operacao, idEvento) {
    let dados_offline = JSON.parse(localStorage.getItem('dados_offline')) || {}
    idEvento = idEvento || ID5digitos()

    if (!dados_offline[operacao]) dados_offline[operacao] = {}
    dados_offline[operacao][idEvento] = objeto

    localStorage.setItem('dados_offline', JSON.stringify(dados_offline))
}

async function reprocessarOffline() {
    const dados_offline = JSON.parse(localStorage.getItem('dados_offline')) || {};

    for (const [operacao, operacoes] of Object.entries(dados_offline)) {

        for (const [idEvento, evento] of Object.entries(operacoes)) {

            if (operacao == 'enviar') {
                await enviar(evento.caminho, evento.valor, idEvento)
            } else if (operacao == 'deletar', idEvento) {
                await deletar(evento.chave, idEvento)
            }

        }
    }
}

function removerOffline(operacao, idEvento) {
    let dados_offline = JSON.parse(localStorage.getItem('dados_offline'))
    delete dados_offline?.[operacao]?.[idEvento]
    localStorage.setItem('dados_offline', JSON.stringify(dados_offline))
}

async function enviarMargens({ codigos, margem, tabela}) {
    return new Promise((resolve) => {
        fetch(`${api}/margens`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ codigos, margem, tabela, servidor })
        })
            .then(response => response.json())
            .then(data => {
                resolve(data);
            })
            .catch((err) => {
                reject({ mensagem: err });
            });
    });
}

async function recAC(identificador) {

    const url = `${api}/recuperar`

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identificador, servidor })
        })

        if (!response.ok) {
            console.error(`Falha ao deletar: ${response.status} ${response.statusText}`)
            const erroServidor = await response.text()
            console.error(`Resposta do servidor:`, erroServidor)
            throw new Error(`Erro HTTP ${response.status}`)
        }

        const data = await response.json()

        return data

    } catch (erro) {
        return { mensagem: erro }
    }

}

async function salvarNovaSenha({ identificador, novaSenha, codigo }) {

    const url = `${api}/verificar-codigo`

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identificador, novaSenha, codigo, servidor })
        })

        if (!response.ok) {
            console.error(`Falha ao deletar: ${response.status} ${response.statusText}`)
            const erroServidor = await response.text()
            console.error(`Resposta do servidor:`, erroServidor)
            throw new Error(`Erro HTTP ${response.status}`)
        }

        const data = await response.json()

        return data

    } catch (erro) {
        return { mensagem: erro }
    }

}

function divPorcentagem(porcentagem) {
    const valor = Math.max(0, Math.min(100, Number(porcentagem) || 0))

    return `
        <div style="${horizontal}; width: 95%; z-index: 0;">
            <div style="position: relative; border: 1px solid #666666; width: 100%; height: 16px; background: #eee; border-radius: 8px; overflow: hidden;">
                <div style="width: ${valor}%; height: 100%; background: ${valor >= 70 ? "#4caf50" : valor >= 40 ? "#ffc107" : "#f44336"};"></div>
                <label style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 0.7rem; color: #000;">
                    ${valor}%
                </label>
            </div>
        </div>
    `
}

async function pdfEmail({ html, emails, htmlContent = 'Documento em anexo', titulo = 'Documento' }) {

    if (!html || emails.length == 0) return

    overlayAguarde()

    try {

        const response = await fetch(`${api}/pdf-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ html, emails, htmlContent, titulo })
        })

        if (!response.ok) {
            const err = await response.json()
            throw err
        }

        const data = await response.json()

        return data

    } catch (err) {
        return { mensagem: err.message }
    }

}

async function desativarCampos(desativar) {

    if (desativar.length == 0) return

    try {

        const response = await fetch(`${api}/desativar-campos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ desativar, servidor })
        })

        if (!response.ok) {
            const err = await response.json()
            throw err
        }

        const data = await response.json()

        return data

    } catch (err) {
        return { mensagem: err.message }
    }

}
