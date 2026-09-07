# GCERT · Controle de Inventário

Sistema interno para controlar o patrimônio de TI da GCERT (computadores, fones, celulares,
carregadores etc.): cadastro de colaboradores, estoque separado por categoria, etiquetas com
QR Code para imprimir e colar nos equipamentos, e conferência mensal automática via ClickUp.

Frontend estático (HTML/CSS/JS puro, sem build) + [Supabase](https://supabase.com) (Postgres
gerenciado, API e autenticação). Feito para rodar no GitHub Pages.

## Formulário público de cadastro (`solicitacao.html`)

Página separada, **sem necessidade de login**, para o colaborador informar nome, setor e os
equipamentos que estão com ele (por categoria + descrição — se a categoria não existir ainda,
ele escolhe "Outro" e descreve do jeito dele). O link para compartilhar aparece na aba
**Cadastro Rápido** do painel.

Isso não grava direto nos cadastros oficiais — cai como uma **solicitação pendente**, visível
só para quem está logado, na mesma aba **Cadastro Rápido**. Um clique em **Aprovar** cria o
colaborador (se ainda não existir) e os itens novos, já com QR Code, exatamente como se tivesse
sido cadastrado manualmente. Isso existe por segurança: sem esse filtro, qualquer pessoa com o
link poderia inserir dados falsos direto no patrimônio.

## Formulário mensal de conferência (ClickUp)

O preenchimento mensal de conferência (auditoria do que cada um ainda tem em mãos) é feito
pelos colaboradores em um **formulário do ClickUp** (fora deste sistema) — diferente do
formulário de cadastro acima, que é sobre equipamento novo. O resultado dessa conferência é
gravado direto no banco (tabela `conferencias`) pela integração descrita mais abaixo — não tem
tela própria no painel, é consultado direto no Supabase ou no próprio ClickUp.

## 1. Criar o backend no Supabase

1. Crie uma conta em [supabase.com](https://supabase.com) e um novo projeto (escolha região e
   senha do banco).
2. Abra **SQL Editor > New query**, cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql)
   e clique em **Run**. Isso cria as tabelas, a view pública usada pelo QR Code, as categorias
   iniciais e as regras de RLS (segurança por linha). É seguro rodar esse arquivo de novo sempre
   que ele for atualizado (toda tabela e política usa `if not exists`/`drop ... if exists` antes
   de recriar) — não duplica nada nem apaga dados existentes.
3. Em **Project Settings > API**, copie a **Project URL** e a chave **anon public**.
4. Abra [`js/supabaseClient.js`](js/supabaseClient.js) e substitua:
   ```js
   const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
   const SUPABASE_ANON_KEY = "SUA-CHAVE-ANON-PUBLICA-AQUI";
   ```
   pelos valores do seu projeto. Essa chave é pública por natureza (é a mesma usada pelo
   navegador do usuário) — quem protege os dados de verdade são as políticas de RLS do passo 2.
5. Crie o primeiro usuário da equipe (TI/RH) em **Authentication > Users > Add user**, com
   e-mail e senha. É esse usuário que faz login na tela inicial do sistema. Crie um por pessoa
   da equipe que vai usar o painel.

## 2. Rodar localmente

Como o app faz chamadas de rede para o Supabase, abra por um servidor local em vez de abrir o
arquivo direto (evita bloqueios de CORS do navegador). Qualquer servidor estático simples
funciona, por exemplo:

```bash
npx serve .
```

ou, com Python instalado:

```bash
python -m http.server 8080
```

Depois acesse `http://localhost:8080` (ou a porta indicada) no navegador.

## 3. Publicar no GitHub Pages

1. Crie um repositório no GitHub e suba este projeto (`git init`, `git add`, `git commit`,
   `git remote add origin ...`, `git push`).
2. No GitHub, vá em **Settings > Pages**, escolha a branch `main` e a pasta `/root`.
3. O site fica disponível em `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`.
4. As etiquetas geradas (`js/utils.js`, função `itemPublicUrl`) usam a própria URL do navegador
   para montar o link do QR Code — funciona tanto local quanto já publicado, sem configuração
   extra.

## Estrutura

```
index.html                painel interno (login + Dashboard, Cadastro Rápido, Colaboradores, Estoque, Etiquetas)
item.html                 página pública do item — é para onde o QR Code aponta, não exige login
solicitacao.html          formulário público de cadastro — não exige login
css/style.css
js/supabaseClient.js      configuração da conexão com o Supabase (preencher com suas chaves)
js/db.js                  todas as consultas ao banco, reaproveitadas pelas telas
js/auth.js                login/logout da equipe
js/ui-*.js                uma tela por arquivo (dashboard, cadastro rápido, colaboradores, estoque, etiquetas)
js/item-publico.js        lógica da item.html
js/solicitacao-publica.js lógica da solicitacao.html
supabase/schema.sql       script único que cria todo o banco de dados
supabase/functions/       Edge Functions (integração com o ClickUp)
```

## Integração com o ClickUp (conferência mensal automática)

Já implementada — o guia completo de configuração (o que criar no ClickUp, automação, deploy da
função) está em [`CLICKUP_INTEGRACAO.md`](CLICKUP_INTEGRACAO.md). Resumo: colaborador preenche
um formulário do ClickUp com e-mail + códigos dos equipamentos, uma automação chama a função em
[`supabase/functions/clickup-webhook`](supabase/functions/clickup-webhook/index.ts), que compara
com o que está registrado e grava direto na tabela `conferencias` (`origem = 'clickup'`).

## Próximos passos

- **Item novo → ClickUp**: ao cadastrar um item novo no sistema (aba Estoque ou Cadastro Rápido),
  chamar a API do ClickUp para criar a task correspondente na lista de patrimônio, guardando o
  `clickup_task_id` de volta no item (precisa de uma coluna nova em `itens` quando for
  implementar). Ainda não feito.
