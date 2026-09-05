# Integração com o ClickUp — conferência mensal automática

Isso conecta o formulário mensal de conferência (preenchido no ClickUp) direto na aba
**Conferências** do sistema, sem ninguém copiar nada manualmente. A função que faz esse meio de
campo já está pronta em [`supabase/functions/clickup-webhook/index.ts`](supabase/functions/clickup-webhook/index.ts) —
falta só configurar o ClickUp e publicar (deploy) a função.

## Pré-requisito: e-mail de cada colaborador

A automação identifica quem respondeu **pelo e-mail**. Antes de ativar isso, confira em
**Colaboradores** que todo mundo tem o e-mail certo cadastrado (muitos criados pelo "Cadastro
Rápido" ficaram sem e-mail) — sem isso, a resposta dele no ClickUp não vai casar com ninguém no
sistema.

## Passo 1 — Criar a List no ClickUp

1. Crie uma List nova, por exemplo **"Conferência Mensal de Patrimônio"**.
2. Nela, crie 2 campos personalizados (Custom Fields), do tipo **texto**:
   - `E-mail do colaborador`
   - `Códigos dos equipamentos que você tem`
3. Um terceiro campo opcional, só pra facilitar a leitura visual no ClickUp:
   - `Nome do colaborador`

## Passo 2 — Ativar o Formulário

1. Na List, adicione uma view do tipo **Form**.
2. Arraste os 3 campos acima para dentro do formulário (marque **E-mail** e **Códigos** como
   obrigatórios).
3. No campo de códigos, deixe uma instrução clara, por exemplo:
   > Digite um código por linha (ou separado por vírgula). O código está na etiqueta colada no
   > equipamento. Ex.: GCERT-0001, GCERT-0004
4. Copie o **link público do formulário** (View do Form > Share > Copy Link) — é esse link que
   você vai mandar todo mês pros colaboradores (e-mail, WhatsApp, Slack, o que usarem).

## Passo 3 — Automação (envia os dados pro sistema)

1. Na List, vá em **Automation > + Add Automation**.
2. Trigger: **"When a task is created"** (nessa List).
3. Action: **"Call a webhook"** — cole a URL da function (você vai ter esse endereço depois do
   deploy no Passo 5), no formato:
   ```
   https://SEU-PROJETO.supabase.co/functions/v1/clickup-webhook?secret=SUA-SENHA-COMPARTILHADA
   ```
   `SUA-SENHA-COMPARTILHADA` é uma senha aleatória que você mesmo inventa (ex.: gere uma string
   longa qualquer) — ela impede que qualquer pessoa que descubra a URL da função consiga mandar
   dados falsos pro seu sistema.

> **Atenção:** a ação "Call a webhook" em Automações só existe nos planos pagos do ClickUp
> (Business ou superior). Se seu plano não tiver isso, ainda dá pra usar a
> [Opção B](#) (conferência manual) até fazer upgrade, ou usar o **Webhook nativo do ClickUp**
> (Settings > Integrations > Webhooks) como alternativa — o formato do payload muda um pouco,
> me avise que eu ajusto a função pra esse caso.

## Passo 4 — Token de API do ClickUp

1. No ClickUp: clique no seu avatar > **Settings > Apps > API Token** > gere um token pessoal.
2. Guarde esse token — você vai colar ele **direto no Supabase** no próximo passo (nunca no
   código do projeto, nunca aqui no chat).

## Passo 5 — Publicar (deploy) a função no Supabase

Você vai precisar do [Supabase CLI](https://supabase.com/docs/guides/cli) instalado. Na pasta do
projeto:

```bash
npx supabase login
npx supabase link --project-ref SEU-PROJETO
npx supabase secrets set CLICKUP_API_TOKEN="cole-o-token-do-passo-4-aqui"
npx supabase secrets set WEBHOOK_SHARED_SECRET="a-mesma-senha-que-voce-colocou-na-url-do-passo-3"
npx supabase functions deploy clickup-webhook
```

Ao final, o comando mostra a URL pública da função — é ela que entra na Automação do Passo 3.

## Passo 6 — Lembrete mensal

O ClickUp não reenvia formulário sozinho. O mais simples é criar uma **task recorrente mensal**
(ex.: todo dia 25) assinalada pra você ou RH, tipo "Enviar link da conferência mensal pros
colaboradores", com o link do formulário colado na descrição — assim não esquece.

## Testando

1. Preencha o formulário publicado, com um e-mail que já exista em Colaboradores e um código
   real que esteja atribuído a essa pessoa.
2. Confira em **Conferências**, no mês atual, se apareceu a linha com origem `clickup` e status
   `Confirmado`.
3. Teste também um código errado (que não é dela) — deve aparecer como `Divergente`, e um código
   que ela tem mas não digitou — deve aparecer como `Não localizado`.

Qualquer erro na automação aparece no histórico da Automação dentro do ClickUp (clique nela >
"Automation History"), com a resposta que a função devolveu — útil pra debugar.
