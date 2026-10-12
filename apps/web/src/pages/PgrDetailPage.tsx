import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ClipboardList, Download, Layers, ShieldAlert, ShieldCheck, Trash2, Users } from "lucide-react";
import { api } from "../lib/api";
import { PgrDadosGeraisTab } from "../components/pgr/PgrDadosGeraisTab";
import { PgrGheTab } from "../components/pgr/PgrGheTab";
import { PgrInventarioTab } from "../components/pgr/PgrInventarioTab";
import { PgrPlanoAcoesTab } from "../components/pgr/PgrPlanoAcoesTab";
import { PgrCronogramaTab } from "../components/pgr/PgrCronogramaTab";
import { PgrFinalizacaoTab } from "../components/pgr/PgrFinalizacaoTab";
import { PgrProgressBar, PgrTabNav, StatTile, type PgrTabId } from "../components/pgr/pgr-shared";
import type { Department, Hazard, PgrDetail, Position } from "../lib/types";

const INCONSISTENCY_SEVERITY_STYLE: Record<string, string> = {
  error: "border-amber bg-amber-tint text-amber",
  warning: "border-amber/50 bg-amber-tint/60 text-amber",
  info: "border-line bg-paper-raised text-ink-muted",
};

export function PgrDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pgr, setPgr] = useState<PgrDetail | null>(null);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [activeTab, setActiveTab] = useState<PgrTabId>("dados-gerais");
  const [approving, setApproving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [checkingInconsistencies, setCheckingInconsistencies] = useState(false);
  const [inconsistenciesError, setInconsistenciesError] = useState<string | null>(null);
  const [inconsistencies, setInconsistencies] = useState<
    { code: string; severity: "info" | "warning" | "error"; message: string }[] | null
  >(null);

  async function load() {
    if (!id) return;
    const pgrData = await api.get<PgrDetail>(`/pgr/${id}`);
    setPgr(pgrData);
    const [hazardList, deptList, posList] = await Promise.all([
      api.get<Hazard[]>("/pgr/hazards"),
      api.get<Department[]>(`/departments?companyId=${encodeURIComponent(pgrData.companyId)}`),
      api.get<Position[]>(`/positions?companyId=${encodeURIComponent(pgrData.companyId)}`),
    ]);
    setHazards(hazardList);
    setDepartments(deptList);
    setPositions(posList);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleApprove() {
    if (!id) return;
    setApproving(true);
    try {
      await api.post(`/pgr/${id}/approve`, {});
      await load();
    } finally {
      setApproving(false);
    }
  }

  async function handleDeletePgr() {
    if (!id || !pgr) return;
    const aviso =
      pgr.status === "APPROVED"
        ? `"${pgr.title}" está aprovado e é a versão vigente. Excluir mesmo assim?`
        : `Excluir o PGR "${pgr.title}"?`;
    if (!window.confirm(aviso)) return;
    await api.del(`/pgr/${id}`);
    navigate("/pgr");
  }

  async function handleDownloadPdf() {
    if (!id) return;
    setDownloadingPdf(true);
    setPdfError(null);
    try {
      const { blob, filename } = await api.getBlob(`/pgr/${id}/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Erro ao gerar o PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleCheckInconsistencies() {
    if (!id) return;
    setCheckingInconsistencies(true);
    setInconsistenciesError(null);
    try {
      const res = await api.get<{ alerts: typeof inconsistencies }>(`/pgr/${id}/inconsistencies`);
      setInconsistencies(res.alerts ?? []);
    } catch (err) {
      setInconsistenciesError(err instanceof Error ? err.message : "Erro ao verificar inconsistências.");
    } finally {
      setCheckingInconsistencies(false);
    }
  }

  if (!pgr) return <p className="text-sm text-ink-muted">Carregando…</p>;

  const approved = pgr.status === "APPROVED";
  const employees = pgr.ghes.reduce((n, g) => n + (g.employeesCount ?? 0), 0);
  const severeRisks = pgr.risks.filter((r) => r.riskLevel === "HIGH" || r.riskLevel === "CRITICAL").length;
  const lateActions = pgr.actions.filter((a) => a.status === "LATE").length;

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-teal to-teal-deep" />
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-tint text-teal-deep">
              <ShieldCheck size={24} />
            </span>
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink">{pgr.title}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full px-2.5 py-1 font-medium ${approved ? "bg-teal-tint text-teal-deep" : "bg-amber-tint text-amber"}`}>
                  {approved ? "Aprovado" : "Em elaboração"}
                </span>
                <span className="rounded-full bg-line px-2.5 py-1 font-mono text-ink-muted">v{pgr.version}</span>
                {pgr.code && <span className="rounded-full bg-line px-2.5 py-1 font-mono text-ink-muted">{pgr.code}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCheckInconsistencies}
              disabled={checkingInconsistencies}
              className="btn-secondary flex items-center gap-1.5"
            >
              <ShieldCheck size={15} /> {checkingInconsistencies ? "Verificando…" : "Verificar inconsistências"}
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="btn-secondary flex items-center gap-1.5"
            >
              <Download size={15} /> {downloadingPdf ? "Gerando…" : "Baixar PDF"}
            </button>
            {!approved && (
              <button onClick={handleApprove} disabled={approving} className="btn-primary flex items-center gap-1.5">
                <CheckCircle2 size={15} /> {approving ? "Aprovando…" : "Aprovar PGR"}
              </button>
            )}
            <button onClick={handleDeletePgr} className="rounded-md p-2 text-ink-muted hover:bg-danger-tint hover:text-danger" title="Excluir PGR" aria-label="Excluir PGR">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <div className="border-t border-line px-5 py-4">
          <PgrProgressBar percent={pgr.progressPercent} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="GHEs" value={pgr.ghes.length} icon={Layers} />
        <StatTile label="Colaboradores nos GHEs" value={employees} icon={Users} tone="neutral" />
        <StatTile
          label="Riscos avaliados"
          value={pgr.risks.length}
          hint={severeRisks ? `${severeRisks} alto(s) ou crítico(s)` : undefined}
          icon={ShieldAlert}
          tone={severeRisks ? "amber" : "teal"}
        />
        <StatTile
          label="Ações no plano"
          value={pgr.actions.length}
          hint={lateActions ? `${lateActions} atrasada(s)` : undefined}
          icon={ClipboardList}
          tone={lateActions ? "danger" : "teal"}
        />
      </div>

      {pdfError && (
        <p className="mt-3 rounded-md border-l-2 border-amber bg-amber-tint px-3 py-2 text-sm">{pdfError}</p>
      )}
      {inconsistenciesError && (
        <p className="mt-3 rounded-md border-l-2 border-amber bg-amber-tint px-3 py-2 text-sm">{inconsistenciesError}</p>
      )}
      {inconsistencies && (
        <div className="mt-3 rounded-lg border border-line bg-paper-raised p-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-ink-muted">
            Checklist de validação ({inconsistencies.length} {inconsistencies.length === 1 ? "item" : "itens"})
          </p>
          {inconsistencies.length === 0 ? (
            <p className="text-sm text-ink">Nenhuma inconsistência encontrada nos dados cadastrados.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {inconsistencies.map((a, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${INCONSISTENCY_SEVERITY_STYLE[a.severity]}`}
                >
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>{a.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <PgrTabNav active={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === "dados-gerais" && <PgrDadosGeraisTab pgr={pgr} onChanged={load} />}
        {activeTab === "ghe" && (
          <PgrGheTab pgr={pgr} departments={departments} positions={positions} onChanged={load} />
        )}
        {activeTab === "inventario" && <PgrInventarioTab pgr={pgr} hazards={hazards} onChanged={load} />}
        {activeTab === "plano-acoes" && <PgrPlanoAcoesTab pgr={pgr} onChanged={load} />}
        {activeTab === "cronograma" && <PgrCronogramaTab pgr={pgr} onChanged={load} />}
        {activeTab === "finalizacao" && <PgrFinalizacaoTab pgr={pgr} onChanged={load} />}
      </div>
    </div>
  );
}
