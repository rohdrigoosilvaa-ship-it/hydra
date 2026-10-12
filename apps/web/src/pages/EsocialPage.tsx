import { FormEvent, useEffect, useState } from "react";
import { Plus, Send } from "lucide-react";
import { api } from "../lib/api";
import type { Company, EsocialEvent, EsocialEventType } from "../lib/types";

const STATUS_LABEL: Record<string, string> = { PENDING: "Pendente", SENT: "Enviado", PROCESSED: "Processado", REJECTED: "Rejeitado" };
const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-line text-ink-muted",
  SENT: "bg-teal-tint text-teal-deep",
  PROCESSED: "bg-teal-tint text-teal-deep",
  REJECTED: "bg-amber-tint text-amber",
};

export function EsocialPage() {
  const [events, setEvents] = useState<EsocialEvent[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [eventList, companyList] = await Promise.all([
      api.get<EsocialEvent[]>("/esocial/events"),
      api.get<Company[]>("/companies"),
    ]);
    setEvents(eventList);
    setCompanies(companyList);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleTransmit(id: string) {
    await api.post(`/esocial/events/${id}/transmit`, {});
    load();
  }

  const summary = {
    pending: events?.filter((e) => e.status === "PENDING").length ?? 0,
    sent: events?.filter((e) => e.status === "SENT" || e.status === "PROCESSED").length ?? 0,
    rejected: events?.filter((e) => e.status === "REJECTED").length ?? 0,
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Cockpit eSocial</h1>
          <p className="mt-1 text-sm text-ink-muted">Eventos de SST — S-2210, S-2220, S-2221, S-2230, S-2240.</p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Novo evento
        </button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-md">
        <div className="card"><p className="font-mono text-xl font-semibold tabular-nums">{summary.pending}</p><p className="mt-1 text-xs text-ink-muted">Pendentes</p></div>
        <div className="card"><p className="font-mono text-xl font-semibold tabular-nums text-teal-deep">{summary.sent}</p><p className="mt-1 text-xs text-ink-muted">Enviados</p></div>
        <div className="card"><p className="font-mono text-xl font-semibold tabular-nums text-amber">{summary.rejected}</p><p className="mt-1 text-xs text-ink-muted">Rejeitados</p></div>
      </div>

      {showForm && (
        <NewEventForm companies={companies} onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />
      )}

      <div className="mt-6 panel">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Evento</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Recibo</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {events?.length === 0 && (
              <tr><td className="px-4 py-6 text-ink-muted" colSpan={4}>Nenhum evento registrado ainda.</td></tr>
            )}
            {events?.map((e) => (
              <tr key={e.id} className="border-b border-line last:border-none">
                <td className="px-4 py-3 font-mono text-ink">{e.eventType}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[e.status]}`}>{STATUS_LABEL[e.status]}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{e.receiptNumber ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  {e.status === "PENDING" && (
                    <button onClick={() => handleTransmit(e.id)} className="flex items-center gap-1.5 text-xs text-teal-deep hover:underline">
                      <Send size={12} /> Transmitir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewEventForm({ companies, onClose, onCreated }: { companies: Company[]; onClose: () => void; onCreated: () => void }) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [eventType, setEventType] = useState<EsocialEventType>("S2220");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/esocial/events", { companyId, eventType });
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Empresa</span>
        <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Evento</span>
        <select className="input" value={eventType} onChange={(e) => setEventType(e.target.value as EsocialEventType)}>
          {["S2210", "S2220", "S2221", "S2230", "S2240"].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <button type="submit" disabled={saving || !companyId} className="btn-primary">{saving ? "Salvando…" : "Salvar"}</button>
      <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
    </form>
  );
}
