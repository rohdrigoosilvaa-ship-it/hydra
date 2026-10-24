import { useEffect, useState } from "react";
import { CircleHelp } from "lucide-react";
import {
  CERTAINTY_OPTIONS,
  LEVEL_COLOR,
  PROBABILITY_HELP,
  PROBABILITY_OPTIONS,
  RESULT_TABLE,
  RISK_GRID,
  SEVERITY_OPTIONS,
  riskResult,
  type HelpTable,
} from "../../lib/risk-assessment";

export interface Assessment {
  probability: number | null;
  severity: number | null;
  certainty: number | null;
}

type Help = { kind: "table"; table: HelpTable } | { kind: "matrix" } | { kind: "result" };

const labelCls = "flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-wide text-teal-deep";
const selectCls = "input w-full";

function HelpButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="text-teal hover:text-teal-deep">
      <CircleHelp size={16} />
    </button>
  );
}

function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-10" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="w-full max-w-3xl overflow-hidden rounded-lg bg-paper-raised shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="bg-ink px-6 py-4 text-sm font-semibold text-white">{title}</div>
        <div className="px-6 py-5">{children}</div>
        <div className="flex justify-end border-t border-line px-6 py-3">
          <button type="button" onClick={onClose} className="text-base font-medium text-ink-muted hover:text-ink">Fechar</button>
        </div>
      </div>
    </div>
  );
}

function ProbabilityHelp({ table }: { table: HelpTable }) {
  return (
    <>
      <p className="text-sm text-ink">{table.subtitle}</p>
      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr className="bg-paper text-ink-muted">
            {table.headers.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {table.rows.map(([n, a, b]) => (
            <tr key={n} className="border-b border-line">
              <td className="px-3 py-3 text-lg text-ink">{n}</td>
              <td className="px-3 py-3 text-ink">{a}</td>
              <td className="px-3 py-3 text-ink">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-ink-muted">{table.note}</p>
    </>
  );
}

/** Matriz de risco: à esquerda Risco × Certeza, à direita Probabilidade × Severidade (X marca a escolha). */
export function RiskMatrix({ value }: { value: Assessment }) {
  const result = riskResult(value.probability, value.severity, value.certainty);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-label="Matriz de risco">
      <div>
        <p className="mb-1 text-sm text-ink-muted">Certeza</p>
        <div className="flex flex-col gap-px">
          {[5, 4, 3, 2, 1].map((level) => (
            <div key={level} className="grid grid-cols-3 gap-px">
              {RESULT_TABLE[level]!.map((text, i) => {
                const active = result?.level === level && value.certainty === i + 1;
                return (
                  <div
                    key={i}
                    className={`flex min-h-[3.25rem] items-center justify-center p-2 text-center text-xs text-ink ${active ? "outline outline-4 outline-white ring-2 ring-ink" : ""}`}
                    style={{ background: LEVEL_COLOR[level] }}
                  >
                    {text}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-sm text-ink-muted">Severidade</p>
        <div className="flex flex-col gap-px">
          {[5, 4, 3, 2, 1].map((p) => (
            <div key={p} className="grid grid-cols-5 gap-px">
              {RISK_GRID[p - 1]!.map((level, i) => (
                <div
                  key={i}
                  className="flex h-[3.25rem] items-center justify-center text-2xl font-bold text-white"
                  style={{ background: LEVEL_COLOR[level], opacity: value.probability && value.probability !== p ? 0.55 : 1 }}
                >
                  {value.probability === p && value.severity === i + 1 ? "X" : ""}
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-ink-muted">Probabilidade: de 5 (em cima) a 1 (embaixo) · Severidade: de 1 a 5, da esquerda para a direita.</p>
      </div>
    </div>
  );
}

/** Probabilidade → Severidade → Estimativa → Resultado, com os "?" de ajuda e a matriz de risco. */
export function RiskAssessment({ value, onChange }: { value: Assessment; onChange: (v: Assessment) => void }) {
  const [help, setHelp] = useState<Help | null>(null);
  const result = riskResult(value.probability, value.severity, value.certainty);
  const pick = (k: keyof Assessment) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value ? Number(e.target.value) : null });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <span className={labelCls}>
            Probabilidade:
            {PROBABILITY_HELP.map((t) => (
              <HelpButton key={t.id} label={`Ajuda: ${t.title}`} onClick={() => setHelp({ kind: "table", table: t })} />
            ))}
          </span>
          <select className={selectCls} aria-label="Probabilidade" value={value.probability ?? ""} onChange={pick("probability")}>
            <option value="">Não informado</option>
            {PROBABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={labelCls}>
            Severidade:
            <HelpButton label="Ajuda: matriz de risco" onClick={() => setHelp({ kind: "matrix" })} />
          </span>
          <select className={selectCls} aria-label="Severidade" value={value.severity ?? ""} onChange={pick("severity")}>
            <option value="">Não informado</option>
            {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={labelCls}>Estimativa:</span>
          <select className={selectCls} aria-label="Estimativa" value={value.certainty ?? ""} onChange={pick("certainty")}>
            <option value="">Não informado</option>
            {CERTAINTY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={labelCls}>
            Resultado:
            <HelpButton label="Ajuda: resultado" onClick={() => setHelp({ kind: "result" })} />
          </span>
          <div
            aria-label="Resultado"
            className="flex min-h-[2.5rem] items-center rounded-md border border-line px-3 py-2 text-sm text-ink"
            style={{ background: result?.color ?? "var(--paper)" }}
          >
            {result?.text ?? "Não informar"}
          </div>
        </div>
      </div>

      {value.probability && <RiskMatrix value={value} />}

      {help?.kind === "table" && (
        <Overlay title={help.table.title} onClose={() => setHelp(null)}>
          <ProbabilityHelp table={help.table} />
        </Overlay>
      )}
      {(help?.kind === "matrix" || help?.kind === "result") && (
        <Overlay title="Matriz de risco" onClose={() => setHelp(null)}>
          <RiskMatrix value={value} />
        </Overlay>
      )}
    </div>
  );
}
