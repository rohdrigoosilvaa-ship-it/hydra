import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import type { Company, Employee, EpiDelivery, EpiDeliveryItem, EpiSigningStatus } from "../lib/types";

const STATUS_LABEL: Record<EpiSigningStatus, string> = {
  NAO_ENVIADA: "Não enviada",
  AGUARDANDO_ASSINATURA: "Aguardando assinatura",
  ASSINADA: "Assinada",
};
const STATUS_STYLE: Record<EpiSigningStatus, string> = {
  NAO_ENVIADA: "bg-line text-ink-muted",
  AGUARDANDO_ASSINATURA: "bg-amber-tint text-amber",
  ASSINADA: "bg-teal-tint text-teal-deep",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

type Situacao = "vigente" | "proximo" | "vencido" | "sem-data";

function classifyExpiry(expiresAt: string | null): Situacao {
  if (!expiresAt) return "sem-data";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiresAt);
  expiry.setHours(0, 0, 0, 0);
  const dias = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (dias < 0) return "vencido";
  if (dias <= 30) return "proximo";
  return "vigente";
}

/** Pior situação entre os itens da ficha — o que mais precisa de atenção manda no badge da linha. */
function worstSituacao(items: EpiDeliveryItem[]): Situacao {
  const situacoes = items.map((i) => classifyExpiry(i.expiresAt));
  if (situacoes.includes("vencido")) return "vencido";
  if (situacoes.includes("proximo")) return "proximo";
  if (situacoes.includes("vigente")) return "vigente";
  return "sem-data";
}

const SITUACAO_STYLE: Record<Situacao, string> = {
  vigente: "bg-teal-tint text-teal-deep",
  proximo: "bg-amber-tint text-amber",
  vencido: "bg-red-100 text-red-700",
  "sem-data": "bg-line text-ink-muted",
};

const SITUACAO_LABEL: Record<Situacao, string> = {
  vigente: "Em dia",
  proximo: "Próximo da troca",
  vencido: "Vencido",
  "sem-data": "Sem data",
};

export function EpiControlPage() {
  const navigate = useNavigate();
  const selectedCompanyId = useCompanyFilterStore((s) => s.selectedCompanyId);
  const [deliveries, setDeliveries] = useState<EpiDelivery[] | null>(null);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const path = selectedCompanyId ? `/epi/deliveries?companyId=${encodeURIComponent(selectedCompanyId)}` : "/epi/deliveries";
    setDeliveries(await api.get<EpiDelivery[]>(path));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId]);

  const counts = useMemo(() => {
    const situacoes = (deliveries ?? []).map((d) => worstSituacao(d.items));
    return {
      proximo: situacoes.filter((s) => s === "proximo").length,
      vencido: situacoes.filter((s) => s === "vencido").length,
    };
  }, [deliveries]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Controle de EPI</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Fichas de entrega de Equipamento de Proteção Individual — assinatura eletrônica via QR code.
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex shrink-0 items-center gap-1.5">
          <Plus size={15} /> Criar novo
        </button>
      </div>

      {showNew && (
        <NewEpiDeliveryModal
          defaultCompanyId={selectedCompanyId ?? undefined}
          onClose={() => setShowNew(false)}
          onSaved={(id) => navigate(`/epi/${id}`)}
        />
      )}

      {deliveries && (counts.proximo > 0 || counts.vencido > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {counts.proximo > 0 && (
            <span className="rounded-md bg-amber-tint px-3 py-1.5 text-xs font-medium text-amber">
              {counts.proximo} ficha(s) com EPI próximo da troca
            </span>
          )}
          {counts.vencido > 0 && (
            <span className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700">
              {counts.vencido} ficha(s) com EPI vencido
            </span>
          )}
        </div>
      )}

      <div className="mt-5 panel">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-paper text-xs font-medium uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3.5">Colaborador</th>
              <th className="px-4 py-3.5">Setor</th>
              <th className="px-4 py-3.5">Cargo</th>
              <th className="px-4 py-3.5">Entrega</th>
              <th className="px-4 py-3.5">Itens</th>
              <th className="px-4 py-3.5">Assinatura</th>
              <th className="px-4 py-3.5">Vencimento de EPI</th>
            </tr>
          </thead>
          <tbody>
            {deliveries?.length === 0 && (
              <tr><td className="px-4 py-8 text-center text-ink-muted" colSpan={7}>Nenhuma ficha de EPI cadastrada ainda.</td></tr>
            )}
            {deliveries?.map((d) => {
              const situacao = worstSituacao(d.items);
              return (
              <tr
                key={d.id}
                onClick={() => navigate(`/epi/${d.id}`)}
                className="cursor-pointer border-t border-line transition-colors hover:bg-paper"
              >
                <td className="px-4 py-3.5 font-medium text-ink">{d.employeeName}</td>
                <td className="px-4 py-3.5 text-xs text-ink-muted">{d.departmentName ?? "—"}</td>
                <td className="px-4 py-3.5 text-xs text-ink-muted">{d.positionName ?? "—"}</td>
                <td className="px-4 py-3.5 font-mono text-xs text-ink-muted">{formatDate(d.deliveryDate)}</td>
                <td className="px-4 py-3.5 text-xs text-ink-muted">{d.items.length}</td>
                <td className="px-4 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[d.signingStatus]}`}>
                    {STATUS_LABEL[d.signingStatus]}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${SITUACAO_STYLE[situacao]}`}>
                    {SITUACAO_LABEL[situacao]}
                  </span>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewEpiDeliveryModal({
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
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10));
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
      const created = await api.post<{ id: string }>("/epi/deliveries", { companyId, employeeId, deliveryDate });
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
        <h3 className="font-display text-base font-semibold text-ink">Nova entrega de EPI</h3>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Data da Entrega</span>
            <input type="date" className="input" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
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
