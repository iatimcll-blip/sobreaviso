# CLAUDE.md

Guia para trabalhar neste repositório (Painel de Escalas e Sobreaviso).

## O que é

Sistema de gestão de escalas de trabalho, plantões de sobreaviso e conformidade CLT, sendo
construído em 5 fases (ver `README.md` para o status atual e o plano completo salvo em
`C:\Users\Wanderson Marcellus\.claude\plans\vast-juggling-treehouse.md`).

## Stack e convenções

- Frontend: React 19 + React Router 7 (SPA declarativa, `src/app/router.tsx`), TypeScript estrito.
- Backend: Hono (`server/index.ts`) hospedado na Vercel — runtime Node, **não** Edge (o driver
  Postgres precisa de socket TCP). `server/vercelHandler.ts` é o entrypoint real; `scripts/build-api.mjs`
  (esbuild) pré-compila ele pra `api/index.js` (CommonJS, ver nota abaixo) antes do deploy —
  **nunca edite `api/index.js` direto, é gerado**. `vercel.json` tem um rewrite mapeando
  `/api/*` pra essa função (nome de arquivo com colchetes tipo `[...route]` é convenção do
  Next.js, não funciona em projetos "outro framework"). Banco Postgres no Supabase, arquivos no
  Supabase Storage. `c.env.DB`/`c.env.BUCKET` continuam com a mesma superfície de sempre
  (`prepare/bind/all/first/run`, `put/get`) através dos adaptadores em `server/db/postgresAdapter.ts`
  e `server/lib/supabaseStorageAdapter.ts` — ao mexer numa rota ou query existente, trate
  `db`/`bucket` exatamente como antes, sem se preocupar com o backend real.
- O bundle da API é CommonJS de propósito: a lib `xlsx` faz `require()` dinâmico de módulos nativos
  do Node em runtime, o que não funciona no shim de `require` que o esbuild gera pra bundles ESM.
  `api/package.json` (`{"type":"commonjs"}`) força isso mesmo com o resto do projeto sendo ESM.
  Além disso, o build da Vercel **não roda bem com `typescript@7.0.2`** (a reescrita nativa/Go) pra
  analisar arquivos `.ts` dentro de `/api` — por isso o pré-build gera JS puro, e a Vercel nunca
  precisa tocar em TypeScript ali.
- Todas as dependências são versões fixas (sem `^`/`latest`) — ao adicionar uma nova, fixe a versão
  exata resolvida.
- `shared/` não pode importar nada de `server/` ou `src/` — é código puro, sem I/O, usado dos dois
  lados (tipos, validação Zod, `shared/calculo/*`, `shared/import/*`).
- Nomes de variáveis, funções e textos de UI em português (pt-BR), consistente com o domínio do
  produto e o restante do código já escrito.

## Autenticação e autorização

- Sessão: cookie httpOnly com token opaco; o banco (`sessions`) guarda só o hash SHA-256 do token.
- Senha: PBKDF2-SHA256 via Web Crypto (`server/services/auth/hash.ts`) — mantido mesmo fora do
  Workers (o motivo original) porque `crypto.subtle` já é nativo no runtime Node da Vercel também;
  não há necessidade de trocar para bcrypt/scrypt.
- RBAC: `server/middleware/rbac.ts` é a única fonte de decisão de autorização. Administrador tem
  acesso total (hard-coded). Usuário comum depende de `user_permissions` (por tela, negado por
  padrão se não houver registro). O frontend (`src/lib/permissions.ts`) espelha o mesmo mapa
  (`CAMPO_POR_ACAO` em `shared/types/permissao.ts`) só para esconder/desabilitar UI — **nunca**
  trate isso como a barreira real ao adicionar uma tela nova.
- Toda rota de mutação registra em `auditoria` via `server/db/queries/auditoria.ts`.

## Ciclo de apuração

`shared/calculo/ciclo.ts::getCiclo(data)` é a única função que deve calcular a que ciclo (15 do mês
→ 14 do mês seguinte) uma data pertence. Não recalcule esses limites em outro lugar — importe e
reutilize essa função (e `diasDoCiclo`/`dataNoCiclo`/`cicloAdjacente`/`formatarPeriodoCiclo`).

## Importação de planilhas

O motor é genérico e reaproveitável: `shared/import/contract.ts` define `ImportadorDefinicao<T>`,
`shared/import/executarImportacao.ts` é o engine puro (usado tanto na prévia quanto na confirmação
autoritativa no servidor), e cada tipo de importação (ex.: `colaboradoresDefinicao.ts`) só declara
aba/colunas/parser/chave de duplicidade. Ao adicionar um novo tipo de importação (ex.: feriados na
Fase 3), siga esse mesmo padrão em vez de duplicar lógica de parsing.

Fluxo em duas etapas, sempre: `POST /api/importacoes/:tipo/preview` (grava o arquivo bruto no
Supabase Storage e devolve prévia) → `POST /api/importacoes/:tipo/confirmar` (relê do Storage,
revalida, grava no Postgres). Nunca persista com base só no parse feito no navegador.

## Banco de dados

- Postgres no Supabase. Migrations em `migrations/`, uma por fase, aplicadas via `npm run
  db:migrate` (`scripts/migrate.ts`, idempotente — registra o que já rodou numa tabela
  `_migrations`, não existe mais o runner do `wrangler d1`).
- **SQL é escrito em sintaxe SQLite-compatível de propósito** (placeholders `?`, sem `$1`/`$2`) —
  `server/db/postgresAdapter.ts` traduz os placeholders e mantém a mesma superfície D1 (`.meta.last_row_id`
  via `RETURNING id` sintético). Ao escrever uma query nova, ainda assim tome cuidado com sintaxe
  que SQLite tolera e Postgres não: `datetime('now')` funciona (função de compatibilidade criada na
  migration 0001), mas `date('now')` **não** — colide com o cast nativo do Postgres; use
  `to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD')` diretamente. `INSERT OR IGNORE` também não
  existe — use `ON CONFLICT ... DO NOTHING`.
- Postgres aplica constraints de `FOREIGN KEY` e `UNIQUE` de verdade (como o D1 antes) — colunas
  `UNIQUE` opcionais (como `colaboradores.matricula`) precisam normalizar string vazia para `NULL`
  na validação (Zod), senão a segunda linha com valor vazio quebra a constraint. Diferente do
  SQLite, o Postgres também **valida a existência da tabela referenciada no momento do
  `CREATE TABLE`/`ALTER TABLE`** — ao criar uma migration nova com referência circular entre
  tabelas, crie a FK problemática só depois via `ALTER TABLE ... ADD CONSTRAINT` (ver o padrão
  `equipes`/`colaboradores` na migration 0001).
- **`UNIQUE` não protege contra duplicidade quando as colunas da constraint podem ser `NULL`** (SQL
  trata `NULL != NULL`, ex.: `feriados.uf_sigla`/`localidade_id` em feriados nacionais). Nesses
  casos, faça uma checagem explícita antes do insert usando `IS NOT DISTINCT FROM` (equivalente
  Postgres do `IS` NULL-safe do SQLite) em vez de `=` — ver `server/db/queries/feriados.ts::criarFeriado`.
- Consultas em `server/db/queries/*.ts`: uma função por operação, sempre mapeando `snake_case` do
  banco para `camelCase` dos tipos em `shared/types/`.
- O client Postgres (`server/db/postgresAdapter.ts`) usa `prepare: false` — o "Transaction pooler"
  do Supabase não garante a mesma conexão física entre idas ao servidor, e prepared statements
  (padrão do driver `postgres`) travam/falham de forma imprevisível nesse modo. Não reative sem
  motivo forte.

## Validação de entrada nas rotas

**Sempre importe `validar` de `server/middleware/validar.ts`, nunca `zValidator` direto de
`@hono/zod-validator`.** O `zValidator` puro responde no próprio formato
(`{success:false, error:{...}}`) quando a validação falha, sem passar pelo
`server/middleware/errorHandler.ts` — o cliente não reconhece esse formato e cai na mensagem
genérica de erro, escondendo qual campo era inválido. O wrapper `validar` já devolve
`{erro, detalhes}`, consistente com o resto da API.

## Motor de cálculo CLT e Inconsistências (Fase 4)

- `shared/calculo/jornada.ts::resolverTurnosDoPeriodo` materializa os turnos concretos (data +
  horário) de um colaborador num período, a partir das escalas vinculadas a ele — direto, pela
  equipe ou pela localidade (nessa ordem de prioridade). `server/db/queries/escalas.ts::listarAtribuicoesDoColaborador`
  monta a entrada para essa função.
- Toda a lógica de detecção de inconsistências vive em `shared/calculo/inconsistencias/*.ts` —
  funções puras, uma por regra, orquestradas por `executarRegrasColaborador` (por colaborador) e
  `detectarDuplaIncompleta` (por dupla, não é escopado por colaborador). O único lugar que toca o
  banco é `server/services/calculo/executarCalculoCiclo.ts`.
- `shared/calculo/geradorEscala.ts::gerarTurnosAutomaticos` gera os turnos de um modelo 5x2/6x1/12x36/4x2
  a partir de horário de entrada + duração da jornada, reaplicando os **mesmos** limiares de
  `shared/calculo/inconsistencias/jornada.ts` (interjornada, intrajornada graduado, jornada máxima,
  12h fixas do 12x36) — não duplique o número mágico, importe/replique a mesma lógica de limite pra
  não gerar um padrão que o motor de detecção vá acusar em seguida. Não cobre `personalizada` (cada
  dia pode ter horário diferente) nem feriados/afastamentos — isso é responsabilidade do vínculo
  colaborador↔escala numa data real, já coberta por `afastamentosFeriados.ts`, não do modelo cíclico
  em si (`cicloDia`, sem data absoluta).
- Persistência é upsert por chave natural (`tipo`, `colaboradorId`, `equipeId`, `dataReferencia`):
  o que já foi revisado por um humano (`STATUS_REVISADOS`) nunca é sobrescrito; o que não foi
  redetectado numa nova execução vira `corrigida` automaticamente. Ao adicionar uma regra nova, não
  escreva no banco diretamente — devolva `InconsistenciaDetectada[]` e deixe o orquestrador cuidar
  da conciliação.

## Exportação (Fase 5)

- `server/services/export/geradores.ts` tem uma função por tipo de exportação (8 no total,
  `shared/types/exportacao.ts::TIPOS_EXPORTACAO`), todas recebendo o mesmo `FiltroRelatorio`
  (`ciclo`/`colaboradorId`/`equipeId`/`ufSigla`/`localidadeId`) — ao adicionar um filtro novo em
  alguma tela, propague-o nesse tipo compartilhado em vez de criar um formato paralelo.
- `server/services/export/xlsxExportService.ts::gerarPlanilha` monta o workbook a partir de arrays
  de objetos simples (`Record<string, string|number>`, chaves = cabeçalho da coluna em português) —
  não crie uma camada de definição de colunas como a de importação, não é necessária aqui.
- Toda exportação grava uma cópia no Supabase Storage e um registro em `export_historico` **e** devolve o arquivo
  para download imediato (não é um ou outro). O download real no navegador é feito por
  `api.baixarArquivo` (`src/lib/api-client.ts`), que lê o nome do arquivo do header
  `Content-Disposition` — as outras funções de `api` (`get`/`post`/...) assumem resposta JSON e não
  servem para isso.
- O componente `<ExportButton tipo="..." filtro={...} />` (`src/components/ExportButton.tsx`) é o
  único ponto de entrada no frontend — reutilize-o em vez de implementar o download manualmente numa
  tela nova.

## Testes e verificação

- `npm run typecheck` (tsc nativo/Go — nota: `moduleResolution` precisa ser `"Bundler"`; se aparecer
  erro de tipo que não bate com uma edição recente (ex.: `react/jsx-runtime` não encontrado, ou um
  campo que você acabou de adicionar a uma interface "não existe"), primeiro apague os
  `*.tsbuildinfo` antes de investigar mais a fundo — costuma ser cache incremental corrompido, não
  um erro real).
- `npm run test` (Vitest) — priorize testes para `shared/calculo/*` (motor de regras, maior risco) e
  `shared/import/*`.
- Para testar a API localmente: copie `.env.example` (se existir) para `.env` com `DATABASE_URL`,
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `SESSION_SECRET` — depois
  `npm run db:migrate`, `npm run seed:dev`, `npm run dev:server` (porta 8787, roda com `tsx watch`,
  sem depender de wrangler) + `npm run dev` (porta 5173, faz proxy de `/api`). No Windows, se o
  `dev:server` parecer travado numa porta já em uso depois de editar um arquivo, o `tsx watch` às
  vezes não mata o processo filho anterior — confira `netstat -ano | grep :8787` e finalize o PID
  antigo manualmente antes de reiniciar.
- Ao validar autorização, sempre teste também batendo direto na API com um usuário limitado (não só
  escondendo o botão na UI) — é isso que prova que o RBAC está reforçado no servidor.
