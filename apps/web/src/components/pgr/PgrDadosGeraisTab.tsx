import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Building2, CalendarDays, FileText, Image as ImageIcon, Pencil, Users } from "lucide-react";
import { api } from "../../lib/api";
import type { Company, PgrDetail } from "../../lib/types";
import { Field, SectionCard } from "./pgr-shared";

export function PgrDadosGeraisTab({ pgr, onChanged }: { pgr: PgrDetail; onChanged: () => void }) {
  const [showDocForm, setShowDocForm] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    api.get<Company>(`/companies/${pgr.companyId}`).then(setCompany);
  }, [pgr.companyId]);

  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : null);
  const council =
    pgr.technicalResponsibleCouncil || pgr.technicalResponsibleUf
      ? `${pgr.technicalResponsibleCouncil ?? "—"} / ${pgr.technicalResponsibleUf ?? "—"}`
      : null;

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Dados do documento"
        subtitle="Identificação, vigência, equipe e responsáveis que aparecem na capa e nas assinaturas do PGR."
        icon={FileText}
        actions={
          <button className="btn-secondary flex items-center gap-1.5 text-xs" onClick={() => setShowDocForm((v) => !v)}>
            <Pencil size={13} /> {showDocForm ? "Fechar" : "Editar"}
          </button>
        }
      >
        <div className="flex items-center gap-3 rounded-lg bg-paper p-3">
          {company?.logoUrl ? (
            <img src={company.logoUrl} alt="" className="h-12 w-12 rounded border border-line bg-paper-raised object-contain" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded border border-line bg-paper-raised text-ink-muted">
              <ImageIcon size={18} />
            </span>
          )}
          <div className="text-sm">
            <p className="font-medium text-ink">{company?.name ?? "Empresa"}</p>
            <Link to="/minha-empresa" className="text-xs text-teal-deep hover:underline">
              {company?.logoUrl ? "Trocar logo" : "Enviar logo"} em Minha Empresa
            </Link>
          </div>
        </div>

        {showDocForm && (
          <DocumentForm
            pgr={pgr}
            onClose={() => setShowDocForm(false)}
            onSaved={() => {
              setShowDocForm(false);
              onChanged();
            }}
          />
        )}
      </SectionCard>

      {!showDocForm && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="Documento" icon={CalendarDays}>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Field label="Código" value={pgr.code} />
              <Field label="Emitido em" value={fmt(pgr.issuedAt)} />
              <div className="sm:col-span-2">
                <Field
                  label="Vigência"
                  value={pgr.validFrom || pgr.validUntil ? `${fmt(pgr.validFrom) ?? "—"} a ${fmt(pgr.validUntil) ?? "—"}` : null}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Equipe do documento" icon={Users}>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <Field label="Elaborado por" value={pgr.preparedBy} />
              <Field label="Revisado por" value={pgr.reviewedBy} />
              <Field label="Aprovado por" value={pgr.approvedBy} />
            </div>
          </SectionCard>

          <SectionCard title="Responsável pela empresa" icon={Building2}>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Field label="Nome" value={pgr.companyResponsibleName} />
              <Field label="Cargo" value={pgr.companyResponsibleRole} />
            </div>
          </SectionCard>

          <SectionCard title="Responsável técnico" icon={BadgeCheck}>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Field label="Nome" value={pgr.technicalResponsibleName} />
              <Field label="Especialidade" value={pgr.technicalResponsibleSpecialty} />
              <Field label="Registro profissional" value={pgr.technicalResponsibleRegistry} />
              <Field label="Conselho / UF" value={council} />
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function DocumentForm({
  pgr,
  onClose,
  onSaved,
}: {
  pgr: PgrDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(pgr.code ?? "");
  const [issuedAt, setIssuedAt] = useState(pgr.issuedAt ? pgr.issuedAt.slice(0, 10) : "");
  const [validFrom, setValidFrom] = useState(pgr.validFrom ? pgr.validFrom.slice(0, 10) : "");
  const [validUntil, setValidUntil] = useState(pgr.validUntil ? pgr.validUntil.slice(0, 10) : "");
  const [preparedBy, setPreparedBy] = useState(pgr.preparedBy ?? "");
  const [reviewedBy, setReviewedBy] = useState(pgr.reviewedBy ?? "");
  const [approvedBy, setApprovedBy] = useState(pgr.approvedBy ?? "");
  const [companyResponsibleName, setCompanyResponsibleName] = useState(pgr.companyResponsibleName ?? "");
  const [companyResponsibleRole, setCompanyResponsibleRole] = useState(pgr.companyResponsibleRole ?? "");
  const [technicalResponsibleName, setTechnicalResponsibleName] = useState(pgr.technicalResponsibleName ?? "");
  const [technicalResponsibleSpecialty, setTechnicalResponsibleSpecialty] = useState(pgr.technicalResponsibleSpecialty ?? "");
  const [technicalResponsibleRegistry, setTechnicalResponsibleRegistry] = useState(pgr.technicalResponsibleRegistry ?? "");
  const [technicalResponsibleCouncil, setTechnicalResponsibleCouncil] = useState(pgr.technicalResponsibleCouncil ?? "");
  const [technicalResponsibleUf, setTechnicalResponsibleUf] = useState(pgr.technicalResponsibleUf ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/pgr/${pgr.id}`, {
        code: code || undefined,
        issuedAt: issuedAt || undefined,
        validFrom: validFrom || undefined,
        validUntil: validUntil || undefined,
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
          <span className="text-ink-muted">Data de emissão</span>
          <input type="date" className="input" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Vigência de</span>
          <input type="date" className="input" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Vigência até</span>
          <input type="date" className="input" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
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
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancelar
        </button>
        {error && <p className="text-sm text-amber">{error}</p>}
      </div>
    </form>
  );
}
