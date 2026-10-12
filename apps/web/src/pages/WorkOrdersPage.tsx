import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import type { Company, Employee, WorkOrder, WorkOrderSigningStatus } from "../lib/types";

const STATUS_LABEL: Record<WorkOrderSigningStatus, string> = {
  NAO_ENVIADA: "Não enviada",
  AGUARDANDO_ASSINATURA: "Aguardando assinatura",
  ASSINADA: "Assinada",
};
const STATUS_STYLE: Record<WorkOrderSigningStatus, string> = {
  NAO_ENVIADA: "bg-line text-ink-muted",
  AGUARDANDO_ASSINATURA: "bg-amber-tint text-amber",
  ASSINADA: "bg-teal-tint text-teal-deep",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function WorkOrdersPage() {
  const navigate = useNavigate();
  const selectedCompanyId = useCompanyFilterStore((s) => s.selectedCompanyId);
  const [workOrders, setWorkOrders] = useState<WorkOrder[] | null>(null);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const path = selectedCompanyId
      ? `/work-orders?companyId=${encodeURIComponent(selectedCompanyId)}`
      : "/work-orders";
    setWorkOrders(await api.get<WorkOrder[]>(path));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Ordem de Serviço</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Riscos e EPIs da função puxados automaticamente do PGR aprovado — assinatura eletrônica via QR code.
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex shrink-0 items-center gap-1.5">
          <Plus size={15} /> Criar nova
        </button>
      </div>

      {showNew && (
        <NewWorkOrderModal
          defaultCompanyId={selectedCompanyId ?? undefined}
          onClose={() => setShowNew(false)}
          onSaved={(id) => navigate(`/ordens-servico/${id}`)}
        />
      )}

      <div className="mt-5 panel">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-paper text-xs font-medium uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3.5">Colaborador</th>
              <th className="px-4 py-3.5">Setor</th>
              <th className="px-4 py-3.5">Cargo</th>
              <th className="px-4 py-3.5">Data</th>
              <th className="px-4 py-3.5">Riscos</th>
              <th className="px-4 py-3.5">EPIs</th>
              <th className="px-4 py-3.5">Assinatura</th>
            </tr>
          </thead>
          <tbody>
            {workOrders?.length === 0 && (
              <tr><td className="px-4 py-8 text-center text-ink-muted" colSpan={7}>Nenhuma Ordem de Serviço cadastrada ainda.</td></tr>
            )}
            {workOrders?.map((wo) => (
              <tr
                key={wo.id}
                onClick={() => navigate(`/ordens-servico/${wo.id}`)}
                className="cursor-pointer border-t border-line transition-colors hover:bg-paper"
              >
                <td className="px-4 py-3.5 font-medium text-ink">{wo.employeeName}</td>
                <td className="px-4 py-3.5 text-xs text-ink-muted">{wo.departmentName ?? "—"}</td>
                <td className="px-4 py-3.5 text-xs text-ink-muted">{wo.positionName ?? "—"}</td>
                <td className="px-4 py-3.5 font-mono text-xs text-ink-muted">{formatDate(wo.issueDate)}</td>
                <td className="px-4 py-3.5 text-xs text-ink-muted">{wo.riskItems.length}</td>
                <td className="px-4 py-3.5 text-xs text-ink-muted">{wo.epiItems.length}</td>
                <td className="px-4 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[wo.signingStatus]}`}>
                    {STATUS_LABEL[wo.signingStatus]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewWorkOrderModal({
  defaultCompanyId,
  onClose,
  onSaved,
}: {
  defaultCompanyId?: string;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const [employeeId, setEmployeeId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Company[]>("/companies").then(setCompanies);
  }, []);

  useEffect(() => {
    if (!companyId) {
      setEmployees([]);
      return;
    }
    api.get<Employee[]>(`/employees?companyId=${encodeURIComponent(companyId)}`).then(setEmployees);
  }, [companyId]);

  async function handleSubmit() {
    if (!companyId || !employeeId) {
      setError("Selecione a empresa e o colaborador.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await api.post<{ id: string }>("/work-orders", { companyId, employeeId, issueDate });
      onSaved(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-base font-semibold text-ink">Nova Ordem de Serviço</h3>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Data da Ordem</span>
            <input type="date" className="input" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Nome da Empresa</span>
            <select className="input" value={companyId} onChange={(e) => { setCompanyId(e.target.value); setEmployeeId(""); }}>
              <option value="">Selecione a empresa</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Nome do Colaborador</span>
            <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} disabled={!companyId}>
              <option value="">Selecione o colaborador</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </label>

          <p className="text-xs text-ink-muted">
            Os riscos e EPIs da função do colaborador são puxados automaticamente do PGR aprovado mais recente da empresa.
          </p>
        </div>

        {error && <p className="mt-2 text-xs text-amber">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
