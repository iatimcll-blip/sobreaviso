# CLAUDE.md

Guia para trabalhar neste repositório (Painel de Escalas e Sobreaviso).

## O que é

Sistema de gestão de escalas de trabalho, plantões de sobreaviso e conformidade CLT, sendo
construído em 5 fases (ver `README.md` para o status atual e o plano completo salvo em
`C:\Users\Wanderson Marcellus\.claude\plans\vast-juggling-treehouse.md`).

## Stack e convenções

- Frontend: React 19 + React Router 7 (SPA declarativa, `src/app/router.tsx`), TypeScript estrito.
- Backend: Cloudflare Workers com Hono (`server/index.ts`), banco D1 (SQLite), arquivos em R2.
- Todas as dependências são versões fixas (sem `^`/`latest`) — ao adicionar uma nova, fixe a versão
  exata resolvida.
- `shared/` não pode importar nada de `server/` ou `src/` — é código puro, sem I/O, usado dos dois
  lados (tipos, validação Zod, `shared/calculo/*`, `shared/import/*`).
- Nomes de variáveis, funções e textos de UI em português (pt-BR), consistente com o domínio do
  produto e o restante do código já escrito.

## Autenticação e autorização

- Sessão: cookie httpOnly com token opaco; o banco (`sessions`) guarda só o hash SHA-256 do token.
- Senha: PBKDF2-SHA256 via Web Crypto (`server/services/auth/hash.ts`) — Workers não tem
  bcrypt/scrypt nativos.
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

Fluxo em duas etapas, sempre: `POST /api/importacoes/:tipo/preview` (grava o arquivo bruto no R2 e
devolve prévia) → `POST /api/importacoes/:tipo/confirmar` (relê do R2, revalida, grava no D1). Nunca
persista com base só no parse feito no navegador.

## Banco de dados

- Migrations em `migrations/`, uma por fase, aplicadas via `wrangler d1 migrations apply` (não
  existe um migration runner customizado).
- D1 aplica constraints de `FOREIGN KEY` e `UNIQUE` de verdade — colunas `UNIQUE` opcionais (como
  `colaboradores.matricula`) precisam normalizar string vazia para `NULL` na validação (Zod), senão
  a segunda linha com valor vazio quebra a constraint.
- **`UNIQUE`/`INSERT OR IGNORE` não protege contra duplicidade quando as colunas da constraint podem
  ser `NULL`** (SQL trata `NULL != NULL`, ex.: `feriados.uf_sigla`/`localidade_id` em feriados
  nacionais). Nesses casos, faça uma checagem explícita antes do insert usando o operador `IS`
  (NULL-safe) em vez de `=` — ver `server/db/queries/feriados.ts::criarFeriado`.
- Consultas em `server/db/queries/*.ts`: uma função por operação, sempre mapeando `snake_case` do
  banco para `camelCase` dos tipos em `shared/types/`.

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
- Toda exportação grava uma cópia no R2 e um registro em `export_historico` **e** devolve o arquivo
  para download imediato (não é um ou outro). O download real no navegador é feito por
  `api.baixarArquivo` (`src/lib/api-client.ts`), que lê o nome do arquivo do header
  `Content-Disposition` — as outras funções de `api` (`get`/`post`/...) assumem resposta JSON e não
  servem para isso.
- O componente `<ExportButton tipo="..." filtro={...} />` (`src/components/ExportButton.tsx`) é o
  único ponto de entrada no frontend — reutilize-o em vez de implementar o download manualmente numa
  tela nova.

## Testes e verificação

- `npm run typecheck` (tsc nativo/Go — nota: `moduleResolution` precisa ser `"Bundler"`; se aparecer
  erro de `react/jsx-runtime` não encontrado, primeiro apague os `.tsbuildinfo` antes de investigar
  mais a fundo — costuma ser cache incremental corrompido, não um erro real).
- `npm run test` (Vitest) — priorize testes para `shared/calculo/*` (motor de regras, maior risco) e
  `shared/import/*`.
- Para testar a API localmente: `npm run db:migrate:local`, `npm run seed:dev`, depois
  `npm run dev:worker` (porta 8787) + `npm run dev` (porta 5173, faz proxy de `/api`).
- Ao validar autorização, sempre teste também batendo direto na API com um usuário limitado (não só
  escondendo o botão na UI) — é isso que prova que o RBAC está reforçado no servidor.
