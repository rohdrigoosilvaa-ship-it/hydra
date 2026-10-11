import { ReactNode, useState } from "react";
import { Sparkles } from "lucide-react";

export const AI_DISCLAIMER = "Sugestão da IA — validar tecnicamente";

export function naOrValue(v: string | null | undefined) {
  return v && v.trim() ? v : "Não informado";
}

export function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="text-ink">{naOrValue(value)}</p>
    </div>
  );
}

/** Botão genérico "Sugerir com IA": busca uma sugestão, mostra em uma caixa rotulada
 * e só aplica aos campos do formulário se o usuário clicar em "Aplicar" — nunca
 * preenche automaticamente. */
export function AiSuggestButton<T>({
  label,
  disabledReason,
  onFetch,
  onApply,
  renderPreview,
}: {
  label: string;
  disabledReason?: string;
  onFetch: () => Promise<T>;
  onApply: (result: T) => void;
  renderPreview: (result: T) => ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<T | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await onFetch());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao consultar a IA.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !!disabledReason}
        title={disabledReason}
        className="flex items-center gap-1 text-xs text-teal-deep hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Sparkles size={12} /> {loading ? "Consultando IA…" : label}
      </button>
      {error && <p className="mt-1 text-xs text-amber">{error}</p>}
      {result && (
        <div className="mt-2 rounded-md border border-teal-deep/30 bg-teal-tint p-3 text-sm">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-teal-deep">{AI_DISCLAIMER}</p>
          {renderPreview(result)}
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onApply(result);
                setResult(null);
              }}
              className="text-xs font-medium text-teal-deep hover:underline"
            >
              Aplicar
            </button>
            <button type="button" onClick={() => setResult(null)} className="text-xs text-ink-muted hover:underline">
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PgrProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Progresso do PGR</p>
        <p className="font-mono text-[10px] text-ink-muted">{clamped}%</p>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-teal-deep transition-all" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

export type PgrTabId = "dados-gerais" | "ghe" | "inventario" | "plano-acoes" | "cronograma" | "finalizacao";

export const PGR_TABS: { id: PgrTabId; label: string }[] = [
  { id: "dados-gerais", label: "Dados gerais" },
  { id: "ghe", label: "GHE" },
  { id: "inventario", label: "Inventário de riscos" },
  { id: "plano-acoes", label: "Plano de ações e recomendações" },
  { id: "cronograma", label: "Cronograma" },
  { id: "finalizacao", label: "Finalização" },
];

export function PgrTabNav({ active, onChange }: { active: PgrTabId; onChange: (id: PgrTabId) => void }) {
  return (
    <div className="mt-5 flex flex-wrap gap-1.5 border-b border-line">
      {PGR_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            active === tab.id
              ? "border-teal-deep text-ink"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
