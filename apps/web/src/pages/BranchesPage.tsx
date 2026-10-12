import { FormEvent, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, Upload, X, MapPin, CheckCircle2, CircleOff } from "lucide-react";
import { api } from "../lib/api";
import { StatTile } from "../components/ui/cards";
import { DataLoadWizard } from "../components/DataLoadWizard";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import type { Branch, Company, Department, Employee, Position } from "../lib/types";

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export function BranchesPage() {
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [reuseFor, setReuseFor] = useState<Branch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedCompanyId = useCompanyFilterStore((s) => s.selectedCompanyId);

  async function load() {
    try {
      const branchPath = selectedCompanyId
        ? `/branches?companyId=${encodeURIComponent(selectedCompanyId)}`
        : "/branches";
      const [b, c] = await Promise.all([
        api.get<Branch[]>(branchPath),
        api.get<Company[]>("/companies"),
      ]);
      setBranches(b);
      setCompanies(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar unidades.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId]);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  async function handleDelete(branch: Branch) {
    if (!window.confirm(`Tem certeza que deseja inativar a unidade "${branch.name}"?`)) return;
    await api.del(`/branches/${branch.id}`);
    load();
  }

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? "—";

  const visible = branches?.filter((b) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      b.name.toLowerCase().includes(term) ||
      (b.code ?? "").toLowerCase().includes(term) ||
      (b.city ?? "").toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Unidade</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {selectedCompany
              ? `Mostrando apenas unidades de ${selectedCompany.name}.`
              : "Filiais/unidades vinculadas às suas empresas."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-1.5" onClick={() => setShowLoad(true)}>
            <Upload size={15} /> Carga de dados
          </button>
          <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
            <Plus size={15} /> Nova unidade
          </button>
        </div>
      </div>

      <input
        className="input mt-4 max-w-sm"
        placeholder="Pesquisar por nome, código ou cidade…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <p className="mt-4 rounded-md border-l-2 border-amber bg-amber-tint px-3 py-2 text-sm">{error}</p>}

      {showLoad && <DataLoadWizard onClose={() => setShowLoad(false)} onImported={load} />}

      {showForm && (
        <BranchForm
          companies={companies}
          defaultCompanyId={selectedCompanyId ?? undefined}
          onClose={() => setShowForm(false)}
          onSaved={(saved, isNew) => {
            setShowForm(false);
            load();
            if (isNew) setReuseFor(saved);
          }}
        />
      )}
      {editing && (
        <BranchForm
          companies={companies}
          branch={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {reuseFor && (
        <ReuseCompanyDataPanel
          branch={reuseFor}
          companyName={companyName(reuseFor.companyId)}
          onClose={() => {
            setReuseFor(null);
            load();
          }}
        />
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Unidades" value={branches?.length ?? 0} icon={MapPin} tone="teal" />
        <StatTile label="Ativas" value={branches?.filter((b) => b.status === "ACTIVE").length ?? 0} icon={CheckCircle2} tone="teal" />
        <StatTile label="Inativas" value={branches?.filter((b) => b.status !== "ACTIVE").length ?? 0} icon={CircleOff} tone="neutral" />
      </div>

      <div className="mt-6 panel">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Cidade/UF</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {branches === null && (
              <tr><td className="px-4 py-6 text-ink-muted" colSpan={6}>Carregando…</td></tr>
            )}
            {visible?.length === 0 && (
              <tr><td className="px-4 py-6 text-ink-muted" colSpan={6}>Nenhuma unidade encontrada.</td></tr>
            )}
            {visible?.map((b) => (
              <tr key={b.id} className="border-b border-line last:border-none">
                <td className="px-4 py-3 text-ink-muted">{b.code ?? "—"}</td>
                <td className="px-4 py-3 text-ink">{b.name}</td>
                <td className="px-4 py-3 text-ink-muted">{companyName(b.companyId)}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {b.city ? `${b.city}${b.state ? "/" + b.state : ""}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${b.status === "ACTIVE" ? "bg-teal-tint text-teal-deep" : "bg-line text-ink-muted"}`}>
                    {b.status === "ACTIVE" ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setEditing(b)} className="flex items-center gap-1 text-xs text-teal-deep hover:underline">
                      <Pencil size={12} /> Editar
                    </button>
                    <button onClick={() => handleDelete(b)} className="flex items-center gap-1 text-xs text-amber hover:underline">
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

function BranchForm({
  companies,
  branch,
  defaultCompanyId,
  onClose,
  onSaved,
}: {
  companies: Company[];
  branch?: Branch;
  defaultCompanyId?: string;
  onClose: () => void;
  onSaved: (saved: Branch, isNew: boolean) => void;
}) {
  const [companyId, setCompanyId] = useState(branch?.companyId ?? defaultCompanyId ?? companies[0]?.id ?? "");
  const [code, setCode] = useState(branch?.code ?? "");
  const [name, setName] = useState(branch?.name ?? "");
  const [cnpj, setCnpj] = useState(branch?.cnpj ?? "");
  const [cep, setCep] = useState(branch?.cep ?? "");
  const [address, setAddress] = useState(branch?.address ?? "");
  const [numero, setNumero] = useState(branch?.numero ?? "");
  const [complemento, setComplemento] = useState(branch?.complemento ?? "");
  const [bairro, setBairro] = useState(branch?.bairro ?? "");
  const [city, setCity] = useState(branch?.city ?? "");
  const [state, setState] = useState(branch?.state ?? "");
  const [status, setStatus] = useState(branch?.status ?? "ACTIVE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        companyId,
        code: code || undefined,
        name,
        cnpj: cnpj || undefined,
        cep: cep || undefined,
        address: address || undefined,
        numero: numero || undefined,
        complemento: complemento || undefined,
        bairro: bairro || undefined,
        city: city || undefined,
        state: state || undefined,
        status,
      };
      if (branch) {
        const saved = await api.patch<Branch>(`/branches/${branch.id}`, payload);
        onSaved(saved, false);
      } else {
        const saved = await api.post<Branch>("/branches", payload);
        onSaved(saved, true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-ink-muted">
          {branch ? "Editar unidade" : "Nova unidade"}
        </h3>
        <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Empresa</span>
          <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
            {companies.length === 0 && <option value="">Cadastre uma empresa primeiro</option>}
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Código</span>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Nome da Unidade</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">CNPJ</span>
          <input className="input" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">CEP</span>
          <input className="input" value={cep} onChange={(e) => setCep(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Endereço</span>
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Número</span>
          <input className="input" value={numero} onChange={(e) => setNumero(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Complemento</span>
          <input className="input" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Bairro</span>
          <input className="input" value={bairro} onChange={(e) => setBairro(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Cidade</span>
          <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Estado</span>
          <select className="input" value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">—</option>
            {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </label>
        {branch && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Situação</span>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}>
              <option value="ACTIVE">Ativa</option>
              <option value="INACTIVE">Inativa</option>
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
  );
}

/**
 * Depois de criar uma unidade nova, oferece reaproveitar setores e
 * funcionários já cadastrados na mesma empresa, em vez de recadastrar do
 * zero. Cargos não aparecem como opção de vínculo porque já são
 * automaticamente compartilhados entre todas as unidades da empresa
 * (Position não tem branchId no modelo de dados).
 *
 * Setor sem unidade vinculada (branchId null) → é adotado por esta unidade
 * (PATCH, só move o vínculo). Setor já vinculado a outra unidade → é
 * duplicado para esta unidade (POST, mantém o original intacto na unidade
 * de origem). Funcionário selecionado → é transferido para esta unidade
 * (PATCH branchId), já que uma pessoa só pode estar em um lugar por vez.
 */
function ReuseCompanyDataPanel({
  branch,
  companyName,
  onClose,
}: {
  branch: Branch;
  companyName: string;
  onClose: () => void;
}) {
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [positions, setPositions] = useState<Position[] | null>(null);
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [selectedDeptIds, setSelectedDeptIds] = useState<Set<string>>(new Set());
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ deptOk: number; deptFail: number; empOk: number; empFail: number } | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Department[]>(`/departments?companyId=${encodeURIComponent(branch.companyId)}`),
      api.get<Position[]>(`/positions?companyId=${encodeURIComponent(branch.companyId)}`),
      api.get<Employee[]>(`/employees?companyId=${encodeURIComponent(branch.companyId)}`),
    ])
      .then(([d, p, e]) => {
        setDepartments(d);
        setPositions(p);
        setEmployees(e.filter((emp) => emp.branchId !== branch.id));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar dados da empresa."));
  }, [branch.companyId, branch.id]);

  function toggle(set: Set<string>, id: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  async function handleFinish() {
    setSaving(true);
    setError(null);
    try {
      const deptResults = await Promise.allSettled(
        [...selectedDeptIds].map((id) => {
          const d = departments!.find((x) => x.id === id)!;
          return d.branchId === null
            ? api.patch(`/departments/${d.id}`, { branchId: branch.id })
            : api.post("/departments", { name: d.name, code: d.code ?? undefined, companyId: branch.companyId, branchId: branch.id });
        }),
      );
      const empResults = await Promise.allSettled(
        [...selectedEmployeeIds].map((id) => api.patch(`/employees/${id}`, { branchId: branch.id })),
      );
      setDone({
        deptOk: deptResults.filter((r) => r.status === "fulfilled").length,
        deptFail: deptResults.filter((r) => r.status === "rejected").length,
        empOk: empResults.filter((r) => r.status === "fulfilled").length,
        empFail: empResults.filter((r) => r.status === "rejected").length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao vincular dados.");
    } finally {
      setSaving(false);
    }
  }

  const loading = departments === null || positions === null || employees === null;

  return (
    <div className="card mt-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-semibold text-ink-muted">
            Unidade "{branch.name}" criada — reaproveitar dados de {companyName}?
          </h3>
          <p className="mt-1 text-xs text-ink-muted">
            Marque abaixo o que deve valer para esta unidade também, sem precisar recadastrar.
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink">
          <X size={16} />
        </button>
      </div>

      {error && <p className="rounded-md border-l-2 border-amber bg-amber-tint px-3 py-2 text-sm">{error}</p>}

      {loading && <p className="text-sm text-ink-muted">Carregando dados da empresa…</p>}

      {!loading && done && (
        <div className="rounded-md border-l-2 border-teal-deep bg-teal-tint px-3 py-2 text-sm text-teal-deep">
          <p>
            {done.deptOk} setor(es) vinculado(s){done.deptFail > 0 ? ` (${done.deptFail} falharam)` : ""} · {done.empOk} funcionário(s)
            transferido(s){done.empFail > 0 ? ` (${done.empFail} falharam)` : ""}.
          </p>
        </div>
      )}

      {!loading && !done && (
        <>
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Setores</h4>
            {departments!.length === 0 && <p className="mt-1 text-sm text-ink-muted">Nenhum setor cadastrado ainda para esta empresa.</p>}
            <div className="mt-2 flex flex-col gap-1.5">
              {departments!.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedDeptIds.has(d.id)}
                    onChange={() => toggle(selectedDeptIds, d.id, setSelectedDeptIds)}
                  />
                  <span className="text-ink">{d.name}</span>
                  <span className="text-xs text-ink-muted">
                    {d.branchId === null ? "— sem unidade vinculada (será atribuído a esta)" : `— vinculado a ${d.branch?.name ?? "outra unidade"} (será duplicado para esta)`}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Cargos</h4>
            {positions!.length === 0 ? (
              <p className="mt-1 text-sm text-ink-muted">Nenhum cargo cadastrado ainda para esta empresa.</p>
            ) : (
              <>
                <p className="mt-1 text-xs text-ink-muted">
                  Cargos já valem para todas as unidades de {companyName} automaticamente — nenhuma ação necessária.
                </p>
                <p className="mt-1 text-sm text-ink-muted">{positions!.map((p) => p.name).join(", ")}</p>
              </>
            )}
          </section>

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Funcionários</h4>
            {employees!.length === 0 && <p className="mt-1 text-sm text-ink-muted">Nenhum funcionário disponível para transferir.</p>}
            <div className="mt-2 flex max-h-48 flex-col gap-1.5 overflow-y-auto">
              {employees!.map((e) => (
                <label key={e.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedEmployeeIds.has(e.id)}
                    onChange={() => toggle(selectedEmployeeIds, e.id, setSelectedEmployeeIds)}
                  />
                  <span className="text-ink">{e.name}</span>
                  <span className="text-xs text-ink-muted">
                    — {e.branch?.name ?? "sem unidade"} · {e.department?.name ?? "sem setor"} · {e.position?.name ?? "sem cargo"}
                  </span>
                </label>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="flex items-center gap-3 border-t border-line pt-4">
        {!done ? (
          <>
            <button
              type="button"
              disabled={saving || loading}
              onClick={handleFinish}
              className="btn-primary"
            >
              {saving ? "Vinculando…" : "Vincular selecionados"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Pular
            </button>
          </>
        ) : (
          <button type="button" onClick={onClose} className="btn-primary">
            Concluir
          </button>
        )}
      </div>
    </div>
  );
}
