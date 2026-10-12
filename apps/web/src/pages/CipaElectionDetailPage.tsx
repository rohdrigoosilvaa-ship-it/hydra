import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Gavel, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import type { CipaElectionDetail, CipaElectionType, Company } from "../lib/types";

const TYPE_LABEL: Record<CipaElectionType, string> = { PRIMEIRA: "Primeira eleição", RENOVACAO: "Renovação" };
const ORIGEM_STYLE: Record<string, string> = {
  LEGAL: "bg-teal-tint text-teal-deep",
  PROGRAMADA: "bg-line text-ink-muted",
};
const ORIGEM_LABEL: Record<string, string> = { LEGAL: "Prazo legal", PROGRAMADA: "Data programada" };

export function CipaElectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [election, setElection] = useState<CipaElectionDetail | null>(null);
  const [company, setCompany] = useState<Company | null>(null);

  async function load() {
    if (!id) return;
    const data = await api.get<CipaElectionDetail>(`/cipa/elections/${id}`);
    setElection(data);
    const companies = await api.get<Company[]>("/companies");
    setCompany(companies.find((c) => c.id === data.companyId) ?? null);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleStep(stepId: string, concluido: boolean) {
    if (!id) return;
    await api.patch(`/cipa/elections/${id}/schedule/${stepId}`, { concluido });
    load();
  }

  if (!election) {
    return <p className="text-sm text-ink-muted">Carregando…</p>;
  }

  const d = election.dimensionamento;

  return (
    <div>
      <Link to="/cipa/eleicoes" className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink">
        <ArrowLeft size={13} /> Voltar para o processo eleitoral
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Gestão {election.gestaoLabel}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {company?.name ?? "—"} · {TYPE_LABEL[election.type]} · Posse em{" "}
            {new Date(election.posseDate).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>

      <div className="mt-6 card">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-teal-tint p-2 text-teal-deep">
            <ShieldCheck size={17} />
          </span>
          <h2 className="font-display text-lg font-semibold text-ink">Dimensionamento (Quadro I, NR-05)</h2>
        </div>

        {!d ? (
          <p className="mt-3 text-sm text-ink-muted">Grau de risco ou número de empregados inválido para cálculo.</p>
        ) : d.semObrigatoriedade ? (
          <p className="mt-3 text-sm text-ink-muted">
            Com {election.empregados} empregado(s) na faixa "{d.faixaLabel}" e grau de risco {election.grauRisco},
            a CIPA formal é <strong className="text-ink">dispensada</strong> nesta combinação.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="font-display text-xl font-semibold tabular-nums text-ink">{d.titularesEmpregados}</p>
              <p className="mt-0.5 text-xs text-ink-muted">Titulares (empregados)</p>
            </div>
            <div>
              <p className="font-display text-xl font-semibold tabular-nums text-ink">{d.suplentesEmpregados}</p>
              <p className="mt-0.5 text-xs text-ink-muted">Suplentes (empregados)</p>
            </div>
            <div>
              <p className="font-display text-xl font-semibold tabular-nums text-ink">{d.titularesOrganizacao}</p>
              <p className="mt-0.5 text-xs text-ink-muted">Titulares (organização)</p>
            </div>
            <div>
              <p className="font-display text-xl font-semibold tabular-nums text-ink">{d.totalMembros}</p>
              <p className="mt-0.5 text-xs text-ink-muted">Total de membros</p>
            </div>
            <p className="col-span-2 text-xs text-ink-muted sm:col-span-4">
              Faixa "{d.faixaLabel}" · {election.empregados} empregado(s) · grau de risco {election.grauRisco}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className="rounded-md bg-amber-tint p-2 text-amber">
          <Gavel size={17} />
        </span>
        <h2 className="font-display text-lg font-semibold text-ink">Cronograma do processo eleitoral</h2>
      </div>

      <div className="mt-3 panel">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-paper text-xs font-medium uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3.5">Etapa</th>
              <th className="px-4 py-3.5">Base legal / regra</th>
              <th className="px-4 py-3.5">Data</th>
              <th className="px-4 py-3.5">Origem</th>
              <th className="px-4 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {election.steps.map((s) => (
              <tr key={s.id} className="border-t border-line transition-colors hover:bg-paper">
                <td className="px-4 py-3.5 font-medium text-ink">{s.etapa}</td>
                <td className="px-4 py-3.5 text-ink-muted">
                  {s.baseLegal && <span className="font-mono text-xs text-ink">{s.baseLegal}</span>}
                  <p className="text-xs">{s.regra}</p>
                </td>
                <td className="px-4 py-3.5 font-mono text-xs text-ink-muted">
                  {new Date(s.data).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ORIGEM_STYLE[s.origem]}`}>
                    {ORIGEM_LABEL[s.origem]}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <button
                    onClick={() => toggleStep(s.id, !s.concluido)}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      s.concluido ? "bg-teal-tint text-teal-deep" : "bg-line text-ink-muted hover:text-ink"
                    }`}
                  >
                    {s.concluido && <Check size={12} />}
                    {s.concluido ? "Concluído" : "Pendente"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
