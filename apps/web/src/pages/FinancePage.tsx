import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import type { Company, Invoice } from "../lib/types";

const STATUS_LABEL: Record<string, string> = { PENDING: "Pendente", PAID: "Paga", OVERDUE: "Atrasada", CANCELED: "Cancelada" };
const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-line text-ink-muted",
  PAID: "bg-teal-tint text-teal-deep",
  OVERDUE: "bg-amber-tint text-amber",
  CANCELED: "bg-line text-ink-muted",
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function FinancePage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const selectedCompanyId = useCompanyFilterStore((s) => s.selectedCompanyId);

  async function load() {
    const invoicePath = selectedCompanyId
      ? `/finance/invoices?companyId=${encodeURIComponent(selectedCompanyId)}`
      : "/finance/invoices";
    const [invoiceList, companyList] = await Promise.all([
      api.get<Invoice[]>(invoicePath),
      api.get<Company[]>("/companies"),
    ]);
    setInvoices(invoiceList);
    setCompanies(companyList);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId]);

  async function handleMarkPaid(id: string) {
    await api.post(`/finance/invoices/${id}/pay`, {});
    load();
  }

  async function handleDelete(invoice: Invoice) {
    if (!window.confirm(`Tem certeza que deseja remover a fatura "${invoice.description}"?`)) return;
    await api.del(`/finance/invoices/${invoice.id}`);
    load();
  }

  const totalOpen = invoices?.filter((i) => i.status === "PENDING").reduce((sum, i) => sum + i.amount, 0) ?? 0;
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Financeiro</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {selectedCompany ? `Mostrando apenas faturas de ${selectedCompany.name}.` : "Faturas e recebíveis."}
          </p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Nova fatura
        </button>
      </div>

      <div className="mt-6 card w-fit">
        <p className="font-mono text-xl font-semibold tabular-nums text-ink">{currency.format(totalOpen)}</p>
        <p className="mt-1 text-xs text-ink-muted">em aberto</p>
      </div>

      {showForm && (
        <NewInvoiceForm
          companies={companies}
          defaultCompanyId={selectedCompanyId ?? undefined}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load(); }}
        />
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-paper-raised">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Vencimento</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {invoices?.length === 0 && (
              <tr><td className="px-4 py-6 text-ink-muted" colSpan={5}>Nenhuma fatura cadastrada ainda.</td></tr>
            )}
            {invoices?.map((i) => (
              <tr key={i.id} className="border-b border-line last:border-none">
                <td className="px-4 py-3 text-ink">{i.description}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-ink-muted">{currency.format(i.amount)}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-ink-muted">{new Date(i.dueDate).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[i.status]}`}>{STATUS_LABEL[i.status]}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {i.status === "PENDING" && (
                      <button onClick={() => handleMarkPaid(i.id)} className="flex items-center gap-1.5 text-xs text-teal-deep hover:underline">
                        <CheckCircle2 size={13} /> Marcar como paga
                      </button>
                    )}
                    <button onClick={() => handleDelete(i)} className="flex items-center gap-1 text-xs text-amber hover:underline">
                      <Trash2 size={13} /> Remover
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewInvoiceForm({
  companies,
  defaultCompanyId,
  onClose,
  onCreated,
}: {
  companies: Company[];
  defaultCompanyId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [description, setDescription] = useState("");
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? companies[0]?.id ?? "");
  const [amount, setAmount] = useState(0);
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/finance/invoices", { description, companyId, amount, dueDate });
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 flex flex-wrap items-end gap-3">
      <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm">
        <span className="text-ink-muted">Descrição</span>
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Empresa</span>
        <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Valor (R$)</span>
        <input type="number" step="0.01" min="0" className="input w-32" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Vencimento</span>
        <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
      </label>
      <button type="submit" disabled={saving || !companyId} className="btn-primary">{saving ? "Salvando…" : "Salvar"}</button>
      <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
    </form>
  );
}
