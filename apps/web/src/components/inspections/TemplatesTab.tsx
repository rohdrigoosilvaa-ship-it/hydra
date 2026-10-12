import { FormEvent, useEffect, useState } from "react";
import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import type { InspectionTemplate } from "../../lib/types";
import { ChecklistStructureEditor } from "./ChecklistStructureEditor";

/** Tipos de checklist da lista suspensa (gravados no campo "categoria" do roteiro, junto do assunto). */
const CHECKLIST_TYPES = ["Checklist", "Inspeção", "Auditoria", "Observação comportamental"];

/** A categoria é gravada como "Tipo · Assunto" (sem mudar o banco de dados). */
function decodeCategory(category: string | null): { type: string; subject: string } {
  if (!category) return { type: CHECKLIST_TYPES[0]!, subject: "" };
  const [head, ...rest] = category.split(" · ");
  if (CHECKLIST_TYPES.includes(head!)) return { type: head!, subject: rest.join(" · ") };
  return { type: CHECKLIST_TYPES[0]!, subject: category }; // checklists antigos: o texto vira o assunto
}

function encodeCategory(type: string, subject: string): string {
  return subject.trim() ? `${type} · ${subject.trim()}` : type;
}

export function TemplatesTab({ companyId }: { companyId?: string }) {
  const [templates, setTemplates] = useState<InspectionTemplate[] | null>(null);
  const [editor, setEditor] = useState<{ template?: InspectionTemplate; tab: "dados" | "estrutura" } | null>(null);

  async function load() {
    const path = companyId ? `/field-ops/inspection-templates?companyId=${encodeURIComponent(companyId)}` : "/field-ops/inspection-templates";
    setTemplates(await api.get<InspectionTemplate[]>(path));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function handleDelete(t: InspectionTemplate) {
    if (!window.confirm(`Excluir o checklist "${t.name}"?`)) return;
    await api.del(`/field-ops/inspection-templates/${t.id}`);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">Checklists reutilizáveis — cada um é aplicado ao iniciar uma nova inspeção.</p>
        <button className="btn-primary flex items-center gap-1.5 text-sm" onClick={() => setEditor({ tab: "dados" })}>
          <Plus size={15} /> Criar Checklist
        </button>
      </div>

      {editor && (
        <ChecklistEditor
          key={editor.template?.id ?? "novo"}
          companyId={companyId}
          template={editor.template}
          initialTab={editor.tab}
          onClose={() => setEditor(null)}
          onChanged={load}
        />
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates?.length === 0 && <p className="text-sm text-ink-muted">Nenhum checklist cadastrado ainda.</p>}
        {templates?.map((t) => (
          <div key={t.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-ink">{t.name}</p>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => setEditor({ template: t, tab: "estrutura" })} className="text-ink-muted hover:text-teal-deep" title="Estruturar checklist">
                  <ListChecks size={14} />
                </button>
                <button onClick={() => setEditor({ template: t, tab: "dados" })} className="text-ink-muted hover:text-teal-deep" title="Editar dados cadastrais">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(t)} className="text-ink-muted hover:text-danger" title="Excluir checklist">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {t.category && <p className="mt-0.5 text-xs text-ink-muted">{t.category}</p>}
            <p className="mt-2 text-xs text-ink-muted">{t.items.length} item(ns)</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Criação/edição de checklist em duas abas:
 *  - DADOS CADASTRAIS: tipo, nome, assunto e descrição. Ao salvar um checklist novo, a aba ESTRUTURA abre sozinha;
 *  - ESTRUTURA: monta os itens (avaliativo, texto, data e lista de seleção).
 */
function ChecklistEditor({
  companyId,
  template: initial,
  initialTab,
  onClose,
  onChanged,
}: {
  companyId?: string;
  template?: InspectionTemplate;
  initialTab: "dados" | "estrutura";
  onClose: () => void;
  onChanged: () => void;
}) {
  const [template, setTemplate] = useState<InspectionTemplate | undefined>(initial);
  const [tab, setTab] = useState<"dados" | "estrutura">(initialTab);
  const decoded = decodeCategory(initial?.category ?? null);
  const [type, setType] = useState(decoded.type);
  const [name, setName] = useState(initial?.name ?? "");
  const [subject, setSubject] = useState(decoded.subject);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSaveData(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const body = { name: name.trim(), category: encodeCategory(type, subject), description: description.trim() || undefined };
      if (template) {
        setTemplate(await api.patch<InspectionTemplate>(`/field-ops/inspection-templates/${template.id}`, body));
        setNotice("Dados salvos.");
        onChanged();
      } else {
        const created = await api.post<InspectionTemplate>("/field-ops/inspection-templates", { companyId, ...body, items: [] });
        setTemplate(created);
        onChanged();
        setTab("estrutura"); // checklist criado: abre a estrutura para colocar os itens
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const tabClass = (active: boolean) =>
    `border-b-2 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-wider transition-colors ${
      active ? "border-teal text-teal-deep" : "border-transparent text-ink-muted hover:text-ink"
    }`;

  return (
    <div className="card mt-4 flex flex-col gap-0 p-0">
      <div className="flex items-center justify-between border-b border-line px-2">
        <div className="flex">
          <button type="button" className={tabClass(tab === "dados")} onClick={() => setTab("dados")}>
            Dados cadastrais
          </button>
          <button type="button" className={tabClass(tab === "estrutura")} onClick={() => setTab("estrutura")}>
            Estrutura
          </button>
        </div>
        <button type="button" onClick={onClose} className="btn-secondary mr-3 text-xs">
          Fechar
        </button>
      </div>

      <div className="p-5">
        {tab === "dados" && (
          <form onSubmit={handleSaveData} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="font-display font-semibold text-ink">Geral</p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Campos com * são obrigatórios</p>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Tipo de checklist *</span>
              <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                {CHECKLIST_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Nome do checklist *</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} required />
              <span className="self-end text-xs text-ink-muted">{name.length} / 255</span>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Assunto</span>
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex.: Segurança do Trabalho" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Descrição</span>
              <textarea className="input min-h-[90px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} />
              <span className="self-end text-xs text-ink-muted">{description.length} / 5000</span>
            </label>
            {error && <p className="text-sm text-amber">{error}</p>}
            {notice && <p className="text-sm text-teal-deep">{notice}</p>}
            <div className="flex gap-2 border-t border-line pt-4">
              <button type="submit" disabled={saving || name.trim().length < 2} className="btn-primary">
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
      </div>
    </div>
  );
}
