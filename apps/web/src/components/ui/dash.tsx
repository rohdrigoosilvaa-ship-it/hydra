import { useId, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { MonthPoint } from "../../lib/types";

/** Quadro arredondado dos dashboards (fundo branco, sem a faixa do topo dos outros quadros). */
export function DashCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-line bg-paper-raised p-5 shadow-sm ${className}`}>{children}</section>;
}

export function DashCardHeader({ title, subtitle, to, right }: { title: string; subtitle?: string; to?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-sm font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
      </div>
      {right}
      {to && (
        <Link to={to} aria-label={`Abrir ${title}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper text-ink-muted transition-colors hover:bg-teal-tint hover:text-ink">
          <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}

/** Número grande; o complemento (ex.: "/ 34", "%") fica apagado. */
export function BigNumber({ value, dim, className = "text-4xl" }: { value: ReactNode; dim?: ReactNode; className?: string }) {
  return (
    <p className={`font-display font-semibold leading-none tabular-nums ${className}`}>
      {value}
      {dim !== undefined && <span className="text-[0.5em] font-medium opacity-45">{dim}</span>}
    </p>
  );
}

export function Badge({ children, tone = "teal" }: { children: ReactNode; tone?: "teal" | "amber" | "danger" | "neutral" }) {
  const styles = {
    teal: "bg-teal text-white",
    amber: "bg-amber-tint text-amber",
    danger: "bg-danger-tint text-danger",
    neutral: "bg-line text-ink-muted",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[tone]}`}>{children}</span>;
}

/** Gráfico de barras em pílula, com listras; a maior barra é destacada em verde escuro. */
export function BarChart({ data, unit = "" }: { data: MonthPoint[]; unit?: string }) {
  const id = useId().replace(/:/g, "");
  const W = 600;
  const H = 250;
  const padL = 34;
  const padB = 28;
  const padT = 34;
  const max = Math.max(1, ...data.map((d) => d.value));
  const niceMax = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const plotH = H - padT - padB;
  const slot = (W - padL) / data.length;
  const barW = Math.min(52, slot * 0.62);
  const topIndex = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0);
  const ticks = [0, 1, 2, 3, 4].map((i) => (niceMax / 4) * i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Gráfico de barras por mês">
      <defs>
        <pattern id={`hatch-${id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" style={{ fill: "var(--teal)", opacity: 0.38 }} />
          <line x1="0" y1="0" x2="0" y2="6" strokeWidth="2" style={{ stroke: "var(--teal-deep)", opacity: 0.22 }} />
        </pattern>
      </defs>
      {ticks.map((t) => {
        const y = padT + plotH - (t / niceMax) * plotH;
        return (
          <g key={t}>
            <line x1={padL} x2={W} y1={y} y2={y} strokeDasharray="4 5" style={{ stroke: "var(--line)" }} />
            <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" style={{ fill: "var(--ink-muted)" }}>
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = Math.max(d.value > 0 ? 14 : 0, (d.value / niceMax) * plotH);
        const x = padL + slot * i + (slot - barW) / 2;
        const y = padT + plotH - h;
        const top = i === topIndex && d.value > 0;
        return (
          <g key={`${d.label}-${i}`}>
            {h > 0 && (
              <rect x={x} y={y} width={barW} height={h} rx={barW / 2} style={{ fill: top ? "var(--teal-deep)" : `url(#hatch-${id})` }}>
                <title>{`${d.label}: ${d.value}${unit}`}</title>
              </rect>
            )}
            {top && (
              <g>
                <rect x={x + barW / 2 - 22} y={y - 28} width="44" height="20" rx="10" style={{ fill: "var(--teal)" }} />
                <text x={x + barW / 2} y={y - 14} textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff">
                  {d.value}
                  {unit}
                </text>
              </g>
            )}
            <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="11" style={{ fill: "var(--ink-muted)" }}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Linha suave com área em degradê. */
export function AreaChart({ data }: { data: MonthPoint[] }) {
  const id = useId().replace(/:/g, "");
  const W = 320;
  const H = 130;
  const pad = 16;
  const max = Math.max(1, ...data.map((d) => d.value));
  const pts = data.map((d, i) => ({
    x: pad + (i * (W - pad * 2)) / Math.max(1, data.length - 1),
    y: H - 24 - (d.value / max) * (H - 44),
  }));
  const path = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1]!;
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, "");
  const area = `${path} L ${pts[pts.length - 1]!.x} ${H - 18} L ${pts[0]!.x} ${H - 18} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Evolução por mês">
      <defs>
        <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--teal)", stopOpacity: 0.35 }} />
          <stop offset="100%" style={{ stopColor: "var(--teal)", stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#area-${id})`} />
      <path d={path} fill="none" strokeWidth="2.5" strokeLinecap="round" style={{ stroke: "var(--teal-deep)" }} />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" style={{ fill: "var(--paper-raised)", stroke: "var(--teal-deep)" }} strokeWidth="2">
            <title>{`${data[i]!.label}: ${data[i]!.value}`}</title>
          </circle>
          <text x={p.x} y={H - 4} textAnchor="middle" fontSize="10" style={{ fill: "var(--ink-muted)" }}>
            {data[i]!.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

const capitalize = (label: string) => (label ? label[0]!.toUpperCase() + label.slice(1).toLowerCase() : label);

/** Linha com marcadores e eixo; sem registros mostra a linha zerada e uma mensagem. */
export function LineChart({ data, emptyTitle, emptyHint, icon }: { data: MonthPoint[]; emptyTitle: string; emptyHint: string; icon?: ReactNode }) {
  const W = 520;
  const H = 210;
  const padL = 30;
  const padB = 26;
  const padT = 14;
  const padR = 14;
  const maxValue = Math.max(0, ...data.map((d) => d.value));
  const niceMax = maxValue <= 4 ? 4 : Math.ceil(maxValue / 4) * 4;
  const plotH = H - padT - padB;
  const plotW = W - padL - padR;
  const pts = data.map((d, i) => ({
    x: padL + (data.length === 1 ? plotW / 2 : (i * plotW) / (data.length - 1)),
    y: padT + plotH - (d.value / niceMax) * plotH,
    d,
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const ticks = [0, 1, 2, 3, 4].map((i) => (niceMax / 4) * i);
  const empty = maxValue === 0;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Evolução por mês">
        {ticks.map((t) => {
          const y = padT + plotH - (t / niceMax) * plotH;
          return (
            <text key={t} x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" style={{ fill: "var(--ink-muted)" }}>
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          );
        })}
        <line x1={padL} x2={padL} y1={padT} y2={padT + plotH} style={{ stroke: "var(--line)" }} />
        <path d={path} fill="none" strokeWidth="2.5" strokeLinejoin="round" style={{ stroke: "var(--teal)" }} />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" strokeWidth="2" style={{ fill: "var(--paper-raised)", stroke: "var(--teal)" }}>
              <title>{`${capitalize(p.d.label)}: ${p.d.value}`}</title>
            </circle>
            <text x={p.x} y={H - 6} textAnchor="middle" fontSize="11" style={{ fill: "var(--ink-muted)" }}>
              {capitalize(p.d.label)}
            </text>
          </g>
        ))}
      </svg>
      {empty && (
        <div className="pointer-events-none absolute inset-x-0 top-[14%] flex flex-col items-center text-center">
          {icon && <span className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-paper text-ink-muted">{icon}</span>}
          <p className="text-sm font-semibold text-ink">{emptyTitle}</p>
          <p className="mt-0.5 max-w-[16rem] text-xs text-ink-muted">{emptyHint}</p>
        </div>
      )}
    </div>
  );
}
