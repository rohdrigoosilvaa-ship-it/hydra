import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import type { CrmLead, CrmStage } from "../lib/types";

const STAGES: CrmStage[] = ["LEAD", "CONTATO", "QUALIFICACAO", "PROPOSTA", "NEGOCIACAO", "CONTRATO", "CLIENTE"];
const STAGE_LABEL: Record<CrmStage, string> = {
  LEAD: "Lead",
  CONTATO: "Contato",
  QUALIFICACAO: "Qualificação",
  PROPOSTA: "Proposta",
  NEGOCIACAO: "Negociação",
  CONTRATO: "Contrato",
  CLIENTE: "Cliente",
};

export function CrmPage() {
  const [leads, setLeads] = useState<CrmLead[] | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLeads(await api.get<CrmLead[]>("/crm/leads"));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleStageChange(id: string, stage: CrmStage) {
    await api.patch(`/crm/leads/${id}/stage`, { stage });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">CRM</h1>
          <p className="mt-1 text-sm text-ink-muted">Pipeline comercial — ProtecOne CRM.</p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Novo lead
        </button>
      </div>

      {showForm && (
        <NewLeadForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {leads?.length === 0 && <p className="text-sm text-ink-muted">Nenhum lead cadastrado ainda.</p>}
        {leads?.map((l) => (
          <div key={l.id} className="card">
            <p className="font-medium text-ink">{l.name}</p>
            <p className="mt-1 text-xs text-ink-muted">{l.contactName ?? "sem contato"} {l.email ? `· ${l.email}` : ""}</p>
            <select
              value={l.stage}
              onChange={(e) => handleStageChange(l.id, e.target.value as CrmStage)}
              className="input mt-3 w-full text-xs"
            >
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewLeadForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/crm/leads", { name, contactName: contactName || undefined, email: email || undefined });
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Empresa (lead)</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Contato</span>
        <input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">E-mail</span>
        <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <button type="submit" disabled={saving} className="btn-primary">{saving ? "Salvando…" : "Salvar"}</button>
      <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
    </form>
  );
}
