import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Plus, ShieldMinus } from "lucide-react";
import { api } from "../lib/api";
import type { Company, MedicalBill, Provider } from "../lib/types";

const STATUS_LABEL: Record<string, string> = { SUBMITTED: "Enviada", UNDER_REVIEW: "Em conferência", APPROVED: "Aprovada", GLOSSED: "Com glosa", PAID: "Paga" };
const STATUS_STYLE: Record<string, string> = {
  SUBMITTED: "bg-line text-ink-muted",
  UNDER_REVIEW: "bg-amber-tint text-amber",
  APPROVED: "bg-teal-tint text-teal-deep",
  GLOSSED: "bg-amber-tint text-amber",
  PAID: "bg-teal-tint text-teal-deep",
};
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function MedicalBillingPage() {
  const [bills, setBills] = useState<MedicalBill[] | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [billList, providerList, companyList] = await Promise.all([
      api.get<MedicalBill[]>("/medical-billing"),
      api.get<Provider[]>("/hydranet/providers"),
      api.get<Company[]>("/companies"),
    ]);
    setBills(billList);
    setProviders(providerList);
    setCompanies(companyList);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(id: string) {
    await api.post(`/medical-billing/${id}/approve`, {});
    load();
  }

  async function handleGloss(id: string) {
    const bill = bills?.find((b) => b.id === id);
    if (!bill) return;
    await api.post(`/medical-billing/${id}/gloss`, { glossAmount: bill.totalAmount * 0.1, glossReason: "Divergência na conferência" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Contas Médicas</h1>
          <p className="mt-1 text-sm text-ink-muted">Conferência de lotes enviados por prestadores.</p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Nova conta
        </button>
      </div>

      {showForm && (
        <NewBillForm providers={providers} companies={companies} onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />
      )}

      <div className="mt-6 panel">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Prestador</th>
              <th className="px-4 py-3 font-medium">Referência</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {bills?.length === 0 && (
              <tr><td className="px-4 py-6 text-ink-muted" colSpan={5}>Nenhuma conta médica registrada ainda.</td></tr>
            )}
            {bills?.map((b) => (
              <tr key={b.id} className="border-b border-line last:border-none">
                <td className="px-4 py-3 text-ink">{b.provider?.name ?? b.providerId}</td>
                <td className="px-4 py-3 font-mono text-ink-muted">{b.referenceMonth}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-ink-muted">{currency.format(b.totalAmount)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status]}`}>{STATUS_LABEL[b.status]}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {(b.status === "SUBMITTED" || b.status === "UNDER_REVIEW") && (
                    <div className="flex justify-end gap-3">
                      <button onClick={() => handleApprove(b.id)} className="flex items-center gap-1.5 text-xs text-teal-deep hover:underline">
                        <CheckCircle2 size={13} /> Aprovar
                      </button>
                      <button onClick={() => handleGloss(b.id)} className="flex items-center gap-1.5 text-xs text-amber hover:underline">
                        <ShieldMinus size={13} /> Glosar
                      </button>
                    </div>
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

function NewBillForm({ providers, companies, onClose, onCreated }: { providers: Provider[]; companies: Company[]; onClose: () => void; onCreated: () => void }) {
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [referenceMonth, setReferenceMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [totalAmount, setTotalAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/medical-billing", { providerId, companyId, referenceMonth, totalAmount });
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  if (providers.length === 0) {
    return <p className="mt-3 text-sm text-ink-muted">Cadastre um prestador no HydraNET antes de lançar uma conta médica.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Prestador</span>
        <select className="input" value={providerId} onChange={(e) => setProviderId(e.target.value)} required>
          {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Empresa</span>
        <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Referência (AAAA-MM)</span>
        <input className="input w-28" value={referenceMonth} onChange={(e) => setReferenceMonth(e.target.value)} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Valor total (R$)</span>
        <input type="number" step="0.01" min="0" className="input w-32" value={totalAmount} onChange={(e) => setTotalAmount(Number(e.target.value))} required />
      </label>
      <button type="submit" disabled={saving || !companyId} className="btn-primary">{saving ? "Salvando…" : "Salvar"}</button>
      <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
    </form>
  );
}
