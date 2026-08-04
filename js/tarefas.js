const prioridades = [
    'Alta',
    'Média',
    'Baixa'
]

const estados = [
    'Não iniciado',
    'Em curso',
    'Stand By',
    'Dependente',
    'Finalizado',
    'Concluído'
]

async function telaTarefas() {

    overlayAguarde()

    const tabela = await modTab({
        btnExtras: '<button onclick="gerenciarTarefa()">Adicionar Tarefa</button>',
        base: 'tarefas',
        body: 'tarefas',
        pag: 'tarefas',
        criarLinha: 'criarLinhaTarefa',
        colunas: {
            'Tarefa': { chave: 'tarefa' },
            'Prioridade': { chave: 'prioridade', tipoPesquisa: 'select' },
            'Destinatário': { chave: 'destinatario', tipoPesquisa: 'select' },
            'Estado': { chave: 'estado', tipoPesquisa: 'select' },
            'Data de Início': { chave: 'data_inicio', tipoPesquisa: 'data' },
            'Data de Fim': { chave: 'data_fim', tipoPesquisa: 'data' },
            'Imagem / Documento': {},
            'Notas': { chave: 'notas' },
            'Edição': {}
        }
    })

    tela.innerHTML = `
        <div>
            ${tabela}
        </div>
    `

    await paginacao('tarefas')

    removerOverlay()
}


function criarLinhaTarefa(dados) {

    const {
        id,
        tarefa,
        prioridade,
        destinatario,
        estado,
        data_inicio,
        data_fim,
        anexos,
        notas
    } = dados || {}


    return `
        <tr>
            <td style="white-space: wrap;">${tarefa || ''}</td>
            <td>
                <span class="tarefas tarefas-${prioridade}">${prioridade || ''}</span>
            </td>
            <td>${destinatario}</td>
            <td>
                <span class="tarefas tarefas-${estado.replace(' ', '-')}">${estado || ''}</span>
            </td>
            <td>${dt(data_inicio)}</td>
            <td>${dt(data_fim)}</td>
            <td></td>
            <td style="white-space: wrap;">${notas || ''}</td>
            <td><img src="imagens/pesquisar.png" onclick="gerenciarTarefa('${id}')"></td>
        </tr>
    `

}

async function gerenciarTarefa(id) {

    try {

        overlayAguarde()

        const {
            tarefa,
            prioridade,
            destinatario,
            estado,
            data_inicio,
            data_fim,
            anexos,
            notas
        } = id ? await recuperarDado('tarefas', id) : {}

        controlesCxOpcoes.destinatario = {
            base: 'dados_setores',
            retornar: ['usuario'],
            colunas: {
                'Usuário': { chave: 'usuario' },
                'Nome': { chave: 'nome_completo' },
                'Função': { chave: 'funcao' }
            }
        }

        const linhas = [
            {
                texto: 'Tarefa',
                editor: tarefa || ''
            },
            {
                texto: 'Prioridade',
                elemento: `
                <select name="prioridade">
                    ${prioridades.map(p => `<option ${prioridade == p ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
            `
            },
            {
                texto: 'Estado',
                elemento: `
                <select name="estado">
                    ${estados.map(e => `<option ${estado == e ? 'selected' : ''}>${e}</option>`).join('')}
                </select>`
            },
            {
                texto: 'Destinatário',
                elemento: `<span class="opcoes" name="destinatario" onclick="cxOpcoes('destinatario')">${destinatario || 'Selecione'}</span>`
            },
            {
                texto: 'Data de Início',
                elemento: `<input name="data_inicio" type="date" value="${data_inicio || ''}">`
            },
            {
                texto: 'Data de Fim',
                elemento: `<input name="data_fim" type="date" value="${data_fim || ''}">`
            },
            {
                texto: 'Imagem / Documento',
                elemento: `<input type="file" multiple>`
            },
            {
                texto: 'Notas',
                editor: notas || ''
            }
        ]

        const botoes = [
            {
                texto: 'Salvar',
                funcao: id ? `salvarTarefa('${id}')` : 'salvarTarefa()',
                img: 'concluido'
            }
        ]

        popup({
            linhas,
            botoes
        })

    } catch (err) {
        console.log(err)
        popup({ mensagem: 'Falha ao abrir a tarefa: Fale com o suporte.' })
    }

}

async function salvarTarefa(id = crypto.randomUUID()) {

    try {

        overlayAguarde()

        const tarefa = await recuperarDado('tarefas', id)

        const editores = [...document.querySelectorAll('.editor-conteudo')]

        const destinatario = document.querySelector('[name="destinatario"]')?.id

        if (!destinatario)
            return popup({ mensagem: 'Não deixe o destinatário em branco!' })

        const atualizado = {
            ...tarefa,
            destinatario,
            prioridade: document.querySelector('[name="prioridade"]')?.value,
            estado: document.querySelector('[name="estado"]')?.value,
            data_inicio: document.querySelector('[name="data_inicio"]')?.value,
            data_fim: document.querySelector('[name="data_fim"]')?.value,
            data_fim: document.querySelector('[name="data_fim"]')?.value,
            tarefa: editores[0].innerHTML || null,
            notas: editores[1].innerHTML || null,
        }

        await enviar(`tarefas/${id}`, atualizado)

        removerTodosPopups()


    } catch (err) {
        console.log(err)
        popup({ mensagem: 'Falha ao salvar a tarefa: Fale com o suporte.' })
    }

}