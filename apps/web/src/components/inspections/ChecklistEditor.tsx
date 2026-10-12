import { FormEvent, useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { api } from "../../lib/api";
import type {
  Branch,
  ChecklistFrequency,
  Department,
  InspectionTemplate,
  InspectionTemplateHistoryEntry,
  NonConformityCreation,
} from "../../lib/types";
import {
  FREQUENCIES,
  HISTORY_ACTION_LABEL,
  STATUS_LABEL,
  STATUS_STYLE,
  formatDateTime,
} from "../../lib/checklist-config";
import { ChecklistStructureEditor } from "./ChecklistStructureEditor";
import { ChecklistPreview } from "./ChecklistPreview";

type Tab = "dados" | "estrutura" | "historico";

const CATEGORY_SUGGESTIONS = ["Inspeção", "Auditoria", "Rotina operacional", "Segurança do Trabalho", "Qualidade", "Meio ambiente"];

/**
 * Criação/edição de um modelo de checklist, em abas:
 *  - DADOS CADASTRAIS (ao salvar um modelo novo, a aba ESTRUTURA abre sozinha);
 *  - ESTRUTURA (seções e perguntas);
 *  - HISTÓRICO (quem alterou o quê).
 */
export function ChecklistEditor({
  companyId,
  template: initial,
  initialTab,
  onClose,
  onChanged,
  onStatus,
}: {
  companyId?: string;
  template?: InspectionTemplate;
  initialTab: Tab;
  onClose: () => void;
  onChanged: () => void;
  onStatus: (template: InspectionTemplate, status: "ATIVO" | "INATIVO" | "ARQUIVADO") => Promise<InspectionTemplate | null>;
}) {
  const [template, setTemplate] = useState<InspectionTemplate | undefined>(initial);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [preview, setPreview] = useState(false);

  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [frequency, setFrequency] = useState<ChecklistFrequency | "">(initial?.frequency ?? "");
  const [branchId, setBranchId] = useState(initial?.branchId ?? "");
  const [departmentId, setDepartmentId] = useState(initial?.departmentId ?? "");
  const [processName, setProcessName] = useState(initial?.process ?? "");
  const [responsibleId, setResponsibleId] = useState(initial?.responsibleId ?? "");
  const [ncCreation, setNcCreation] = useState<NonConformityCreation>(initial?.ncCreation ?? "MANUAL");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const scopeCompanyId = template?.companyId ?? companyId;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [history, setHistory] = useState<InspectionTemplateHistoryEntry[] | null>(null);

  useEffect(() => {
    api.get<{ id: string; name: string }[]>("/field-ops/inspection-templates/responsibles").then(setPeople).catch(() => setPeople([]));
  }, []);
  useEffect(() => {
    if (!scopeCompanyId) return;
    const q = encodeURIComponent(scopeCompanyId);
    api.get<Branch[]>(`/branches?companyId=${q}`).then(setBranches).catch(() => setBranches([]));
    api.get<Department[]>(`/departments?companyId=${q}`).then(setDepartments).catch(() => setDepartments([]));
  }, [scopeCompanyId]);
  useEffect(() => {
    if (tab !== "historico" || !template) return;
    api.get<InspectionTemplateHistoryEntry[]>(`/field-ops/inspection-templates/${template.id}/history`).then(setHistory).catch(() => setHistory([]));
  }, [tab, template]);

  async function handleSaveData(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    const body = {
      name: name.trim(),
      category: category.trim() || undefined,
      description: description.trim() || undefined,
      frequency: frequency || undefined,
      branchId: branchId || undefined,
      departmentId: departmentId || undefined,
      process: processName.trim() || undefined,
      responsibleId: responsibleId || undefined,
      ncCreation,
    };
    try {
      if (template) {
        const updated = await api.patch<InspectionTemplate>(`/field-ops/inspection-templates/${template.id}`, body);
        setNotice(
          updated.id !== template.id
            ? `Dados salvos. Como o modelo já foi aplicado, foi criada a versão ${updated.version} — as aplicações anteriores continuam na versão ${template.version}.`
            : "Dados salvos.",
        );
        setTemplate(updated);
      } else {
        const created = await api.post<InspectionTemplate>("/field-ops/inspection-templates", { companyId, ...body });
        setTemplate(created);
        setTab("estrutura"); // modelo criado: abre a estrutura para montar as perguntas
      }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(status: "ATIVO" | "INATIVO" | "ARQUIVADO") {
    if (!template) return;
    const updated = await onStatus(template, status);
    if (updated) setTemplate(updated);
  }

  const tabClass = (active: boolean) =>
    `border-b-2 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-wider transition-colors ${
      active ? "border-teal text-teal-deep" : "border-transparent text-ink-muted hover:text-ink"
    }`;
  const locked = template?.status === "ARQUIVADO";

  return (
    <div className="card mt-4 flex flex-col gap-0 p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-2">
        <div className="flex" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "dados"} className={tabClass(tab === "dados")} onClick={() => setTab("dados")}>Dados cadastrais</button>
          <button type="button" role="tab" aria-selected={tab === "estrutura"} className={tabClass(tab === "estrutura")} onClick={() => setTab("estrutura")}>Estrutura</button>
          <button type="button" role="tab" aria-selected={tab === "historico"} className={tabClass(tab === "historico")} onClick={() => setTab("historico")} disabled={!template}>Histórico</button>
        </div>
        <div className="mr-3 flex flex-wrap items-center gap-2">
          {template && (
            <>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[template.status]}`}>{STATUS_LABEL[template.status]}</span>
              <button type="button" className="btn-secondary flex items-center gap-1 text-xs" onClick={() => setPreview(true)}>
                <Eye size={13} /> Prévia
              </button>
              {(template.status === "RASCUNHO" || template.status === "INATIVO") && (
                <button type="button" className="btn-primary text-xs" onClick={() => handleStatus("ATIVO")}>Ativar modelo</button>
              )}
              {template.status === "ATIVO" && (
                <button type="button" className="btn-secondary text-xs" onClick={() => handleStatus("INATIVO")}>Inativar</button>
              )}
            </>
          )}
          <button type="button" onClick={onClose} className="btn-secondary text-xs">Fechar</button>
        </div>
      </div>

      <div className="p-5">
        {locked && (
          <p className="mb-4 rounded-md border-l-2 border-amber bg-amber-tint px-3 py-2 text-sm">
            Modelo arquivado: não pode ser editado. Duplique-o para criar uma cópia, ou reative-o pela lista.
          </p>
        )}

        {tab === "dados" && (
          <form onSubmit={handleSaveData} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="font-display font-semibold text-ink">Geral</p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Campos com * são obrigatórios</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink-muted">Código</span>
                <input className="input" value={template?.code ?? "Gerado ao salvar"} disabled />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink-muted">Versão</span>
                <input className="input" value={template ? `v${template.version}` : "v1"} disabled />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink-muted">Situação</span>
                <input className="input" value={template ? STATUS_LABEL[template.status] : "Rascunho"} disabled />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Nome do checklist *</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} required disabled={locked} />
              <span className="self-end text-xs text-ink-muted">{name.length} / 255</span>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink-muted">Categoria</span>
                <input className="input" list="checklist-categories" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex.: Inspeção, Auditoria" disabled={locked} />
                <datalist id="checklist-categories">
                  {CATEGORY_SUGGESTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink-muted">Frequência</span>
                <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value as ChecklistFrequency | "")} disabled={locked}>
                  <option value="">Não definida</option>
                  {FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Descrição</span>
              <textarea className="input min-h-[90px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} disabled={locked} />
              <span className="self-end text-xs text-ink-muted">{description.length} / 5000</span>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink-muted">Unidade relacionada</span>
                <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)} disabled={locked || !scopeCompanyId}>
                  <option value="">Todas</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink-muted">Setor relacionado</span>
                <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} disabled={locked || !scopeCompanyId}>
                  <option value="">Todos</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink-muted">Processo relacionado</span>
                <input className="input" value={processName} onChange={(e) => setProcessName(e.target.value)} disabled={locked} />
              </label>
            </div>
            {!scopeCompanyId && (
              <p className="-mt-2 text-xs text-ink-muted">Selecione uma empresa no filtro do topo para escolher unidade e setor.</p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink-muted">Responsável pelo modelo</span>
                <select className="input" value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)} disabled={locked}>
                  <option value="">Sem responsável</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink-muted">Quando a resposta for “não conforme”</span>
                <select className="input" value={ncCreation} onChange={(e) => setNcCreation(e.target.value as NonConformityCreation)} disabled={locked}>
                  <option value="MANUAL">Quem aplica decide se registra a não conformidade</option>
                  <option value="AUTOMATICA">Registrar a não conformidade automaticamente</option>
                </select>
              </label>
            </div>

            {template && (
              <p className="text-xs text-ink-muted">
                Criado em {formatDateTime(template.createdAt)} · última atualização em {formatDateTime(template.updatedAt)}
              </p>
            )}

            {error && <p className="text-sm text-amber" role="alert">{error}</p>}
            {notice && <p className="text-sm text-teal-deep" role="status">{notice}</p>}
            <div className="flex gap-2 border-t border-line pt-4">
              <button type="submit" disabled={saving || locked || name.trim().length < 2} className="btn-primary">
                {saving ? "Salvando…" : template ? "Salvar dados" : "Salvar e estruturar"}
              </button>
            </div>
          </form>
        )}

        {tab === "estrutura" &&
          (template ? (
            <ChecklistStructureEditor
              key={template.id}
              template={template}
              onSaved={(updated) => {
                setTemplate(updated);
                onChanged();
              }}
            />
          ) : (
            <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
              Salve os dados cadastrais para começar a estruturar o checklist.
            </p>
          ))}

        {tab === "historico" && (
          <div>
            {history === null && <p className="text-sm text-ink-muted">Carregando histórico…</p>}
            {history?.length === 0 && <p className="text-sm text-ink-muted">Nenhum registro ainda.</p>}
            <ol className="flex flex-col gap-2">
              {history?.map((h) => (
                <li key={h.id} className="rounded-md border border-line px-3 py-2 text-sm">
                  <p className="font-medium text-ink">{HISTORY_ACTION_LABEL[h.action] ?? h.action}</p>
                  {h.details && <p className="text-ink-muted">{h.details}</p>}
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {h.userName ?? "Usuário"} · {formatDateTime(h.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {preview && template && <ChecklistPreview template={template} onClose={() => setPreview(false)} />}
    </div>
  );
}
