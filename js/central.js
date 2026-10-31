const horizontal = `display: flex; align-items: center; justify-content: center;`
const vertical = `display: flex; align-items: start; justify-content: start; flex-direction: column`
const api = `https://api.reconstrularobras.com`
const servidor = 'RECONST'
let stream;
let emAtualizacao = false
let acesso = {}
let tela = null
let toolbar = null
let titulo = null
let menus = null
let nomeUsuario = null
let overlayTimeout = null
let sOverlay = false

function obVal(name) {
    const painel = document.querySelector('.painel-padrao')
    const el = painel.querySelector(`[name="${name}"]`)
    return el ? el.value || el.id : null
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
    if (!data) return '-'
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
}

const modeloTabela = ({ body, linhas, colunas, btnExtras, removerPesquisa }) => {

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

telaLogin()

function exibirSenha(img) {

    let inputSenha = img.previousElementSibling
    const atual = inputSenha.type == 'password'
    inputSenha.type = atual ? 'text' : 'password'
    img.src = `imagens/${atual ? 'olhoAberto' : 'olhoFechado'}.png`

}

async function acessoLogin() {

    overlayAguarde()
    const divAcesso = document.getElementById('acesso')
    divAcesso.style.display = 'none'

    const inputs = divAcesso.querySelectorAll('input')
    const url = `${api}/acesso`

    if (inputs[0].value == '' || inputs[1].value == '') {
        popup({ mensagem: 'Palavra-passe e/ou utilizador não informado(s)' })
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

            if (data.trocarSenha) {
                divAcesso.style.display = 'flex'
                return formularioPrimeiroAcesso(data.usuario, inputs[1].value)
            }

            if (data.mensagem) {
                divAcesso.style.display = 'flex'
                return popup({ mensagem: data.mensagem || 'Falha no acesso' })

            } else {
                localStorage.setItem('acesso', JSON.stringify(data))

                if (!await validarAcesso()) return
                await telaPrincipal()
                priExe = false
                connectWebSocket()

                removerOverlay()
            }

            divAcesso.style.display = 'flex'

        } catch (err) {
            divAcesso.style.display = 'flex'
            popup({ mensagem: err.mensagem || err.message || 'Falha no acesso' })
        }

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

        popup(mensagem('Palavra-passe, utilizador ou e-mail não informado(s)'), 'AVISO', true)

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
                return popup({ mensagem: data.mensagem || 'Falha... tente novamente.' })
            })
            .catch(err => {
                popup({ mensagem: err.mensagem || 'Falha... tente novamente.' })
            })

    }

}

function removerOverlay() {
    let aguarde = document.querySelector('.aguarde')
    if (aguarde) aguarde.remove()
}

function overlayAguarde() {

    if (sOverlay)
        return

    const aguardeAntigo = document.querySelector('.aguarde')

    if (aguardeAntigo)
        aguardeAntigo.remove()

    const elemento = `
        <div class="aguarde">

            <div class="loading-container">
                <img src="imagens/loading.png" alt="A carregar">
            </div>
            
        </div>
    `

    document.body.insertAdjacentHTML('beforeend', elemento)

    const aguarde = document.querySelector('.aguarde')

    let pageHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
    )

    aguarde.style.height = `${pageHeight}px`

    clearTimeout(overlayTimeout)

    overlayTimeout = setTimeout(() => {

        const loadingContainer = aguarde.querySelector('.loading-container')

        if (!loadingContainer)
            return

        loadingContainer.innerHTML = `
            <div class="popup-fechar">
                <span>O processo demorou muito, verifique se sua ação foi realizada ou fale com o suporte.</span>
                <button onclick="removerOverlay()">Fechar</button>
            </div>
            `

    }, 30000)
}

// Balão de notificação (como no GCS): empilhados no canto inferior direito, com × para fechar.
// usuario/status: aviso de presença; texto: conteúdo livre (HTML). tempo em segundos; 0 = fica até fechar.
function balaoNotificacao({ imagem, texto, usuario, status, tempo = 5 }) {

    if (document.title == 'PDF')
        return

    let container = document.querySelector('.popup-mensagens')
    if (!container) {
        container = document.createElement('div')
        container.className = 'popup-mensagens'
        document.body.appendChild(container)
    }

    const msg = document.createElement('div')
    msg.className = 'popup-mensagem'
    msg.setAttribute('role', 'status')

    msg.innerHTML = `
        <img src="${escaparAtributo(imagem || 'imagens/logo.png')}" alt="">
        <div class="popup-mensagem-conteudo">
            ${usuario !== undefined
                ? `<strong>${escaparAtributo(usuario)}</strong><span class="popup-mensagem-status">${escaparAtributo(status || 'offline')}</span>`
                : (texto || '')}
        </div>
        <button class="popup-mensagem-fechar" type="button" aria-label="Fechar notificação">×</button>
    `

    const fechar = () => {
        msg.classList.remove('visivel')
        setTimeout(() => msg.remove(), 400)
    }
    msg.querySelector('.popup-mensagem-fechar').addEventListener('click', fechar)

    container.appendChild(msg)
    requestAnimationFrame(() => msg.classList.add('visivel'))

    if (tempo != 0)
        setTimeout(fechar, tempo * 1000)
}

// Entrou, saiu ou ficou disponível de novo (ida e volta de "ausente" não mostra balão: websocket.js).
function balaoUsuario(st, texto) {
    const rotulos = { online: 'Ficou disponível', offline: 'Saiu', ausente: 'Está ausente' }
    balaoNotificacao({ imagem: imagemStatus(st), usuario: texto, status: rotulos[st] || st })
}

async function telaPrincipal() {

    atribuirVariaveis()

    toolbar.style.display = 'flex'
    menus.style.display = 'flex'
    acesso = JSON.parse(localStorage.getItem('acesso'))

    if (!acesso)
        return removerAcesso()

    criarMenus('inicial')
    telaInicial()

    tela.classList.remove('login')

    await carregarControles()

}

function telaInicial() {

    titulo.textContent = 'Menus'
    const acumulado = `
        <div class="plano-fundo">
            <img src="imagens/logo.png" class="logo">
            <p>Seja bem vindo!</p>
        </div>
    `
    tela.innerHTML = acumulado
}

async function removerAcesso() {
    await chatPushEncerrar()
    await encerrarSessaoServidor()
    acesso = null
    localStorage.removeItem('acesso')
    if (socket?.readyState === WebSocket.OPEN) socket.close()
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

async function telaPrecosDesativada() {
    await telaPrecos('S')
}

function confirmarSaida() {

    const botoes = [
        { texto: 'Confirmar', img: 'concluido', fechar: true, funcao: `deslogar()` }
    ]

    popup({ mensagem: 'Tem certeza?', botoes, titulo: 'Sair', removerAnteriores: true })
}

async function deslogar() {
    await chatPushEncerrar()
    // Encerra a sessão no servidor (antes o token continuava válido até vencer) e fecha o websocket.
    await encerrarSessaoServidor()
    localStorage.removeItem('acesso')
    if (socket?.readyState === WebSocket.OPEN) socket.close()
    telaLogin()
}

function visibilidade(input, value) {
    const campos = ['quantidade', 'tamanho']
    for (const campo of campos) {
        document.querySelector(`[name="${value}_${campo}"]`).style.display = input.checked ? '' : 'none'
    }
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
        popup({ mensagem: 'Erro ao aceder à câmara: ' + err.message })
    }
}

function encerrarCam() {

    if (stream)
        stream.getTracks().forEach(track => track.stop())
    const cameraDiv = document.querySelector('.cameraDiv')

    if (cameraDiv)
        cameraDiv.style.display = 'none'

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

// Mesma regra de SCRIPTS/salvar_registro.js (servidor) e dos destinatários do e-mail.
const emailValido = valor => /^[^\s<>@,;"']+@[^\s<>@,;"']+\.[^\s<>@,;"']+$/.test(String(valor ?? '').trim())

async function verificarRegras() {

    const painel = document.querySelector('.painel-padrao')
    if (!painel) return { campos: ['Formulário indisponível'] }
    const input = (name) => painel.querySelector(`[name="${name}"]`)
    const campos = []
    const funcao = [...painel.querySelectorAll('[name="funcao"]:checked')]?.[0]?.dataset?.valor
    const ignorar = ['Diretor Programador', 'CEO'].includes(funcao)
    const limites = {
        nome: { tipo: 'A' },
        numero_contribuinte: { limite: 9, tipo: 1 },
        seguranca_social: { limite: 11, tipo: 1 },
        telefone: { limite: 9, tipo: 1 }
    }
    const camposFixos = ['documento', 'especialidade', 'status']
    const camposFlex = [
        'nome',
        'nome_completo',
        'data_nascimento',
        'email',
        'morada',
        'morada_execucao',
        'morada_fiscal',
        'numero_documento',
        'apolice'
    ]

    function inv(el, remover) {
        if (!el) return

        el.style.backgroundColor = remover
            ? ''
            : '#f7c5c5'

        el.style.border = remover
            ? ''
            : 'solid 1px red'

    }

    // Função;
    const localFuncao = painel.querySelector('.campo-funcoes')
    if (localFuncao) {
        if (!funcao) {
            inv(localFuncao)
            campos.push('Função')
        } else {
            inv(localFuncao, true)
        }
    }

    // EPI;
    const formEPI = painel.querySelector('.bloco-form-epi')
    if (formEPI) {
        const linhaFormEPI = formEPI.closest('.linha-padrao')

        if (['Diretor Operativo', 'CEO', 'Diretor Programador'].includes(funcao)) {

            linhaFormEPI.style.display = 'none'
            inv(formEPI, true)

        } else {

            linhaFormEPI.style.display = 'flex'

            const marcadados = [...painel.querySelectorAll('[name="camposEpi"]:checked')]

            if (!marcadados.length) {
                campos.push('Preencha os itens de EPI')
                inv(formEPI)
            } else {
                inv(formEPI, true)
            }
        }
    }

    // Documentos;
    const funcoesExigemDocs = [
        'Coordenador Operativo',
        'Encarregado de Obra',
        'Trabalhador'
    ]

    const docs = ['exame', 'contrato_obra']
    for (const doc of docs) {

        const inputExame = input(doc)
        if (!inputExame)
            continue

        const existente = document.getElementById(`anexos_${doc}`).children.length

        // A marcação de obrigatório vai na área de documento (o input fica escondido dentro dela).
        const alvoDoc = inputExame.closest('.zona-documento')?.querySelector('.zona-documento-alvo') || inputExame

        if (funcoesExigemDocs.includes(funcao)) {

            if (!inputExame.files.length && existente == 0) {
                campos.push(`Documento ${doc}`.replace('_', ' '))
                inv(alvoDoc)
            } else {
                inv(alvoDoc, true)
            }

        } else {
            inv(alvoDoc, true)
        }

    }

    // Bloco correspondente ao Pin (a senha é gerada como provisória pelo rodapé);
    const trabalhador = funcao == 'Trabalhador'
    const painelPin = document.querySelector('.painel-pin')

    if (painelPin) {
        painelPin.style.display = trabalhador ? 'flex' : 'none'
        painelPin.closest('.linha-padrao').style.display = trabalhador ? 'flex' : 'none'
    }

    // Obrigatoriedade do Usuário;
    const inpUsuario = input('usuario')

    if (inpUsuario)
        input('usuario').closest('.linha-padrao').style.display = trabalhador ? 'none' : 'flex'

    if (funcao && funcao == 'Trabalhador') {

        const pin = input('pin')
        const pinEspelho = input('pinEspelho')
        const rodapeAlerta = painel.querySelector('.rodape-alerta')

        // 4 Dígitos e apenas números;
        pin.value = pin.value.slice(0, 4)
        pin.value = pin.value.replace(/\D/g, '')

        pinEspelho.value = pinEspelho.value.slice(0, 4)
        pinEspelho.value = pinEspelho.value.replace(/\D/g, '')

        const mensagem = (img, msg) => `
            <div class="rodape-alerta">
                <img src="imagens/${img}.png">
                <span>${msg}</span>
            </div>
            `

        if (pin.value !== pinEspelho.value || pin.value == '') {
            rodapeAlerta.innerHTML = mensagem('cancel', 'Os Pins não são iguais')
            inv(pin)
            inv(pinEspelho)
            campos.push('pins não são iguais')
        } else {
            inv(pin, true)
            inv(pinEspelho, true)
            rodapeAlerta.innerHTML = mensagem('concluido', 'Pins iguais')
        }

    } else if (inpUsuario) {
        // O usuário é gerado pelo servidor ao salvar: não é campo obrigatório.
        inv(inpUsuario, true)
    }

    for (let [name, regra] of Object.entries(limites)) {
        const campo = input(name)
        if (!campo)
            continue

        if (regra.tipo === 1) {
            campo.value = campo.value.replace(/\D/g, '')
        } else if (regra.tipo === 'A') {
            campo.value = campo.value.replace(/[0-9]/g, '')
        }

        if (regra.limite) {
            if (campo.value.length > regra.limite) {
                campo.value = campo.value.slice(0, regra.limite)
            }

            regra.liberado = campo.value.length === regra.limite

            if (regra.liberado) {
                inv(campo, true)
            } else {
                inv(campo)
                campos.push(name)
            }
        }
    }

    const cidade = painel.querySelector('[name="cidade"]')
    if (cidade) {
        if (!cidade?.id) {
            inv(cidade)
            campos.push('cidade')
        } else {
            inv(cidade, true)
        }
    }

    //Campos Fixos;
    for (const campo of camposFixos) {
        const ativo = painel.querySelector(`input[name="${campo}"]:checked`)
        const bloco = painel.querySelector(`[name="${campo}_bloco"]`)

        if (!bloco)
            continue

        // Pode ignorar se Especialidade && funções;
        const podeIgnorar = campo == 'especialidade' && ['Diretor Operativo', 'Coordenador Operativo'].includes(funcao)

        if (podeIgnorar || ignorar || ativo) {
            inv(bloco, true)
        } else {
            inv(bloco)
            campos.push(campo)
        }
    }

    // Campos Flex;
    for (const campo of camposFlex) {
        const elCampo = input(campo)
        if (!elCampo)
            continue

        if (elCampo.value == '') {
            inv(elCampo)
            campos.push(campo)
        } else {
            inv(elCampo, true)
        }
    }

    // E-mail: um único endereço completo (nome@dominio.ext); o servidor repete a regra.
    const email = input('email')
    if (email && email.value) {
        email.value = email.value.trim()
        if (emailValido(email.value)) {
            inv(email, true)
        } else {
            inv(email)
            campos.push('e-mail inválido (use nome@dominio.pt)')
        }
    }

    const numero_documento = input('numero_documento')

    if (numero_documento) {
        const docAtivo = painel.querySelector('input[name="documento"]:checked')

        if (docAtivo && docAtivo.value == 'Cartão de Cidadão') {

            if (numero_documento.value.length > 8)
                numero_documento.value = numero_documento.value.slice(0, 8)

            numero_documento.value = numero_documento.value.replace(/\D/g, '')

            if (numero_documento.value.length !== 8) {
                campos.push('numero_documento')
                inv(numero_documento)
            } else {
                inv(numero_documento, true)
            }
        }
    }

    // Formulário de Despesas;

    const paiTiposDespesas = painel.querySelector('.tipo-despesa')
    const elTipoDespesa = [...painel.querySelectorAll('[name="tipo_despesa"]:checked')]
    if (paiTiposDespesas && !elTipoDespesa.length) {
        inv(paiTiposDespesas)
        campos.push('Tipo de Despesa')
    } else if (paiTiposDespesas) {
        inv(paiTiposDespesas, true)
    }

    const camposDespesas = [
        'foto',
        'fatura',
        'fornecedor',
        'obra',
        'quantidade',
        'valor',
        'data',
        'especialidade',
        'material'
    ]

    for (const c of camposDespesas) {

        let el = painel.querySelector(`[name="${c}"]`)

        if (!el)
            continue

        // No cadastro de colaborador, a foto (reconhecimento do ponto) só é exigida do Trabalhador.
        if (c === 'foto' && el.closest('.colaborador-foto') && funcao !== 'Trabalhador') {
            inv(el.closest('.colaborador-foto'), true)
            continue
        }

        let temValor
        const tipo = el.tagName

        if (tipo == 'SPAN') {
            temValor = el?.id

        } else if (tipo == 'IMG') {
            temValor = el?.src
            el = el.closest('#upload')

        } else if (el.files) {
            temValor = el.files.length
            el = el.closest('#upload')

        } else {
            temValor = el?.value
        }

        if (temValor == undefined)
            continue

        if (!temValor) {
            campos.push(inicialMaiuscula(c))
            inv(el)
        } else {
            inv(el, true)
        }

    }

    return { campos }

}

function telaLogin() {

    atribuirVariaveis()

    try {
        acesso = JSON.parse(localStorage.getItem('acesso'))
        if (acesso)
            return telaPrincipal()
    } catch {
        removerAcesso()
    }

    menus.style.display = 'none'
    toolbar.style.display = 'none'

    const acumulado = `
        <div id="acesso" class="loginBloco">

            <div class="botaoSuperiorLogin" onclick="telaRegistroPonto()">
                <img src="imagens/relogio.png">
                <span>Registo de Ponto</span>
                <small class="ponto-pendentes" data-ponto-pendentes hidden></small>
            </div>

            <div class="baixoLogin">

                <img src="imagens/acesso.png" class="cadeado">

                <div class="login-campos">

                    <label>Utilizador</label>
                    <input type="text" placeholder="Utilizador">

                    <label>Palavra-passe</label>
                    <div class="login-senha">
                        <input onkeydown="if(event.key === 'Enter') acessoLogin()" type="password" placeholder="Palavra-passe">
                        <img src="imagens/olhoFechado.png" class="olho" onclick="exibirSenha(this)">
                    </div>

                    <span class="login-esqueceu" onclick="recuperarSenha()">Esqueceu-se da palavra-passe?</span>

                </div>

            </div>

            <div class="rodape-padrao">
                <label class="botoes-rodape login-entrar" onclick="acessoLogin()">Entrar</label>
            </div>

        </div>
    `

    tela.innerHTML = acumulado
    tela.classList.add('login')
    tela.classList.remove('active')
    PontoOffline.atualizarAviso()
}

// Primeiro acesso com senha provisória: cria a senha definitiva e entra.
// A provisória fica só em memória, não vai para o formulário.
let primeiroAcesso = null

function formularioPrimeiroAcesso(usuario, senhaProvisoria) {

    primeiroAcesso = { usuario, senhaProvisoria }

    const campo = (nome, placeholder) =>
        `<input name="${nome}" type="password" autocomplete="new-password" placeholder="${placeholder}">`

    const linhas = [
        { elemento: `<span style="text-align: left;">Entrou com uma palavra-passe provisória. Crie a sua palavra-passe para continuar.</span>` },
        { texto: 'Nova palavra-passe', elemento: campo('novaSenha', 'Nova palavra-passe') },
        { texto: 'Repita a nova palavra-passe', elemento: campo('confirmarSenha', 'Repita a nova palavra-passe') },
        { elemento: `<small style="text-align: left;">A palavra-passe precisa ter pelo menos 8 caracteres.</small>` }
    ]

    const botoes = [
        { texto: 'Guardar e entrar', img: 'concluido', funcao: 'salvarPrimeiroAcesso()' }
    ]

    popup({ linhas, botoes, titulo: 'Crie a sua palavra-passe' })
}

async function salvarPrimeiroAcesso() {

    const painel = [...document.querySelectorAll('.painel-padrao')].at(-1)
    const valor = nome => painel?.querySelector(`[name="${nome}"]`)?.value || ''
    const novaSenha = valor('novaSenha')

    if (!primeiroAcesso)
        return removerTodosPopups()

    if (novaSenha !== valor('confirmarSenha'))
        return popup({ mensagem: 'A confirmação não confere com a nova palavra-passe.' })

    if (novaSenha.length < 8)
        return popup({ mensagem: 'A palavra-passe precisa ter pelo menos 8 caracteres.' })

    overlayAguarde()

    try {
        const resposta = await fetch(`${api}/definir-senha`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...primeiroAcesso, novaSenha })
        })
        const dados = await resposta.json().catch(() => ({}))

        // Erro de validação: mantém o formulário aberto para corrigir.
        if (!resposta.ok || !dados.success) {
            removerOverlay()
            return popup({ mensagem: dados.mensagem || 'Falha ao criar a palavra-passe.' })
        }

        primeiroAcesso = null
        removerTodosPopups()

        // Entra com a senha nova, pelo login normal.
        document.querySelectorAll('#acesso input')[1].value = novaSenha
        acessoLogin()
    } catch {
        removerOverlay()
        popup({ mensagem: 'Sem conexão com o servidor. Tente novamente.' })
    }
}

function recuperarSenha() {

    const linhas = [
        { texto: 'Escreva o Utilizador', elemento: `<input name="identificador">` }
    ]

    const botoes = [
        { texto: 'Solicitar', img: 'concluido', funcao: `solicitarCodigo()`, fechar: true }
    ]

    popup({ linhas, botoes, titulo: 'Recuperar acesso', removerAnteriores: true })

}

async function solicitarCodigo() {

    const identificador = document.querySelector('[name="identificador"]')

    if (!identificador) return

    overlayAguarde()

    const resposta = await recAC(identificador.value)

    if (resposta.success) {

        const linhas = [
            {
                texto: 'Código recebido no e-mail',
                elemento: `
                <input id="identificador" style="display: none;" value="${identificador.value}">
                <input id="codigo" placeholder="Código" class="camp-1" type="number">
                `
            },
            {
                texto: 'Nova palavra-passe',
                elemento: `<input id="novaSenha" placeholder="Nova Palavra-passe" class="camp-1">`
            }
        ]
        const botoes = [
            { texto: 'Confirmar', img: 'concluido', fechar: true, funcao: `salvarSenha()` }
        ]

        popup({ linhas, botoes, titulo: 'Informe o código', removerAnteriores: true })
    } else {
        popup({ mensagem: resposta.mensagem || 'Falha na solicitação' })
    }

}

async function salvarSenha() {

    overlayAguarde()

    const identificador = document.getElementById('identificador').value
    const novaSenha = document.getElementById('novaSenha').value
    const codigo = document.getElementById('codigo').value

    const resposta = await salvarNovaSenha({ identificador, novaSenha, codigo })

    if (resposta.success)
        return popup({ mensagem: resposta.mensagem })

    if (resposta.mensagem)
        return popup({ mensagem: resposta.mensagem })

}

function inicialMaiuscula(string) {
    if (string == undefined) {
        return ''
    }

    string = string.replaceAll('_', ' ')

    if (string.includes('lpu')) return string.toUpperCase()

    return string
        .toLowerCase()
        .split(' ')
        .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
        .join(' ')
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

async function enviarExcel(idObra) {
    const input = document.querySelector('#arquivoExcel')
    if (!input.files.length)
        return popup({ mensagem: 'Ainda não selecionou nenhum ficheiro' })

    const formData = new FormData()
    formData.append('arquivo', input.files[0])

    try {
        const resposta = await fetch(`${api}/processar-tarefas/${idObra}`, {
            method: 'POST',
            body: formData
        });

        const dados = await resposta.json();
        if (resposta.ok) {
            await verAndamento(idObra)
        } else {
            popup({ mensagem: `Erro: ${dados.mensagem}` })
        }
    } catch (err) {
        popup({ mensagem: `Erro de conexão: ${err}` })
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
        const response = await fetch(`${api}/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${acesso?.token}` },
            body: formData
        });
        return await response.json();
    } catch (err) {
        popup({ mensagem: `Erro na API: ${err}` })
        throw err;
    }
}

// Link de um ficheiro enviado (/uploads exige acesso): as imagens e os links não mandam cabeçalhos,
// por isso o token de ficheiros da sessão vai na URL. Ele só abre ficheiros (não serve na API).
function urlArquivo(link) {
    const k = acesso?.tokenArquivos
    return `${api}/uploads/RECONST/${encodeURIComponent(link)}${k ? `?k=${encodeURIComponent(k)}` : ''}`
}

// Cor do selo de tipo no cartão de anexo.
function corTipoAnexo(extensao) {
    const cores = {
        pdf: '#d1453b',
        xls: '#1f8a4c', xlsx: '#1f8a4c', csv: '#1f8a4c',
        doc: '#2b6cb0', docx: '#2b6cb0', txt: '#2b6cb0',
        ppt: '#d9822b', pptx: '#d9822b',
        zip: '#7b4fb0', rar: '#7b4fb0', '7z': '#7b4fb0',
        dwg: '#0f8a8a', dxf: '#0f8a8a'
    }
    return cores[extensao] || '#5b707f'
}

// Cartão de anexo (miniatura para imagem, selo com o tipo para os outros), como no GCS.
// O botão de remover é filho direto do cartão e não abre o anexo (stopPropagation).
function criarAnexoVisual({ nome, link, funcao }) {

    nome = String(nome || link || 'anexo')
    const formato = (nome.match(/\.([^.]+)$/)?.[1] || '').toLowerCase()
    const titulo = escaparAtributo(nome)
    const excluir = funcao
        ? `<button type="button" class="anexo-remover" title="Remover" aria-label="Remover ${titulo}"
            onclick="event.stopPropagation(); ${funcao}">&times;</button>`
        : ''

    if (['jpg', 'jpeg', 'png', 'webp'].includes(formato)) {
        return `
            <div class="anexo-imagem" title="${titulo}">
                ${excluir}
                <img class="foto-status" id="${escaparAtributo(link)}" src="${escaparAtributo(urlArquivo(link))}"
                    alt="${titulo}" loading="lazy" onclick="ampliarImagem(this, '${escaparAtributo(link)}')">
            </div>
        `
    }

    // A extensão vai no selo colorido; o nome aparece sem ela (cortado com … pelo CSS).
    const extensao = formato || 'arq'
    const nomeSemExtensao = formato ? nome.slice(0, -(formato.length + 1)) : nome
    return `
        <div class="contorno-anexos" name="${escaparAtributo(link)}" title="${titulo}" style="--anexo-cor: ${corTipoAnexo(extensao)}">
            <div class="contorno-iterno" onclick="abrirArquivo('${escaparAtributo(link)}')">
                <span class="anexo-tipo">${escaparAtributo(extensao.slice(0, 4))}</span>
                <span class="anexo-textos">
                    <span class="anexo-nome">${escaparAtributo(nomeSemExtensao || nome)}</span>
                    <small>${extensao === 'pdf' ? 'Clique para ver' : 'Clique para abrir'}</small>
                </span>
            </div>
            ${excluir}
        </div>
    `
}

function ampliarImagem(img) {

    const elemento = `
        <div style="position: relative; background-color: #d2d2d2;">
            <img style="width: 95%;" src="${img.src}">
        </div>
    `

    popup({ elemento })

}

function abrirArquivo(link) {
    // Extensão do nome do ficheiro (antes de montar a URL, que leva o token em ?k=).
    const extensao = String(link).split('.').pop().toLowerCase();
    link = urlArquivo(link);
    const imagens = ['png', 'jpg', 'jpeg', 'webp'];

    if (imagens.includes(extensao)) {
        const elemento = `
            <div class="fundoImagens">
                <img src="${link}">
            </div>
        `
        return popup({ elemento })
    }

    // PDF: visualizador dentro do app, com atalho para abrir noutro separador (ou descarregar).
    if (extensao === 'pdf') {
        const id = popup({ titulo: 'Documento', elemento: `
            <div class="visualizador-pdf">
                <iframe src="${link}#view=FitH" title="Documento PDF"></iframe>
                <a href="${link}" target="_blank" rel="noopener">Abrir noutro separador ↗</a>
            </div>` })
        document.getElementById(id)?.classList.add('popup-visualizador')
        return
    }

    window.open(link, '_blank');
}

async function blocoAuxiliarFotos(fotos) {

    if (fotos) {

        const imagens = Object.entries(fotos)
            .map(([link,]) => `<img name="foto" data-salvo="sim" id="${link}" src="${urlArquivo(link)}" class="foto" onclick="ampliarImagem(this, '${link}')">`)
            .join('')

        const painel = `
            <div style="${vertical}; gap: 5px;">
                <div class="capturar" onclick="blocoAuxiliarFotos()">
                    <img src="imagens/camera.png" class="olho">
                    <span>Abrir Câmara</span>
                </div>
                <div class="fotos">${imagens}</div>
            </div>
        `
        return painel

    } else {

        const elemento = `
            <div style="${vertical}; align-items: center; gap: 3px; background-color: #d2d2d2;">
                <div class="capturar" style="position: fixed; bottom: 10px; left: 10px; z-index: 10003;" onclick="fotoTarefa()">
                    <img src="imagens/camera.png">
                    <span>Capturar Imagem</span>
                </div>

                <div class="cameraDiv">
                    <video autoplay playsinline></video>
                    <canvas style="display: none;"></canvas>
                </div>
            </div>
            `
        popup({ elemento, titulo: 'Registar fotos' })
        await abrirCamera()
    }

}

function visibilidadeFotos() {
    const fotos = document.querySelector('.fotos')
    const qtd = fotos.querySelectorAll('img')
    fotos.style.display = qtd.length == 0
        ? 'none'
        : 'grid'
}

async function fotoTarefa() {

    const fotos = document.querySelector('.fotos')
    const cameraDiv = document.querySelector('.cameraDiv');
    const canvas = cameraDiv.querySelector('canvas');
    const video = cameraDiv.querySelector('video');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const idFoto = crypto.randomUUID()
    const foto = `<img name="foto" id="${idFoto}" src="${canvas.toDataURL('image/png')}" class="foto" onclick="ampliarImagem(this, '${idFoto}')">`
    fotos.insertAdjacentHTML('beforeend', foto)

    encerrarCam()

    removerPopup()
    visibilidadeFotos()

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

async function recAC(identificador) {

    const url = `${api}/recuperar`

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identificador, servidor })
        })

        // 429 (limite de solicitações) traz { mensagem } para exibir.
        if (!response.ok && response.status !== 429) {
            console.error(`Falha ao eliminar: ${response.status} ${response.statusText}`)
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
            console.error(`Falha ao eliminar: ${response.status} ${response.statusText}`)
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
                'Content-Type': 'application/json',
                Authorization: `Bearer ${acesso?.token}`
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

async function pdf({ id, html = null, estilos = [], nome = 'documento' }) {

    try {
        overlayAguarde()

        if (!id && !html)
            return popup({ mensagem: 'ID do elemento ou html não localizado: Fale com o suporte.' })

        const htmlPdf = html || document.getElementById(id).outerHTML

        estilos = estilos
            .map(estilo => `<link rel="stylesheet" href="https://devleonny.github.io/Reconstrular/css/${estilo}.css">`)
            .join('')

        const htmlFinal = `
            <html>
                <head>
                    <meta charset="UTF-8">
                    ${estilos}
                    <style>
                        @page { size: A4; margin: 0mm; }
                        html, body { margin: 0; padding: 0; }
                        body {
                            font-family: 'Poppins', sans-serif; 
                            background: white; 
                        }

                    </style>
                </head>
                <body>${htmlPdf}</body>
            </html>`

        const response = await fetch(`${api}/pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${acesso?.token}` },
            body: JSON.stringify({ html: htmlFinal })
        })

        if (!response.ok) {
            let msg = 'Falha ao descarregar PDF'
            const text = await response.text()
            const j = JSON.parse(text)
            msg = j?.mensagem || j?.error || text || msg

            popup({ mensagem: msg })
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = url
        a.download = `${nome}.pdf`
        a.click()

        URL.revokeObjectURL(url)
        removerOverlay()

    } catch (err) {
        console.error(err)
        popup({ mensagem: 'Falha ao gerar PDF: Fale com o suporte.' })
    }
}
