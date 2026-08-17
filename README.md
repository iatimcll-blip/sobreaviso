# Painel de Escalas e Sobreaviso

Aplicação web para gestão de jornadas, escalas de trabalho, plantões de sobreaviso e conformidade
trabalhista (CLT) de equipes técnicas no Brasil.

## Stack

- **Frontend**: React 19 + React Router (SPA), Vite, TypeScript.
- **Backend**: Hono (TypeScript) rodando como função serverless Node na Vercel (`api/[[...route]].ts`).
- **Banco de dados**: Postgres no Supabase.
- **Arquivos**: Supabase Storage (planilhas importadas, exportações, anexos).
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

## Desenvolvimento local

Pré-requisitos: Node 20+, npm, um projeto Supabase (Postgres + Storage).

Crie um `.env` na raiz com:

```
DATABASE_URL=postgresql://postgres.<ref>:<senha>@aws-0-<regiao>.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key do projeto>
SUPABASE_STORAGE_BUCKET=sobreaviso-arquivos
SESSION_SECRET=dev-only-secret-nao-usar-em-producao
```

```bash
npm install

# aplica as migrations no Postgres (idempotente)
npm run db:migrate

# cria o usuário administrador local (usuário/senha padrão — troque depois)
npm run seed:dev

# terminal 1: backend (Node, mesmo código que roda na Vercel)
npm run dev:server

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
server/      app Hono — middleware (auth/RBAC), rotas, serviços (auth, cálculo, importação,
             exportação, sobreaviso), acesso a dados (Postgres via db/postgresAdapter.ts)
src/         SPA React — app/ (layout, rotas), pages/ (uma pasta por tela), lib/, components/
api/         entrypoint serverless da Vercel ([[...route]].ts), delega tudo para server/index.ts
migrations/  SQL (sintaxe compatível com SQLite e Postgres), uma migration por fase (5 no total)
scripts/     runner de migrations, seed de desenvolvimento, servidor de dev local
```

### Regras importantes

- **Autorização é sempre reforçada no servidor** (`server/middleware/rbac.ts`). O frontend só espelha
  as permissões para esconder/desabilitar UI — nunca é a barreira real.
- **Ciclo de apuração** (dia 15 → dia 14 do mês seguinte) é calculado por `shared/calculo/ciclo.ts`,
  a única fonte de verdade para essa matemática em todo o sistema.
- Administrador tem acesso total; usuários comuns têm permissões por tela (`user_permissions`),
  negadas por padrão.

## Publicação

Hospedado na Vercel (frontend estático de `npm run build` + a função serverless em
`api/[[...route]].ts`), com Postgres e Storage no Supabase. Variáveis de ambiente necessárias no
projeto Vercel: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_STORAGE_BUCKET`, `SESSION_SECRET`. As migrations (`npm run db:migrate`) rodam contra o
Postgres do Supabase antes do deploy, não fazem parte do build da Vercel.
