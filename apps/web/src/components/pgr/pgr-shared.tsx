import type { ReactNode } from "react";
import { CalendarRange, ClipboardList, FileText, FlagTriangleRight, Layers, ShieldAlert, type LucideIcon } from "lucide-react";

export function naOrValue(v: string | null | undefined) {
  return v && v.trim() ? v : "Não informado";
}

export function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={value && value.trim() ? "text-ink" : "text-ink-muted"}>{naOrValue(value)}</p>
    </div>
  );
}

/** Quadro padrão das telas do PGR: título com ícone, ações à direita e conteúdo. */
export function SectionCard({
  title,
  subtitle,
  icon: Icon,
  actions,
  children,
  accent = "bg-teal",
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-paper-raised shadow-sm">
      <div className={`h-1 ${accent}`} />
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-tint text-teal-deep">
              <Icon size={18} />
            </span>
          )}
          <div>
            <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="px-5 pb-5 pt-4">{children}</div>
    </section>
  );
}

const TONES = {
  teal: "bg-teal-tint text-teal-deep",
  amber: "bg-amber-tint text-amber",
  danger: "bg-danger-tint text-danger",
  neutral: "bg-line text-ink-muted",
} as const;

/** Indicador grande (número + rótulo) para os resumos do topo das telas. */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "teal",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-paper-raised p-4 shadow-sm">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-2xl font-semibold leading-none text-ink tabular-nums">{value}</p>
        <p className="mt-1 truncate text-xs font-medium text-ink-muted">{label}</p>
        {hint && <p className="truncate text-[11px] text-ink-muted">{hint}</p>}
      </div>
    </div>
  );
}

export function PgrProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Progresso do PGR</p>
        <p className="font-display text-sm font-semibold text-teal-deep tabular-nums">{clamped}%</p>
      </div>
      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-gradient-to-r from-teal to-teal-deep transition-all" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

export type PgrTabId = "dados-gerais" | "ghe" | "inventario" | "plano-acoes" | "cronograma" | "finalizacao";

export const PGR_TABS: { id: PgrTabId; label: string; icon: LucideIcon }[] = [
  { id: "dados-gerais", label: "Dados gerais", icon: FileText },
  { id: "ghe", label: "GHE", icon: Layers },
  { id: "inventario", label: "Inventário de riscos", icon: ShieldAlert },
  { id: "plano-acoes", label: "Plano de ações", icon: ClipboardList },
  { id: "cronograma", label: "Cronograma", icon: CalendarRange },
  { id: "finalizacao", label: "Finalização", icon: FlagTriangleRight },
];

/** Etapas do PGR em abas numeradas: dá para ver em que passo se está e navegar entre eles. */
export function PgrTabNav({ active, onChange }: { active: PgrTabId; onChange: (id: PgrTabId) => void }) {
  return (
    <nav aria-label="Etapas do PGR" className="mt-5 flex gap-2 overflow-x-auto pb-1">
      {PGR_TABS.map((tab, index) => {
        const on = active === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={on ? "step" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors ${
              on
                ? "border-teal bg-teal text-white shadow-sm"
                : "border-line bg-paper-raised text-ink-muted hover:border-teal/50 hover:text-ink"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] ${
                on ? "bg-white/20 text-white" : "bg-line text-ink-muted"
              }`}
            >
              {index + 1}
            </span>
            <Icon size={15} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
