import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, ChevronDown, ChevronRight, Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { api } from "../lib/api";
import { DepartmentPicker, allPositionIds, colabLabel, countFor, useDepartmentSummary, type DepartmentSummary } from "../components/pgr/ghe-department";
import type { Department, Ghe, LtcatAgent, LtcatDetail, Position, RiskCategory } from "../lib/types";

const STATUS_LABEL: Record<string, string> = { DRAFT: "Rascunho", IN_REVIEW: "Em revisão", APPROVED: "Aprovado", ARCHIVED: "Arquivado" };
const RISK_CATEGORY_LABEL: Record<RiskCategory, string> = {
  FISICO: "Físico",
  QUIMICO: "Químico",
  BIOLOGICO: "Biológico",
  ERGONOMICO: "Ergonômico",
  ACIDENTE: "Acidente",
};

function naOrValue(v: string | null | undefined): string {
  return v && v.trim() ? v : "Não informado";
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="text-ink">{naOrValue(value)}</p>
    </div>
  );
}

export function LtcatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ltcat, setLtcat] = useState<LtcatDetail | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const summary = useDepartmentSummary(ltcat?.companyId);
  const [positions, setPositions] = useState<Position[]>([]);
  const [showDocForm, setShowDocForm] = useState(false);
  const [showNewGheForm, setShowNewGheForm] = useState(false);
  const [showNewAgentForm, setShowNewAgentForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<LtcatAgent | null>(null);
  const [approving, setApproving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [structuring, setStructuring] = useState(false);
  const [structureError, setStructureError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    const data = await api.get<LtcatDetail>(`/ltcat/${id}`);
    setLtcat(data);
    const [deptList, posList] = await Promise.all([
      api.get<Department[]>(`/departments?companyId=${encodeURIComponent(data.companyId)}`),
      api.get<Position[]>(`/positions?companyId=${encodeURIComponent(data.companyId)}`),
    ]);
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
      await api.post(`/ltcat/${id}/approve`, {});
      await load();
    } finally {
      setApproving(false);
    }
  }

  async function handleDelete() {
    if (!id || !ltcat) return;
    const aviso =
      ltcat.status === "APPROVED"
        ? `"${ltcat.title}" está aprovado. Excluir mesmo assim?`
        : `Excluir o LTCAT "${ltcat.title}"?`;
    if (!window.confirm(aviso)) return;
    await api.del(`/ltcat/${id}`);
    navigate("/ltcat");
  }

  async function handleDownloadPdf() {
    if (!id) return;
    setDownloadingPdf(true);
    setPdfError(null);
    try {
      const { blob, filename } = await api.getBlob(`/ltcat/${id}/pdf`);
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

  async function handleImportFromPgr() {
    if (!id) return;
    setStructuring(true);
    setStructureError(null);
    try {
      await api.post(`/ltcat/${id}/import-ghe-from-pgr`, {});
      await load();
    } catch (err) {
      setStructureError(err instanceof Error ? err.message : "Erro ao importar do PGR.");
    } finally {
      setStructuring(false);
    }
  }

  async function handleCopyFromPreviousLtcat() {
    if (!id) return;
    setStructuring(true);
    setStructureError(null);
    try {
      await api.post(`/ltcat/${id}/copy-ghe-from-previous-ltcat`, {});
      await load();
    } catch (err) {
      setStructureError(err instanceof Error ? err.message : "Erro ao copiar do LTCAT anterior.");
    } finally {
      setStructuring(false);
    }
  }

  async function handleRemoveFunction(functionId: string) {
    await api.del(`/pgr/ghe-functions/${functionId}`);
    load();
  }

  async function handleDeleteAgent(agent: LtcatAgent) {
    if (!window.confirm(`Remover o agente "${agent.agentName}"?`)) return;
    await api.del(`/ltcat/agents/${agent.id}`);
    load();
  }

  if (!ltcat) return <p className="text-sm text-ink-muted">Carregando…</p>;

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{ltcat.title}</h1>
          <p className="mt-1 font-mono text-xs text-ink-muted">
            v{ltcat.version} · {STATUS_LABEL[ltcat.status]}
            {ltcat.artNumber ? ` · ART ${ltcat.artNumber}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDownloadPdf} disabled={downloadingPdf} className="btn-secondary flex items-center gap-1.5">
            <Download size={15} /> {downloadingPdf ? "Gerando…" : "Baixar PDF"}
          </button>
          {ltcat.status !== "APPROVED" && (
            <button onClick={handleApprove} disabled={approving} className="btn-primary flex items-center gap-1.5">
              <CheckCircle2 size={15} /> {approving ? "Aprovando…" : "Aprovar LTCAT"}
            </button>
          )}
          <button onClick={handleDelete} className="text-ink-muted hover:text-danger" title="Excluir LTCAT">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {pdfError && <p className="mt-3 rounded-md border-l-2 border-amber bg-amber-tint px-3 py-2 text-sm">{pdfError}</p>}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Dados do documento</h2>
          <button className="btn-secondary flex items-center gap-1.5 text-xs" onClick={() => setShowDocForm((v) => !v)}>
            <Pencil size={13} /> {showDocForm ? "Fechar" : "Editar"}
          </button>
        </div>

        {!showDocForm && (
          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 rounded-xl border border-line bg-paper-raised shadow-sm p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Código" value={ltcat.code} />
            <Field label="ART" value={ltcat.artNumber} />
            <Field label="Emitido em" value={ltcat.issuedAt ? new Date(ltcat.issuedAt).toLocaleDateString("pt-BR") : null} />
            <Field label="Elaborado por" value={ltcat.preparedBy} />
            <Field label="Revisado por" value={ltcat.reviewedBy} />
            <Field label="Aprovado por" value={ltcat.approvedBy} />
            <Field label="Responsável pela empresa" value={ltcat.companyResponsibleName} />
            <Field label="Cargo do responsável" value={ltcat.companyResponsibleRole} />
            <Field label="Responsável técnico" value={ltcat.technicalResponsibleName} />
            <Field label="Especialidade" value={ltcat.technicalResponsibleSpecialty} />
            <Field label="Registro profissional" value={ltcat.technicalResponsibleRegistry} />
            <Field
              label="Conselho / UF"
              value={
                ltcat.technicalResponsibleCouncil || ltcat.technicalResponsibleUf
                  ? `${ltcat.technicalResponsibleCouncil ?? "—"} / ${ltcat.technicalResponsibleUf ?? "—"}`
                  : null
              }
            />
          </div>
        )}

        {showDocForm && (
          <LtcatDocumentForm ltcat={ltcat} onClose={() => setShowDocForm(false)} onSaved={() => { setShowDocForm(false); load(); }} />
        )}
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Grupos Homogêneos de Exposição (GHE)</h2>
          {ltcat.ghes.length > 0 && (
            <button className="btn-secondary flex items-center gap-1.5 text-xs" onClick={() => setShowNewGheForm((v) => !v)}>
              <Plus size={13} /> Novo GHE
            </button>
          )}
        </div>

        {ltcat.ghes.length === 0 ? (
          <div className="mt-3 rounded-xl border border-line bg-paper-raised shadow-sm p-5 text-center">
            <p className="text-sm text-ink-muted">
              Este LTCAT ainda não tem GHE cadastrado — reaproveite a estrutura já existente, sem recadastrar.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button onClick={handleImportFromPgr} disabled={structuring} className="btn-primary flex items-center gap-1.5 text-sm">
                <Upload size={14} /> Importar estrutura de GHE do PGR aprovado
              </button>
              <button onClick={handleCopyFromPreviousLtcat} disabled={structuring} className="btn-secondary flex items-center gap-1.5 text-sm">
                <Upload size={14} /> Copiar do LTCAT anterior
              </button>
            </div>
            {structureError && <p className="mt-3 text-sm text-amber">{structureError}</p>}
          </div>
        ) : (
          <>
            {showNewGheForm && (
              <NewGheForm ltcatId={ltcat.id} companyId={ltcat.companyId} summary={summary} onClose={() => setShowNewGheForm(false)} onCreated={() => { setShowNewGheForm(false); load(); }} />
            )}
            <div className="mt-3 flex flex-col gap-3">
              {ltcat.ghes.map((ghe) => (
                <GheCard key={ghe.id} ghe={ghe} departments={departments} positions={positions} summary={summary} onChanged={load} onRemoveFunction={handleRemoveFunction} />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Agentes ambientais (NR-09)</h2>
          <button
            className="btn-secondary flex items-center gap-1.5 text-xs"
            onClick={() => setShowNewAgentForm(true)}
            disabled={ltcat.ghes.length === 0}
          >
            <Plus size={13} /> Novo agente
          </button>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-paper text-xs font-medium uppercase tracking-wide text-ink-muted">
                <th className="px-3 py-2.5">GHE</th>
                <th className="px-3 py-2.5">Agente</th>
                <th className="px-3 py-2.5">Categoria</th>
                <th className="px-3 py-2.5">Intensidade/Conc.</th>
                <th className="px-3 py-2.5">Limite de tolerância</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {ltcat.agents.length === 0 && (
                <tr><td className="px-3 py-6 text-center text-ink-muted" colSpan={6}>Nenhum agente ambiental cadastrado ainda.</td></tr>
              )}
              {ltcat.agents.map((agent) => (
                <tr key={agent.id} className="border-t border-line">
                  <td className="px-3 py-2.5 text-ink">{agent.ghe?.name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-ink">{agent.agentName}</td>
                  <td className="px-3 py-2.5 text-xs text-ink-muted">{RISK_CATEGORY_LABEL[agent.agentCategory]}</td>
                  <td className="px-3 py-2.5 text-xs text-ink-muted">{agent.intensityConcentration ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-ink-muted">{agent.toleranceLimit ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingAgent(agent)} className="text-ink-muted hover:text-teal-deep">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDeleteAgent(agent)} className="text-ink-muted hover:text-danger">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {(showNewAgentForm || editingAgent) && (
        <AgentForm
          ltcatId={ltcat.id}
          ghes={ltcat.ghes}
          agent={editingAgent ?? undefined}
          onClose={() => {
            setShowNewAgentForm(false);
            setEditingAgent(null);
          }}
          onSaved={() => {
            setShowNewAgentForm(false);
            setEditingAgent(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function LtcatDocumentForm({ ltcat, onClose, onSaved }: { ltcat: LtcatDetail; onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState(ltcat.code ?? "");
  const [artNumber, setArtNumber] = useState(ltcat.artNumber ?? "");
  const [issuedAt, setIssuedAt] = useState(ltcat.issuedAt ? ltcat.issuedAt.slice(0, 10) : "");
  const [preparedBy, setPreparedBy] = useState(ltcat.preparedBy ?? "");
  const [reviewedBy, setReviewedBy] = useState(ltcat.reviewedBy ?? "");
  const [approvedBy, setApprovedBy] = useState(ltcat.approvedBy ?? "");
  const [companyResponsibleName, setCompanyResponsibleName] = useState(ltcat.companyResponsibleName ?? "");
  const [companyResponsibleRole, setCompanyResponsibleRole] = useState(ltcat.companyResponsibleRole ?? "");
  const [technicalResponsibleName, setTechnicalResponsibleName] = useState(ltcat.technicalResponsibleName ?? "");
  const [technicalResponsibleSpecialty, setTechnicalResponsibleSpecialty] = useState(ltcat.technicalResponsibleSpecialty ?? "");
  const [technicalResponsibleRegistry, setTechnicalResponsibleRegistry] = useState(ltcat.technicalResponsibleRegistry ?? "");
  const [technicalResponsibleCouncil, setTechnicalResponsibleCouncil] = useState(ltcat.technicalResponsibleCouncil ?? "");
  const [technicalResponsibleUf, setTechnicalResponsibleUf] = useState(ltcat.technicalResponsibleUf ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/ltcat/${ltcat.id}`, {
        code: code || undefined,
        artNumber: artNumber || undefined,
        issuedAt: issuedAt || undefined,
        preparedBy: preparedBy || undefined,
        reviewedBy: reviewedBy || undefined,
        approvedBy: approvedBy || undefined,
        companyResponsibleName: companyResponsibleName || undefined,
        companyResponsibleRole: companyResponsibleRole || undefined,
        technicalResponsibleName: technicalResponsibleName || undefined,
        technicalResponsibleSpecialty: technicalResponsibleSpecialty || undefined,
        technicalResponsibleRegistry: technicalResponsibleRegistry || undefined,
        technicalResponsibleCouncil: technicalResponsibleCouncil || undefined,
        technicalResponsibleUf: technicalResponsibleUf || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-3 flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Código do documento</span>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Nº da ART</span>
          <input className="input" value={artNumber} onChange={(e) => setArtNumber(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Data de emissão</span>
          <input type="date" className="input" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Elaborado por</span>
          <input className="input" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Revisado por</span>
          <input className="input" value={reviewedBy} onChange={(e) => setReviewedBy(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Aprovado por</span>
          <input className="input" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} />
        </label>
      </div>

      <div className="border-t border-line pt-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-wide text-ink-muted">Responsável pela empresa</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Nome</span>
            <input className="input" value={companyResponsibleName} onChange={(e) => setCompanyResponsibleName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Cargo</span>
            <input className="input" value={companyResponsibleRole} onChange={(e) => setCompanyResponsibleRole(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="border-t border-line pt-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-wide text-ink-muted">Responsável técnico</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Nome</span>
            <input className="input" value={technicalResponsibleName} onChange={(e) => setTechnicalResponsibleName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Especialidade</span>
            <input className="input" value={technicalResponsibleSpecialty} onChange={(e) => setTechnicalResponsibleSpecialty(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Registro profissional</span>
            <input className="input" value={technicalResponsibleRegistry} onChange={(e) => setTechnicalResponsibleRegistry(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Conselho</span>
            <input className="input" value={technicalResponsibleCouncil} onChange={(e) => setTechnicalResponsibleCouncil(e.target.value)} placeholder="ex.: CREA" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">UF</span>
            <input className="input" value={technicalResponsibleUf} onChange={(e) => setTechnicalResponsibleUf(e.target.value)} maxLength={2} />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-line pt-4">
        <button type="submit" disabled={saving} className="btn-primary">{saving ? "Salvando…" : "Salvar"}</button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        {error && <p className="text-sm text-amber">{error}</p>}
      </div>
    </form>
  );
}

function NewGheForm({
  ltcatId,
  summary,
  onClose,
  onCreated,
}: {
  ltcatId: string;
  companyId: string;
  summary: DepartmentSummary[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [departmentId, setDepartmentId] = useState("");
  const [positionIds, setPositionIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDepartment(id: string) {
    setDepartmentId(id);
    setPositionIds(allPositionIds(summary, id));
    const dep = summary.find((d) => d.id === id);
    if (dep) {
      setName(dep.name);
      setCode(dep.code ?? "");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/pgr/ghe", {
        ltcatId,
        departmentId: departmentId || undefined,
        positionIds: departmentId ? positionIds : undefined,
        name,
        code: code || undefined,
        localDescription: localDescription || undefined,
        activityDescription: activityDescription || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-3 flex flex-col gap-3">
      {summary.length > 0 && (
        <DepartmentPicker
          summary={summary}
          departmentId={departmentId}
          positionIds={positionIds}
          onDepartmentChange={handleDepartment}
          onPositionsChange={setPositionIds}
        />
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Nome do GHE</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Código</span>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Descrição do local</span>
        <textarea className="input min-h-[60px] resize-y" value={localDescription} onChange={(e) => setLocalDescription(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Descrição da atividade</span>
        <textarea className="input min-h-[60px] resize-y" value={activityDescription} onChange={(e) => setActivityDescription(e.target.value)} />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary">{saving ? "Salvando…" : "Salvar"}</button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        {error && <p className="text-sm text-amber">{error}</p>}
      </div>
    </form>
  );
}

function GheCard({
  ghe,
  departments,
  positions,
  summary,
  onChanged,
  onRemoveFunction,
}: {
  ghe: Ghe;
  departments: Department[];
  positions: Position[];
  summary: DepartmentSummary[];
  onChanged: () => void;
  onRemoveFunction: (functionId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [showFunctionForm, setShowFunctionForm] = useState(false);

  return (
    <div className="rounded-xl border border-line bg-paper-raised shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-left">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          <span className="font-medium text-ink">{ghe.name}</span>
          {ghe.code && <span className="font-mono text-xs text-ink-muted">{ghe.code}</span>}
          {ghe.employeesCount !== undefined && (
            <span className="rounded-full bg-teal-tint px-2 py-0.5 text-xs font-medium text-teal-deep" title="Colaboradores vinculados a este GHE (pelo setor/cargo)">
              {colabLabel(ghe.employeesCount)}
            </span>
          )}
        </button>
      </div>
      {open && (
        <div className="border-t border-line px-4 py-3">
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Field label="Descrição do local" value={ghe.localDescription} />
            <Field label="Descrição da atividade" value={ghe.activityDescription} />
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Setor / Cargo / Atividade</p>
              <button onClick={() => setShowFunctionForm((v) => !v)} className="text-xs text-teal-deep hover:underline">
                {showFunctionForm ? "Fechar" : "Adicionar"}
              </button>
            </div>
            {showFunctionForm && (
              <NewFunctionForm
                gheId={ghe.id}
                departments={departments}
                positions={positions}
                summary={summary}
                onClose={() => setShowFunctionForm(false)}
                onCreated={() => {
                  setShowFunctionForm(false);
                  onChanged();
                }}
              />
            )}
            <ul className="mt-2 flex flex-col gap-1.5">
              {ghe.functions.length === 0 && <li className="text-xs text-ink-muted">Nenhuma função vinculada a este GHE.</li>}
              {ghe.functions.map((f) => (
                <li key={f.id} className="flex items-center justify-between rounded-md border border-line px-3 py-1.5 text-sm">
                  <span className="text-ink">
                    {f.department?.name ?? "—"} — {f.position?.name ?? "—"}
                    {countFor(summary, f.departmentId, f.positionId) !== null && (
                      <span className="ml-2 text-xs text-ink-muted">· {colabLabel(countFor(summary, f.departmentId, f.positionId)!)}</span>
                    )}
                  </span>
                  <button onClick={() => onRemoveFunction(f.id)} className="text-xs text-amber hover:underline">
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function NewFunctionForm({
  gheId,
  departments,
  positions,
  summary,
  onClose,
  onCreated,
}: {
  gheId: string;
  departments: Department[];
  positions: Position[];
  summary: DepartmentSummary[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [departmentId, setDepartmentId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      await api.post("/pgr/ghe-functions", {
        gheId,
        departmentId: departmentId || undefined,
        positionId: positionId || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 rounded-md border border-line p-2">
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-ink-muted">Setor</span>
        <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">Selecione</option>
          {departments.map((d) => {
            const n = countFor(summary, d.id);
            return <option key={d.id} value={d.id}>{d.name}{n !== null ? ` — ${colabLabel(n)}` : ""}</option>;
          })}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-ink-muted">Cargo</span>
        <select className="input" value={positionId} onChange={(e) => setPositionId(e.target.value)}>
          <option value="">Selecione</option>
          {positions.map((p) => {
            const n = departmentId ? countFor(summary, departmentId, p.id) : null;
            return <option key={p.id} value={p.id}>{p.name}{n !== null ? ` — ${colabLabel(n)} no setor` : ""}</option>;
          })}
        </select>
      </label>
      <button type="button" onClick={handleSubmit} disabled={saving} className="btn-primary text-xs">
        {saving ? "Salvando…" : "Salvar"}
      </button>
      <button type="button" onClick={onClose} className="btn-secondary text-xs">Cancelar</button>
      {error && <p className="w-full text-xs text-amber">{error}</p>}
    </div>
  );
}

function AgentForm({
  ltcatId,
  ghes,
  agent,
  onClose,
  onSaved,
}: {
  ltcatId: string;
  ghes: Ghe[];
  agent?: LtcatAgent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!agent;
  const [gheId, setGheId] = useState(agent?.gheId ?? ghes[0]?.id ?? "");
  const [agentCategory, setAgentCategory] = useState<RiskCategory>(agent?.agentCategory ?? "FISICO");
  const [agentName, setAgentName] = useState(agent?.agentName ?? "");
  const [intensityConcentration, setIntensityConcentration] = useState(agent?.intensityConcentration ?? "");
  const [toleranceLimit, setToleranceLimit] = useState(agent?.toleranceLimit ?? "");
  const [measurementMethod, setMeasurementMethod] = useState(agent?.measurementMethod ?? "");
  const [exposureTechnique, setExposureTechnique] = useState(agent?.exposureTechnique ?? "");
  const [effectiveEpi, setEffectiveEpi] = useState(agent?.effectiveEpi ?? "");
  const [conclusion, setConclusion] = useState(agent?.conclusion ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!agentName.trim()) {
      setError("Digite o nome do agente.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEditing) {
        await api.patch(`/ltcat/agents/${agent!.id}`, {
          gheId: gheId || null,
          agentCategory,
          agentName,
          intensityConcentration: intensityConcentration || null,
          toleranceLimit: toleranceLimit || null,
          measurementMethod: measurementMethod || null,
          exposureTechnique: exposureTechnique || null,
          effectiveEpi: effectiveEpi || null,
          conclusion: conclusion || null,
        });
      } else {
        await api.post("/ltcat/agents", {
          ltcatId,
          gheId: gheId || undefined,
          agentCategory,
          agentName,
          intensityConcentration: intensityConcentration || undefined,
          toleranceLimit: toleranceLimit || undefined,
          measurementMethod: measurementMethod || undefined,
          exposureTechnique: exposureTechnique || undefined,
          effectiveEpi: effectiveEpi || undefined,
          conclusion: conclusion || undefined,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-base font-semibold text-ink">{isEditing ? "Editar agente" : "Novo agente ambiental"}</h3>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">GHE</span>
            <select className="input" value={gheId} onChange={(e) => setGheId(e.target.value)}>
              <option value="">Selecione</option>
              {ghes.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Categoria</span>
            <select className="input" value={agentCategory} onChange={(e) => setAgentCategory(e.target.value as RiskCategory)}>
              {Object.entries(RISK_CATEGORY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-ink-muted">Nome do agente</span>
            <input className="input" value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Ex.: Ruído, Poeira, Calor…" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Intensidade/Concentração</span>
            <input className="input" value={intensityConcentration} onChange={(e) => setIntensityConcentration(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Limite de tolerância</span>
            <input className="input" value={toleranceLimit} onChange={(e) => setToleranceLimit(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Método de medição</span>
            <input className="input" value={measurementMethod} onChange={(e) => setMeasurementMethod(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Técnica de avaliação</span>
            <input className="input" value={exposureTechnique} onChange={(e) => setExposureTechnique(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-ink-muted">EPI eficaz</span>
            <input className="input" value={effectiveEpi} onChange={(e) => setEffectiveEpi(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-ink-muted">Conclusão</span>
            <textarea className="input" rows={2} value={conclusion} onChange={(e) => setConclusion(e.target.value)} />
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
