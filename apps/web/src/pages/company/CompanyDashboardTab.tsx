import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  Boxes,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileEdit,
  FileText,
  HeartPulse,
  Home,
  Radio,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { api } from "../../lib/api";
import { LineChart, BigNumber, DashCard } from "../../components/ui/dash";
import type { Company, CompanySummary } from "../../lib/types";
import type { CompanyWorkspaceContext } from "./CompanyWorkspacePage";

const nf = new Intl.NumberFormat("pt-BR");
const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "—" : nf.format(n));
const sum = (points: { value: number }[] | undefined) => (points ?? []).reduce((total, p) => total + p.value, 0);

const COMPANY_REQUIRED: [keyof Company, string][] = [
  ["legalName", "razão social"],
  ["cnpj", "CNPJ"],
  ["cnae", "CNAE"],
  ["grauRisco", "grau de risco"],
  ["endereco", "endereço"],
  ["cidade", "cidade"],
];

/** Visão geral da empresa: andamento do PGR, indicadores e o que precisa de atenção. */
export function CompanyDashboardTab() {
  const { company, search, edit } = useOutletContext<CompanyWorkspaceContext>();
  const [summary, setSummary] = useState<CompanySummary | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    api.get<CompanySummary>(`/companies/${company.id}/summary`).then(setSummary).catch(() => setSummary(null));
  }, [company.id]);

  const empty = Array.from({ length: 6 }, (_, i) => ({ label: ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN"][i]!, value: 0 }));
  const asos = summary?.asosByMonth ?? empty;
  const cats = summary?.catsByMonth ?? empty;
  const pgr = summary?.pgr ?? null;
  const pgrLink = pgr ? `/pgr/${pgr.id}` : "/pgr";

  const actionsTotal = summary?.actions.total ?? 0;
  const actionsOpen = summary?.actions.open ?? 0;
  const drafts = summary?.draftDocuments ?? 0;

  const tiles: { label: string; value: ReactValue; hint: string; icon: LucideIcon; tone: "teal" | "amber" | "danger" | "neutral"; big?: boolean }[] = [
    { label: "Eventos eSocial", value: fmt(summary?.esocialEventsRecent), hint: "Nos últimos 6 meses", icon: Radio, tone: "teal" },
    { label: "Funcionários afastados", value: fmt(summary?.absentEmployees), hint: "Atualmente afastados", icon: UserX, tone: "teal" },
    { label: drafts === 1 ? "Documento em rascunho" : "Documentos em rascunho", value: fmt(drafts), hint: "Aguardando finalização", icon: FileEdit, tone: "teal" },
    {
      label: "Plano de ação",
      value: actionsTotal === 0 ? "Não iniciado" : actionsOpen > 0 ? `${actionsOpen} em aberto` : "Concluído",
      hint: actionsTotal === 0 ? "Nenhuma ação cadastrada" : `${actionsTotal} ${actionsTotal === 1 ? "ação cadastrada" : "ações cadastradas"}`,
      icon: ClipboardCheck,
      tone: actionsTotal === 0 || actionsOpen > 0 ? "amber" : "teal",
      big: true,
    },
  ];
  const TONE = { teal: "bg-teal-tint text-teal-deep", amber: "bg-amber-tint text-amber", danger: "bg-danger-tint text-danger", neutral: "bg-line text-ink-muted" };

  const missing = COMPANY_REQUIRED.filter(([key]) => !company[key]).map(([, label]) => label);
  const follow: { key: string; icon: LucideIcon; title: string; badge?: string; text: string; action: string; to?: string; onClick?: () => void }[] = [];
  if (missing.length > 0) {
    follow.push({
      key: "dados",
      icon: Building2,
      title: "Completar dados da empresa",
      badge: "Pendente",
      text: `Falta preencher: ${missing.join(", ")}. Complete as informações para avançar com o PGR e as demais funcionalidades.`,
      action: "Editar empresa",
      onClick: edit,
    });
  }
  if (drafts > 0) {
    follow.push({
      key: "rascunho",
      icon: FileText,
      title: "Revisar documento em rascunho",
      badge: `${drafts} ${drafts === 1 ? "documento" : "documentos"}`,
      text: `Existe${drafts === 1 ? "" : "m"} ${drafts} ${drafts === 1 ? "documento" : "documentos"} em rascunho que aguarda${drafts === 1 ? "" : "m"} sua revisão e finalização.`,
      action: "Abrir documento",
      to: pgrLink,
    });
  }
  if (summary && !pgr) {
    follow.push({ key: "pgr", icon: FileText, title: "Criar o PGR da empresa", text: "Ainda não há PGR para esta empresa. Comece o preenchimento para manter a gestão de SST em dia.", action: "Criar PGR", to: "/pgr" });
  }
  if (summary && summary.environments === 0) {
    follow.push({ key: "amb", icon: Home, title: "Cadastrar ambientes", text: "Nenhum ambiente foi cadastrado. Eles organizam por onde cada cargo transita.", action: "Cadastrar", to: "../ambientes" });
  }
  if (summary && summary.positions === 0) {
    follow.push({ key: "cargos", icon: Boxes, title: "Cadastrar cargos", text: "Nenhum cargo foi cadastrado para esta empresa.", action: "Adicionar cargo", to: "../ghe" });
  }

  const q = search.trim().toLowerCase();
  if (q) {
    const found = [
      { label: "Vidas", value: fmt(summary?.lives) },
      { label: "Cargos / GHE", value: summary ? `${fmt(summary.positions)} / ${fmt(summary.ghes)}` : "—" },
      { label: "ASOs emitidos", value: String(sum(asos)) },
      { label: "CATs registradas", value: String(sum(cats)) },
      ...tiles.map((t) => ({ label: t.label, value: String(t.value) })),
    ].filter((t) => t.label.toLowerCase().includes(q));
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {found.map((t) => (
          <DashCard key={t.label}>
            <p className="text-xs text-ink-muted">{t.label}</p>
            <BigNumber value={t.value} className="mt-2 text-3xl text-ink" />
          </DashCard>
        ))}
        {found.length === 0 && <p className="text-sm text-ink-muted">Nenhum indicador encontrado para “{search}”.</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-extrabold text-ink">Visão geral da empresa</h2>
          <p className="mt-1 text-sm text-ink-muted">Acompanhe o PGR, os riscos e as ações de SST.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={pgrLink} className="btn-primary flex items-center gap-1.5 px-5 py-3 font-semibold">
            {pgr ? "Continuar PGR" : "Abrir PGR"} <ChevronRight size={16} />
          </Link>
          <div className="relative">
            <button className="btn-secondary flex items-center gap-1.5 bg-paper-raised px-4 py-3" onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen}>
              Mais ações <ChevronDown size={15} />
            </button>
            {moreOpen && (
              <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-line bg-paper-raised py-1 text-sm shadow-lg" onMouseLeave={() => setMoreOpen(false)}>
                <button className="w-full px-3 py-2 text-left text-ink hover:bg-teal-tint" onClick={() => { setMoreOpen(false); edit(); }}>Editar empresa</button>
                <Link className="block px-3 py-2 text-ink hover:bg-teal-tint" to="../ambientes">Ambientes</Link>
                <Link className="block px-3 py-2 text-ink hover:bg-teal-tint" to="../ghe">GHE / Cargos</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PGR em andamento */}
      <DashCard className="flex flex-wrap items-center gap-5 !p-4 sm:!px-6">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-tint text-teal-deep">
          <FileText size={24} />
        </span>
        {pgr ? (
          <>
            <div className="min-w-[200px]">
              <p className="font-display text-lg font-bold text-ink">{pgr.status === "APPROVED" ? "PGR aprovado" : "PGR em andamento"}</p>
              <p className="text-sm text-ink-muted">{pgr.status === "APPROVED" ? "O PGR desta empresa está finalizado." : "Continue o preenchimento para concluir seu PGR."}</p>
            </div>
            <div className="min-w-[260px] flex-1">
              <div className="flex items-center gap-3">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pgr.percent} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-teal" style={{ width: `${pgr.percent}%` }} />
                </div>
                <span className="font-display text-sm font-semibold text-teal-deep">{pgr.percent}%</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
                {pgr.lastDone && (
                  <span className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal text-white"><Check size={14} /></span>
                    <span><span className="block font-medium text-ink">{pgr.lastDone}</span><span className="text-xs text-ink-muted">Concluído</span></span>
                  </span>
                )}
                {pgr.next && (
                  <span className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full border-2 border-line" />
                    <span><span className="block font-medium text-ink">{pgr.next}</span><span className="text-xs text-ink-muted">Próxima etapa</span></span>
                  </span>
                )}
              </div>
            </div>
            <Link to={pgrLink} className="btn-primary flex items-center gap-1.5 px-6 py-3.5 font-semibold">
              Continuar de onde parou <ChevronRight size={16} />
            </Link>
          </>
        ) : (
          <>
            <div className="min-w-[200px] flex-1">
              <p className="font-display text-lg font-bold text-ink">Nenhum PGR iniciado</p>
              <p className="text-sm text-ink-muted">Crie o PGR desta empresa para acompanhar o andamento por aqui.</p>
            </div>
            <Link to="/pgr" className="btn-primary flex items-center gap-1.5 px-6 py-3.5 font-semibold">
              Criar PGR <ChevronRight size={16} />
            </Link>
          </>
        )}
      </DashCard>

      {/* vidas + gráficos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)]">
        <div className="flex flex-col gap-4">
          <section className="rounded-2xl bg-teal-deep p-5 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Vidas</p>
              <HeartPulse size={20} className="opacity-80" />
            </div>
            <BigNumber value={fmt(summary?.lives)} className="mt-3 text-5xl" />
            <p className="mt-3 text-sm opacity-90">
              {summary?.contractedLives != null
                ? `${fmt(summary.contractedLives)} contratadas${(summary.excessLives ?? 0) > 0 ? ` · ${fmt(summary.excessLives)} excedentes` : ""}`
                : "Vidas contratadas não informadas"}
            </p>
          </section>
          <DashCard>
            <p className="text-sm font-semibold text-ink-muted">Cargos / GHE</p>
            <div className="mt-1 flex items-center justify-between">
              <BigNumber value={summary ? fmt(summary.positions) : "—"} dim={summary ? ` / ${fmt(summary.ghes)}` : undefined} className="text-4xl text-ink" />
              <Boxes className="text-teal-deep" size={34} />
            </div>
          </DashCard>
        </div>

        <DashCard>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold text-ink">ASOs emitidos</h3>
              <p className="text-sm text-ink-muted">Últimos 6 meses</p>
            </div>
            <span className="flex items-center gap-2 font-display text-3xl font-semibold text-ink"><FileText size={22} className="text-teal-deep" />{sum(asos)}</span>
          </div>
          <div className="mt-3">
            <LineChart data={asos} icon={<FileText size={18} />} emptyTitle="Nenhum registro no período" emptyHint="Não há ASOs emitidos nos últimos 6 meses." />
          </div>
        </DashCard>

        <DashCard>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold text-ink">CATs registradas</h3>
              <p className="text-sm text-ink-muted">Últimos 6 meses</p>
            </div>
            <span className="flex items-center gap-2 font-display text-3xl font-semibold text-ink"><FileText size={22} className="text-teal-deep" />{sum(cats)}</span>
          </div>
          <div className="mt-3">
            <LineChart data={cats} icon={<FileText size={18} />} emptyTitle="Nenhum registro no período" emptyHint="Não há CATs registradas nos últimos 6 meses." />
          </div>
        </DashCard>
      </div>

      {/* indicadores */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(({ label, value, hint, icon: Icon, tone, big }) => (
          <DashCard key={label} className="flex items-center gap-4 !p-4">
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${TONE[tone]}`}>
              <Icon size={24} />
            </span>
            <div className="min-w-0">
              {big ? (
                <>
                  <p className="text-xs text-ink-muted">{label}</p>
                  <p className={`font-display text-2xl font-extrabold ${tone === "amber" ? "text-amber" : "text-teal-deep"}`}>{value}</p>
                </>
              ) : (
                <>
                  <BigNumber value={value} className="text-3xl text-ink" />
                  <p className="mt-1 text-sm font-semibold text-ink">{label}</p>
                </>
              )}
              <p className="text-xs text-ink-muted">{hint}</p>
            </div>
          </DashCard>
        ))}
      </div>

      {/* acompanhar agora */}
      <div>
        <h3 className="font-display text-2xl font-extrabold text-ink">Acompanhar agora</h3>
        <p className="text-sm text-ink-muted">Pendências e próximas etapas para manter a gestão de SST em dia.</p>
        <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {follow.length === 0 && summary && (
            <DashCard className="flex items-center gap-3 text-sm text-ink-muted xl:col-span-2">
              <Check size={18} className="text-teal" /> Tudo em dia por aqui.
            </DashCard>
          )}
          {follow.slice(0, 4).map(({ key, icon: Icon, title, badge, text, action, to, onClick }) => (
            <DashCard key={key} className="flex items-center gap-4 !p-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-tint text-amber"><Icon size={24} /></span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                  {title}
                  {badge && <span className="rounded-full bg-amber-tint px-2 py-0.5 text-[11px] font-semibold text-amber">{badge}</span>}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">{text}</p>
              </div>
              {to ? (
                <Link to={to} className="flex shrink-0 items-center gap-1 rounded-lg border border-teal px-3 py-2 text-sm font-semibold text-teal-deep hover:bg-teal-tint">
                  {action} <ChevronRight size={14} />
                </Link>
              ) : (
                <button type="button" onClick={onClick} className="flex shrink-0 items-center gap-1 rounded-lg border border-teal px-3 py-2 text-sm font-semibold text-teal-deep hover:bg-teal-tint">
                  {action} <ChevronRight size={14} />
                </button>
              )}
            </DashCard>
          ))}
        </div>
      </div>
    </div>
  );
}

type ReactValue = string;
