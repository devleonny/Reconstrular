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


    try {

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

        tela.innerHTML = montarPagina({ titulo: 'Tarefas', imagem: 'checklist', tabela })

        await paginacao('tarefas')

        removerOverlay()

    } catch (err) {
        console.log(err)
        popup({ mensagem: 'Falha ao abrir a tela de Tarefas: Fale com o suporte.' })
    }

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

    const listagemAnexos = Object.entries(anexos || {})
        .map(([id, anexo]) => {
            return criarAnexoVisual(anexo)
        })
        .join('')

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
            <td>
                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                    ${listagemAnexos}
                </div>
            </td>
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

        const listagemAnexos = Object.entries(anexos || {})
            .map(([id, anexo]) => {
                return criarAnexoVisual(anexo)
            })
            .join('')

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
                elemento: `<span ${destinatario ? `id="${destinatario}"` : ''} class="opcoes" name="destinatario" onclick="cxOpcoes('destinatario')">${destinatario || 'Selecione'}</span>`
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
                elemento: `
                    <div style="${vertical}; gap: 5px;">
                        <input id="anexos" type="file" multiple>
                        <div style="display: flex; flex-wrap: wrap;">${listagemAnexos}</div>
                    </div>
                    `
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

        // Anexos
        const input = document.getElementById('anexos')
        const respAnexos = await importarAnexos({ input }) || []
        const anexos = Object.fromEntries(
            respAnexos.map(a => [crypto.randomUUID(), a])
        )

        const atualizado = {
            ...tarefa,
            anexos: {
                ...tarefa?.anexos,
                ...anexos
            },
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
        console.error(err)
        popup({ mensagem: 'Falha ao salvar a tarefa: Fale com o suporte.' })
    }

}