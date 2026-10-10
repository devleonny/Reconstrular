# Regras de tarefas para o servidor

O frontend mantém as rotas existentes `/pesquisar-db`, `/recuperar-dado` e
`/salvar`, base `tarefas`. Nenhuma rota nova é exigida, mas o servidor precisa
aplicar estas regras também. Filtros e botões do navegador não garantem privacidade.

## Campos

Preservar os campos existentes e adicionar:

- `criador`: usuário que criou a tarefa, definido pelo token e imutável.
- `usuario`: alias do criador para compatibilidade com registros anteriores.
- `envolvidos`: array `[usuario, destinatario]`, sem duplicados, validado pelo servidor.
- `destinatario_funcao`: cargo do destinatário. O servidor consulta o diretório;
  não deve confiar no cargo enviado pelo frontend ou em um cargo desatualizado.
- `particular`: booleano, verdadeiro quando criador e destinatário são a mesma pessoa.
- `notas_usuario`: objeto de notas individuais, com chaves `encodeURIComponent(usuario)`.

O campo existente `notas` continua armazenando a **Descrição da tarefa**, evitando
perder dados antigos. As anotações individuais são armazenadas separadamente.

## Visibilidade

Uma tarefa particular só pode ser lida pelo criador/destinatário, inclusive nas
rotas de busca, recuperação por ID, contagem, exportação e eventos WebSocket.
CEO e Diretor Programador não podem acessar tarefas particulares de outros usuários.

Tarefas compartilhadas e suas notas são visíveis aos usuários de `envolvidos` e,
independentemente de participação, ao CEO e ao Diretor Programador. Os demais
cargos não acessam tarefas apenas por serem superiores. A escolha do destinatário
consulta `dados_colaboradores` sem filtro adicional de cargos no frontend; o
servidor retorna apenas colaboradores permitidos para o usuário autenticado.

Ao salvar, o frontend utiliza o destinatário selecionado na listagem, sem uma
segunda consulta ao diretório. O próprio usuário é sempre permitido para criar
particulares. O servidor valida a autorização e resolve o cargo na gravação.

O menu Tarefas fica disponível também ao Trabalhador. Todos podem criar para si.
Registros antigos sem `envolvidos` usam `criador`/`usuario` e `destinatario` para
determinar os envolvidos. As notas de uma tarefa seguem sua visibilidade; cada
usuário continua editando somente a nota identificada pela própria chave.

## Alterações

- O destinatário altera apenas `estado`, `prioridade` e sua própria nota.
- O criador de tarefa compartilhada, o CEO e o Diretor Programador podem editar a tarefa integralmente
  quando não são o destinatário e respeitam a visibilidade.
- O dono de uma tarefa particular pode voltar a editar todos os campos.
- Uma nota deve ser gravada somente em `notas_usuario/<usuário do token>`.
  Nunca permitir sobrescrever a nota de outro usuário pelo caminho genérico.
- Validar destinatário, valores dos dropdowns, datas e anexos no servidor.
- Restringir caminhos de `/salvar` para impedir atualização integral por destinatário,
  alteração do criador ou modificação de privacidade/cargo por um cliente adulterado.

Estados: `Não iniciado`, `Em curso`, `Stand By`, `Dependente`, `Finalizado`, `Concluído`.
Prioridades: `Alta`, `Média`, `Baixa`.

Somente `Concluído` pertence ao relatório Histórico. A separação é por filtro;
não há transferência entre bases. Reabrir pelo dropdown devolve a tarefa à lista
ativa, respeitando as mesmas permissões.

## Dados anteriores

Preencher `criador` a partir do usuário de criação/auditoria real, quando disponível,
e calcular `particular` e cargo destinatário. Não atribuir os registros antigos
arbitrariamente ao usuário que estiver conectado. Sem criador, o frontend deixa
edição geral apenas ao CEO (se não for destinatário); o destinatário continua
alterando estado, prioridade e a própria nota.

Sanitizar o HTML dos campos dos editores no servidor. O frontend permite apenas
formatação simples sem atributos HTML.

## Histórico no mesmo objeto

`historico` é um objeto JSON com chaves UUID. Cada registro contém `timestamp`
(milissegundos), `data_hora` (ISO), `usuario`, `campo`, `acao`, `anterior` e `novo`.
O frontend registra criação, mudanças de prioridade, estado, tarefa, descrição,
destinatário, datas, anexos e nota individual. Não duplica eventos ao salvar sem
alterações. A exibição ordena do mais antigo ao mais recente nos detalhes.

Tarefa e histórico são enviados juntos a `/salvar`, caminho `tarefas/<id>`.
Assim, inclusive as alterações restritas passam agora um objeto completo.
O servidor deve comparar com o registro existente para permitir ao destinatário
apenas estado, prioridade e sua própria nota; os demais campos enviados devem
permanecer idênticos. Não basta liberar escrita integral por causa deste histórico.

Para não perder eventos em alterações simultâneas, o servidor deve mesclar os
eventos por UUID e aplicar as alterações atomicamente, com controle de versão
ou bloqueio/transação. A leitura e regravação pelo frontend, sozinhas, não protegem
contra concorrência. O servidor também deve validar/gerar usuário e data dos
eventos pelo token e pelo relógio do servidor e impedir alteração de eventos antigos.
O histórico usa as mesmas regras de visibilidade da tarefa; registra que uma nota
mudou, sem expor seu conteúdo na tabela de alterações.
