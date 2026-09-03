# GCERT · Controle de Inventário

Sistema interno para controlar o patrimônio de TI da GCERT (computadores, fones, celulares,
carregadores etc.): cadastro de colaboradores, estoque separado por categoria, etiquetas com
QR Code para imprimir e colar nos equipamentos, e um histórico de conferências mensais.

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
formulário de cadastro acima, que é sobre equipamento novo. A aba **Conferências** aqui dentro
guarda o histórico dessas conferências (uma linha por item/colaborador/mês) e já está pronta
para receber, no futuro, os dados sincronizados automaticamente do ClickUp — enquanto isso não
está implementado, dá pra registrar manualmente por aqui mesmo. Veja "Próximos passos" no final
deste arquivo.

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
index.html               painel interno (login + Dashboard, Cadastro Rápido, Colaboradores, Estoque, Conferências, Scanner, Etiquetas)
item.html                página pública do item — é para onde o QR Code aponta, não exige login
solicitacao.html         formulário público de cadastro — não exige login
css/style.css
js/supabaseClient.js     configuração da conexão com o Supabase (preencher com suas chaves)
js/db.js                 todas as consultas ao banco, reaproveitadas pelas telas
js/auth.js               login/logout da equipe
js/ui-*.js               uma tela por arquivo (dashboard, cadastro rápido, colaboradores, estoque, conferências, etiquetas, scanner)
js/item-publico.js       lógica da item.html
js/solicitacao-publica.js lógica da solicitacao.html
supabase/schema.sql      script único que cria todo o banco de dados
```

## Próximos passos: integração com o ClickUp

Ainda não implementado — fica documentado aqui como próximo passo, para depois que o sistema
em si estiver validado no dia a dia:

- **Formulário → Sistema**: quando um colaborador responde o formulário mensal no ClickUp, usar
  um **webhook do ClickUp** (dispara em criação/edição de task) apontando para uma
  [Supabase Edge Function](https://supabase.com/docs/guides/functions), que recebe o payload,
  identifica o item pelo código (campo customizado no ClickUp) e grava/atualiza a linha
  correspondente em `conferencias` com `origem = 'clickup'` e `clickup_task_id` preenchido.
- **Item novo → ClickUp**: ao cadastrar um item novo no sistema (aba Estoque), chamar a API do
  ClickUp para criar a task correspondente na lista de patrimônio, guardando o `clickup_task_id`
  de volta no item (precisa de uma coluna nova em `itens` quando for implementar).
- Essas chamadas para a API do ClickUp exigem uma chave de API que não pode ficar exposta no
  frontend — por isso elas devem rodar em uma Edge Function do Supabase (ou outro backend), nunca
  direto no navegador.
