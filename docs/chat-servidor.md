# Mensageiro Reconstrular — contrato para implementar no servidor

O frontend está preparado, mas as rotas abaixo precisam ser implementadas para
conversas e mensagens persistirem. Não há simulação nem armazenamento local de
mensagens. O chat legado foi removido do aplicativo; a base `mensagens` existente
no servidor não precisa ser alterada.

## Padrão de API

Todas as rotas são `POST`, relativas à variável `api`, com JSON e
`Authorization: Bearer <token>`, usando `fetchAutenticado`, como no restante do app.
O usuário autenticado é determinado pelo token, nunca pelo corpo da requisição.
Respostas de erro: HTTP 400/403/404/409/500 com `{ "erro": "Descrição" }`.
O corpo de sucesso deve seguir os formatos abaixo. Datas são números em
milissegundos UTC. Identificadores e nomes são strings, mensagens são texto puro.

## Pessoas: rota já utilizada pelo app

`POST /pesquisar-db`, base `dados_colaboradores`. O frontend usa `pagina` (a partir
de 1), `limite: 30`, ordenação por `nome_completo` e filtros OR com `includes` em
`nome_completo` e `usuario`. Resposta: `{ resultados: [...], paginas, total }`.
Cada resultado utilizado contém `usuario`, `nome_completo`, `funcao`.
Excluir pessoas sem usuário e o próprio usuário na interface. A busca deve ser
insensível a maiúsculas/minúsculas. A API deve projetar apenas dados públicos
do diretório autorizados para o solicitante, sem expor credenciais ou dados pessoais
desnecessários. O destinatário é identificado por `usuario`, não pelo ID do colaborador.

## Novas tabelas/bases sugeridas

- `chat_conversas`: `id`, `tipo` (`individual` ou `grupo`), `nome` (grupo),
  `criada_em`, `atualizada_em`, `criada_por`, `chave_individual` (única e calculada
  a partir do par de usuários, em ordem estável).
- `chat_participantes`: `conversa_id`, `usuario`, `entrou_em`, `ultima_lida_id`,
  `papel` (`administrador` ou `membro`). Chave única `(conversa_id, usuario)`.
- `chat_mensagens`: `id`, `conversa_id`, `remetente`, `texto`, `criada_em`,
  `cliente_id`. Restrição única `(remetente, cliente_id)` e índice para
  `(conversa_id, criada_em, id)`.

Se seu servidor usa objetos JSON em vez de SQL, mantenha a mesma estrutura
lógica e implemente as restrições com transações ou operações atômicas.
Mensagens são registros separados para evitar regravar todo o histórico.
Adicionar índices de participação por usuário e atualização das conversas.

## Formato de conversa

```json
{
  "id": "uuid-conversa",
  "tipo": "individual",
  "nome": null,
  "participantes": [
    { "usuario": "ana", "nome_completo": "Ana Silva", "papel": "administrador" },
    { "usuario": "joao", "nome_completo": "João Souza" }
  ],
  "criada_em": 1791500000000,
  "atualizada_em": 1791500000000,
  "ultima_mensagem": { "texto": "Olá", "remetente": "ana" },
  "nao_lidas": 1
}
```

`nao_lidas` é calculado por participante; não é um contador global. Não contar
mensagens do próprio usuário. Grupo sem mensagem pode retornar `ultima_mensagem: null`.

## Rotas novas

### POST /chat/conversas/listar

Entrada: `{ "pagina": 1, "limite": 40 }`.
Saída: `{ "resultados": [conversa], "paginas": 1, "total": 1 }`.
Retornar apenas conversas do usuário, ordenadas por `atualizada_em` decrescente
com desempate por ID. A busca da coluna esquerda filtra as conversas carregadas;
“Mais conversas” carrega a próxima página.

### POST /chat/conversas/criar

Individual: `{ "tipo": "individual", "participantes": ["joao"] }`.
Grupo: `{ "tipo": "grupo", "nome": "Equipe da obra", "participantes": ["joao", "maria"] }`.
Saída: `{ "conversa": conversa }`.

Adicionar automaticamente o usuário autenticado. Validar que todos os usuários
existem e podem receber mensagens. Remover duplicados. Individual tem exatamente
dois participantes; retornar a conversa existente do par em vez de criar outra.
Grupo exige nome de 1–80 caracteres e pelo menos três participantes no total;
o criador é administrador. Criação e inserção dos participantes devem ser atômicas.

### POST /chat/mensagens/listar

Entrada inicial: `{ "conversa_id": "uuid", "limite": 50, "antes": null, "depois_id": null }`.
Saída: `{ "resultados": [mensagem], "proximo_cursor": "cursor-opaco-ou-null" }`.

Na primeira chamada, retornar as últimas 50 mensagens **em ordem cronológica
crescente**. `proximo_cursor` aponta para mensagens anteriores ao primeiro registro
do lote. Com `antes`, retornar o lote anterior, também crescente, e o próximo cursor
para continuar retrocedendo. Usar ordenação estável `(criada_em, id)` e cursor
exclusivo para evitar duplicação na fronteira das páginas.

Com `depois_id`, retornar as primeiras 50 mensagens **posteriores** ao ID informado,
em ordem crescente. As próximas atualizações usam o último ID recebido, permitindo
recuperar intervalos com mais de 50 mensagens sem saltos. `antes` e `depois_id` não
devem ser combinados. Validar que ID e cursor pertencem à conversa autorizada.

Formato de mensagem:

```json
{
  "id": "uuid-mensagem",
  "conversa_id": "uuid-conversa",
  "remetente": "ana",
  "nome_remetente": "Ana Silva",
  "texto": "Olá! Como está a obra?",
  "criada_em": 1791500000000
}
```

### POST /chat/mensagens/enviar

Entrada: `{ "conversa_id": "uuid", "texto": "Olá", "cliente_id": "uuid-do-envio" }`.
Saída: `{ "mensagem": mensagem }`.

Validar texto não vazio, máximo 4.000 caracteres e participação na conversa.
Remetente, data e ID são determinados pelo servidor. Inserir mensagem e atualizar
a conversa na mesma transação. Para uma repetição com o mesmo remetente e
`cliente_id`, retornar a mensagem já salva; não inserir novamente. Recusar a reutilização
da chave com conteúdo/conversa diferentes. O frontend só limpa o campo após confirmação.

### POST /chat/conversas/ler

Entrada: `{ "conversa_id": "uuid", "mensagem_id": "uuid-ultima-visualizada" }`.
Saída: `{ "success": true }`.
Validar a participação e atualizar apenas a leitura do usuário autenticado, sem
retroceder o marcador nem marcar mensagens posteriores ao ID informado.

## Atualizações e acesso

Depois de criar conversa, enviar mensagem ou atualizar leitura, emitir o evento
WebSocket já utilizado pelo app:

```json
{ "tipo": "atualizacao", "tabela": "chat_mensagens" }
```

Também são reconhecidas `chat_conversas` e `chat_participantes`. Enviar esses eventos
somente aos participantes autorizados, sem conteúdo de mensagens no broadcast.
O frontend atualiza por evento e consulta a cada 10 segundos enquanto o mensageiro
está aberto e a página visível. Para todas as rotas, validar a participação no servidor,
aplicar limites de paginação e impedir acesso direto às bases genéricas que contorne
essas regras. As rotas não devem permitir executar ações do chat legado.

## Escopo implementado

### `POST /chat/grupos/editar`

Recebe `{ "conversa_id": "uuid", "nome": "Equipe", "participantes": ["ana", "joao", "maria"] }`.
`participantes` é a lista completa desejada, incluindo o administrador autenticado.
Retorna `{ "success": true, "conversa": { ... } }` no formato de conversa acima.
As respostas de criação e listagem devem incluir `papel` em cada participante e
`criada_por` na conversa. O frontend abre o editor pelo ícone de participantes
somente para administradores; os demais usuários visualizam a lista.

O servidor deve verificar pelo token se o solicitante ainda é participante com
papel `administrador` e se a conversa é um grupo, retornando 403 caso contrário.
Validar nome de 1–80 caracteres, usuários válidos e únicos e pelo menos três
participantes, mantendo o solicitante. Atualizar nome e membros em transação;
preservar papéis e marcadores de leitura dos membros mantidos e adicionar novos
usuários como `membro`. Não aceitar papéis enviados pelo cliente.
Usuários removidos devem perder imediatamente acesso à conversa e às mensagens.
Notificar membros mantidos, adicionados e removidos com `chat_participantes`,
sem conteúdo de mensagens, para atualizar suas listas e contadores.
A rota precisa ser implementada no servidor separado para o salvamento funcionar.

Conversas individuais, criação de grupos, visualização dos participantes, busca de
colaboradores, lista paginada, mensagens de texto, histórico paginado, contador de
não lidas, rascunhos em memória por conversa e navegação para celular.
O frontend inclui edição de nome e membros do grupo para administradores.
Anexos, recibos de leitura
por destinatário, digitação, áudio e chamadas não fazem parte desta primeira versão.
Não migrar automaticamente avisos com ações de aprovação para mensagens comuns.

## Verificação após implementar o servidor

Usar duas sessões distintas: criar conversa nos dois lados ao mesmo tempo (deve
resultar no mesmo ID), enviar e receber, repetir `cliente_id`, criar grupo e conferir
todos os participantes. Testar histórico com mais de 50 mensagens, diretório com mais
de 30 pessoas, leitura, falha de rede e acesso negado de um terceiro usuário.
