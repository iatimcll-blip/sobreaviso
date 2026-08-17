# Painel de Escalas e Sobreaviso

Aplicação web para gestão de jornadas, escalas de trabalho, plantões de sobreaviso e conformidade
trabalhista (CLT) de equipes técnicas no Brasil.

## Stack

- **Frontend**: React 19 + React Router (SPA), Vite, TypeScript.
- **Backend**: Cloudflare Workers (Hono), TypeScript.
- **Banco de dados**: Cloudflare D1 (SQLite).
- **Arquivos**: Cloudflare R2 (planilhas importadas, exportações, anexos).
- **Autenticação**: usuário/senha com sessão em cookie httpOnly (PBKDF2 via Web Crypto).

Código de domínio compartilhado entre frontend e backend vive em `shared/` (tipos, validação Zod,
motor de cálculo do ciclo de apuração, motor de importação de planilhas).

## Status

Projeto construído em 5 fases — **todas concluídas**. Veja o plano completo em
`C:\Users\Wanderson Marcellus\.claude\plans\vast-juggling-treehouse.md`.

- ✅ **Fase 1** — Fundação (auth, RBAC, 6 rotas, layout) + Colaboradores (CRUD + importação de planilha).
- ✅ **Fase 2** — Escalas (modelos 5x2/6x1/12x36/4x2/personalizada, turnos, vínculos, duplicação) + Sobreaviso (lançamento manual, detecção de conflito, regras de rodízio automático) + Equipes/Duplas.
- ✅ **Fase 3** — Localidades (CRUD completo) + Feriados (nacionais automáticos via cálculo de Páscoa, cadastro manual e importação estadual/municipal) + Afastamentos (lançamento com detecção de conflito de escala/sobreaviso, aprovação, anexo de documento).
- ✅ **Fase 4** — Motor de cálculo CLT (horas previstas/trabalhadas/extras/noturnas/banco de horas, ciclo materializado a partir das escalas) + as 11 regras de Inconsistências (interjornada, intrajornada, jornada máxima, 12x36 irregular, descanso semanal, sobreposições, afastamento/feriado, cadastro/dupla incompletos) com fluxo revisar→justificar/aprovar/corrigir e parâmetros CLT configuráveis.
- ✅ **Fase 5** — Exportação Excel (8 tipos: colaboradores, escalas, sobreavisos, afastamentos, inconsistências, horas trabalhadas, banco de horas, relatório consolidado multi-aba) respeitando filtros e ciclo, sempre com cópia em R2 (`export_historico`) + download imediato. Dashboard 100% com dados reais, incluindo o gráfico de horas planejadas × realizadas por semana.

**Pendência para publicação real**: `.openai/hosting.json` ainda tem `d1`/`r2` como `null` — a
plataforma de hospedagem precisa provisionar esses bindings antes do primeiro deploy (fora do
alcance do código deste repositório).

## Desenvolvimento local

Pré-requisitos: Node 20+, npm.

```bash
npm install

# aplica o schema no banco D1 local
npm run db:migrate:local

# cria o usuário administrador local (usuário/senha padrão — troque depois)
npm run seed:dev

# terminal 1: backend (Worker + D1/R2 emulados localmente)
npm run dev:worker

# terminal 2: frontend (Vite, proxy /api -> :8787)
npm run dev
```

Acesse `http://localhost:5173`.

### Outros comandos

```bash
npm run typecheck   # tsc --noEmit no frontend e no backend
npm run test         # Vitest (shared/calculo, shared/import)
npm run build         # build de produção (client + worker)
```

## Estrutura

```
shared/      tipos, validação Zod, constantes, motor de cálculo CLT (ciclo, jornada, inconsistências,
             hora noturna, banco de horas), motor de importação de planilhas
server/      Worker Hono — middleware (auth/RBAC), rotas, serviços (auth, cálculo, importação,
             exportação, sobreaviso), acesso a dados (D1)
src/         SPA React — app/ (layout, rotas), pages/ (uma pasta por tela), lib/, components/
migrations/  SQL do D1, uma migration por fase (5 no total)
scripts/     build do worker, seed de desenvolvimento
```

### Regras importantes

- **Autorização é sempre reforçada no servidor** (`server/middleware/rbac.ts`). O frontend só espelha
  as permissões para esconder/desabilitar UI — nunca é a barreira real.
- **Ciclo de apuração** (dia 15 → dia 14 do mês seguinte) é calculado por `shared/calculo/ciclo.ts`,
  a única fonte de verdade para essa matemática em todo o sistema.
- Administrador tem acesso total; usuários comuns têm permissões por tela (`user_permissions`),
  negadas por padrão.

## Publicação

O build (`npm run build`) gera `dist/` (assets estáticos) e `dist/server/index.js` (Worker
empacotado), no formato esperado pela plataforma de hospedagem já configurada em
`.openai/hosting.json`. Os bindings de D1 e R2 dessa plataforma ainda não foram provisionados
(`d1`/`r2` estão `null`) — isso precisa ser feito antes do primeiro deploy real.
