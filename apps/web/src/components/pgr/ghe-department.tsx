import { useEffect, useState } from "react";
import { api } from "../../lib/api";

/** Setor da empresa com a quantidade de colaboradores ativos (total e por cargo). */
export interface DepartmentSummary {
  id: string;
  name: string;
  code: string | null;
  employeeCount: number;
  positions: { id: string; name: string; count: number }[];
}

export function useDepartmentSummary(companyId: string | undefined): DepartmentSummary[] {
  const [summary, setSummary] = useState<DepartmentSummary[]>([]);
  useEffect(() => {
    if (!companyId) return;
    api
      .get<DepartmentSummary[]>(`/pgr/ghe/department-summary?companyId=${encodeURIComponent(companyId)}`)
      .then(setSummary)
      .catch(() => setSummary([])); // sem permissão/erro: só some a contagem, o resto continua funcionando
  }, [companyId]);
  return summary;
}

export function colabLabel(n: number): string {
  return `${n} colaborador${n === 1 ? "" : "es"}`;
}

/** Colaboradores ativos do setor+cargo (ou do setor inteiro, se não houver cargo). null = sem dado. */
export function countFor(summary: DepartmentSummary[], departmentId?: string | null, positionId?: string | null): number | null {
  const dep = summary.find((d) => d.id === departmentId);
  if (!dep) return null;
  if (!positionId) return dep.employeeCount;
  return dep.positions.find((p) => p.id === positionId)?.count ?? 0;
}

/**
 * "Criar GHE a partir de um Setor": escolhe o setor cadastrado (vira o GHE) e marca os cargos/funções
 * que entram nele — com a quantidade de colaboradores de cada um calculada automaticamente.
 */
export function DepartmentPicker({
  summary,
  departmentId,
  positionIds,
  onDepartmentChange,
  onPositionsChange,
}: {
  summary: DepartmentSummary[];
  departmentId: string;
  positionIds: string[];
  onDepartmentChange: (id: string) => void;
  onPositionsChange: (ids: string[]) => void;
}) {
  const dep = summary.find((d) => d.id === departmentId);
  const total = dep
    ? positionIds.length
      ? dep.positions.filter((p) => positionIds.includes(p.id)).reduce((n, p) => n + p.count, 0)
      : dep.employeeCount
    : 0;

  function toggle(id: string) {
    onPositionsChange(positionIds.includes(id) ? positionIds.filter((x) => x !== id) : [...positionIds, id]);
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-line p-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Criar a partir de um Setor cadastrado (opcional)</span>
        <select className="input" value={departmentId} onChange={(e) => onDepartmentChange(e.target.value)}>
          <option value="">Preencher manualmente</option>
          {summary.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} — {colabLabel(d.employeeCount)}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink-muted">
          O setor vira o GHE e a quantidade de colaboradores vem do cadastro (só ativos).
        </span>
      </label>

      {dep && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-ink-muted">Funções (cargos) do setor neste GHE</p>
          {dep.positions.length === 0 ? (
            <p className="text-xs text-ink-muted">Nenhum colaborador com cargo neste setor — o GHE será criado só com o setor.</p>
          ) : (
            dep.positions.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={positionIds.includes(p.id)} onChange={() => toggle(p.id)} />
                <span className="text-ink">{p.name}</span>
                <span className="text-xs text-ink-muted">· {colabLabel(p.count)}</span>
              </label>
            ))
          )}
          <p className="text-xs font-medium text-teal-deep">Total neste GHE: {colabLabel(total)}</p>
        </div>
      )}
    </div>
  );
}

/** Ao escolher o setor: marca todos os cargos dele por padrão. */
export function allPositionIds(summary: DepartmentSummary[], departmentId: string): string[] {
  return summary.find((d) => d.id === departmentId)?.positions.map((p) => p.id) ?? [];
}
