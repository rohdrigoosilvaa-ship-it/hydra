import { Fragment, FormEvent, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Plus, UserPlus } from "lucide-react";
import { api } from "../lib/api";
import { EvidenceUploader } from "../components/EvidenceUploader";
import type { Company, Occurrence, OccurrenceInvolvedPersonRole, OccurrenceType } from "../lib/types";

const TYPE_LABEL: Record<OccurrenceType, string> = {
  INCIDENT: "Incidente",
  NEAR_MISS: "Quase acidente",
  ACCIDENT_TYPICAL: "Acidente típico",
  ACCIDENT_COMMUTE: "Acidente de trajeto",
  OCCUPATIONAL_DISEASE: "Doença ocupacional",
};
const STATUS_LABEL: Record<string, string> = { OPEN: "Aberta", INVESTIGATING: "Em investigação", CLOSED: "Encerrada" };
const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-amber-tint text-amber",
  INVESTIGATING: "bg-teal-tint text-teal-deep",
  CLOSED: "bg-line text-ink-muted",
};
const ROLE_LABEL: Record<OccurrenceInvolvedPersonRole, string> = {
  VITIMA: "Vítima",
  TESTEMUNHA: "Testemunha",
  ENVOLVIDO: "Envolvido",
};

export function OccurrencesPage() {
  const [occurrences, setOccurrences] = useState<Occurrence[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    const [list, companyList] = await Promise.all([
      api.get<Occurrence[]>("/occurrences"),
      api.get<Company[]>("/companies"),
    ]);
    setOccurrences(list);
    setCompanies(companyList);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleInvestigate(occurrenceId: string) {
    await api.post("/occurrences/investigations", { occurrenceId, method: "FIVE_WHYS" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Incidentes e Acidentes</h1>
          <p className="mt-1 text-sm text-ink-muted">Registro, investigação e CAT.</p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Nova ocorrência
        </button>
      </div>

      {showForm && (
        <NewOccurrenceForm companies={companies} onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />
      )}

      <div className="mt-6 panel">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium"></th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {occurrences?.length === 0 && (
              <tr><td className="px-4 py-6 text-ink-muted" colSpan={6}>Nenhuma ocorrência registrada ainda.</td></tr>
            )}
            {occurrences?.map((o) => {
              const expanded = expandedId === o.id;
              return (
                <Fragment key={o.id}>
                  <tr className="border-b border-line last:border-none">
                    <td className="px-2 py-3">
                      <button onClick={() => setExpandedId(expanded ? null : o.id)} className="text-ink-muted hover:text-ink">
                        {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {o.description}
                      {o.highPotential && <span className="ml-2 rounded bg-amber-tint px-1.5 py-0.5 text-[10px] font-medium text-amber">ALTO POTENCIAL</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{TYPE_LABEL[o.type]}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-ink-muted">
                      {new Date(o.occurredAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[o.status]}`}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!o.investigation && (
                        <button onClick={() => handleInvestigate(o.id)} className="text-xs text-teal-deep hover:underline">
                          Iniciar investigação
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="border-b border-line bg-paper last:border-none">
                      <td colSpan={6} className="px-4 py-4">
                        <OccurrenceDetails occurrence={o} onChanged={load} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OccurrenceDetails({ occurrence, onChanged }: { occurrence: Occurrence; onChanged: () => void }) {
  const [immediateActions, setImmediateActions] = useState(occurrence.immediateActions ?? "");
  const [saving, setSaving] = useState(false);
  const [showPersonForm, setShowPersonForm] = useState(false);

  async function saveImmediateActions() {
    if (immediateActions === (occurrence.immediateActions ?? "")) return;
    setSaving(true);
    try {
      await api.patch(`/occurrences/${occurrence.id}`, { immediateActions });
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function removePerson(id: string) {
    await api.del(`/occurrences/involved-people/${id}`);
    onChanged();
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div>
        {occurrence.location && (
          <p className="text-sm text-ink-muted">
            <span className="font-medium text-ink">Local: </span>{occurrence.location}
          </p>
        )}
        <label className="mt-2 flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Medidas imediatas</span>
          <textarea
            className="input"
            rows={2}
            value={immediateActions}
            onChange={(e) => setImmediateActions(e.target.value)}
            onBlur={saveImmediateActions}
            disabled={saving}
          />
        </label>

        <div className="mt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink">Pessoas envolvidas</span>
            <button onClick={() => setShowPersonForm(true)} className="flex items-center gap-1 text-xs text-teal-deep hover:underline">
              <UserPlus size={13} /> Adicionar
            </button>
          </div>
          {occurrence.involvedPeople.length === 0 && !showPersonForm && (
            <p className="mt-1 text-xs text-ink-muted">Nenhuma pessoa registrada.</p>
          )}
          <ul className="mt-1 flex flex-col gap-1">
            {occurrence.involvedPeople.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm text-ink-muted">
                <span>{p.name ?? "—"} · {ROLE_LABEL[p.role]}</span>
                <button onClick={() => removePerson(p.id)} className="text-xs text-danger hover:underline">Remover</button>
              </li>
            ))}
          </ul>
          {showPersonForm && (
            <AddPersonForm
              occurrenceId={occurrence.id}
              onClose={() => setShowPersonForm(false)}
              onAdded={() => {
                setShowPersonForm(false);
                onChanged();
              }}
            />
          )}
        </div>
      </div>

      <div>
        <span className="text-sm font-medium text-ink">Evidências</span>
        <div className="mt-1">
          <EvidenceUploader sourceType="OCCURRENCE" sourceId={occurrence.id} companyId={occurrence.companyId} />
        </div>
      </div>
    </div>
  );
}

function AddPersonForm({ occurrenceId, onClose, onAdded }: { occurrenceId: string; onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<OccurrenceInvolvedPersonRole>("ENVOLVIDO");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/occurrences/involved-people", { occurrenceId, name, role });
      onAdded();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-end gap-2">
      <input className="input flex-1" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
      <select className="input" value={role} onChange={(e) => setRole(e.target.value as OccurrenceInvolvedPersonRole)}>
        {Object.entries(ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <button type="submit" disabled={saving || !name} className="btn-primary text-xs">Adicionar</button>
      <button type="button" onClick={onClose} className="btn-secondary text-xs">Cancelar</button>
    </form>
  );
}

function NewOccurrenceForm({ companies, onClose, onCreated }: { companies: Company[]; onClose: () => void; onCreated: () => void }) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [type, setType] = useState<OccurrenceType>("NEAR_MISS");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [immediateActions, setImmediateActions] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [highPotential, setHighPotential] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/occurrences", {
        companyId,
        type,
        description,
        location: location || undefined,
        immediateActions: immediateActions || undefined,
        occurredAt,
        highPotential,
      });
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
        <span className="text-ink-muted">Tipo</span>
        <select className="input" value={type} onChange={(e) => setType(e.target.value as OccurrenceType)}>
          {Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Data</span>
        <input type="date" className="input" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} required />
      </label>
      <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-sm">
        <span className="text-ink-muted">Descrição</span>
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} required />
      </label>
      <label className="flex min-w-[180px] flex-col gap-1 text-sm">
        <span className="text-ink-muted">Local</span>
        <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
      </label>
      <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-sm">
        <span className="text-ink-muted">Medidas imediatas (opcional)</span>
        <input className="input" value={immediateActions} onChange={(e) => setImmediateActions(e.target.value)} />
      </label>
      <label className="flex items-center gap-2 text-sm text-ink-muted">
        <input type="checkbox" checked={highPotential} onChange={(e) => setHighPotential(e.target.checked)} />
        Alto potencial
      </label>
      <button type="submit" disabled={saving || !companyId} className="btn-primary">{saving ? "Salvando…" : "Salvar"}</button>
      <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
    </form>
  );
}
