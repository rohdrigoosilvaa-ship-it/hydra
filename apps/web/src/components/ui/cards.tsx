import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** Quadro padrão do sistema: faixa de cor no topo, título com ícone, ações à direita e conteúdo. */
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
    <div className="flex items-center gap-3 rounded-xl border border-line bg-paper-raised shadow-sm p-4 shadow-sm">
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

