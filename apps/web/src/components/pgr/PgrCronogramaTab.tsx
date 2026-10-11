import { FormEvent, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import type { PgrCronogramaItem, PgrDetail } from "../../lib/types";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Meses da vigência (validFrom → validUntil), no máximo 36 colunas. Sem vigência
 * definida, mostra os 12 meses do ano corrente. */
export function cronogramaMonths(validFrom: string | null, validUntil: string | null): { year: number; month: number }[] {
  const from = validFrom ? new Date(validFrom) : new Date();
  const start = validFrom ? { year: from.getUTCFullYear(), month: from.getUTCMonth() + 1 } : { year: from.getFullYear(), month: 1 };
  let end: { year: number; month: number };
  if (validUntil) {
    const until = new Date(validUntil);
    end = { year: until.getUTCFullYear(), month: until.getUTCMonth() + 1 };
  } else {
    end = { year: start.year, month: 12 };
  }
  const months: { year: number; month: number }[] = [];
  let { year, month } = start;
  while ((year < end.year || (year === end.year && month <= end.month)) && months.length < 36) {
    months.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

export function PgrCronogramaTab({ pgr, onChanged }: { pgr: PgrDetail; onChanged: () => void }) {
  const months = cronogramaMonths(pgr.validFrom, pgr.validUntil);
  const [description, setDescription] = useState("");
  const [responsible, setResponsible] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (description.trim().length < 2) return;
    setAdding(true);
    setError(null);
    try {
      await api.post(`/pgr/${pgr.id}/cronograma`, {
        description: description.trim(),
        responsible: responsible.trim() || undefined,
      });
      setDescription("");
      setResponsible("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-ink">Cronograma do PGR</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Plano de ação por mês — clique em um mês para marcar ou desmarcar. Os meses seguem a vigência do documento.
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-paper-raised">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-paper text-xs font-medium uppercase tracking-wide text-ink-muted">
              <th className="min-w-[220px] px-3 py-3">Ação</th>
              <th className="min-w-[140px] px-3 py-3">Responsável</th>
              {months.map((m) => (
                <th key={`${m.year}-${m.month}`} className="px-1.5 py-3 text-center">
                  <span className="block">{MONTH_LABELS[m.month - 1]}</span>
                  <span className="block font-mono text-[9px] normal-case">{String(m.year).slice(2)}</span>
                </th>
              ))}
              <th className="px-2" />
            </tr>
          </thead>
          <tbody>
            {pgr.cronograma.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-ink-muted" colSpan={months.length + 3}>
                  Nenhuma ação no cronograma ainda.
                </td>
              </tr>
            )}
            {pgr.cronograma.map((item) => (
              <CronogramaRow key={item.id} item={item} months={months} onChanged={onChanged} />
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleAdd} className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm">
          <span className="text-ink-muted">Nova ação</span>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="flex min-w-[160px] flex-col gap-1 text-sm">
          <span className="text-ink-muted">Responsável</span>
          <input className="input" value={responsible} onChange={(e) => setResponsible(e.target.value)} />
        </label>
        <button type="submit" disabled={adding || description.trim().length < 2} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={14} /> {adding ? "Adicionando…" : "Adicionar"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-amber">{error}</p>}
    </div>
  );
}

function CronogramaRow({
  item,
  months,
  onChanged,
}: {
  item: PgrCronogramaItem;
  months: { year: number; month: number }[];
  onChanged: () => void;
}) {
  const [description, setDescription] = useState(item.description);
  const [responsible, setResponsible] = useState(item.responsible ?? "");

  async function saveText() {
    const nextDescription = description.trim();
    if (nextDescription.length < 2) {
      setDescription(item.description);
      return;
    }
    if (nextDescription === item.description && responsible === (item.responsible ?? "")) return;
    await api.patch(`/pgr/cronograma/${item.id}`, { description: nextDescription, responsible });
    onChanged();
  }

  async function toggle(year: number, month: number) {
    await api.post(`/pgr/cronograma/${item.id}/toggle`, { year, month });
    onChanged();
  }

  async function handleDelete() {
    if (!window.confirm(`Remover "${item.description}" do cronograma?`)) return;
    await api.del(`/pgr/cronograma/${item.id}`);
    onChanged();
  }

  const isMarked = (year: number, month: number) => item.marks.some((m) => m.year === year && m.month === month);

  return (
    <tr className="border-t border-line">
      <td className="px-2 py-1.5">
        <input className="input w-full" value={description} onChange={(e) => setDescription(e.target.value)} onBlur={saveText} />
      </td>
      <td className="px-2 py-1.5">
        <input className="input w-full" value={responsible} onChange={(e) => setResponsible(e.target.value)} onBlur={saveText} />
      </td>
      {months.map((m) => {
        const marked = isMarked(m.year, m.month);
        return (
          <td key={`${m.year}-${m.month}`} className="p-0.5 text-center">
            <button
              type="button"
              onClick={() => toggle(m.year, m.month)}
              aria-pressed={marked}
              aria-label={`${MONTH_LABELS[m.month - 1]}/${m.year}`}
              className={`h-7 w-7 rounded border transition-colors ${
                marked ? "border-teal-deep bg-teal-deep" : "border-line hover:bg-paper"
              }`}
            />
          </td>
        );
      })}
      <td className="px-2 text-right">
        <button type="button" onClick={handleDelete} className="text-ink-muted hover:text-danger" title="Remover">
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}
