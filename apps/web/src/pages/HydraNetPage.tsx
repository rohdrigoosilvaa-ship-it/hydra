import { FormEvent, useEffect, useState } from "react";
import { Handshake, Plus } from "lucide-react";
import { api } from "../lib/api";
import type { Company, Provider, ProviderContract, ProviderType } from "../lib/types";

const TYPE_LABEL: Record<ProviderType, string> = {
  CLINICA: "Clínica",
  ENGENHEIRO: "Engenheiro",
  TECNICO: "Técnico",
  CONSULTORIA: "Consultoria",
  LABORATORIO: "Laboratório",
  OUTRO: "Outro",
};
const CONTRACT_STATUS_LABEL: Record<string, string> = { DRAFT: "Solicitado", ACTIVE: "Ativo", EXPIRED: "Expirado", CANCELED: "Cancelado" };
const CONTRACT_STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-amber-tint text-amber",
  ACTIVE: "bg-teal-tint text-teal-deep",
  EXPIRED: "bg-line text-ink-muted",
  CANCELED: "bg-line text-ink-muted",
};

export function HydraNetPage() {
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [contracts, setContracts] = useState<ProviderContract[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [providerList, contractList, companyList] = await Promise.all([
      api.get<Provider[]>("/hydranet/providers"),
      api.get<ProviderContract[]>("/hydranet/contracts"),
      api.get<Company[]>("/companies"),
    ]);
    setProviders(providerList);
    setContracts(contractList);
    setCompanies(companyList);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRequestContract(providerId: string) {
    const companyId = companies[0]?.id;
    if (!companyId) return;
    await api.post("/hydranet/contracts", {
      providerId,
      companyId,
      startDate: new Date().toISOString().slice(0, 10),
    });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">HydraNET</h1>
          <p className="mt-1 text-sm text-ink-muted">Catálogo de prestadores da sua empresa e contratos solicitados.</p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Novo prestador
        </button>
      </div>

      {showForm && (
        <NewProviderForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {providers?.length === 0 && <p className="text-sm text-ink-muted">Nenhum prestador cadastrado ainda.</p>}
        {providers?.map((p) => (
          <div key={p.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-ink">{p.name}</p>
              <span className="tag shrink-0">{TYPE_LABEL[p.type]}</span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">{p.email ?? "sem e-mail"}</p>
            <button
              onClick={() => handleRequestContract(p.id)}
              className="mt-3 flex items-center gap-1.5 text-xs text-teal-deep hover:underline"
            >
              <Handshake size={13} /> Solicitar contratação
            </button>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-ink">Contratos</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-line bg-paper-raised">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-medium">Prestador</th>
                <th className="px-4 py-3 font-medium">Início</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts?.length === 0 && (
                <tr><td className="px-4 py-6 text-ink-muted" colSpan={3}>Nenhum contrato solicitado ainda.</td></tr>
              )}
              {contracts?.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-none">
                  <td className="px-4 py-3 text-ink">{c.provider?.name ?? c.providerId}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-ink-muted">{new Date(c.startDate).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${CONTRACT_STATUS_STYLE[c.status]}`}>
                      {CONTRACT_STATUS_LABEL[c.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function NewProviderForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ProviderType>("CLINICA");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/hydranet/providers", { name, type, email: email || undefined });
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Nome</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Tipo</span>
        <select className="input" value={type} onChange={(e) => setType(e.target.value as ProviderType)}>
          {Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
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
