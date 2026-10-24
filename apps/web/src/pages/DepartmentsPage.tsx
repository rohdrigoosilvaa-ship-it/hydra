import { FormEvent, useEffect, useState } from "react";
import { ModalFrame } from "../components/ui/modal";
import { Pencil, Plus, Trash2, Upload, X, UsersRound, CheckCircle2, CircleOff } from "lucide-react";
import { api } from "../lib/api";
import { StatTile } from "../components/ui/cards";
import { DataLoadWizard } from "../components/DataLoadWizard";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import type { Branch, Company, Department } from "../lib/types";

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedCompanyId = useCompanyFilterStore((s) => s.selectedCompanyId);

  async function load() {
    try {
      const departmentPath = selectedCompanyId
        ? `/departments?companyId=${encodeURIComponent(selectedCompanyId)}`
        : "/departments";
      const branchPath = selectedCompanyId
        ? `/branches?companyId=${encodeURIComponent(selectedCompanyId)}`
        : "/branches";
      const [d, c, b] = await Promise.all([
        api.get<Department[]>(departmentPath),
        api.get<Company[]>("/companies"),
        api.get<Branch[]>(branchPath),
      ]);
      setDepartments(d);
      setCompanies(c);
      setBranches(b);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar setores.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId]);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  async function handleDelete(dept: Department) {
    if (!window.confirm(`Tem certeza que deseja inativar o setor "${dept.name}"?`)) return;
    await api.del(`/departments/${dept.id}`);
    load();
  }

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? "—";

  const visible = departments?.filter((d) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return d.name.toLowerCase().includes(term) || (d.code ?? "").toLowerCase().includes(term);
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Setor</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {selectedCompany
              ? `Mostrando apenas setores de ${selectedCompany.name}.`
              : "Setores vinculados a uma unidade da empresa."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-1.5" onClick={() => setShowLoad(true)}>
            <Upload size={15} /> Carga de dados
          </button>
          <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
            <Plus size={15} /> Novo setor
          </button>
        </div>
      </div>

      <input
        className="input mt-4 max-w-sm"
        placeholder="Pesquisar por nome ou código…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <p className="mt-4 rounded-md border-l-2 border-amber bg-amber-tint px-3 py-2 text-sm">{error}</p>}

      {showLoad && <DataLoadWizard onClose={() => setShowLoad(false)} onImported={load} />}

      {showForm && (
        <DepartmentForm
          companies={companies}
          branches={branches}
          defaultCompanyId={selectedCompanyId ?? undefined}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
      {editing && (
        <DepartmentForm
          companies={companies}
          branches={branches}
          department={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Setores" value={departments?.length ?? 0} icon={UsersRound} tone="teal" />
        <StatTile label="Ativos" value={departments?.filter((d) => d.status === "ACTIVE").length ?? 0} icon={CheckCircle2} tone="teal" />
        <StatTile label="Inativos" value={departments?.filter((d) => d.status !== "ACTIVE").length ?? 0} icon={CircleOff} tone="neutral" />
      </div>

      <div className="mt-6 panel">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Unidade</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {departments === null && (
              <tr><td className="px-4 py-6 text-ink-muted" colSpan={6}>Carregando…</td></tr>
            )}
            {visible?.length === 0 && (
              <tr><td className="px-4 py-6 text-ink-muted" colSpan={6}>Nenhum setor encontrado.</td></tr>
            )}
            {visible?.map((d) => (
              <tr key={d.id} className="border-b border-line last:border-none">
                <td className="px-4 py-3 text-ink-muted">{d.code ?? "—"}</td>
                <td className="px-4 py-3 text-ink">{d.name}</td>
                <td className="px-4 py-3 text-ink-muted">{companyName(d.companyId)}</td>
                <td className="px-4 py-3 text-ink-muted">{d.branch?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${d.status === "ACTIVE" ? "bg-teal-tint text-teal-deep" : "bg-line text-ink-muted"}`}>
                    {d.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setEditing(d)} className="flex items-center gap-1 text-xs text-teal-deep hover:underline">
                      <Pencil size={12} /> Editar
                    </button>
                    <button onClick={() => handleDelete(d)} className="flex items-center gap-1 text-xs text-amber hover:underline">
                      <Trash2 size={12} /> Inativar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DepartmentForm({
  companies,
  branches,
  department,
  defaultCompanyId,
  onClose,
  onSaved,
}: {
  companies: Company[];
  branches: Branch[];
  department?: Department;
  defaultCompanyId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [companyId, setCompanyId] = useState(department?.companyId ?? defaultCompanyId ?? companies[0]?.id ?? "");
  const [branchId, setBranchId] = useState(department?.branchId ?? "");
  const [code, setCode] = useState(department?.code ?? "");
  const [name, setName] = useState(department?.name ?? "");
  const [status, setStatus] = useState(department?.status ?? "ACTIVE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const branchOptions = branches.filter((b) => b.companyId === companyId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        companyId,
        branchId: branchId || undefined,
        code: code || undefined,
        name,
        status,
      };
      if (department) {
        await api.patch(`/departments/${department.id}`, payload);
      } else {
        await api.post("/departments", payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalFrame title={department ? "Editar setor" : "Novo setor"} onClose={onClose}>
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Empresa</span>
          <select
            className="input"
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              setBranchId("");
            }}
            required
          >
            {companies.length === 0 && <option value="">Cadastre uma empresa primeiro</option>}
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Unidade</span>
          <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">Nenhuma</option>
            {branchOptions.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Código</span>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Nome do Setor</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        {department && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Situação</span>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </label>
        )}
      </div>
      <div className="flex items-center gap-3 border-t border-line pt-4">
        <button type="submit" disabled={saving || !companyId} className="btn-primary">
          {saving ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        {error && <p className="text-sm text-amber">{error}</p>}
      </div>
    </form>
    </ModalFrame>
  );
}
