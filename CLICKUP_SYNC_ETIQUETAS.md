# Sincronizar o Cadastro do ClickUp com o sistema de Etiquetas/Estoque

Isso conecta o que já está automatizado no ClickUp (formulário de Cadastro de Equipamentos →
cria o equipamento → gera o identificador `GC-000x` → cria a subtarefa no colaborador) com este
sistema: toda vez que isso acontecer no ClickUp, o mesmo equipamento aparece automaticamente
aqui em **Estoque** e **Etiquetas**, com o colaborador certo já atribuído e o mesmo identificador
usado na conferência mensal do ClickUp — sem digitar nada duas vezes.

Quem chama essa sincronização é o **próprio Google Apps Script** que já roda a automação do
ClickUp (`conferencia_inventario.gs`), não uma automação nova do ClickUp — por isso não depende
de nenhum plano pago do ClickUp, é só uma chamada HTTP que o script já faz.

## O que já foi feito nesses arquivos

- `supabase/schema.sql` — adicionada a coluna `clickup_task_id` em `itens` (identifica, sem
  duplicar, qual item daqui corresponde a qual task do ClickUp).
- `supabase/functions/clickup-sync-item/index.ts` — a função nova que recebe os dados do
  equipamento e cria/atualiza o colaborador, a categoria e o item.
- `conferencia_inventario.gs` — ganhou a função `sincronizarItemNoSistema_`, chamada
  automaticamente sempre que um equipamento é criado, tem o status alterado (Estoque ↔ Alocado)
  ou tem o Colaborador Responsável alterado.

## Passo 1 — Rodar a atualização do banco

No Supabase: **SQL Editor > New query**, cole o conteúdo atualizado de `supabase/schema.sql`
(o arquivo inteiro, de novo — é seguro, só adiciona o que falta) e clique em **Run**.

## Passo 2 — Publicar a nova função no Supabase

Na pasta do projeto, com o Supabase CLI já configurado (mesmo usado no `clickup-webhook`):

```bash
npx supabase functions deploy clickup-sync-item
```

Ela reaproveita os secrets que você já configurou (`WEBHOOK_SHARED_SECRET`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`) — não precisa configurar nada novo no Supabase.

Ao final, o comando mostra a URL pública da função, algo como:
```
https://SEU-PROJETO.supabase.co/functions/v1/clickup-sync-item
```

## Passo 3 — Colar a URL no Apps Script

Abra o projeto do Apps Script (script.google.com) e, no topo do arquivo, preencha:

```js
const SINCRONIZAR_COM_SISTEMA = true;
const SUPABASE_SYNC_URL = 'https://SEU-PROJETO.supabase.co/functions/v1/clickup-sync-item?secret=A-MESMA-SENHA-DO-WEBHOOK_SHARED_SECRET';
```

Use exatamente a mesma senha que você colocou em `WEBHOOK_SHARED_SECRET` no Supabase (a mesma
que já está na URL do `clickup-webhook`, se você já configurou aquela integração).

Depois de colar, **Implantar > Gerenciar implantações > ✏️ (editar) > Nova versão > Implantar**
— edição de código só entra em vigor depois de uma nova versão implantada.

## Testando

1. Preencha o Formulário de Cadastro de Equipamentos no ClickUp (com um Solicitante válido).
2. Confira em **Execuções**, no editor do Apps Script, se apareceu a linha de log
   `Sincronização com sistema de etiquetas: 200 ...`.
3. Abra o sistema (aba **Estoque** ou **Etiquetas**) e confirme que o equipamento apareceu, já
   com o colaborador certo e o identificador `GC-000x` igual ao do ClickUp.
4. Mude o **Status** do equipamento no ClickUp para "Em Estoque" — o item aqui deve voltar para
   "Em estoque" e perder o colaborador. Mude para "Alocados Internamente" de novo — deve
   reaparecer com o colaborador.

Se alguma chamada falhar, ela **não trava a automação do ClickUp** (fica só registrada no log de
Execuções do Apps Script) — assim um problema de sincronização nunca impede o resto do fluxo
(criação de subtarefa, conferência mensal, etc.) de funcionar.

## Observação sobre o formato do identificador

Os 9 itens que já existem aqui usam o prefixo `GCERT-000x` (das etiquetas já impressas). Os itens
que chegarem pelo ClickUp vão usar o prefixo `GC-000x` (o que já está configurado lá). Os dois
convivem sem problema — `codigo` é só um texto único, não depende do prefixo — mas se um dia
quiser que todos os itens novos sigam o mesmo padrão visual, basta trocar o prefixo `'GC-'` por
`'GCERT-'` na função `gerarProximoIdentificador_()` do Apps Script (e reiniciar o contador, se
quiser recomeçar a numeração do zero com o novo prefixo).
