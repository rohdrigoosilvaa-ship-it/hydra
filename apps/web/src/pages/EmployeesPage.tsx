import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Upload } from "lucide-react";
import { api } from "../lib/api";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import { CreatableSelect } from "../components/CreatableSelect";
import { DataLoadWizard } from "../components/DataLoadWizard";
import type { Company, Department, Employee, Position } from "../lib/types";

export function EmployeesPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const selectedCompanyId = useCompanyFilterStore((s) => s.selectedCompanyId);

  async function load() {
    try {
      const employeePath = selectedCompanyId
        ? `/employees?companyId=${encodeURIComponent(selectedCompanyId)}`
        : "/employees";
      const [employeeList, companyList] = await Promise.all([
        api.get<Employee[]>(employeePath),
        api.get<Company[]>("/companies"),
      ]);
      setEmployees(employeeList);
      setCompanies(companyList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar colaboradores.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId]);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Colaboradores</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {selectedCompany
              ? `Mostrando apenas colaboradores de ${selectedCompany.name}.`
              : "Escopo aplicado automaticamente conforme seu perfil de acesso."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-1.5" onClick={() => setShowLoad(true)}>
            <Upload size={15} /> Carga de dados
          </button>
          <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
            <Plus size={15} /> Novo colaborador
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md border-l-2 border-amber bg-amber-tint px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {showForm && (
        <EmployeeForm
          companies={companies}
          defaultCompanyId={selectedCompanyId ?? undefined}
          onClose={() => setShowForm(false)}
          onSaved={(id) => {
            setShowForm(false);
            load();
            navigate(`/cadastros/estrutura/funcionarios/${id}`);
          }}
        />
      )}

      {showLoad && <DataLoadWizard onClose={() => setShowLoad(false)} onImported={load} />}

      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-paper-raised">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">CPF</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3 font-medium">Unidade</th>
              <th className="px-4 py-3 font-medium">Setor</th>
              <th className="px-4 py-3 font-medium">Cargo</th>
              <th className="px-4 py-3 font-medium">Admissão</th>
            </tr>
          </thead>
          <tbody>
            {employees === null && (
              <tr>
                <td className="px-4 py-6 text-ink-muted" colSpan={7}>
                  Carregando…
                </td>
              </tr>
            )}
            {employees?.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-ink-muted" colSpan={7}>
                  Nenhum colaborador cadastrado ainda.
                </td>
              </tr>
            )}
            {employees?.map((emp) => (
              <tr
                key={emp.id}
                onClick={() => navigate(`/cadastros/estrutura/funcionarios/${emp.id}`)}
                className="cursor-pointer border-b border-line last:border-none hover:bg-teal-tint/40"
              >
                <td className="px-4 py-3 text-ink">{emp.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{formatCpf(emp.cpf)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={emp.status} />
                </td>
                <td className="px-4 py-3 text-ink-muted">{emp.branch?.name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-muted">{emp.department?.name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-muted">{emp.position?.name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {emp.admittedAt ? new Date(emp.admittedAt).toLocaleDateString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCpf(cpf: string | null): string {
  if (!cpf) return "—";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function StatusBadge({ status }: { status: Employee["status"] }) {
  const map: Record<Employee["status"], string> = {
    ACTIVE: "bg-teal-tint text-teal-deep",
    ON_LEAVE: "bg-amber-tint text-amber",
    TERMINATED: "bg-line text-ink-muted",
  };
  const label: Record<Employee["status"], string> = {
    ACTIVE: "Ativo",
    ON_LEAVE: "Afastado",
    TERMINATED: "Inativo",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      {label[status]}
    </span>
  );
}

function EmployeeForm({
  companies,
  defaultCompanyId,
  onClose,
  onSaved,
}: {
  companies: Company[];
  defaultCompanyId?: string;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? companies[0]?.id ?? "");
  const [departmentId, setDepartmentId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    if (!companyId) {
      setDepartments([]);
      setPositions([]);
      return;
    }
    Promise.all([
      api.get<Department[]>(`/departments?companyId=${encodeURIComponent(companyId)}`),
      api.get<Position[]>(`/positions?companyId=${encodeURIComponent(companyId)}`),
    ]).then(([d, p]) => {
      setDepartments(d);
      setPositions(p);
    });
  }, [companyId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!departmentId || !positionId) {
      setError("Setor e Cargo são obrigatórios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await api.post<Employee>("/employees", {
        name,
        companyId,
        departmentId,
        positionId,
      });
      onSaved(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Nome</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Empresa</span>
        <select
          className="input"
          value={companyId}
          onChange={(e) => {
            setCompanyId(e.target.value);
            setDepartmentId("");
            setPositionId("");
          }}
          required
        >
          {companies.length === 0 && <option value="">Cadastre uma empresa primeiro</option>}
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <CreatableSelect
        label="Setor *"
        options={departments}
        value={departmentId}
        onChange={setDepartmentId}
        onCreate={(name) => api.post<Department>("/departments", { name, companyId })}
      />
      <CreatableSelect
        label="Cargo *"
        options={positions}
        value={positionId}
        onChange={setPositionId}
        onCreate={(name) => api.post<Position>("/positions", { name, companyId })}
      />
      <p className="w-full text-xs text-ink-muted">
        Complete os demais dados (documentos, endereço, deficiência) na ficha do colaborador depois de salvar.
      </p>
      <button type="submit" disabled={saving || !companyId || !departmentId || !positionId} className="btn-primary">
        {saving ? "Salvando…" : "Salvar"}
      </button>
      <button type="button" onClick={onClose} className="btn-secondary">
        Cancelar
      </button>
      {error && <p className="w-full text-sm text-amber">{error}</p>}
    </form>
  );
}
