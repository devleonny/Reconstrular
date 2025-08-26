const tela = document.getElementById('tela')
const toolbar = document.querySelector('.toolbar')
const titulo = toolbar.querySelector('span')
const horizontal = `display: flex; align-items: center; justify-content: center;`
const vertical = `display: flex; align-items: start; justify-content: start; flex-direction: column`
const nomeBaseCentral = 'Reconstrular'
const nomeStore = 'Bases'
let dados_distritos = {}
let etapasProvisorias = {}
let stream;
const api = `https://leonny.dev.br`

const dtFormatada = (data) => {
    if (!data) return '--'
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
}

const modeloTabela = (colunas, base, btnExtras) => {

    const ths = colunas
        .map(col => `<th>${col}</th>`).join('')

    const thead = (colunas && colunas.length > 0) ? `<thead>${ths}</thead>` : ''

    return `
    <div class="blocoTabela">
        <div class="painelBotoes">
            <div class="botoes">
                <div class="pesquisa">
                    <input oninput="pesquisar(this, 'body')" placeholder="Pesquisar" style="width: 100%;">
                    <img src="imagens/pesquisar2.png">
                </div>
                ${btnExtras || ''}
            </div>
            <img class="atualizar" src="imagens/atualizar.png" onclick="atualizarDados('${base}')">
        </div>
        <div class="recorteTabela">
            <table class="tabela">
                ${thead}
                <tbody id="body"></tbody>
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
telaLogin()

function exibirSenha(img) {

    let inputSenha = img.previousElementSibling
    const atual = inputSenha.type == 'password'
    inputSenha.type = atual ? 'text' : 'password'
    img.src = `imagens/${atual ? 'olhoAberto' : 'olhoFechado'}.png`

}

function cadastrar() {

    const campos = ['Nome Completo', 'Usuário', 'Senha', 'E-mail', 'Telefone']

    const modelo = (texto) => `
        <div style="${vertical};">
            <span>${texto}</span>
            <input placeholder="${texto}">
        </div>
    `

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
            servidor: 'RECONST',
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

            } if (data.permissao == 'novo') {
                popup(mensagem('Alguém do setor de SUPORTE precisa autorizar sua entrada', 'imagens/concluido.png'), 'ALERTA', true)
            } else if (data.permissao !== 'novo') {
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
        servidor: 'RECONST',
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

        if (data.permissao) {
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
                servidor: 'RECONST',
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

                switch (true) {
                    case data.mensagem:
                        popup(mensagem(data.mensagem), 'AVISO', true);
                        break;
                    case data.permissao == 'novo':
                        popup(mensagem('Seu cadastro foi realizado! Alguém do setor de SUPORTE precisa autorizar sua entrada!'), 'ALERTA')
                        break;
                    default:
                        popup(mensagem('Servidor Offline... fale com o Setor de SUPORTE'), 'AVISO', true);
                }

            })
            .catch(error => {
                popup(mensagem(error.mensagem), 'AVISO', true);
            });

    }

}

function popup(elementoHTML, titulo, naoRemoverAnteriores) {

    const acumulado = `
        <div id="tempPop" class="overlay">

            <div class="janela_fora">
                
                <div class="toolbarPopup">

                    <div style="width: 90%;">${titulo || 'Popup'}</div>
                    <span style="width: 10%" onclick="removerPopup()">×</span>

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
    const acesso = JSON.parse(localStorage.getItem('acesso'))
    const acumulado = `

    <div class="menu-container">

        <div class="side-menu" id="sideMenu">

            <span class="nomeUsuario">${acesso.usuario} <strong>${acesso.permissao}</strong></span>

            <div style="${vertical}; justify-content: space-between; height: 100%;">
                
                <div class="botoesMenu">

                    ${btn('colaborador', 'Colaboradores', 'telaColaboradores()')}
                    ${btn('obras', 'Obras', 'telaObras()')}
                    ${btn('pessoas', 'Clientes', 'telaClientes()')}
                    ${btn('perfil', 'Usuários', 'usuarios()')}
                    ${btn('configuracoes', 'Configurações', 'telaConfiguracoes()')}
                    ${btn('sair', 'Desconectar', 'deslogar()')}

                </div>

            </div>
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

    await sincronizarDados('dados_distritos', true)
    await sincronizarDados('configuracoes', true)
    dados_distritos = await recuperarDados('dados_distritos')
    await sincronizarSetores()

}

function telaClientes() {

    esconderMenus()
    titulo.textContent = 'Cadastro de Clientes'
    const acumulado = `
    <div class="painel-clientes">
        <div>
            <img src="imagens/pessoas.png">
            <span>Cadastro de Clientes</span>
        </div>
        <div>
            <img src="imagens/todos.png">
            <span>Verificar Clientes</span>
        </div>
    </div>
    `

    const telaInterna = document.querySelector('.telaInterna')
    telaInterna.innerHTML = acumulado
}

async function telaConfiguracoes() {

    esconderMenus()
    titulo.innerHTML = 'Configurações'
    const modelo = (texto, elemento) => `
        <div>
            <span><Strong>${texto}</strong></span>
            ${elemento}
        </div>
    `

    const configuracoes = await recuperarDados('configuracoes')

    const acumulado = `
        <div class="configuracoes">
            <h1 style="color: #222;">Configurações</h1>
            <span>Informe os e-mails para receber as informações abaixo:
            <hr style="width: 100%;">
            ${modelo('Folhas de Ponto',
        `<input id="emailFolha" placeholder="digite o e-mail" value="${configuracoes?.emailFolha || ''}">`
    )}
            ${modelo('Recebimento de alertas [Colaboradores preenchidos]',
        `<input id="emailAlertas" placeholder="digite o e-mail" value="${configuracoes?.emailAlertas || ''}">`
    )}

            <br>
            <button onclick="salvarConfigs()">Salvar</button>
        
        </div>
    `

    const telaInterna = document.querySelector('.telaInterna')

    telaInterna.innerHTML = acumulado
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
    const menu = document.getElementById('sideMenu');
    if (menu && menu.classList.contains('active') && !menu.contains(event.target)) menu.classList.remove('active')
}

async function usuarios() {

    esconderMenus()

    const nomeBase = 'dados_setores'
    const acumulado = `
        ${modeloTabela(['Nome', 'Usuário', 'Setor', 'Permissão', ''], nomeBase)}
    `
    titulo.textContent = 'Gerenciar Usuários'
    const telaInterna = document.querySelector('.telaInterna')
    telaInterna.innerHTML = acumulado

    const dados_setores = await recuperarDados(nomeBase)
    for (const [id, usuario] of Object.entries(dados_setores).reverse()) criarLinha(usuario, id, nomeBase)

}

async function sincronizarDados(base, overlayOff) {

    if (!overlayOff) overlayAguarde()

    let nuvem = await receber(base) || {}
    await inserirDados(nuvem, base)

    if (!overlayOff) removerOverlay()
}

async function telaObras() {

    esconderMenus()
    const nomeBase = 'dados_obras'
    titulo.textContent = 'Gerenciar Obras'
    const acumulado = `
        ${btnRodape('Adicionar', 'adicionarObra()')}
        ${modeloTabela(['Cliente', 'Distrito', 'Cidade', 'Porcentagem', 'Status', 'Acompanhamento', ''], nomeBase)}
    `
    const telaInterna = document.querySelector('.telaInterna')

    telaInterna.innerHTML = acumulado

    const dados_obras = await recuperarDados(nomeBase)
    for (const [idObra, obra] of Object.entries(dados_obras).reverse()) criarLinha(obra, idObra, nomeBase)
}

async function atualizarDados(base) {

    overlayAguarde()
    await sincronizarDados(base)

    const dados = await recuperarDados(base)
    for (const [id, objeto] of Object.entries(dados).reverse()) criarLinha(objeto, id, base)
    removerOverlay()

}

async function adicionarObra(idObra) {

    const obra = await recuperarDado('dados_obras', idObra)

    const modelo = (texto, elemento) => `
        <div style="${vertical}; gap: 3px;">
            <span style="text-align: left;"><strong>${texto}</strong></span>
            <div>${elemento}</div>
        </div>
    `

    const acumulado = `
        <div class="painelCadastro">
            ${modelo('Distrito', `<select name="distrito" onchange="carregarSelects({select: this})"></select>`)}
            ${modelo('Cidade', `<select name="cidade"></select>`)}
            ${modelo('Cliente', `<input value="${obra?.cliente || ''}" name="cliente" placeholder="Nome do Cliente">`)}
            ${modelo('Contacto cliente', `<input value="${obra?.contacto || ''}" name="contacto" placeholder="Contacto">`)}
            ${modelo('E-mail cliente', `<input value="${obra?.email || ''}" name="email" placeholder="E-mail">`)}

        </div>
        <div class="rodape-formulario">
            <button onclick="salvarObra(${idObra ? `'${idObra}'` : ''})">Inserir</button>
        </div>
    `

    popup(acumulado, 'Cadastro')

    await carregarSelects({ ...obra })

}

async function carregarSelects({ select, cidade, distrito }) {

    const dados_distritos = await recuperarDados('dados_distritos');
    const selectDistrito = document.querySelector('[name="distrito"]');
    const selectCidade = document.querySelector('[name="cidade"]');
    const campoVazio = { '': { nome: '' } }

    if (!select) {
        const opcoesDistrito = Object.entries({ ...campoVazio, ...dados_distritos }).reverse()
            .map(([idDistrito, objDistrito]) => `<option value="${idDistrito}" ${distrito == idDistrito ? 'selected' : ''}>${objDistrito.nome}</option>`)
            .join('');
        selectDistrito.innerHTML = opcoesDistrito;
    }

    const selectAtual = select ? select.value : selectDistrito.value
    const cidades = dados_distritos?.[selectAtual]?.cidades || {};
    const opcoesCidade = Object.entries({ ...campoVazio, ...cidades }).reverse()
        .map(([idCidade, objCidade]) => `<option value="${idCidade}" ${cidade == idCidade ? 'selected' : ''}>${objCidade.nome}</option>`)
        .join('');

    selectCidade.innerHTML = opcoesCidade;
}


async function salvarObra(idObra) {

    overlayAguarde()

    idObra = idObra || unicoID()

    function obVal(name) {
        const el = document.querySelector(`[name="${name}"]`)
        if (el) return el.value
    }

    let obra = {}
    const camposFixos = ['cliente', 'contacto', 'email', 'distrito', 'cidade']

    for (const campo of camposFixos) obra[campo] = obVal(campo)

    await enviar(`dados_obras/${idObra}`, obra)
    await inserirDados({ [idObra]: obra }, 'dados_obras')

    criarLinha(obra, idObra, 'dados_obras')

    removerPopup()

}

function deslogar() {
    localStorage.removeItem('acesso')
    telaLogin()
}

function esconderMenus() {
    const sideMenu = document.getElementById('sideMenu');
    sideMenu.classList.toggle('active');
}

async function telaColaboradores() {

    esconderMenus()
    const btnExtras = `
        <button onclick="confimacaoZipPdf()">Baixar Folhas em .zip</button> 
    `
    const nomeBase = 'dados_colaboradores'
    titulo.textContent = 'Gerenciar Colaboradores'
    const acumulado = `
        ${btnRodape('Adicionar', 'adicionarColaborador()')}
        ${modeloTabela(['Nome Completo', 'Telefone', 'Obra Alocada', 'Status', 'Especialidade', 'Folha de Ponto', ''], nomeBase, btnExtras)}
    `
    const telaInterna = document.querySelector('.telaInterna')

    telaInterna.innerHTML = acumulado
    dados_distritos = await recuperarDados('dados_distritos')
    const dados_colaboradores = await recuperarDados(nomeBase)
    for (const [id, colaborador] of Object.entries(dados_colaboradores).reverse()) criarLinha(colaborador, id, nomeBase)

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
        <div class="painelCadastro">

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

async function criarLinha(dados, id, nomeBase) {

    const modelo = (texto, exclamacao) => {

        const algoPendente = (!dados.epi || !dados.exame || !dados.contratoObra) ? 'exclamacao' : 'doublecheck'

        return `
        <td>
            <div class="camposTd">
                ${exclamacao ? `<img src="imagens/${algoPendente}.png">` : ''}
                <span class="${texto.replace(' ', '_')}">${texto}</span>
            </div>
        </td>`
    }

    let tds = ''
    let funcao = ''

    if (nomeBase == 'dados_colaboradores') {
        funcao = `adicionarColaborador('${id}')`

        const especialidades = (dados?.especialidade || [])
            .map(op => `<span>• ${op}</span>`)
            .join('')

        const obraAlocada = await recuperarDado('dados_obras', dados.obraAlocada) || false

        let dadosObra = '<span>Sem Obra</span>'
        if (obraAlocada && dados_distritos[obraAlocada.distrito]) {
            const distrito = dados_distritos[obraAlocada.distrito]
            const cidade = distrito.cidades[obraAlocada.cidade]

            dadosObra = `
            <div style="${vertical}; gap: 1px;">
                <span><strong>${obraAlocada.cliente}</strong></span>
                <span>• ${distrito.nome}</span>
                <span>• ${cidade.nome}</span>
            </div>
            `
        }

        const infoObra = `
            <div style="${vertical}; gap: 2px;">
                ${dadosObra}
            </div>
        `

        tds = `
            ${modelo(dados?.nome || '--', true)}
            ${modelo(dados?.telefone || '--')}
            <td>${infoObra}</td>
            ${modelo(dados?.status || '--')}
            <td>
                <div style="${vertical}; gap: 2px;">
                    ${especialidades}
                </div>
            </td>
            <td class="detalhes">
                <img src="imagens/relogio.png" onclick="mostrarFolha('${id}')">
            </td>
        `
    } else if (nomeBase == 'dados_obras') {
        funcao = `adicionarObra('${id}')`
        const distrito = dados_distritos?.[dados?.distrito] || {}
        const cidades = distrito?.cidades?.[dados?.cidade] || {}
        const resultado = await atualizarToolbar(id, false, true)
        const porcentagem = Number(resultado.porcentagemAndamento)
        
        let st = 'Por Iniciar'
        if (porcentagem == 100) {
            st = 'Finalizado'
        } else if (porcentagem > 0) {
            st = 'Em Andamento'
        }

        tds = `
            ${modelo(dados?.cliente || '--')}
            ${modelo(distrito?.nome || '--')}
            ${modelo(cidades?.nome || '--')}
            <td style="text-align: center;">
                <span><strong>${porcentagem}%</strong></span>
            </td>
            <td style="text-align: left;">
                <span class="${st.replace(' ', '_')}">${st}</span>
                ${resultado.totais.excedente ? '<span class="excedente">Excedente</span>' : ''}
            </td>
            <td class="detalhes">
                <img src="imagens/kanban.png" onclick="verAndamento('${id}')">
            </td>
        `
    } else if (nomeBase == 'dados_setores') {
        funcao = `gerenciarUsuario('${id}')`
        tds = `
            ${modelo(dados?.nome_completo || '--')}
            ${modelo(dados?.usuario || '--')}
            ${modelo(dados?.setor || '--')}
            ${modelo(dados?.permissao || '--')}
        `
    }

    const linha = `
        <tr id="${id}">
            ${tds}
            <td class="detalhes">
                <img onclick="${funcao}" src="imagens/pesquisar.png">
            </td>
        </tr>
    `

    const tr = document.getElementById(id)
    if (tr) return tr.innerHTML = linha
    const body = document.getElementById('body')
    body.insertAdjacentHTML('beforeend', linha)

}

async function gerenciarUsuario(id) {

    const usuario = await recuperarDado('dados_setores', id)

    const modelo = (texto, elemento) => `
        <div style="${vertical}; gap: 3px;">
            <span style="text-align: left;"><strong>${texto}</strong></span>
            <div>${elemento}</div>
        </div>
    `

    const permissoes = ['', 'novo', 'adm', 'user', 'analista']
        .map(op => `<option ${usuario?.permissao == op ? 'selected' : ''}>${op}</option>`).join('')

    const setores = ['', 'SUPORTE', 'GESTÃO', 'LOGÍSTICA']
        .map(op => `<option ${usuario?.setor == op ? 'selected' : ''}>${op}</option>`).join('')

    const acumulado = `
        <div style="${vertical}; gap: 5px; padding: 2vw; background-color: #d2d2d2;">
            ${modelo('Nome', usuario?.nome_completo || '--')}
            ${modelo('E-mail', usuario?.email || '--')}
            ${modelo('Permissão', `<select onchange="configuracoes('${id}', 'permissao', this.value)">${permissoes}</select>`)}
            ${modelo('Setor', `<select onchange="configuracoes('${id}', 'setor', this.value)">${setores}</select>`)}
        </div>
    `

    popup(acumulado, 'Usuário')
}

async function adicionarColaborador(id) {

    const colaborador = await recuperarDado('dados_colaboradores', id) || {}
    const dados_obras = await recuperarDados('dados_obras')
    const dados_distritos = await recuperarDados('dados_distritos')

    const listas = {
        status: ['Ativo', 'Baixa Médica', 'Não Ativo', 'Impedido'],
        documento: ['Cartão de Cidadão', 'Passaporte', 'Título de residência'],
        especialidade: ['Pedreiros', 'Ladrilhadores', 'Pintor', 'Estucador', 'Pavimento Laminado', 'Eletricista Certificado', 'Ajudante', 'Teto Falso e Paredes em Gesso Cartonado', 'Canalizador', 'Carpinteiro']
    }

    const modelo = (texto, elemento) => `
        <div style="${vertical}; gap: 3px;">
            <span style="text-align: left;"><strong>${texto}</strong></span>
            <div>${elemento}</div>
        </div>
    `

    function retornarCaixas(name) {

        let opcoesStatus = ''
        const espc = name == 'especialidade'

        for (const op of listas[name]) {
            let checked = false

            const especialidades = colaborador?.especialidade || []
            if ((espc && especialidades.includes(op)) || colaborador?.[name] == op) {
                checked = true
            }

            opcoesStatus += `
            <div class="opcaoStatus">
                <input ${regras} value="${op}" 
                type="${espc ? 'checkbox' : 'radio'}" 
                name="${name}" 
                ${checked ? 'checked' : ''}>
                <span style="text-align: left;">${op}</span>
            </div>
            `
        }

        return `
            <div name="${name}_bloco" style="${vertical}; gap: 5px;">
                ${opcoesStatus}
            </div>`

    }

    const obras = { '': { cliente: 'Sem Obra', cidade: '--', distrito: '--' }, ...dados_obras }
    let opcoesObras = ''
    for (const [idObra, obra] of Object.entries(obras)) {
        const distrito = dados_distritos?.[obra.distrito] || {}
        const cidade = distrito?.cidades?.[obra.cidade] || {}
        opcoesObras += `<option ${colaborador?.obraAlocada == idObra ? 'selected' : ''} value="${idObra}">${obra.cliente} / ${distrito.nome || '--'} / ${cidade.nome || '--'}</option>`
    }

    const regras = `oninput="verificarRegras()"`
    const caixaStatus = retornarCaixas('status')
    const caixaEspecialidades = retornarCaixas('especialidade')
    const caixaDocumentos = `${retornarCaixas('documento')} <input ${regras} value="${colaborador?.numeroDocumento || ''}" name="numeroDocumento" placeholder="Número do documento">`
    const divAnexos = (chave) => {
        const anexos = colaborador?.[chave] || {}
        let anexoString = ''
        for (const [idAnexo, anexo] of Object.entries(anexos)) {
            anexoString += criarAnexoVisual(anexo)
        }
        return `<div style="${vertical}">${anexoString}</div>`
    }

    // EPI
    let blocoEPI = `
    <div style="${vertical}; margin-bottom: 1vw;">
        <button onclick="formularioEPI('${id}')">Inserir EPI</button>
    </div>
    `
    if (colaborador.epi) {

        let camposEpi = ''
        for (const [equipamento, dados] of Object.entries(colaborador?.epi?.equipamentos || {})) {
            camposEpi += `
                <div style="${vertical}; gap: 2px;">
                    <span><strong>${equipamento.toUpperCase()}</strong></span>
                    <span>• Quantidade: ${dados.quantidade}</span>
                    <span>• Tamanho: ${dados.tamanho}</span>
                </div>
            `
        }

        blocoEPI += `
        <div class="epis">
            <div style="${horizontal}; justify-content: space-between; width: 100%;">
                <div style="${vertical}">
                    ${camposEpi}
                </div>
                <img src="imagens/pdf.png" onclick="abrirEPI('${id}')">
            </div>
            <hr style="width: 100%;">
            <span>Inserido em: ${new Date(colaborador.epi.data).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })}</span>
        </div>
    `
    }

    const acumulado = `
        <div class="painelCadastro">

            ${modelo('Nome Completo', `<textarea ${regras} name="nome" placeholder="Nome Completo">${colaborador?.nome || ''}</textarea>`)}
            ${modelo('Data de Nascimento', `<input ${regras} value="${colaborador?.dataNascimento || ''}" type="date" name="dataNascimento">`)}
            ${modelo('Morada', `<textarea ${regras} name="morada" placeholder="Morada">${colaborador?.morada || ''}</textarea>`)}
            ${modelo('Apólice de Seguro', `<input value="0010032495" name="apolice" placeholder="Número da Apólice" readOnly>`)}
            ${modelo('Telefone', `<input ${regras} value="${colaborador?.telefone || ''}" name="telefone" placeholder="Telefone">`)}
            ${modelo('E-mail', `<textarea ${regras} name="email" placeholder="E-mail">${colaborador?.email || ''}</textarea>`)}
            ${modelo('Obra Alocada', `<select name="obraAlocada">${opcoesObras}</select>`)}
            ${modelo('Documento', caixaDocumentos)}
            ${modelo('Número de Contribuinte', `<input ${regras} value="${colaborador?.numeroContribuinte || ''}" name="numeroContribuinte" placeholder="Máximo de 9 dígitos">`)}
            ${modelo('Segurança Social', `<input ${regras} value="${colaborador?.segurancaSocial || ''}" name="segurancaSocial" placeholder="Máximo de 11 dígitos">`)}
            ${modelo('Especialidade', caixaEspecialidades)}
            ${modelo('Status', caixaStatus)}
            ${modelo('Contrato de Obra', `<input name="contratoObra" type="file">`)}
            ${divAnexos('contratoObra')}
            ${modelo('Exame médico', '<input name="exame" type="file">')}
            ${divAnexos('exame')}

            <hr style="width: 100%;">
            ${modelo('Epi’s', blocoEPI)}
            <hr style="width: 100%;">

            ${modelo('Foto do Colaborador', `
                    <div style="${vertical}; gap: 5px;">
                        <img src="imagens/camera.png" class="cam" onclick="abrirCamera()">
                        <div class="cameraDiv">
                            <button onclick="tirarFoto()">Tirar Foto</button>
                            <video autoplay playsinline></video>
                            <canvas style="display: none;"></canvas>
                        </div>
                        <img name="foto" ${colaborador?.foto ? `src="${api}/uploads/RECONST/${colaborador.foto}"` : ''} class="foto">

                    </div>
                `)}
            <br>

            <div class="painelPin">
                ${modelo('PIN de Acesso', `<input ${regras} type="password" value="${colaborador?.pin || ''}" ${colaborador.pin ? `data-existente="${colaborador.pin}"` : ''} name="pin" placeholder="Máximo de 4 números">`)}
                ${modelo('Repetir PIN', `<input ${regras} name="pinEspelho" value="${colaborador?.pin}" type="password" placeholder="Repita o PIN">`)}
                <button onclick="resetarPin()">Novo Pin</button>
            </div>
            <div class="rodapeAlerta"></div>

            <br>

        </div>
        <div class="rodape-formulario">
            <button onclick="salvarColaborador(${id ? `'${id}'` : ''}">Salvar</button>
        </div>
    `

    popup(acumulado, 'Cadastro')

    verificarRegras()

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

    stream.getTracks().forEach(track => track.stop());
    cameraDiv.style.display = 'none'

}

function verificarRegras() {
    //REGRAS
    const input = (name) => document.querySelector(`[name="${name}"]`)
    let liberado = true
    let limites = {
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
    const rodapeAlerta = document.querySelector('.rodapeAlerta')
    const mensagem = (img, msg) => `
        <div class="rodapeAlerta">
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

async function salvarColaborador(idColaborador) {
    const liberado = verificarRegras();
    if (!liberado) return popup(mensagem('Verifique os campos inválidos!'), 'Aviso', true);

    overlayAguarde();

    idColaborador = idColaborador || unicoID();

    // Recupera colaborador existente para não sobrescrever anexos
    let colaboradorExistente = await recuperarDado('dados_colaboradores', idColaborador) || {};

    function obVal(name) {
        const el = document.querySelector(`[name="${name}"]`);
        return el ? el.value : '';
    }

    let colaborador = { ...colaboradorExistente };

    const camposFixos = ['nome', 'dataNascimento', 'email', 'morada', 'apolice', 'telefone', 'numeroDocumento', 'segurancaSocial', 'obraAlocada', 'numeroContribuinte'];
    for (const campo of camposFixos) colaborador[campo] = obVal(campo);

    const camposRatio = ['status', 'documento'];
    for (const campo of camposRatio) {
        colaborador[campo] = document.querySelector(`input[name="${campo}"]:checked`)?.value || '';
    }

    const especialidades = document.querySelectorAll(`input[name="especialidade"]:checked`)
    colaborador.especialidade = []
    for (const especialidade of especialidades) {
        colaborador.especialidade.push(especialidade.value)
    }

    // Verificação do PIN;
    const inputPin = document.querySelector('[name="pin"]')
    const pinExistente = inputPin.dataset.existente

    if (pinExistente && pinExistente !== inputPin.value) {

        const resposta = await colaboradorPin(colaborador.pin)
        if (resposta?.mensagem !== 'Pin não localizado') {
            inputPin.classList.add('invalido')
            return popup(mensagem('O PIN escolhido já está em uso'), 'Alerta', true)
        }

    }
    colaborador.pin = inputPin.value

    const camposAnexos = ['contratoObra', 'exame'];
    for (const campo of camposAnexos) {
        const input = document.querySelector(`[name="${campo}"]`);
        if (!input || !input.files || input.files.length === 0) continue;

        const anexos = await importarAnexos({ input });

        if (!colaborador[campo]) colaborador[campo] = {};
        for (const anexo of anexos) {
            let idAnexo;
            do {
                idAnexo = ID5digitos();
            } while (colaborador[campo][idAnexo]); // evita IDs duplicados

            colaborador[campo][idAnexo] = anexo;
        }
    }

    const foto = document.querySelector('[name="foto"]')
    if (foto.src && !foto.src.includes(api)) {
        const resposta = await importarAnexos({ foto: foto.src })

        if (resposta[0].link) {
            colaborador.foto = resposta[0].link
        } else {
            return popup(mensagem('Falha no envio da Foto: tente novamente.'), 'Alerta', true)
        }

    }

    await enviar(`dados_colaboradores/${idColaborador}`, colaborador);
    await inserirDados({ [idColaborador]: colaborador }, 'dados_colaboradores');

    criarLinha(colaborador, idColaborador, 'dados_colaboradores');
    removerPopup();
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
                    <button onclick="acessoLogin()">Entrar</button>

                </div>
                <div style="display: flex; justify-content: center; align-items: center; flex-direction: column;">
                    <label>Primeiro acesso?</label>
                    <button style="background-color: #097fe6; white-space: nowrap;" onclick="cadastrar()">Cadastre-se</button>
                </div>
                <br>
            </div>

        </div>
    `

    tela.innerHTML = acumulado
}

// API
function enviar(caminho, info) {
    return new Promise((resolve) => {
        let objeto = {
            caminho: caminho,
            valor: info,
            servidor: 'RECONST'
        };

        fetch(`${api}/salvar`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(objeto)
        })
            .then(data => resolve(data))
            .catch((erro) => {
                console.mensagemr(erro);
                salvar_offline(objeto, 'enviar');
                resolve();
            });
    });
}

async function receber(chave) {

    let chavePartes = chave.split('/')
    let timestamp = 0
    let dados = await recuperarDados(chavePartes[0]) || {}

    for (const [id, objeto] of Object.entries(dados)) {
        if (objeto.timestamp && objeto.timestamp > timestamp) timestamp = objeto.timestamp
    }

    let objeto = {
        servidor: 'RECONST',
        chave: chave,
        timestamp: timestamp
    };

    const obs = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(objeto)
    };

    return new Promise((resolve, reject) => {
        fetch(`${api}/dados`, obs)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                resolve(data);
            })
            .catch(err => {
                popup(mensagem(`Erro de conexão: ${err}`))
                resolve({})
            });
    })
}

async function deletar(chave) {
    const url = `${api}/deletar`;
    const acesso = JSON.parse(localStorage.getItem('acesso'))
    const objeto = {
        chave,
        usuario: acesso.usuario,
        servidor: 'RECONST'
    }

    return new Promise((resolve) => {
        fetch(url, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(objeto)
        })
            .then(response => response.json())
            .then(data => {
                resolve(data);
            })
            .catch((err) => {
                popup(mensagem(err), 'Aviso', true)
                resolve();
            });
    });
}

function pesquisarGenerico(coluna, texto, filtro, id) {

    filtro[coluna] = String(texto).toLowerCase().replace('.', '')

    let tbody = document.getElementById(id);
    let trs = tbody.querySelectorAll('tr');

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

        tr.style.display = mostrarLinha ? '' : 'none';
    });

}

async function cxOpcoes(name, nomeBase, campos, funcaoAux) {

    let base = await recuperarDados(nomeBase)
    let opcoesDiv = ''

    for ([cod, dado] of Object.entries(base)) {

        const labels = campos
            .map(campo => `${(dado[campo] && dado[campo] !== '') ? `<label>${dado[campo]}</label>` : ''}`)
            .join('')

        opcoesDiv += `
            <div name="camposOpcoes" class="atalhos" onclick="selecionar('${name}', '${cod}', '${dado[campos[0]]}' ${funcaoAux ? `, '${funcaoAux}'` : ''})" style="${vertical}; gap: 2px; max-width: 40vw;">
                ${labels}
            </div>`
    }

    const acumulado = `
        <div style="${horizontal}; justify-content: left; background-color: #b1b1b1;">
            <div style="${horizontal}; padding-left: 1vw; padding-right: 1vw; margin: 5px; background-color: white; border-radius: 10px;">
                <input oninput="pesquisarCX(this)" placeholder="Pesquisar itens" style="width: 100%;">
                <img src="imagens/pesquisar2.png" style="width: 1.5vw;">
            </div>
        </div>
        <div style="padding: 1vw; gap: 5px; ${vertical}; background-color: #d2d2d2; width: 30vw; max-height: 40vh; height: max-content; overflow-y: auto; overflow-x: hidden;">
            ${opcoesDiv}
        </div>
    `

    popup(acumulado, 'Selecione o item', true)

}

async function selecionar(name, id, termo, funcaoAux) {
    const elemento = document.querySelector(`[name='${name}']`)
    elemento.textContent = termo
    elemento.id = id
    removerPopup()

    if (funcaoAux) await eval(funcaoAux)
}

function pesquisarCX(input) {

    const termoPesquisa = String(input.value).toLowerCase()

    const divs = document.querySelectorAll(`[name='camposOpcoes']`)

    for (const div of divs) {

        const termoDiv = String(div.textContent).toLocaleLowerCase()

        div.style.display = (termoDiv.includes(termoPesquisa) || termoPesquisa == '') ? '' : 'none'

    }

}

async function configuracoes(usuario, campo, valor) {

    let dados_usuario = await recuperarDado('dados_setores', usuario)
    dados_usuario[campo] = valor
    await inserirDados({ [usuario]: dados_usuario }, 'dados_setores')
    criarLinha(dados_usuario, usuario, 'dados_setores')

    return new Promise((resolve, reject) => {
        fetch(`${api}/configuracoes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario, campo, valor, servidor: 'RECONST' })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                resolve(data);
            })
            .catch(err => {
                console.mensagemr(err)
                reject()
            });
    })
}

async function sincronizarSetores() {

    dados_setores = await recuperarDados('dados_setores')

    let timestamp = 0
    for (const [usuario, objeto] of Object.entries(dados_setores)) {
        if (objeto.timestamp && objeto.timestamp > timestamp) timestamp = objeto.timestamp
    }

    let nuvem = await listaSetores(timestamp)

    await inserirDados(nuvem, 'dados_setores')
    dados_setores = await recuperarDados('dados_setores')

}

async function listaSetores(timestamp) {
    try {
        const response = await fetch(`${api}/setores`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ timestamp, servidor: 'RECONST' })
        });

        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;

    } catch {
        return {}
    }
}

function porcentagemHtml(valor) {
    valor = conversor(valor);
    const percentual = isNaN(valor) ? 0 : Math.max(0, valor).toFixed(0);

    let cor;
    if (percentual < 50) cor = 'red';
    else if (percentual < 100) cor = 'orange';
    else if (percentual > 100) cor = 'blue';
    else cor = 'green';

    return `
    <div style="display:flex; align-items:center; gap:4px;">
        <span style="color:#888; font-size:14px;">${percentual}%</span>
        <div class="barra" style="flex:1; height:8px; background:#ddd;">
            <div style="width:${percentual}%; height:100%; background:${cor};"></div>
        </div>
    </div>
  `;
}

function modeloTR({ descricao, unidade, porcentagem, quantidade, cor, id, idEtapa, idTarefa }) {

    const idLinha = idTarefa ? idTarefa : idEtapa
    const esquema = `('${id}', '${idEtapa}' ${idTarefa ? `, '${idTarefa}'` : ''})`
    const tr = `
        <tr id="${idLinha}" data-etapa="${!idTarefa ? 'sim' : ''}" data-concluido="${porcentagem >= 100 ? 'sim' : ''}" style="background-color: ${cor ? cor : ''};">
            <td></td>
            <td>
                <div style="${horizontal}; justify-content: space-between;">
                    <span ${!idTarefa ? 'style="font-weight: bold;"' : ''}>${descricao}</span>
                    <span>${quantidade ? `${quantidade} ${unidade}` : ''}</span>
                </div>
            </td>
            <td>${idTarefa ? porcentagemHtml(porcentagem) : ''}</td>
            <td>
                <div class="edicao">
                    <img class="btnAcmp" src="imagens/lapis.png" onclick="editarTarefa${esquema}">
                    <img class="btnAcmp" src="imagens/fechar.png" onclick="confirmarExclusao${esquema}">
                </div>
            </td>
        </tr>
    `

    const trExistente = document.getElementById(idLinha)

    if (trExistente) return trExistente.innerHTML = tr
    document.getElementById('bodyTarefas').insertAdjacentHTML('beforeend', tr)

}

async function confirmarExclusao(id, idEtapa, idTarefa) {

    const esquema = `('${id}', '${idEtapa}' ${idTarefa ? `, '${idTarefa}'` : ''})`
    const acumulado = `
    <div class="aviso">
        ${mensagem('Tem certeza que deseja remover este item?')}
        <button onclick="excluir${esquema}">Confirmar</button>
    </div>
    `

    popup(acumulado, 'Aviso')
}

async function excluir(id, idEtapa, idTarefa) {

    removerPopup()
    overlayAguarde()

    let objeto = await recuperarDado('dados_obras', id)

    if (idTarefa) {

        delete objeto.etapas[idEtapa].tarefas[idTarefa]
        await deletar(`dados_obras/${id}/etapas/${idEtapa}/tarefas/${idTarefa}`)

    } else {

        delete objeto.etapas[idEtapa]
        await deletar(`dados_obras/${id}/etapas/${idEtapa}`)

    }

    await inserirDados({ [id]: objeto }, 'dados_obras')

    document.getElementById('bodyTarefas').innerHTML = ''
    await verAndamento(id)

    removerOverlay()
    ordenacaoAutomatica()
}

async function verAndamento(id) {

    titulo.textContent = 'Lista de Tarefas'

    const acumulado = `

        <div class="acompanhamento">

            <div class="painel-1-tarefas">
                <input placeholder="Pesquisa" oninput="pesquisar(this, 'bodyTarefas')">
                <select id="etapas" onchange="atualizarToolbar('${id}', this.value); carregarLinhas('${id}', this.value)"></select>

                <div style="${vertical};">
                    <div style="${horizontal}; gap: 1vw;">
                        <input type="checkbox" name="etapa" onchange="filtrar()">
                        <span>Exibir somente as etapas</span>
                    </div>
                    <div style="${horizontal}; gap: 1vw;">
                        <input type="checkbox" name="concluido" onchange="filtrar()">
                        <span>Ocultar etapa concluídas</span>
                    </div>
                </div>
                <button style="background-color: #247EFF;" onclick="caixa('${id}', this)">+ Adicionar</button>
                <input type="file" id="arquivoExcel" accept=".xls,.xlsx" style="display:none" onchange="enviarExcel('${id}')">
                <button style="background-color: #249f41;" onclick="document.getElementById('arquivoExcel').click()">Importar Excel</button>
                <button style="background-color: #222;" onclick="telaObras()">Voltar</button>
            </div>

            <div id="resumo" class="painel-1-tarefas"></div>

            <br>

            <div class="tabTarefas">
                <table>
                    <tbody id="bodyTarefas"></tbody>
                </table>
            </div>

        </div>
    `
    const telaInterna = document.querySelector('.telaInterna')
    telaInterna.innerHTML = acumulado

    await atualizarToolbar(id)
    await carregarLinhas(id)

    ordenacaoAutomatica()

}

function filtrar() {
    const inputEtapa = document.querySelector('[name="etapa"]');
    const inputConcluido = document.querySelector('[name="concluido"]');
    const tbody = document.getElementById('bodyTarefas');
    if (!tbody) return;

    const etapaChecked = !!inputEtapa?.checked;
    const concluidoChecked = !!inputConcluido?.checked;

    const linhas = tbody.querySelectorAll('tr');

    linhas.forEach(tr => {
        const etapaAttr = (tr.dataset.etapa || '').toLowerCase();
        const concluidoAttr = (tr.dataset.concluido || '').toLowerCase();

        let mostrar = true;

        if (etapaChecked && etapaAttr !== 'sim') mostrar = false;

        if (concluidoChecked && concluidoAttr === 'sim') mostrar = false;

        tr.style.display = mostrar ? '' : 'none';
    });
}

async function caixa(id, button) {

    const existente = document.getElementById('caixa-temporaria');
    if (existente) existente.remove();

    const caixa = document.createElement('div');
    caixa.id = 'caixa-temporaria';
    caixa.classList = 'caixa'

    const rect = button.getBoundingClientRect();
    caixa.style.top = (window.scrollY + rect.bottom) + 'px';
    caixa.style.left = (window.scrollX + rect.left) + 'px';

    caixa.innerHTML = `
        <span onclick="editarTarefa('${id}', 'novo')">Etapa</span>
        <span onclick="editarTarefa('${id}', 'novo', 'novo')">Tarefa</span>
    `;

    document.body.appendChild(caixa);

    const removerCaixa = (e) => {
        if (!caixa.contains(e.target) && e.target !== button) {
            caixa.remove();
            document.removeEventListener('click', removerCaixa);
        }
    };
    setTimeout(() => {
        document.addEventListener('click', removerCaixa);
    }, 0);
}

async function carregarLinhas(id, nomeEtapa) {
    let obra = await recuperarDado('dados_obras', id)
    const etapas = obra.etapas || {}

    if (nomeEtapa && nomeEtapa.includes('Todas')) nomeEtapa = false

    const tbody = document.getElementById('bodyTarefas')
    if (nomeEtapa) tbody.innerHTML = ''

    for (const [idEtapa, dados] of Object.entries(etapas)) {

        const etapaAtual = dados.descricao

        if (nomeEtapa && nomeEtapa !== etapaAtual) continue

        const tarefas = Object.entries(dados?.tarefas || {})
        modeloTR({ ...dados, id, idEtapa, cor: '#F5F5F5' })

        for (const [idTarefa, tarefa] of tarefas) {
            modeloTR({ ...tarefa, id, idEtapa, idTarefa })
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

async function atualizarToolbar(id, nomeEtapa, resumo) {

    let obra = await recuperarDado('dados_obras', id)
    if (!obra.etapas) obra.etapas = {}

    if (nomeEtapa && nomeEtapa.includes('Todas')) nomeEtapa = false

    const bloco = (texto, valor) => `
        <div class="bloco">
            <span>${valor}</span>
            <label>${texto}</label>
        </div>
    `

    let totais = {
        excedente: false,
        tarefas: 0,
        naoIniciado: 0,
        emAndamento: 0,
        concluido: 0,
        porcentagemConcluido: 0
    }

    let etapas = ['Todas as tarefas']

    etapasProvisorias = {} // Resetar esse objeto;
    for (let [idEtapa, dados] of Object.entries(obra.etapas)) {

        const etapaAtual = dados.descricao
        etapas.push(etapaAtual)
        etapasProvisorias[idEtapa] = dados.descricao

        if (nomeEtapa && nomeEtapa !== etapaAtual) continue

        const tarefas = Object.entries(dados?.tarefas || [])
        totais.tarefas += tarefas.length

        for (const [idTarefa, tarefa] of tarefas) {

            if (tarefa.porcentagem == 0) {
                totais.naoIniciado++
            } else if (tarefa.porcentagem !== 0 && tarefa.porcentagem < 100) {
                totais.emAndamento++
            } else if (tarefa.porcentagem >= 100) {
                totais.concluido++
            }

            if (tarefa.porcentagem > 100) {
                totais.excedente = true
            }

            const progressoTarefa = Math.min(100, tarefa.porcentagem)
            totais.porcentagemConcluido += progressoTarefa
        }
    }

    const emPorcentagemConcluido = totais.porcentagemConcluido / 100
    const porcentagemAndamento = emPorcentagemConcluido == 0 ? 0 : ((emPorcentagemConcluido / totais.tarefas) * 100).toFixed(0)

    if (resumo) return { porcentagemAndamento, totais }

    const opcoes = etapas
        .map(op => `<option ${nomeEtapa == op ? 'selected' : ''}>${op}</option>`).join('')

    document.getElementById('etapas').innerHTML = opcoes
    document.getElementById('resumo').innerHTML = `
        ${bloco('Total', totais.tarefas)}
        ${bloco('Não iniciado', totais.naoIniciado)}
        ${bloco('Em andamento', totais.emAndamento)}
        ${bloco('Concluída', totais.concluido)}
        ${bloco('Realizado', `${porcentagemAndamento}%`)}
    `
}

async function editarTarefa(id, idEtapa, idTarefa) {

    const modelo = (texto, elemento, campo) => `
        <div style="${vertical}; gap: 3px;">
            <span style="text-align: left;"><strong>${texto}</strong></span>
            ${texto == 'Etapa' ? elemento : `<input name="${texto}" ${campo ? 'type="number"' : ''} value="${elemento}" oninput="calcular()">`}
        </div>
    `
    const objeto = await recuperarDado('dados_obras', id)

    let campos = ''
    let tarefa = {}
    let funcao = ''

    if (idTarefa) {

        tarefa = objeto?.etapas?.[idEtapa]?.tarefas?.[idTarefa] || {}

        funcao = `salvarTarefa('${id}', '${idEtapa}', '${idTarefa}')`
        campos = `
            ${modelo('Etapa',
            `<select name="Etapa">
                ${Object.entries(etapasProvisorias).map(([id, nomeEtapa]) => `<option value="${id}" ${id == idEtapa ? 'selected' : ''}>${nomeEtapa}</option>`).join('')}
            </select>`)}

            ${modelo('Unidade', tarefa?.unidade || '')}
            ${modelo('Quantidade', tarefa?.quantidade || '', true)}
            ${modelo('Resultado', tarefa?.resultado || '', true)}
            <div id="indPorcentagem"></div>
            <input name="Porcentagem" type="number" style="display: none;">
            `

    } else {
        funcao = `salvarTarefa('${id}', '${idEtapa}')`
    }

    const acumulado = `
        <div class="painelCadastro">
            ${modelo('Descrição', tarefa?.descricao || '')}
            ${campos}
        </div>
        <div class="rodape-formulario">
            <button onclick="${funcao}">Salvar</button>
        </div>
    `
    popup(acumulado, 'Gerenciamento de Etapas e Tarefas')

}

async function salvarTarefa(id, idEtapa, idTarefa) {
    overlayAguarde();

    const valor = (name) => document.querySelector(`[name="${name}"]`)?.value || '';
    let idEtapaAtual = valor('Etapa');

    let obra = await recuperarDado('dados_obras', id)
    if (!obra.etapas) obra.etapas = {}
    let objeto = obra

    let novosDadosBase = {
        descricao: valor('Descrição'),
    };

    let etapaAlterada = false;

    // CASO 1: NOVA ETAPA
    if (idEtapa === 'novo' && idTarefa !== 'novo') {
        idEtapaAtual = ID5digitos();
        objeto.etapas[idEtapaAtual] = {
            tarefas: {},
            ...novosDadosBase
        };

        await enviar(`dados_obras/${id}/etapas`, objeto.etapas);
        await inserirDados({ [id]: objeto }, 'dados_obras');
        await verAndamento(id);
        removerPopup();
        return;
    }

    novosDadosBase = {
        ...novosDadosBase,
        unidade: valor('Unidade'),
        quantidade: valor('Quantidade'),
        resultado: valor('Resultado'),
        porcentagem: Number(valor('Porcentagem') || 0)
    };

    if (idTarefa === 'novo') {
        idTarefa = ID5digitos();
        etapaAlterada = true;
    } else if (idEtapaAtual !== idEtapa) {
        delete objeto.etapas[idEtapa]?.tarefas?.[idTarefa];
        await deletar(`dados_obras/${id}/etapas/${idEtapa}/tarefas/${idTarefa}`);
        etapaAlterada = true;
    }

    // Adiciona a tarefa antes de reorganizar
    objeto.etapas[idEtapaAtual].tarefas[idTarefa] = novosDadosBase;

    await enviar(`dados_obras/${id}/etapas`, objeto.etapas);
    modeloTR({ ...novosDadosBase, id, idTarefa, idEtapa: idEtapaAtual });
    await inserirDados({ [id]: objeto }, 'dados_obras');

    etapaAlterada ? await verAndamento(id) : await atualizarToolbar(id);
    removerPopup();

    ordenacaoAutomatica()
}

function ordenacaoAutomatica() {
    const bodyTarefas = document.getElementById('bodyTarefas')
    const trs = bodyTarefas.querySelectorAll('tr')

    let ordemEtapas = 0
    let ordemTarefas = 1
    for (const tr of trs) {
        const tds = tr.querySelectorAll('td')

        if (tr.dataset.etapa && tr.dataset.etapa == 'sim') {
            ordemEtapas++
            tds[0].textContent = `${ordemEtapas}.0`
            ordemTarefas = 1
        } else {
            tds[0].textContent = `${ordemEtapas}.${ordemTarefas}`
            ordemTarefas++
        }
    }

}

function calcular() {

    const campoQuantidade = document.querySelector('[name="Quantidade"]')
    if (!campoQuantidade) return
    const quantidade = Number(campoQuantidade.value)
    const resultado = Number(document.querySelector('[name="Resultado"]').value)
    const indPorcentagem = document.getElementById('indPorcentagem')
    const porcentagem = (resultado / quantidade) * 100

    indPorcentagem.innerHTML = porcentagemHtml(porcentagem)

    document.querySelector(`[name="Porcentagem"]`).value = porcentagem
}

async function enviarAlerta(idColaborador) {
    const url = `${api}/enviar-alerta`
    const resposta = await fetch(url, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idColaborador, servidor: 'RECONST' })
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
            <div onclick="abrirArquivo('${link}', '${nome}')" class="contornoInterno">
                <img src="imagens/anexo2.png">
                <label title="${nome}">${nome}</label>
            </div>
            <img src="imagens/cancel.png" style="display: ${displayExcluir};" onclick="${funcao}">
        </div>`
}

function abrirArquivo(link, nome) {
    link = `${api}/uploads/RECONST/${link}`;
    const imagens = ['png', 'jpg', 'jpeg'];

    const extensao = nome.split('.').pop().toLowerCase(); // pega sem o ponto

    if (imagens.includes(extensao)) {
        const acumulado = `
            <div class="fundoImagens">
                <img src="${link}">
            </div>
        `
        return popup(acumulado, nome, true);
    }

    window.open(link, '_blank');
}

