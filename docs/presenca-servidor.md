# Presença de usuários — contrato do servidor

O frontend consulta presença separadamente das tabelas de colaboradores.
Implementar `POST /presenca/online` na mesma base de URL da API, com
`Authorization: Bearer <token>`, corpo `{}` e `Cache-Control: no-store`.

Resposta de sucesso:

```json
{
  "success": true,
  "resultados": [
    { "usuario": "ana", "nome_completo": "Ana Silva", "funcao": "Administrativo" }
  ]
}
```

Retornar TODOS os usuários online autorizados no ambiente/empresa do solicitante,
uma entrada por usuário, incluindo o próprio solicitante se conectado.
Não aplicar filtros, hierarquia de cargos, paginação ou estado das tabelas.
Não expor tokens, IDs de sessões, documentos ou dados de outras empresas.
Autenticar o token; devolver 401 para sessão inválida. Lista vazia é sucesso;
indisponibilidade do serviço deve devolver erro, nunca lista vazia simulada.

Determinar presença pelas conexões WebSocket autenticadas e vivas, não pelo
campo persistido `dados_colaboradores.status`. Manter conjunto de conexões por
usuário: fechar uma aba não torna o usuário offline se outra conexão está viva.
Registrar conexão somente após autenticação, remover no fechamento e revogação.
Usar heartbeat ping/pong do servidor (por exemplo, 30 segundos) e encerrar
conexões sem resposta (por exemplo, 60 segundos), inclusive desconexões abruptas.
Com várias instâncias do backend, compartilhar presença com TTL ou mecanismo
equivalente; limpar registros expirados e não conservar presença após reinícios.

Ao mudar a presença efetiva, emitir aos clientes autorizados:
`{ "tipo": "status", "usuario": "ana", "status": "online" }` ou `offline`.
O frontend já trata esses eventos, consulta ao carregar os controles e atualiza
a cada 30 segundos. A rota também deve funcionar com HTTP autenticado sem
exigir que a própria requisição do solicitante possua WebSocket aberto.

Validar: filtros de colaboradores não afetam presença; múltiplas abas e
dispositivos contam uma pessoa; fechar última conexão remove presença;
queda de rede expira pelo heartbeat; token revogado remove conexões;
empresas diferentes ficam isoladas; ausência de conexões retorna lista vazia.

## Prompt para o chat do servidor

Implemente o contrato de docs/presenca-servidor.md no backend. O frontend já
consulta POST /presenca/online e não usa mais dados_colaboradores.status nem
filtros das tabelas para o contador e o painel de usuários online. Inspecione e
reaproveite a infraestrutura WebSocket existente. Use conexões autenticadas,
heartbeat e controle de múltiplas abas/dispositivos para determinar presença
real, respeitando isolamento por empresa. Emita os eventos tipo status no
formato documentado. Implemente a rota, valide os cenários descritos e informe
qualquer configuração necessária para múltiplas instâncias do servidor.
