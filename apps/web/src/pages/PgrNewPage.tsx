import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { api } from "../lib/api";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import { ModalField } from "../components/ui/modal";
import { RichTextEditor } from "../components/ui/RichTextEditor";
import { RiskCategoryBadge } from "../components/risk/RiskCategoryBadge";
import { riskResult } from "../lib/risk-assessment";
import { monthLabel } from "./company/ActionScheduleModal";
import type { ActionSchedule, Company, Position, WorkEnvironment } from "../lib/types";

const STEPS = [
  { id: "dados", label: "1 · Dados gerais" },
  { id: "modelo", label: "Texto do documento" },
  { id: "ambientes", label: "2 · Ambientes e cargos" },
  { id: "riscos", label: "3 · Inventário de riscos" },
  { id: "plano", label: "4 · Plano de ação" },
] as const;

const today = () => new Date().toISOString().slice(0, 10);
const plusYears = (iso: string, n: number) => `${Number(iso.slice(0, 4)) + n}${iso.slice(4)}`;

/** Novo PGR: dados gerais → texto editável → ambientes (GHE) e cargos → riscos → plano de ação, tudo puxado da empresa. */
export function PgrNewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const filterCompany = useCompanyFilterStore((s) => s.selectedCompanyId);
  const [step, setStep] = useState(0);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState(params.get("companyId") ?? filterCompany ?? "");

  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [author, setAuthor] = useState("");
  const [coordinator, setCoordinator] = useState("");
  const [issuedAt, setIssuedAt] = useState(today());
  const [validFrom, setValidFrom] = useState(today());
  const [renewalAt, setRenewalAt] = useState(plusYears(today(), 2));
  const [description, setDescription] = useState("");

  const [modelHtml, setModelHtml] = useState("");
  const [modelTouched, setModelTouched] = useState(false);

  const [environments, setEnvironments] = useState<WorkEnvironment[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [schedules, setSchedules] = useState<ActionSchedule[]>([]);
  const [envIds, setEnvIds] = useState<string[]>([]);
  const [scheduleIds, setScheduleIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Company[]>("/companies").then((list) => {
      setCompanies(list);
      setCompanyId((cur) => cur || list[0]?.id || "");
    }).catch(() => setCompanies([]));
    api.get<{ html: string }>("/pgr/model-default").then((r) => setModelHtml(r.html)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      api.get<WorkEnvironment[]>(`/environments?companyId=${companyId}`),
      api.get<Position[]>(`/positions?companyId=${companyId}`),
      api.get<ActionSchedule[]>(`/action-schedules?companyId=${companyId}`),
    ])
      .then(([envs, pos, sch]) => {
        setEnvironments(envs);
        setPositions(pos);
        setSchedules(sch);
        setEnvIds(envs.map((e) => e.id));
        setScheduleIds(sch.map((s) => s.id));
      })
      .catch(() => undefined);
  }, [companyId]);

  const company = companies.find((c) => c.id === companyId);
  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const positionsOf = (envId: string) => positions.filter((p) => (p.environments ?? []).some((e) => e.environmentId === envId));
  const chosenEnvs = useMemo(() => environments.filter((e) => envIds.includes(e.id)), [environments, envIds]);
  const totalRisks = chosenEnvs.reduce((n, e) => n + new Set(positionsOf(e.id).flatMap((p) => (p.risks ?? []).map((r) => r.hazardId))).size, 0);
  const dadosOk = !!companyId && title.trim().length >= 2 && author.trim().length >= 2 && !!issuedAt && !!validFrom;

  async function generate() {
    setSaving(true);
    setError(null);
    try {
      const pgr = await api.post<{ id: string }>("/pgr/generate", {
        companyId,
        title: title.trim(),
        code: code.trim() || undefined,
        preparedBy: author.trim(),
        coordinator: coordinator.trim() || undefined,
        issuedAt,
        validFrom,
        renewalAt: renewalAt || undefined,
        description: description.trim() || undefined,
        modelHtml: modelTouched ? modelHtml : undefined,
        environmentIds: envIds,
        scheduleIds,
      });
      navigate(`/pgr/${pgr.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar o PGR.");
      setSaving(false);
    }
  }

  const last = step === STEPS.length - 1;

  return (
    <div>
      <Link to="/pgr" className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={14} /> PGRs
      </Link>
      <h1 className="font-display text-2xl font-semibold text-ink">Novo PGR</h1>
      <p className="mt-1 text-sm text-ink-muted">Os ambientes, cargos, riscos e planos de ação são puxados do cadastro da empresa.</p>

      <nav aria-label="Etapas do novo PGR" className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => (i <= step || dadosOk) && setStep(i)}
            aria-current={i === step ? "step" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${i === step ? "border-teal bg-teal-tint text-teal-deep" : "border-line text-ink-muted hover:text-ink"}`}
          >
            {i < step && <Check size={14} />} {s.label}
          </button>
        ))}
      </nav>

      <div className="card mt-4">
        {step === 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <ModalField label="Empresa" required>
              <select className="input" aria-label="Empresa" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </ModalField>
            <div className="md:col-span-2">
              <ModalField label="Título deste documento" required>
                <input className="input" aria-label="Título deste documento" value={title} onChange={(e) => setTitle(e.target.value)} />
              </ModalField>
            </div>
            <ModalField label="Autor" required>
              <input className="input" aria-label="Autor" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </ModalField>
            <ModalField label="Coordenador">
              <input className="input" aria-label="Coordenador" value={coordinator} onChange={(e) => setCoordinator(e.target.value)} />
            </ModalField>
            <ModalField label="Código do documento">
              <input className="input" aria-label="Código do documento" placeholder="ex.: PGR-2026-001" value={code} onChange={(e) => setCode(e.target.value)} />
            </ModalField>
            <ModalField label="Data do documento" required>
              <input className="input" type="date" aria-label="Data do documento" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
            </ModalField>
            <ModalField label="Início da validade" required>
              <input className="input" type="date" aria-label="Início da validade" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            </ModalField>
            <ModalField label="Data sugerida para renovação (opcional)">
              <input className="input" type="date" aria-label="Data sugerida para renovação" value={renewalAt} onChange={(e) => setRenewalAt(e.target.value)} />
            </ModalField>
            <div className="md:col-span-3">
              <ModalField label="Descrição / observações">
                <textarea className="input min-h-[5rem]" aria-label="Descrição / observações" value={description} onChange={(e) => setDescription(e.target.value)} />
              </ModalField>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="mb-3 text-sm text-ink-muted">
              Este é o texto padrão do PGR. Escreva por cima ou acrescente o que quiser; um título novo vira um capítulo extra no final do documento.
            </p>
            <RichTextEditor value={modelHtml} onChange={(h) => { setModelHtml(h); setModelTouched(true); }} />
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-3 text-sm text-ink-muted">Cada ambiente de {company?.name ?? "a empresa"} vira um GHE do PGR, com os cargos que transitam nele.</p>
            {environments.length === 0 && <p className="text-sm text-ink-muted">Nenhum ambiente cadastrado. Cadastre em Mapeamento › Ambiente.</p>}
            <div className="flex flex-col gap-3">
              {environments.map((env) => {
                const pos = positionsOf(env.id);
                return (
                  <label key={env.id} className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3">
                    <input type="checkbox" className="mt-1" aria-label={`Incluir ${env.name}`} checked={envIds.includes(env.id)} onChange={() => toggle(envIds, setEnvIds, env.id)} />
                    <div>
                      <p className="font-medium text-ink">{env.name} <span className="text-xs font-normal text-ink-muted">(GHE)</span></p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {pos.length ? `Cargos: ${pos.map((p) => p.name).join(", ")}` : "Nenhum cargo vinculado a este ambiente."}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="mb-3 text-sm text-ink-muted">Riscos já vinculados aos cargos de cada ambiente ({totalRisks} no total). Para mudar, edite o cargo em Mapeamento › GHE / Cargos.</p>
            {chosenEnvs.length === 0 && <p className="text-sm text-ink-muted">Nenhum ambiente escolhido na etapa anterior.</p>}
            <div className="flex flex-col gap-4">
              {chosenEnvs.map((env) => (
                <div key={env.id}>
                  <p className="font-display text-sm font-semibold text-ink">{env.name}</p>
                  <div className="mt-1 divide-y divide-line rounded-md border border-line">
                    {positionsOf(env.id).flatMap((p) =>
                      (p.risks ?? []).map((r) => {
                        const res = riskResult(r.probability, r.severity, r.certainty);
                        return (
                          <div key={`${p.id}-${r.hazardId}`} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                            <span className="w-44 shrink-0 text-ink-muted">{p.name}</span>
                            <RiskCategoryBadge category={r.hazard.category} />
                            <span className="text-ink">{r.hazard.name}</span>
                            {res ? <span className="rounded px-2 py-0.5 text-xs text-ink" style={{ background: res.color }}>{res.label}</span> : <span className="text-xs text-ink-muted">não avaliado</span>}
                          </div>
                        );
                      }),
                    )}
                    {positionsOf(env.id).every((p) => (p.risks ?? []).length === 0) && <p className="px-3 py-2 text-sm text-ink-muted">Nenhum risco vinculado aos cargos deste ambiente.</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <p className="mb-3 text-sm text-ink-muted">Cronogramas de ação cadastrados na empresa. Os marcados entram no plano de ação do PGR.</p>
            {schedules.length === 0 && <p className="text-sm text-ink-muted">Nenhum cronograma cadastrado. Cadastre em Segurança › Plano / Cronograma de Ações.</p>}
            <div className="flex flex-col gap-2">
              {schedules.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-line p-3 text-sm">
                  <input type="checkbox" aria-label={`Incluir ${s.name}`} checked={scheduleIds.includes(s.id)} onChange={() => toggle(scheduleIds, setScheduleIds, s.id)} />
                  <span className="font-medium text-ink">{s.name}</span>
                  <span className="text-xs text-ink-muted">
                    {s.type === "W5H2" ? "5W2H" : "Geral"} · {s.mode === "DEFINED" ? "Versão final" : "Rascunho"} · {s.items.length} ação(ões) · a partir de {monthLabel(s.startMonth.slice(0, 7))}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-amber" role="alert">{error}</p>}
      <div className="mt-4 flex items-center justify-between">
        <button type="button" className="btn-secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Voltar</button>
        {last ? (
          <button type="button" className="btn-primary" disabled={!dadosOk || saving} onClick={generate}>{saving ? "Gerando…" : "Gerar PGR"}</button>
        ) : (
          <button type="button" className="btn-primary" disabled={step === 0 && !dadosOk} onClick={() => setStep((s) => s + 1)}>Próximo</button>
        )}
      </div>
    </div>
  );
}
