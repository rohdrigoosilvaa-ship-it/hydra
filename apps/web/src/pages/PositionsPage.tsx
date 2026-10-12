import { FormEvent, useEffect, useState } from "react";
import { HardHat, Pencil, Plus, Trash2, Upload, X, BriefcaseBusiness, CheckCircle2, CircleOff } from "lucide-react";
import { api } from "../lib/api";
import { StatTile } from "../components/ui/cards";
import { DataLoadWizard } from "../components/DataLoadWizard";
import { CboPicker } from "../components/CboPicker";
import { PositionRequiredEpisModal } from "../components/positions/PositionRequiredEpisModal";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import type { Company, Position } from "../lib/types";

export function PositionsPage() {
  const [positions, setPositions] = useState<Position[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [managingEpis, setManagingEpis] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedCompanyId = useCompanyFilterStore((s) => s.selectedCompanyId);

  async function load() {
    try {
      const positionPath = selectedCompanyId
        ? `/positions?companyId=${encodeURIComponent(selectedCompanyId)}`
        : "/positions";
      const [p, c] = await Promise.all([
        api.get<Position[]>(positionPath),
        api.get<Company[]>("/companies"),
      ]);
      setPositions(p);
      setCompanies(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar cargos.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId]);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  async function handleDelete(position: Position) {
    if (!window.confirm(`Tem certeza que deseja inativar o cargo "${position.name}"?`)) return;
    await api.del(`/positions/${position.id}`);
    load();
  }

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? "—";

  const visible = positions?.filter((p) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      p.name.toLowerCase().includes(term) ||
      (p.code ?? "").toLowerCase().includes(term) ||
      (p.cbo ?? "").toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Cargo</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {selectedCompany
              ? `Mostrando apenas cargos de ${selectedCompany.name}.`
              : "Cargos/funções reaproveitáveis entre unidades da empresa."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-1.5" onClick={() => setShowLoad(true)}>
            <Upload size={15} /> Carga de dados
          </button>
          <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
            <Plus size={15} /> Novo cargo
          </button>
        </div>
      </div>

      <input
        className="input mt-4 max-w-sm"
        placeholder="Pesquisar por nome, código ou CBO…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <p className="mt-4 rounded-md border-l-2 border-amber bg-amber-tint px-3 py-2 text-sm">{error}</p>}

      {showLoad && <DataLoadWizard onClose={() => setShowLoad(false)} onImported={load} />}

      {showForm && (
        <PositionForm
          companies={companies}
          defaultCompanyId={selectedCompanyId ?? undefined}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
      {editing && (
        <PositionForm
          companies={companies}
          position={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {managingEpis && (
        <PositionRequiredEpisModal
          positionId={managingEpis.id}
          positionName={managingEpis.name}
          onClose={() => setManagingEpis(null)}
        />
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Cargos" value={positions?.length ?? 0} icon={BriefcaseBusiness} tone="teal" />
        <StatTile label="Ativos" value={positions?.filter((p) => p.status === "ACTIVE").length ?? 0} icon={CheckCircle2} tone="teal" />
        <StatTile label="Inativos" value={positions?.filter((p) => p.status !== "ACTIVE").length ?? 0} icon={CircleOff} tone="neutral" />
      </div>

      <div className="mt-6 panel">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">CBO</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {positions === null && (
              <tr><td className="px-4 py-6 text-ink-muted" colSpan={6}>Carregando…</td></tr>
            )}
            {visible?.length === 0 && (
              <tr><td className="px-4 py-6 text-ink-muted" colSpan={6}>Nenhum cargo encontrado.</td></tr>
            )}
            {visible?.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-none">
                <td className="px-4 py-3 text-ink-muted">{p.code ?? "—"}</td>
                <td className="px-4 py-3 text-ink">{p.name}</td>
                <td className="px-4 py-3 text-ink-muted">{companyName(p.companyId)}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{p.cbo ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${p.status === "ACTIVE" ? "bg-teal-tint text-teal-deep" : "bg-line text-ink-muted"}`}>
                    {p.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setManagingEpis(p)} className="flex items-center gap-1 text-xs text-ink-muted hover:underline">
                      <HardHat size={12} /> EPIs exigidos
                    </button>
                    <button onClick={() => setEditing(p)} className="flex items-center gap-1 text-xs text-teal-deep hover:underline">
                      <Pencil size={12} /> Editar
                    </button>
                    <button onClick={() => handleDelete(p)} className="flex items-center gap-1 text-xs text-amber hover:underline">
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

function PositionForm({
  companies,
  position,
  defaultCompanyId,
  onClose,
  onSaved,
}: {
  companies: Company[];
  position?: Position;
  defaultCompanyId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [companyId, setCompanyId] = useState(position?.companyId ?? defaultCompanyId ?? companies[0]?.id ?? "");
  const [code, setCode] = useState(position?.code ?? "");
  const [name, setName] = useState(position?.name ?? "");
  const [cbo, setCbo] = useState(position?.cbo ?? "");
  const [description, setDescription] = useState(position?.description ?? "");
  const [status, setStatus] = useState(position?.status ?? "ACTIVE");
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
        cbo: cbo || undefined,
        description: description || undefined,
        status,
      };
      if (position) {
        await api.patch(`/positions/${position.id}`, payload);
      } else {
        await api.post("/positions", payload);
      }
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
        <h3 className="font-display text-sm font-semibold text-ink-muted">
          {position ? "Editar cargo" : "Novo cargo"}
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
          <span className="text-ink-muted">Nome do Cargo</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">CBO</span>
          <CboPicker
            value={cbo}
            onChange={setCbo}
            onSelectOccupation={(occ) => {
              setCbo(occ.code);
              if (!name) setName(occ.title);
            }}
          />
        </label>
        {position && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Situação</span>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </label>
        )}
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Descrição / Atividades</span>
        <textarea
          className="input min-h-[100px] resize-y"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição do cargo e atividades típicas (conforme CBO)…"
        />
      </label>
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
