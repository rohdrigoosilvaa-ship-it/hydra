import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import type { Company, PsychosocialSurvey } from "../lib/types";

const STATUS_LABEL: Record<PsychosocialSurvey["status"], string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativa",
  CLOSED: "Encerrada",
};
const STATUS_STYLE: Record<PsychosocialSurvey["status"], string> = {
  DRAFT: "bg-line text-ink-muted",
  ACTIVE: "bg-teal-tint text-teal-deep",
  CLOSED: "bg-amber-tint text-amber",
};

export function PsychosocialListPage() {
  const [surveys, setSurveys] = useState<PsychosocialSurvey[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [surveyList, companyList] = await Promise.all([
      api.get<PsychosocialSurvey[]>("/psicossocial/surveys"),
      api.get<Company[]>("/companies"),
    ]);
    setSurveys(surveyList);
    setCompanies(companyList);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Riscos Psicossociais</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Identificação, análise e avaliação dos fatores psicossociais relacionados ao trabalho — a pesquisa é uma
            das ferramentas do processo, não um sinônimo de conformidade com a NR-01.
          </p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Nova pesquisa
        </button>
      </div>

      <p className="mt-3 rounded-md border-l-2 border-line bg-paper-raised px-3 py-2 text-xs text-ink-muted">
        Este módulo identifica e gerencia fatores relacionados à organização e às condições de trabalho. Não realiza
        diagnóstico de ansiedade, depressão, burnout ou qualquer outra condição clínica — as respostas não são
        utilizadas para gerar diagnóstico médico ou psicológico.
      </p>

      {showForm && (
        <NewSurveyForm
          companies={companies}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {surveys === null && <p className="text-sm text-ink-muted">Carregando…</p>}
        {surveys?.length === 0 && <p className="text-sm text-ink-muted">Nenhuma pesquisa cadastrada ainda.</p>}
        {surveys?.map((s) => {
          const invited = s._count?.invites ?? 0;
          const responded = s._count?.responses ?? 0;
          const pct = invited > 0 ? Math.round((responded / invited) * 100) : 0;
          return (
            <Link key={s.id} to={`/nr01/psicossocial/${s.id}`} className="card block hover:border-teal">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-ink">{s.title}</p>
                <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s.status]}`}>
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
              <p className="mt-2 font-mono text-xs text-ink-muted">
                {s._count?.questions ?? 0} perguntas · {responded}/{invited} respostas ({pct}%)
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NewSurveyForm({
  companies,
  onClose,
  onCreated,
}: {
  companies: Company[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/psicossocial/surveys", {
        title,
        companyId,
        description: description || undefined,
        useSampleQuestions: true,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Título da campanha</span>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex.: Avaliação Psicossocial 2026.1"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Empresa</span>
          <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
            {companies.length === 0 && <option value="">Cadastre uma empresa primeiro</option>}
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Descrição (opcional)</span>
        <textarea className="input min-h-[60px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <p className="rounded-md border-l-2 border-teal bg-teal-tint px-3 py-2 text-xs text-ink-muted">
        A pesquisa já nasce com 21 perguntas de exemplo (fictícias), organizadas em 7 dimensões, só para você visualizar
        o formato. Assim que tiver o questionário oficial (ex.: HSE-IT), edite ou substitua as perguntas na tela da
        pesquisa.
      </p>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving || !companyId} className="btn-primary">
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
