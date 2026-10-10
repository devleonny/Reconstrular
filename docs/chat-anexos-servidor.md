# Anexos do chat — contrato do backend

O frontend em js/chat.js está preparado para selecionar e remover anexos,
enviar apenas arquivos ou texto com arquivos, preservar seleção e cliente_id
em falhas e baixar anexos com autenticação. Não há upload separado.

## Envio

Expandir `POST /chat/mensagens/enviar` para aceitar o JSON atual (mensagens
de texto) e `multipart/form-data` para mensagens com arquivos.
Autenticar `Authorization: Bearer <token>` em ambos.
No multipart, campos texto: `conversa_id`, `texto` e `cliente_id`.
Os arquivos são enviados em partes repetidas com nome `arquivos`.
Não exigir texto quando houver ao menos um arquivo válido; texto até 4000 caracteres.
Aceitar no máximo 5 arquivos, cada um não vazio e com até 10 MiB (10485760 bytes).
Tipos: JPG/JPEG, PNG, WEBP, PDF, TXT, DOCX e XLSX. Validar extensão, MIME e conteúdo
no servidor; não confiar nos metadados enviados pelo navegador. Configurar limite
de corpo no proxy e parser compatível com 50 MiB mais overhead do multipart.

Exemplo de resposta, também usado por `POST /chat/mensagens/listar`:

```json
{
  "success": true,
  "mensagem": {
    "id": "123",
    "conversa_id": "uuid",
    "remetente": "ana",
    "texto": "Documento da obra",
    "criada_em": 1791500000000,
    "anexos": [
      { "id": "uuid-anexo", "nome": "documento.pdf", "tamanho": 102400, "tipo": "application/pdf" }
    ]
  }
}
```

`anexos` é array, vazio quando não houver arquivos. IDs de mensagens permanecem
strings numéricas para ordenação do histórico. `mensagens/listar` inclui os
mesmos metadados em cada mensagem. Em `conversas/listar`, usar uma prévia como
“Anexo” quando a última mensagem não tiver texto.

Preservar a idempotência por (remetente, cliente_id), inclusive em multipart e
requisições concorrentes. Repetir um envio retorna a mesma mensagem e anexos,
sem duplicar arquivos. Registrar mensagem e anexos atomicamente e limpar objetos
órfãos em falhas. Armazenar arquivos privados com nomes internos aleatórios;
sanitizar nome original e não permitir caminhos enviados pelo cliente.
Verificar participação ativa e empresa antes de aceitar envio. Remoção de um
participante impede novos downloads. Emitir o evento chat_mensagens existente.

## Download

Implementar `POST /chat/anexos/baixar`, JSON `{ "anexo_id": "uuid-anexo" }`,
com Bearer token. Verificar usuário, empresa, participação atual na conversa
e vínculo entre anexo e mensagem. Nunca expor caminho físico ou URL pública.
Sucesso retorna os bytes do arquivo, MIME correto, Content-Disposition: attachment,
Cache-Control: private, no-store e X-Content-Type-Options: nosniff.
Erros retornam status apropriado e JSON com mensagem. O frontend baixa via fetch
autenticado e cria um link temporário para salvar o arquivo; não usa URL pública.

## Validação

Testar texto sem arquivos, arquivo sem texto, texto com vários arquivos,
limites e tipos inválidos, repetição e concorrência do cliente_id, falha parcial
de armazenamento, histórico paginado com metadados, download autenticado e
bloqueio para usuário removido ou de outra empresa.

## Prompt para o chat do servidor

Implemente docs/chat-anexos-servidor.md no backend. O frontend já envia arquivos
com multipart/form-data em POST /chat/mensagens/enviar, mantendo JSON para texto
simples, e baixa via POST /chat/anexos/baixar com Bearer token. Implemente
armazenamento privado, validações, autorização por conversa/empresa, idempotência
e limpeza em falhas. Inclua anexos nas respostas de envio e histórico e mantenha
os eventos WebSocket existentes. Valide os cenários do documento e indique
configurações necessárias do proxy, limite de upload e armazenamento.
