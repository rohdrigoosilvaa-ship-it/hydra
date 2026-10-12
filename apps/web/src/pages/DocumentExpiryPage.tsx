import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { api } from "../lib/api";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import type { Employee, EmployeeDocument, EmployeeDocumentType } from "../lib/types";

const TYPE_LABELS: Record<EmployeeDocumentType, string> = {
  RG: "RG",
  ASO: "ASO",
  PPP: "PPP",
  TREINAMENTO: "Treinamento",
  OUTRO: "Outro",
};

type Situacao = "vigente" | "proximo" | "vencido" | "sem-data";

function classify(expiryDate: string | null): { situacao: Situacao; diasRestantes: number | null } {
  if (!expiryDate) return { situacao: "sem-data", diasRestantes: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - today.getTime();
  const dias = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (dias < 0) return { situacao: "vencido", diasRestantes: dias };
  if (dias <= 30) return { situacao: "proximo", diasRestantes: dias };
  return { situacao: "vigente", diasRestantes: dias };
}

const SITUACAO_STYLE: Record<Situacao, string> = {
  vigente: "bg-teal-tint text-teal-deep",
  proximo: "bg-amber-tint text-amber",
  vencido: "bg-red-100 text-red-700",
  "sem-data": "bg-line text-ink-muted",
};

const SITUACAO_LABEL: Record<Situacao, string> = {
  vigente: "🟢 Vigente",
  proximo: "🟡 Próximo do vencimento",
  vencido: "🔴 Vencido",
  "sem-data": "Sem data",
};

export function DocumentExpiryPage() {
  const [documents, setDocuments] = useState<EmployeeDocument[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [typeFilter, setTypeFilter] = useState<EmployeeDocumentType | "">("");
  const [situacaoFilter, setSituacaoFilter] = useState<Situacao | "">("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedCompanyId = useCompanyFilterStore((s) => s.selectedCompanyId);

  async function load() {
    try {
      const path = selectedCompanyId
        ? `/employee-documents?companyId=${encodeURIComponent(selectedCompanyId)}`
        : "/employee-documents";
      const [docs, emps] = await Promise.all([
        api.get<EmployeeDocument[]>(path),
        api.get<Employee[]>(selectedCompanyId ? `/employees?companyId=${encodeURIComponent(selectedCompanyId)}` : "/employees"),
      ]);
      setDocuments(docs);
      setEmployees(emps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar documentos.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId]);

  const rows = useMemo(() => {
    if (!documents) return null;
    return documents
      .map((doc) => ({ doc, ...classify(doc.expiryDate) }))
      .filter((r) => !typeFilter || r.doc.type === typeFilter)
      .filter((r) => !situacaoFilter || r.situacao === situacaoFilter)
      .filter((r) => {
        const term = search.trim().toLowerCase();
        if (!term) return true;
        return r.doc.employee?.name.toLowerCase().includes(term);
      })
      .sort((a, b) => (a.diasRestantes ?? Infinity) - (b.diasRestantes ?? Infinity));
  }, [documents, typeFilter, situacaoFilter, search]);

  const counts = useMemo(() => {
    if (!documents) return { vigente: 0, proximo: 0, vencido: 0 };
    const classified = documents.map((d) => classify(d.expiryDate).situacao);
    return {
      vigente: classified.filter((s) => s === "vigente").length,
      proximo: classified.filter((s) => s === "proximo").length,
      vencido: classified.filter((s) => s === "vencido").length,
    };
  }, [documents]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Controle de Vencimentos de Documentos</h1>
          <p className="mt-1 text-sm text-ink-muted">RG, ASO, PPP e treinamentos dos colaboradores.</p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Registrar documento
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-md bg-teal-tint px-3 py-1.5 text-xs font-medium text-teal-deep">{counts.vigente} Vigentes</span>
        <span className="rounded-md bg-amber-tint px-3 py-1.5 text-xs font-medium text-amber">{counts.proximo} Próximos do vencimento</span>
        <span className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700">{counts.vencido} Vencidos</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Pesquisar colaborador…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-[180px]" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as EmployeeDocumentType | "")}>
          <option value="">Todos os tipos</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select className="input max-w-[220px]" value={situacaoFilter} onChange={(e) => setSituacaoFilter(e.target.value as Situacao | "")}>
          <option value="">Todas as situações</option>
          <option value="vigente">🟢 Vigente</option>
          <option value="proximo">🟡 Próximo do vencimento</option>
          <option value="vencido">🔴 Vencido</option>
        </select>
      </div>

      {error && <p className="mt-4 rounded-md border-l-2 border-amber bg-amber-tint px-3 py-2 text-sm">{error}</p>}

      {showForm && (
        <DocumentForm
          employees={employees}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      <div className="mt-6 panel">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Funcionário</th>
              <th className="px-4 py-3 font-medium">Documento</th>
              <th className="px-4 py-3 font-medium">Unidade</th>
              <th className="px-4 py-3 font-medium">Setor</th>
              <th className="px-4 py-3 font-medium">Cargo</th>
              <th className="px-4 py-3 font-medium">Emissão</th>
              <th className="px-4 py-3 font-medium">Vencimento</th>
              <th className="px-4 py-3 font-medium">Dias restantes</th>
              <th className="px-4 py-3 font-medium">Situação</th>
            </tr>
          </thead>
          <tbody>
            {rows === null && (
              <tr><td className="px-4 py-6 text-ink-muted" colSpan={9}>Carregando…</td></tr>
            )}
            {rows?.length === 0 && (
              <tr><td className="px-4 py-6 text-ink-muted" colSpan={9}>Nenhum documento encontrado.</td></tr>
            )}
            {rows?.map(({ doc, situacao, diasRestantes }) => (
              <tr key={doc.id} className="border-b border-line last:border-none">
                <td className="px-4 py-3 text-ink">{doc.employee?.name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-muted">{TYPE_LABELS[doc.type]}{doc.name ? ` — ${doc.name}` : ""}</td>
                <td className="px-4 py-3 text-ink-muted">{doc.employee?.branch?.name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-muted">{doc.employee?.department?.name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-muted">{doc.employee?.position?.name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-muted">{doc.issueDate ? new Date(doc.issueDate).toLocaleDateString("pt-BR") : "—"}</td>
                <td className="px-4 py-3 text-ink-muted">{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString("pt-BR") : "—"}</td>
                <td className="px-4 py-3 text-ink-muted">{diasRestantes ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${SITUACAO_STYLE[situacao]}`}>
                    {SITUACAO_LABEL[situacao]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocumentForm({
  employees,
  onClose,
  onSaved,
}: {
  employees: Employee[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [type, setType] = useState<EmployeeDocumentType>("ASO");
  const [name, setName] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/employee-documents", {
        employeeId,
        type,
        name: name || undefined,
        issueDate: issueDate || undefined,
        expiryDate: expiryDate || undefined,
        notes: notes || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-ink-muted">Registrar documento</h3>
        <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Colaborador</span>
          <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
            {employees.length === 0 && <option value="">Nenhum colaborador disponível</option>}
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Tipo de documento</span>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as EmployeeDocumentType)}>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        {(type === "TREINAMENTO" || type === "OUTRO") && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Nome (ex.: NR-35)</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Data de emissão</span>
          <input type="date" className="input" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Data de vencimento</span>
          <input type="date" className="input" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Observações</span>
        <textarea className="input min-h-[70px] resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="flex items-center gap-3 border-t border-line pt-4">
        <button type="submit" disabled={saving || !employeeId} className="btn-primary">
          {saving ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        {error && <p className="text-sm text-amber">{error}</p>}
      </div>
    </form>
  );
}
