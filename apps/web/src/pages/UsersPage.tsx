import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import { HYDRA_ROLE_LABELS, type Company, type HydraRole, type HydraUser } from "../lib/types";

const ROLE_OPTIONS = Object.entries(HYDRA_ROLE_LABELS) as [HydraRole, string][];

export function UsersPage() {
  const [users, setUsers] = useState<HydraUser[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HydraUser | null>(null);

  async function load() {
    try {
      const [userList, companyList] = await Promise.all([
        api.get<HydraUser[]>("/users"),
        api.get<Company[]>("/companies"),
      ]);
      setUsers(userList);
      setCompanies(companyList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar usuários.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleStatus(user: HydraUser) {
    const nextStatus = user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    await api.patch(`/users/${user.id}/status`, { status: nextStatus });
    load();
  }

  async function handleDelete(user: HydraUser) {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${user.name}"?`)) return;
    setError(null);
    try {
      await api.del(`/users/${user.id}`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir usuário.");
    }
  }

  function companyName(scopeId: string | null) {
    return companies.find((c) => c.id === scopeId)?.name ?? "—";
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Usuários</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Cada usuário enxerga apenas a empresa à qual está vinculado — exceto perfis com acesso a
            todas as empresas.
          </p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Novo usuário
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-md border-l-2 border-amber bg-amber-tint px-3 py-2 text-sm">{error}</p>
      )}

      {showForm && (
        <UserForm
          companies={companies}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
      {editing && (
        <UserForm
          companies={companies}
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-paper-raised">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Perfil</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users === null && (
              <tr>
                <td className="px-4 py-6 text-ink-muted" colSpan={6}>
                  Carregando…
                </td>
              </tr>
            )}
            {users?.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-ink-muted" colSpan={6}>
                  Nenhum usuário cadastrado ainda.
                </td>
              </tr>
            )}
            {users?.map((u) => {
              const assignment = u.roleAssignments[0];
              return (
                <tr key={u.id} className="border-b border-line last:border-none">
                  <td className="px-4 py-3 text-ink">{u.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{u.email}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {assignment ? HYDRA_ROLE_LABELS[assignment.role] : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {assignment?.scopeType === "TENANT" ? "Todas" : companyName(assignment?.scopeId ?? null)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setEditing(u)}
                        className="text-xs text-teal-deep hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleStatus(u)}
                        className="text-xs text-teal-deep hover:underline"
                      >
                        {u.status === "SUSPENDED" ? "Reativar" : "Suspender"}
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="text-xs text-amber hover:underline"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: HydraUser["status"] }) {
  const map: Record<HydraUser["status"], string> = {
    ACTIVE: "bg-teal-tint text-teal-deep",
    INVITED: "bg-amber-tint text-amber",
    SUSPENDED: "bg-line text-ink-muted",
  };
  const label: Record<HydraUser["status"], string> = {
    ACTIVE: "Ativo",
    INVITED: "Convidado",
    SUSPENDED: "Suspenso",
  };
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[status]}`}>{label[status]}</span>;
}

function UserForm({
  companies,
  user,
  onClose,
  onSaved,
}: {
  companies: Company[];
  user?: HydraUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const currentAssignment = user?.roleAssignments[0];
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<HydraRole>(currentAssignment?.role ?? "ADMIN_EMPRESA");
  const [scopeType, setScopeType] = useState<"TENANT" | "COMPANY">(
    currentAssignment?.scopeType === "TENANT" ? "TENANT" : "COMPANY",
  );
  const [companyId, setCompanyId] = useState(
    (currentAssignment?.scopeType === "COMPANY" ? currentAssignment.scopeId : null) ?? companies[0]?.id ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        email,
        password: password || undefined,
        role,
        scopeType,
        scopeId: scopeType === "COMPANY" ? companyId : undefined,
      };
      if (user) {
        await api.patch(`/users/${user.id}`, payload);
      } else {
        await api.post("/users", payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar usuário.");
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
        <span className="text-ink-muted">E-mail</span>
        <input
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">{user ? "Nova senha (opcional)" : "Senha provisória"}</span>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={user ? "Deixe em branco para manter" : undefined}
          minLength={8}
          required={!user}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Perfil</span>
        <select className="input" value={role} onChange={(e) => setRole(e.target.value as HydraRole)}>
          {ROLE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Acesso</span>
        <select
          className="input"
          value={scopeType}
          onChange={(e) => setScopeType(e.target.value as "TENANT" | "COMPANY")}
        >
          <option value="COMPANY">Uma empresa</option>
          <option value="TENANT">Todas as empresas (administrador)</option>
        </select>
      </label>
      {scopeType === "COMPANY" && (
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
      )}
      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? "Salvando…" : "Salvar"}
      </button>
      <button type="button" onClick={onClose} className="btn-secondary">
        Cancelar
      </button>
      {error && <p className="w-full text-sm text-amber">{error}</p>}
    </form>
  );
}
