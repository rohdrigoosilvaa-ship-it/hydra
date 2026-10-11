import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { NonConformity, NonConformityStatus } from "../../lib/types";

const SEVERITY_STYLE: Record<string, string> = {
  BAIXA: "bg-line text-ink-muted",
  MEDIA: "bg-amber-tint text-amber",
  ALTA: "bg-danger-tint text-danger",
  CRITICA: "bg-danger text-white",
};
const SEVERITY_LABEL: Record<string, string> = { BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", CRITICA: "Crítica" };
const STATUS_LABEL: Record<NonConformityStatus, string> = { ABERTA: "Aberta", EM_TRATATIVA: "Em tratativa", RESOLVIDA: "Resolvida" };

export function NonConformitiesTab({ companyId }: { companyId?: string }) {
  const [items, setItems] = useState<NonConformity[] | null>(null);

  async function load() {
    const path = companyId ? `/field-ops/non-conformities?companyId=${encodeURIComponent(companyId)}` : "/field-ops/non-conformities";
    setItems(await api.get<NonConformity[]>(path));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function handleStatusChange(id: string, status: NonConformityStatus) {
    await api.patch(`/field-ops/non-conformities/${id}/status`, { status });
    load();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-paper-raised">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-paper text-xs font-medium uppercase tracking-wide text-ink-muted">
            <th className="px-4 py-3.5">Descrição</th>
            <th className="px-4 py-3.5">Severidade</th>
            <th className="px-4 py-3.5">Prazo</th>
            <th className="px-4 py-3.5">Plano de ação</th>
            <th className="px-4 py-3.5">Status</th>
          </tr>
        </thead>
        <tbody>
          {items?.length === 0 && (
            <tr><td className="px-4 py-8 text-center text-ink-muted" colSpan={5}>Nenhuma não conformidade registrada.</td></tr>
          )}
          {items?.map((nc) => (
            <tr key={nc.id} className="border-t border-line transition-colors hover:bg-paper">
              <td className="px-4 py-3.5 text-ink">{nc.description}</td>
              <td className="px-4 py-3.5">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${SEVERITY_STYLE[nc.severity]}`}>
                  {SEVERITY_LABEL[nc.severity]}
                </span>
              </td>
              <td className="px-4 py-3.5 font-mono text-xs text-ink-muted">
                {nc.dueDate ? new Date(nc.dueDate).toLocaleDateString("pt-BR") : "—"}
              </td>
              <td className="px-4 py-3.5 text-xs text-ink-muted">
                {nc.actions?.[0] ? nc.actions[0].status : "—"}
              </td>
              <td className="px-4 py-3.5">
                <select
                  className="input py-1 text-xs"
                  value={nc.status}
                  onChange={(e) => handleStatusChange(nc.id, e.target.value as NonConformityStatus)}
                >
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
