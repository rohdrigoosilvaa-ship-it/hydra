import { FormEvent, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, Copy, Plus, X } from "lucide-react";
import { api } from "../../lib/api";
import { FormModal, ModalField } from "../../components/ui/modal";
import type { ActionSchedule, ActionScheduleItem } from "../../lib/types";

const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const PRIORITIES = ["Não informado (0)", "Trivial (1)", "Tolerável (2)", "Moderado (3)", "Substancial (4)", "Intolerável (5)"];

/** "2024-05" → "MAI/24". */
export const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]}/${ym.slice(2, 4)}`;

/** Os 12 meses a partir do mês inicial (AAAA-MM). */
function twelveMonths(start: string): string[] {
  const [y, m] = start.split("-").map(Number) as [number, number];
  return Array.from({ length: 12 }, (_, i) => {
    const t = y * 12 + (m - 1) + i;
    return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
  });
}

type DraftItem = Omit<ActionScheduleItem, "totalCost"> & { key: string; totalCost: string };
let counter = 0;
const newItem = (src?: Partial<DraftItem>): DraftItem => ({
  key: `i${++counter}`,
  what: "", why: "", place: "", how: "", responsible: "", totalCost: "", followUp: "", priority: 0, months: [],
  ...src,
});

const withoutKey = ({ key: _key, ...rest }: DraftItem) => rest;

type TextField = "what" | "why" | "place" | "how" | "followUp";

/** Campo de texto com o atalho "[puxar do histórico]": sugere o que já foi escrito em outros cronogramas. */
function HistoryArea({ label, required, value, onChange, options, disabled }: { label: string; required?: boolean; value: string; onChange: (v: string) => void; options: string[]; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex flex-col gap-1.5">
      <span className="flex items-center gap-1 font-display text-[11px] font-bold uppercase tracking-wide text-teal-deep">
        {required && <span aria-hidden>★</span>}
        {label}
        <button type="button" disabled={disabled} className="hover:underline disabled:opacity-50" onClick={() => setOpen((o) => !o)}>[puxar do histórico]</button>
      </span>
      <textarea className="input min-h-[5.5rem]" aria-label={label} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} />
      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-md border border-line bg-paper-raised shadow-lg">
          {options.length === 0 && <p className="p-3 text-xs text-ink-muted">Nada no histórico ainda.</p>}
          {options.map((o) => (
            <button key={o} type="button" className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-paper" onClick={() => { onChange(o); setOpen(false); }}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ActionScheduleModal({ companyId, schedule, history, onClose, onSaved }: { companyId: string; schedule?: ActionSchedule; history: ActionSchedule[]; onClose: () => void; onSaved: (saved?: ActionSchedule) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(schedule?.name ?? "");
  const [author, setAuthor] = useState(schedule?.author ?? "");
  const [elaboratedAt, setElaboratedAt] = useState(schedule?.elaboratedAt.slice(0, 10) ?? today);
  const [type, setType] = useState<"GERAL" | "W5H2">(schedule?.type ?? "GERAL");
  const [startMonth, setStartMonth] = useState(schedule?.startMonth.slice(0, 7) ?? today.slice(0, 7));
  const [mode, setMode] = useState<"DRAFT" | "DEFINED">(schedule?.mode ?? "DRAFT");
  const [items, setItems] = useState<DraftItem[]>(() =>
    schedule?.items.length ? schedule.items.map((i) => newItem({ ...i, why: i.why ?? "", place: i.place ?? "", how: i.how ?? "", responsible: i.responsible ?? "", followUp: i.followUp ?? "", totalCost: i.totalCost == null ? "" : String(i.totalCost) })) : [newItem()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = schedule?.mode === "DEFINED";
  const months = useMemo(() => twelveMonths(startMonth || today.slice(0, 7)), [startMonth, today]);
  const authors = useMemo(() => [...new Set(history.map((h) => h.author))], [history]);
  const past = (field: TextField) => [...new Set(history.flatMap((h) => h.items.map((i) => (i[field] ?? "").trim())).filter(Boolean))].slice(0, 30);

  const patch = (key: string, p: Partial<DraftItem>) => setItems((cur) => cur.map((i) => (i.key === key ? { ...i, ...p } : i)));
  const indexOf = (key: string) => items.findIndex((i) => i.key === key);
  const insertAfter = (key: string, item: DraftItem) => setItems((cur) => { const n = [...cur]; n.splice(cur.findIndex((i) => i.key === key) + 1, 0, item); return n; });
  const move = (key: string, dir: -1 | 1) =>
    setItems((cur) => {
      const i = cur.findIndex((x) => x.key === key);
      const j = i + dir;
      if (j < 0 || j >= cur.length) return cur;
      const n = [...cur];
      [n[i], n[j]] = [n[j]!, n[i]!];
      return n;
    });
  const toggleMonth = (key: string, ym: string) =>
    setItems((cur) => cur.map((i) => (i.key === key ? { ...i, months: i.months.includes(ym) ? i.months.filter((m) => m !== ym) : [...i.months, ym] } : i)));

  const valid = name.trim().length >= 2 && author.trim().length >= 2 && !!elaboratedAt && !!startMonth && items.every((i) => i.what.trim());

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (locked) {
        if (mode === "DRAFT") await api.patch(`/action-schedules/${schedule!.id}/mode`, { mode: "DRAFT" });
        onSaved();
        return;
      }
      const body = {
        companyId,
        name: name.trim(),
        author: author.trim(),
        elaboratedAt,
        type,
        startMonth: `${startMonth}-01`,
        items: items.map((i) => ({
          what: i.what, why: i.why, place: i.place, how: i.how, responsible: i.responsible, followUp: i.followUp,
          totalCost: i.totalCost.trim() ? Number(i.totalCost.replace(",", ".")) : null,
          priority: i.priority, months: i.months,
        })),
      };
      const saved = schedule
        ? await api.put<ActionSchedule>(`/action-schedules/${schedule.id}`, body)
        : await api.post<ActionSchedule>("/action-schedules", body);
      if (mode === "DEFINED") await api.patch(`/action-schedules/${saved.id}/mode`, { mode: "DEFINED" });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
      setSaving(false);
    }
  }

  const btn = "flex h-9 w-9 items-center justify-center rounded-md text-white disabled:opacity-40";

  return (
    <FormModal
      title="Plano / Cronograma de ações"
      onClose={onClose}
      onSubmit={handleSubmit}
      saving={saving}
      canSave={locked ? mode === "DRAFT" : valid}
      saveLabel={locked ? (mode === "DRAFT" ? "Reabrir" : "Fechar") : "Salvar"}
      error={error}
      size="max-w-6xl"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ModalField label="Nome do cronograma" required>
          <input className="input" aria-label="Nome do cronograma" disabled={locked} value={name} onChange={(e) => setName(e.target.value)} />
        </ModalField>
        <ModalField label="Autor" required>
          <input className="input" aria-label="Autor" list="action-authors" disabled={locked} value={author} onChange={(e) => setAuthor(e.target.value)} />
          <datalist id="action-authors">{authors.map((a) => <option key={a} value={a} />)}</datalist>
        </ModalField>
        <ModalField label="Data de elaboração" required>
          <input className="input" type="date" aria-label="Data de elaboração" disabled={locked} value={elaboratedAt} onChange={(e) => setElaboratedAt(e.target.value)} />
        </ModalField>
        <ModalField label={`Modo: ${mode === "DEFINED" ? "Definido" : "Rascunho"}`}>
          <select className="input" aria-label="Modo" value={mode} onChange={(e) => setMode(e.target.value as "DRAFT" | "DEFINED")}>
            <option value="DRAFT">Rascunho (Editável)</option>
            <option value="DEFINED">Definido (Não Editável)</option>
          </select>
        </ModalField>
        <ModalField label="Tipo">
          <select className="input" aria-label="Tipo" disabled={locked} value={type} onChange={(e) => setType(e.target.value as "GERAL" | "W5H2")}>
            <option value="GERAL">Geral</option>
            <option value="W5H2">5W2H</option>
          </select>
        </ModalField>
        <ModalField label="Início do cronograma" required>
          <input className="input" type="month" aria-label="Início do cronograma" disabled={locked} value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
        </ModalField>
      </div>

      {items.map((it, n) => (
        <section key={it.key} className="flex flex-col gap-4 rounded-lg border border-line bg-teal-tint/0 p-4" aria-label={`Ação ${n + 1}`}>
          <div className={`grid grid-cols-1 gap-4 ${type === "W5H2" ? "md:grid-cols-3" : ""}`}>
            <HistoryArea label="O quê / Ação" required value={it.what} onChange={(v) => patch(it.key, { what: v })} options={past("what")} disabled={locked} />
            {type === "W5H2" && (
              <>
                <HistoryArea label="Por quê" value={it.why ?? ""} onChange={(v) => patch(it.key, { why: v })} options={past("why")} disabled={locked} />
                <HistoryArea label="Onde" value={it.place ?? ""} onChange={(v) => patch(it.key, { place: v })} options={past("place")} disabled={locked} />
              </>
            )}
          </div>
          <div className={`grid grid-cols-1 gap-4 ${type === "W5H2" ? "md:grid-cols-[1fr_1fr] lg:grid-cols-[1fr_0.8fr_1fr]" : ""}`}>
            {type === "W5H2" && <HistoryArea label="Como será feito" value={it.how ?? ""} onChange={(v) => patch(it.key, { how: v })} options={past("how")} disabled={locked} />}
            <div className="flex flex-col gap-4">
              <ModalField label="Responsável">
                <input className="input" aria-label="Responsável" disabled={locked} value={it.responsible ?? ""} onChange={(e) => patch(it.key, { responsible: e.target.value })} />
              </ModalField>
              {type === "W5H2" && (
                <>
                  <ModalField label="Custo total">
                    <input className="input" aria-label="Custo total" inputMode="decimal" placeholder="R$ 0,00" disabled={locked} value={it.totalCost} onChange={(e) => patch(it.key, { totalCost: e.target.value })} />
                  </ModalField>
                  <ModalField label="Prioridade">
                    <select className="input" aria-label="Prioridade" disabled={locked} value={it.priority} onChange={(e) => patch(it.key, { priority: Number(e.target.value) })}>
                      {PRIORITIES.map((p, v) => <option key={v} value={v}>{p}</option>)}
                    </select>
                  </ModalField>
                </>
              )}
            </div>
            {type === "W5H2" && <HistoryArea label="Aferição e acompanhamento" value={it.followUp ?? ""} onChange={(v) => patch(it.key, { followUp: v })} options={past("followUp")} disabled={locked} />}
          </div>

          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <div className="flex flex-col gap-2">
              <span className="font-display text-[11px] font-bold uppercase tracking-wide text-teal-deep">Quando</span>
              <div className="flex gap-1">
                <button type="button" disabled={locked} title="Marcar todos os meses" aria-label="Marcar todos os meses" onClick={() => patch(it.key, { months: [...new Set([...it.months, ...months])] })} className="rounded border border-line px-1.5 text-xs text-teal-deep disabled:opacity-40">todos</button>
                <button type="button" disabled={locked} title="Limpar meses" aria-label="Limpar meses" onClick={() => patch(it.key, { months: it.months.filter((m) => !months.includes(m)) })} className="rounded border border-line px-1.5 text-xs text-ink-muted disabled:opacity-40">limpar</button>
              </div>
            </div>
            {months.map((ym) => {
              const on = it.months.includes(ym);
              return (
                <div key={ym} className="flex flex-col items-center gap-1">
                  <span className="text-[11px] font-bold text-ink-muted">{monthLabel(ym)}</span>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    aria-label={`${monthLabel(ym)} ação ${n + 1}`}
                    disabled={locked}
                    onClick={() => toggleMonth(it.key, ym)}
                    className={`flex h-9 w-9 items-center justify-center rounded border ${on ? "border-teal-deep bg-teal-deep text-white" : "border-line bg-paper"}`}
                  >
                    {on && <Check size={16} />}
                  </button>
                </div>
              );
            })}
            <div className="ml-auto flex gap-1.5">
              <button type="button" aria-label="Remover ação" title="Remover ação" disabled={locked || items.length === 1} onClick={() => setItems((cur) => cur.filter((i) => i.key !== it.key))} className={`${btn} bg-amber`}><X size={16} /></button>
              <button type="button" aria-label="Subir ação" title="Subir" disabled={locked || indexOf(it.key) === 0} onClick={() => move(it.key, -1)} className={`${btn} bg-teal-deep`}><ArrowUp size={16} /></button>
              <button type="button" aria-label="Descer ação" title="Descer" disabled={locked || indexOf(it.key) === items.length - 1} onClick={() => move(it.key, 1)} className={`${btn} bg-teal-deep`}><ArrowDown size={16} /></button>
              <button type="button" aria-label="Duplicar ação" title="Duplicar esta ação" disabled={locked} onClick={() => insertAfter(it.key, newItem(withoutKey(it)))} className={`${btn} bg-ink`}><Copy size={16} /></button>
              <button type="button" aria-label="Adicionar nova ação" title="Adicionar nova ação" disabled={locked} onClick={() => insertAfter(it.key, newItem())} className={`${btn} bg-ink`}><Plus size={16} /></button>
            </div>
          </div>
        </section>
      ))}
      {locked && <p className="text-xs text-ink-muted">Este cronograma está definido e não pode ser editado. Mude o modo para Rascunho e clique em Reabrir para editar.</p>}
    </FormModal>
  );
}
