import { useEffect, useMemo, useState } from "react";
import { Copy, Eye, Pencil, Plus, Power, PowerOff, Archive, ListChecks, Search } from "lucide-react";
import { api } from "../../lib/api";
import type { ChecklistTemplateStatus, InspectionTemplate } from "../../lib/types";
import { FREQUENCIES, STATUS_LABEL, STATUS_STYLE } from "../../lib/checklist-config";
import { ChecklistEditor } from "./ChecklistEditor";
import { ChecklistPreview } from "./ChecklistPreview";

type Filter = "TODOS" | ChecklistTemplateStatus;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "TODOS", label: "Todos" },
  { id: "RASCUNHO", label: "Rascunhos" },
  { id: "ATIVO", label: "Ativos" },
  { id: "INATIVO", label: "Inativos" },
  { id: "ARQUIVADO", label: "Arquivados" },
];

/** Modelos de checklist: cadastrar, editar, duplicar, ativar, inativar e arquivar. */
export function TemplatesTab({ companyId }: { companyId?: string }) {
  const [templates, setTemplates] = useState<InspectionTemplate[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editor, setEditor] = useState<{ template?: InspectionTemplate; tab: "dados" | "estrutura" } | null>(null);
  const [previewing, setPreviewing] = useState<InspectionTemplate | null>(null);
  const [filter, setFilter] = useState<Filter>("TODOS");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "erro"; text: string } | null>(null);

  async function load() {
    const path = companyId ? `/field-ops/inspection-templates?companyId=${encodeURIComponent(companyId)}` : "/field-ops/inspection-templates";
    try {
      setTemplates(await api.get<InspectionTemplate[]>(path));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (templates ?? []).filter((t) => {
      if (filter === "TODOS" ? t.status === "ARQUIVADO" : t.status !== filter) return false;
      if (!term) return true;
      return [t.name, t.code ?? "", t.category ?? ""].some((v) => v.toLowerCase().includes(term));
    });
  }, [templates, filter, search]);

  async function changeStatus(t: InspectionTemplate, status: "ATIVO" | "INATIVO" | "ARQUIVADO"): Promise<InspectionTemplate | null> {
    if (status === "ARQUIVADO" && !window.confirm(`Arquivar o modelo "${t.name}"? Ele deixa de aparecer para aplicação. As aplicações já feitas continuam guardadas.`)) {
      return null;
    }
    try {
      const updated = await api.post<InspectionTemplate>(`/field-ops/inspection-templates/${t.id}/status`, { status });
      setMessage({ kind: "ok", text: `Modelo ${STATUS_LABEL[status].toLowerCase()}.` });
      load();
      return updated;
    } catch (err) {
      setMessage({ kind: "erro", text: err instanceof Error ? err.message : "Não foi possível mudar a situação." });
      return null;
    }
  }

  async function duplicate(t: InspectionTemplate) {
    try {
      const copy = await api.post<InspectionTemplate>(`/field-ops/inspection-templates/${t.id}/duplicate`, {});
      setMessage({ kind: "ok", text: `Cópia criada como rascunho (${copy.code}).` });
      await load();
      setEditor({ template: copy, tab: "dados" });
    } catch (err) {
      setMessage({ kind: "erro", text: err instanceof Error ? err.message : "Não foi possível duplicar." });
    }
  }

  const btn = "flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs font-medium text-ink-muted hover:bg-teal-tint hover:text-ink";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-muted">Modelos de checklist — só os ativos podem ser aplicados.</p>
        <button className="btn-primary flex items-center gap-1.5 text-sm" onClick={() => setEditor({ tab: "dados" })}>
          <Plus size={15} /> Criar Checklist
        </button>
      </div>

      {message && (
        <p role={message.kind === "erro" ? "alert" : "status"} className={`mt-3 rounded-md border-l-2 px-3 py-2 text-sm ${message.kind === "erro" ? "border-amber bg-amber-tint" : "border-teal bg-teal-tint"}`}>
          {message.text}
        </p>
      )}

      {editor && (
        <ChecklistEditor
          key={editor.template?.id ?? "novo"}
          companyId={companyId}
          template={editor.template}
          initialTab={editor.tab}
          onClose={() => setEditor(null)}
          onChanged={load}
          onStatus={changeStatus}
        />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por situação">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${filter === f.id ? "bg-teal text-white" : "bg-paper-raised text-ink-muted hover:text-ink"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="relative ml-auto">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-8" placeholder="Buscar por nome, código ou categoria" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar modelos" />
        </label>
      </div>

      {failed && (
        <p role="alert" className="mt-4 rounded-md border-l-2 border-amber bg-amber-tint px-3 py-2 text-sm">
          Não foi possível carregar os modelos. <button className="underline" onClick={load}>Tentar de novo</button>
        </p>
      )}
      {templates === null && !failed && <p className="mt-4 text-sm text-ink-muted">Carregando modelos…</p>}
      {templates && visible.length === 0 && (
        <p className="mt-4 text-sm text-ink-muted">
          {templates.length === 0 ? "Nenhum modelo cadastrado ainda. Clique em “Criar Checklist” para começar." : "Nenhum modelo encontrado com esse filtro."}
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((t) => (
          <div key={t.id} className="card flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">{t.code ?? "—"} · v{t.version}</p>
                <p className="font-medium text-ink">{t.name}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
            </div>
            <p className="text-xs text-ink-muted">
              {[t.category, t.frequency ? FREQUENCIES.find((f) => f.value === t.frequency)?.label : null].filter(Boolean).join(" · ") || "Sem categoria"}
            </p>
            <p className="text-xs text-ink-muted">
              {t.sections.length} seção(ões) · {t.items.length} pergunta(s)
              {t._count?.inspections ? ` · ${t._count.inspections} aplicação(ões)` : ""}
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {t.status !== "ARQUIVADO" && (
                <>
                  <button className={btn} onClick={() => setEditor({ template: t, tab: "estrutura" })}><ListChecks size={12} /> Estrutura</button>
                  <button className={btn} onClick={() => setEditor({ template: t, tab: "dados" })}><Pencil size={12} /> Editar</button>
                </>
              )}
              <button className={btn} onClick={() => setPreviewing(t)}><Eye size={12} /> Prévia</button>
              <button className={btn} onClick={() => duplicate(t)}><Copy size={12} /> Duplicar</button>
              {(t.status === "RASCUNHO" || t.status === "INATIVO") && (
                <button className={btn} onClick={() => changeStatus(t, "ATIVO")}><Power size={12} /> Ativar</button>
              )}
              {t.status === "ATIVO" && (
                <button className={btn} onClick={() => changeStatus(t, "INATIVO")}><PowerOff size={12} /> Inativar</button>
              )}
              {t.status !== "ARQUIVADO" && (
                <button className={btn} onClick={() => changeStatus(t, "ARQUIVADO")}><Archive size={12} /> Arquivar</button>
              )}
              {t.status === "ARQUIVADO" && (
                <button className={btn} onClick={() => changeStatus(t, "INATIVO")}><Power size={12} /> Reativar</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {previewing && <ChecklistPreview template={previewing} onClose={() => setPreviewing(null)} />}
    </div>
  );
}
