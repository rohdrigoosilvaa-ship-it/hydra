import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Vote } from "lucide-react";
import { api } from "../lib/api";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import type { CipaElection, CipaElectionType, Company } from "../lib/types";

const TYPE_LABEL: Record<CipaElectionType, string> = { PRIMEIRA: "Primeira eleição", RENOVACAO: "Renovação" };

export function CipaElectionsPage() {
  const navigate = useNavigate();
  const [elections, setElections] = useState<CipaElection[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const selectedCompanyId = useCompanyFilterStore((s) => s.selectedCompanyId);

  async function load() {
    const electionPath = selectedCompanyId
      ? `/cipa/elections?companyId=${encodeURIComponent(selectedCompanyId)}`
      : "/cipa/elections";
    const [electionList, companyList] = await Promise.all([
      api.get<CipaElection[]>(electionPath),
      api.get<Company[]>("/companies"),
    ]);
    setElections(electionList);
    setCompanies(companyList);
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
          <h1 className="font-display text-2xl font-semibold text-ink">CIPA — Processo Eleitoral</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {selectedCompany
              ? `Mostrando apenas eleições de ${selectedCompany.name}.`
              : "Dimensionamento e cronograma legal do processo eleitoral (NR-05)."}
          </p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Nova eleição
        </button>
      </div>

      {showForm && (
        <NewElectionForm
          companies={companies}
          defaultCompanyId={selectedCompanyId ?? undefined}
          onClose={() => setShowForm(false)}
          onCreated={(id) => {
            setShowForm(false);
            navigate(`/cipa/eleicoes/${id}`);
          }}
        />
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {elections?.length === 0 && <p className="text-sm text-ink-muted">Nenhuma eleição cadastrada ainda.</p>}
        {elections?.map((e) => {
          const company = companies.find((c) => c.id === e.companyId);
          return (
            <button
              key={e.id}
              onClick={() => navigate(`/cipa/eleicoes/${e.id}`)}
              className="card flex flex-col items-start gap-2 text-left transition-colors hover:bg-teal-tint/40"
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className="rounded-md bg-teal-tint p-2 text-teal-deep">
                  <Vote size={16} />
                </span>
                <span className="shrink-0 rounded px-2 py-0.5 text-xs font-medium bg-line text-ink-muted">
                  {TYPE_LABEL[e.type]}
                </span>
              </div>
              <p className="font-medium text-ink">Gestão {e.gestaoLabel}</p>
              <p className="text-xs text-ink-muted">{company?.name ?? "—"}</p>
              <p className="font-mono text-xs text-ink-muted">
                Posse em {new Date(e.posseDate).toLocaleDateString("pt-BR")}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NewElectionForm({
  companies,
  defaultCompanyId,
  onClose,
  onCreated,
}: {
  companies: Company[];
  defaultCompanyId?: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? companies[0]?.id ?? "");
  const [type, setType] = useState<CipaElectionType>("PRIMEIRA");
  const [grauRisco, setGrauRisco] = useState(1);
  const [gestaoLabel, setGestaoLabel] = useState("");
  const [posseDate, setPosseDate] = useState("");
  const [dataTerminoMandatoAtual, setDataTerminoMandatoAtual] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const company = companies.find((c) => c.id === companyId);

  useEffect(() => {
    if (company?.grauRisco) setGrauRisco(company.grauRisco);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await api.post<{ id: string }>("/cipa/elections", {
        companyId,
        type,
        grauRisco,
        gestaoLabel,
        posseDate: type === "PRIMEIRA" ? posseDate : undefined,
        dataTerminoMandatoAtual: type === "RENOVACAO" ? dataTerminoMandatoAtual : undefined,
      });
      onCreated(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar eleição.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Empresa</span>
        <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Tipo de processo</span>
        <select className="input" value={type} onChange={(e) => setType(e.target.value as CipaElectionType)}>
          <option value="PRIMEIRA">Primeira eleição</option>
          <option value="RENOVACAO">Renovação</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Grau de risco (NR-4)</span>
        <select className="input w-24" value={grauRisco} onChange={(e) => setGrauRisco(Number(e.target.value))}>
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Gestão</span>
        <input
          className="input w-32"
          placeholder="2026/2027"
          value={gestaoLabel}
          onChange={(e) => setGestaoLabel(e.target.value)}
          required
        />
      </label>
      {type === "PRIMEIRA" ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Data da posse</span>
          <input
            type="date"
            className="input"
            value={posseDate}
            onChange={(e) => setPosseDate(e.target.value)}
            required
          />
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Término do mandato atual</span>
          <input
            type="date"
            className="input"
            value={dataTerminoMandatoAtual}
            onChange={(e) => setDataTerminoMandatoAtual(e.target.value)}
            required
          />
        </label>
      )}
      <button type="submit" disabled={saving || !companyId} className="btn-primary">
        {saving ? "Salvando…" : "Salvar"}
      </button>
      <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </form>
  );
}
