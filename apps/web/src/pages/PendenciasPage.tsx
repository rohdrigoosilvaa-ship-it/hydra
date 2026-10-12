import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { api } from "../lib/api";
import type { Pendencia, PendenciaCriticidade, PendenciaOrigem } from "../lib/types";

const CRITICIDADE_STYLE: Record<PendenciaCriticidade, string> = {
  alta: "bg-danger-tint text-danger",
  media: "bg-amber-tint text-amber",
};
const CRITICIDADE_LABEL: Record<PendenciaCriticidade, string> = {
  alta: "Alta",
  media: "Média",
};

export function PendenciasPage() {
  const [pendencias, setPendencias] = useState<Pendencia[] | null>(null);
  const [origemFilter, setOrigemFilter] = useState<PendenciaOrigem | "">("");
  const [criticidadeFilter, setCriticidadeFilter] = useState<PendenciaCriticidade | "">("");
  const [unidadeFilter, setUnidadeFilter] = useState("");

  useEffect(() => {
    api.get<Pendencia[]>("/pendencias").then(setPendencias);
  }, []);

  const unidades = useMemo(
    () => Array.from(new Set((pendencias ?? []).map((p) => p.unidade).filter((v): v is string => !!v))).sort(),
    [pendencias],
  );

  const filtered = (pendencias ?? []).filter((p) => {
    if (origemFilter && p.origem !== origemFilter) return false;
    if (criticidadeFilter && p.criticidade !== criticidadeFilter) return false;
    if (unidadeFilter && p.unidade !== unidadeFilter) return false;
    return true;
  });

  const altaCount = (pendencias ?? []).filter((p) => p.criticidade === "alta").length;
  const mediaCount = (pendencias ?? []).filter((p) => p.criticidade === "media").length;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Central de Pendências</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">
        Tudo que exige atenção — ações atrasadas, documentos vencidos ou vencendo, EPIs próximos da troca e riscos
        críticos sem ação concluída — reunido num só lugar, com origem, responsável e prazo.
      </p>

      {pendencias && (
        <div className="mt-4 flex gap-2 text-sm">
          <span className="rounded-md bg-danger-tint px-3 py-1.5 font-medium text-danger">
            {altaCount} de alta criticidade
          </span>
          <span className="rounded-md bg-amber-tint px-3 py-1.5 font-medium text-amber">
            {mediaCount} de média criticidade
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <select className="input w-44" value={origemFilter} onChange={(e) => setOrigemFilter(e.target.value as PendenciaOrigem | "")}>
          <option value="">Todas as origens</option>
          <option value="Ação">Ação</option>
          <option value="Documento">Documento</option>
          <option value="EPI">EPI</option>
          <option value="Risco">Risco</option>
        </select>
        <select
          className="input w-44"
          value={criticidadeFilter}
          onChange={(e) => setCriticidadeFilter(e.target.value as PendenciaCriticidade | "")}
        >
          <option value="">Todas as criticidades</option>
          <option value="alta">Alta</option>
          <option value="media">Média</option>
        </select>
        {unidades.length > 0 && (
          <select className="input w-48" value={unidadeFilter} onChange={(e) => setUnidadeFilter(e.target.value)}>
            <option value="">Todas as unidades</option>
            {unidades.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-4 panel">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-paper text-xs font-medium uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3.5">Origem</th>
              <th className="px-4 py-3.5">Item</th>
              <th className="px-4 py-3.5">Unidade</th>
              <th className="px-4 py-3.5">Responsável</th>
              <th className="px-4 py-3.5">Prazo</th>
              <th className="px-4 py-3.5">Criticidade</th>
              <th className="px-4 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {pendencias === null && (
              <tr>
                <td className="px-4 py-8 text-center text-ink-muted" colSpan={7}>
                  Carregando…
                </td>
              </tr>
            )}
            {pendencias !== null && filtered.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-ink-muted" colSpan={7}>
                  Nenhuma pendência encontrada com os filtros atuais.
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-line transition-colors hover:bg-paper">
                <td className="px-4 py-3.5 text-ink-muted">{p.origem}</td>
                <td className="px-4 py-3.5 text-ink">
                  <Link to={p.link} className="font-medium hover:text-teal-deep hover:underline">
                    {p.titulo}
                  </Link>
                </td>
                <td className="px-4 py-3.5 text-ink-muted">{p.unidade ?? "—"}</td>
                <td className="px-4 py-3.5 text-ink-muted">{p.responsavel ?? "—"}</td>
                <td className="px-4 py-3.5 font-mono text-xs text-ink-muted">
                  {p.prazo ? new Date(p.prazo).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${CRITICIDADE_STYLE[p.criticidade]}`}
                  >
                    {p.criticidade === "alta" ? <ShieldAlert size={12} /> : <AlertTriangle size={12} />}
                    {CRITICIDADE_LABEL[p.criticidade]}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-ink-muted">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-ink-muted">
        Treinamentos vencendo e inconsistências do eSocial ainda não entram aqui — nenhum dos dois tem dado real no
        sistema ainda para calcular com segurança.
      </p>
    </div>
  );
}
