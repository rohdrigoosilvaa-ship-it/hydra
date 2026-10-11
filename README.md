# Hydra — Fase 1

Núcleo organizacional + autenticação + PGR. Ver [`docs/hydra-arquitetura.html`](docs/hydra-arquitetura.html) para a arquitetura completa (ou o artifact publicado na conversa).

## Produção (Vercel)

- **App:** https://hydra-web-fawn.vercel.app
- **API:** https://hydra-api-omega.vercel.app (usada via proxy `/api/*` configurado em `apps/web/vercel.json` — evita cookie cross-site)
- **Time Vercel:** `hydra-sst` (conta `rohdrigoosilvaa-8040` / rohdrigoosilvaa@icloud.com), **separado** do time `protecseg` onde fica o Portal SSMA.
- Login de demonstração: `admin@hydra.local` / `hydra123` (empresa: `hydra-demo`).
- Banco: o mesmo Neon usado em dev (`DATABASE_URL` configurada como env var de produção nos dois projetos).
- `apps/api` roda como função serverless (`apps/api/api/index.ts` embrulha o Nest com `ExpressAdapter`, importando o build compilado em `dist/`). Ver `apps/api/vercel.json` para o `buildCommand` e as `routes`.
- Para redeployar após mudanças: `vercel deploy --prod --scope=hydra-sst` dentro de `apps/api` ou `apps/web` (a partir da raiz do monorepo `hydra/`, não da subpasta — o CLI precisa enxergar o `pnpm-workspace.yaml`).

## Rodando localmente

1. **Banco de dados** — crie um PostgreSQL gratuito no [neon.tech](https://neon.tech) (mesmo fluxo do Portal SSMA) e copie a connection string.
2. Copie `.env.example` para `.env` em **dois lugares** e cole a mesma `DATABASE_URL` nos dois:
   - `packages/db/.env`
   - `apps/api/.env` (também troque `JWT_ACCESS_SECRET` e `COOKIE_SECRET` por frases próprias)
3. Instale as dependências (uma vez):
   ```bash
   pnpm install
   ```
4. Crie as tabelas e gere o client Prisma:
   ```bash
   pnpm --filter @hydra/db migrate
   ```
5. Popule com um tenant de demonstração e um admin:
   ```bash
   pnpm --filter @hydra/db seed
   ```
   Login gerado: `admin@hydra.local` / `hydra123` (empresa: `hydra-demo`).
6. Suba a API (porta 3333):
   ```bash
   pnpm --filter @hydra/api dev
   ```
7. Suba o front-end (porta 5174):
   ```bash
   pnpm --filter @hydra/web dev
   ```
8. Acesse `http://localhost:5174` e entre com o login do passo 5.

## O que já funciona

- Login/logout com JWT + refresh token rotativo, com restauração de sessão após F5.
- CRUD de Empresas, Filiais, Unidades e Colaboradores, com escopo por papel (RBAC).
- PGR: criação de documento, GHE, inventário de riscos (com cálculo automático de nível) e aprovação.
- Plano de Ações unificado (Hydra Actions), hoje alimentado pelo PGR.
- Saúde Ocupacional: PCMSO (documento versionado) e exames/ASO.
- Incidentes e Acidentes: registro, investigação (5 Porquês/Ishikawa) e CAT.
- CIPA: mandatos e membros.
- LTCAT: documento versionado com aprovação e nº de ART.
- Laudos: insalubridade, periculosidade, complementar e parecer técnico.
- Previdenciário: afastamentos e índices FAP/NTEP.
- PPP: emissão por colaborador/período.
- Cockpit eSocial: eventos S-2210/2220/2221/2230/2240 com transmissão simulada (recibo) — a transmissão real ao governo exige certificado digital e integração com o webservice oficial, fora do escopo do MVP.
- HydraNET: catálogo de prestadores da empresa e solicitação de contratação. Hoje é por tenant — uma rede compartilhada entre empresas diferentes exigiria um modelo de dados público separado do isolamento por tenant, fica para uma fase futura.
- Financeiro: faturas com marcação de pagamento e total em aberto.
- CRM: leads com pipeline (Lead → Contato → Qualificação → Proposta → Negociação → Contrato → Cliente).
- Contas Médicas: lotes de prestadores com aprovação ou glosa.
- **Filtro de empresa global** (header): escolhe uma empresa e o Dashboard, Minha Empresa e Colaboradores passam a mostrar só os dados dela — persiste entre telas e recarregamentos. Cada opção do filtro já mostra colaboradores, ações atrasadas e incidentes no mês daquela empresa.
- Editar/excluir empresa (com confirmação) e editar colaborador (formulário reaproveitado entre criar/editar).
- "Ações atrasadas" agora é um número real: qualquer ação com prazo vencido e status não concluído/cancelado conta, empresa a empresa.

- Colaborador agora tem **Setor** e **Cargo** de verdade no formulário (criação e edição), com opção de criar um setor/cargo novo na hora ("+ Novo…") sem sair da tela. Setor deixou de exigir Filial/Unidade — pertence direto à Empresa, igual Cargo (a hierarquia rígida Empresa→Filial→Unidade→Setor foi simplificada porque ainda não existe tela de Filiais/Unidades, e forçar esse cadastro só para adicionar um setor não fazia sentido).

### Nota de segurança corrigida

Colaboradores tinham um gap: `PATCH`/`DELETE` de colaborador checava só a permissão do papel, não o escopo (empresa/filial/unidade) do vínculo — um `GESTOR` restrito a uma unidade conseguiria editar colaborador de outra. Corrigido em `apps/api/src/modules/org/employees.service.ts` (mesmo filtro de escopo que já existia para leitura, agora reaplicado na escrita).

## Próximo módulo (Fase 5)

Hydra BI, Hydra AI/Copilot, app mobile e automações — conforme o roadmap da seção 11 do documento de arquitetura. Essa é a última fase do roadmap original.
