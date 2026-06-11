const el = (name) => {
    return (
        document.querySelector(`.painel-padrao [name="${name}"]`) ||
        document.querySelector(`.filtro-tabela [name="${name}"]`) ||
        document.querySelector(`[name="${name}"]`) ||
        null
    )
}

async function telaUsuarios() {

    overlayAguarde()

    telaAtiva = 'parceiros'
    titulo.textContent = 'Parceiros'

    const colunas = {
        'Nome Completo': { chave: 'nome_completo' },
        'Telefone': { chave: 'telefone' },
        'Email': { chave: 'email' },
        'Função': { chave: 'snapshots.funcao', tipoPesquisa: 'select' },
        'Zona': { chave: 'snapshots.cidade.zona', tipoPesquisa: 'select' },
        'Distrito': { chave: 'snapshots.cidade.distrito', tipoPesquisa: 'select' },
        'Cidade': { chave: 'snapshots.cidade.nome', tipoPesquisa: 'select' },
        'Edição': {}
    }

    const tabela = await modTab({
        colunas,
        pag: 'parceiros',
        base: 'dados_setores',
        criarLinha: 'criarLinhaUsuarios',
        body: 'bodyParceiros'
    })

    tela.innerHTML = tabela

    await paginacao()

    removerOverlay()

}

async function criarLinhaUsuarios(dados) {

    const { usuario, nome_completo, telefone, email, cidade, funcao } = dados || {}
    const nCidade = await recuperarDado('cidades', cidade) || {}
    const { nome } = await recuperarDado('funcoes', funcao) || {}

    const tds = `
        <td>${nome_completo || ''}</td>
        <td>${telefone || ''}</td>
        <td>${email || ''}</td>
        <td>${nome || ''}</td>
        <td>${nCidade?.zona || ''}</td>
        <td>${nCidade?.distrito || ''}</td>
        <td>${nCidade.nome || ''}</td>
        <td>
            <img onclick="editarParceiros('${usuario}')" src="imagens/pesquisar.png">
        </td>`

    return `<tr>${tds}</tr>`

}

async function editarParceiros(usuario) {

    overlayAguarde()

    const {
        nome_completo,
        funcao,
        email,
        data_nascimento,
        telefone
    } = await recuperarDado('dados_setores', usuario) || {}

    const linhas = [
        { texto: 'Usuário', elemento: `<input ${usuario ? 'readOnly="true"' : ''} name="usuario" placeholder="Usuário" value="${usuario || ''}">` },
        { texto: 'Nome', elemento: `<input name="nome_completo" placeholder="Nome Completo" value="${nome_completo || ''}">` },
        { texto: 'E-mail', elemento: `<input name="email" type="email" placeholder="E-mail" value="${email || ''}">` },
        { texto: 'Telefone', elemento: `<input name="telefone" placeholder="Telefone" value="${telefone || ''}">` },
        { texto: 'Data de Nascimento', elemento: `<input type="date" name="data_nascimento" placeholder="Data de Nascimento" value="${data_nascimento || ''}">` },
        {
            elemento: `<div class="campo-funcoes"></div>`
        }
    ]

    const botoes = [
        { texto: 'Salvar', img: 'concluido', funcao: `salvarParceiro('${usuario}')` }
    ]

    if (usuario)
        botoes.push({ texto: 'Excluir', img: 'cancel', funcao: `confirmarDesativarUsuario('${usuario}')` })

    popup({ linhas, botoes, titulo: 'Adicionar Parceiro' })

    carregarTabelaFuncoes()

}

async function carregarTabelaFuncoes() {
    const esquema = [
        { titulo: 'CEO' },
        { titulo: 'Diretor Operativo' },
        { titulo: 'Coordenador Operativo', campos: ['zona'] },
        { titulo: 'Encarregado de Obra', campos: ['zona', 'distrito', 'area'] },
        { titulo: 'Trabalhador', campos: ['zona', 'distrito', 'area', 'obra'] }
    ];

    const estado = {
        funcaoIndex: null,
        valores: {}
    };

    const campoFuncoes = document.querySelector('.campo-funcoes');

    function normalizarCampo(campo) {
        return campo.toLowerCase();
    }

    function montarFiltrosAte(campoAtual) {
        const ordem = ['zona', 'distrito', 'area', 'obra'];
        const filtros = {};
        const idxAtual = ordem.indexOf(campoAtual);

        for (let i = 0; i < idxAtual; i++) {
            const campo = ordem[i];
            const valor = estado.valores[campo];

            if (Array.isArray(valor) && valor.length === 1) {
                filtros[campo] = { op: '=', value: valor[0] };
            }
        }

        return filtros;
    }

    async function obterOpcoes(campo) {
        const filtros = montarFiltrosAte(campo);

        const resultado = await contarPorCampo({
            base: 'cidades',
            path: campo,
            filtros
        });

        return Object.keys(resultado || {}).filter(r => r !== 'todos');
    }

    function limparCamposPosteriores(campos, campoAlterado) {
        const idx = campos.indexOf(campoAlterado);
        for (let i = idx + 1; i < campos.length; i++) {
            delete estado.valores[campos[i]];
        }
    }

    async function atualizarOpcoesCampos(campos, container) {
        for (const campo of campos) {
            const select = container.querySelector(`[data-campo="${campo}"]`);
            if (!select) continue;

            const opcoes = await obterOpcoes(campo);
            const selecionados = estado.valores[campo] || [];

            select.innerHTML = opcoes.map(op => `
                <label class="multi-option">
                    <input 
                        type="checkbox" 
                        value="${op}"
                        ${selecionados.includes(op) ? 'checked' : ''}
                    >
                    <span>${op}</span>
                </label>
            `).join('');
        }
    }

    const labels = {
        zona: 'Zona',
        distrito: 'Distrito',
        area: 'Área',
        obra: 'Obra'
    };

    function criarMultiSelect(campo) {
        const label = labels[campo] || campo;

        return `
        <div class="multi-select-wrap">
            <label class="multi-select-trigger" data-trigger="${campo}">
                <span>${label}</span>
                <span>⌵</span>
            </label>
            <div class="multi-select-dropdown" data-campo="${campo}"></div>
        </div>
    `;
    }

    async function renderizarCamposExtras(index) {
        const item = esquema[index];
        const campos = (item.campos || []).map(normalizarCampo);
        const linha = campoFuncoes.querySelector(`[data-linha="${index}"]`);
        const extras = linha.querySelector('.extras-funcao');

        estado.valores = {};
        extras.innerHTML = campos.map(criarMultiSelect).join('');

        await atualizarOpcoesCampos(campos, extras);

        extras.querySelectorAll('.multi-select-trigger').forEach(btn => {
            btn.addEventListener('click', () => {
                const campo = btn.dataset.trigger;
                const dropdown = extras.querySelector(`[data-campo="${campo}"]`);
                dropdown.classList.toggle('aberto');
            });
        });

        campos.forEach(campo => {
            const dropdown = extras.querySelector(`[data-campo="${campo}"]`);

            dropdown.addEventListener('change', async e => {
                if (e.target.type !== 'checkbox') return;

                const marcados = [...dropdown.querySelectorAll('input:checked')].map(i => i.value);
                estado.valores[campo] = marcados;

                limparCamposPosteriores(campos, campo);

                await atualizarOpcoesCampos(campos, extras);
                atualizarTextoTriggers(campos, extras);
            });
        });

        atualizarTextoTriggers(campos, extras);
    }

    function atualizarTextoTriggers(campos, container) {
        campos.forEach(campo => {
            const btn = container.querySelector(`[data-trigger="${campo}"]`);
            const selecionados = estado.valores[campo] || [];
            const label = labels[campo] || campo;

            btn.innerHTML = selecionados.length
                ? `<span>${label}: ${selecionados.join(', ')}</span><span>⌵</span>`
                : `<span>${label}</span><span>⌵</span>`;
        });
    }

    const elementos = esquema.map(({ titulo, campos = [] }, index) => `
        <div class="linha-funcao" data-linha="${index}" style="${horizontal}; gap: 1rem;">
            <input type="radio" name="funcao" value="${index}" style="width: 1.5rem; height: 1.5rem;">
            <span>${titulo}</span>
            <div class="extras-funcao"></div>
        </div>
    `).join('');

    campoFuncoes.innerHTML = elementos;

    campoFuncoes.querySelectorAll('input[type="radio"][name="funcao"]').forEach(radio => {
        radio.addEventListener('change', async e => {
            const novoIndex = Number(e.target.value);

            campoFuncoes.querySelectorAll('.extras-funcao').forEach(el => el.innerHTML = '');

            estado.funcaoIndex = novoIndex;
            estado.valores = {};

            await renderizarCamposExtras(novoIndex);
        });
    });
}

function confirmarDesativarUsuario(usuario) {

    const botoes = [
        { texto: 'Confirmar', img: 'concluido', funcao: `deletarUsuario('${usuario}')` }
    ]
    popup({ botoes, mensagem: 'Tem certeza?', nra: false })
}

async function desativarUsuario(usuario) {

    overlayAguarde()

    await deletar(`dados_setores/${usuario}`)

    removerOverlay()

}

async function salvarParceiro(usuario = el('usuario').value) {

    overlayAguarde()

    const nome_completo = el('nome_completo').value
    const email = el('email').value
    const telefone = el('telefone').value
    const cidade = el('cidade')?.id
    const funcao = el('funcao')?.id

    if (!usuario || !cidade || !nome_completo || !email)
        return popup({ mensagem: 'Não deixe Usuário/Nome ou E-mail em branco' })

    const user = {
        usuario,
        nome_completo,
        email,
        telefone,
        cidade,
        funcao
    }

    const resposta = await enviarUsuario(user)

    if (resposta.mensagem)
        return popup({ mensagem: resposta.mensagem })

    removerPopup()

    await usuariosToolbar()

}

async function deletarUsuario(usuario) {

    overlayAguarde()

    await enviarUsuario({ usuario, excluido: Date.now() })

    removerOverlay()

}

async function enviarUsuario(user) {
    try {

        const { token } = JSON.parse(localStorage.getItem('acesso')) || {}

        const response = await fetch(`${api}/adicionar-usuario`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ...user })
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