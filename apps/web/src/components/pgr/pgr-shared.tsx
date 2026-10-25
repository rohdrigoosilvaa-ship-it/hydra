export { SectionCard, StatTile } from "../ui/cards";
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

export type PgrTabId = "dados-gerais" | "modelo" | "ghe" | "inventario" | "plano-acoes" | "cronograma" | "finalizacao";

export const PGR_TABS: { id: PgrTabId; label: string; icon: LucideIcon }[] = [
  { id: "dados-gerais", label: "Dados gerais", icon: FileText },
  { id: "modelo", label: "Texto do documento", icon: FileText },
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
