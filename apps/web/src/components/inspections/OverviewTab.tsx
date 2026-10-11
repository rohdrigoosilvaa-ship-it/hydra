import { useEffect, useState } from "react";
import { ClipboardCheck, ClipboardList, ListChecks, TriangleAlert } from "lucide-react";
import { api } from "../../lib/api";
import type { Inspection, NonConformity } from "../../lib/types";

export function OverviewTab({ companyId }: { companyId?: string }) {
  const [inspections, setInspections] = useState<Inspection[] | null>(null);
  const [nonConformities, setNonConformities] = useState<NonConformity[] | null>(null);

  useEffect(() => {
    const inspectionsPath = companyId
      ? `/field-ops/inspections?companyId=${encodeURIComponent(companyId)}`
      : "/field-ops/inspections";
    const ncPath = companyId
      ? `/field-ops/non-conformities?companyId=${encodeURIComponent(companyId)}`
      : "/field-ops/non-conformities";
    Promise.all([api.get<Inspection[]>(inspectionsPath), api.get<NonConformity[]>(ncPath)]).then(
      ([i, nc]) => {
        setInspections(i);
        setNonConformities(nc);
      },
    );
  }, [companyId]);

  const total = inspections?.length ?? 0;
  const concluidas = inspections?.filter((i) => i.status === "CONCLUIDA").length ?? 0;
  const ncAbertas = nonConformities?.filter((nc) => nc.status !== "RESOLVIDA").length ?? 0;
  const ncCriticas = nonConformities?.filter((nc) => nc.severity === "CRITICA" && nc.status !== "RESOLVIDA").length ?? 0;

  const cards = [
    { label: "Inspeções realizadas", value: total, icon: ClipboardList, tone: "teal" as const },
    { label: "Inspeções concluídas", value: concluidas, icon: ClipboardCheck, tone: "teal" as const },
    { label: "Não conformidades em aberto", value: ncAbertas, icon: ListChecks, tone: "amber" as const },
    { label: "Críticas em aberto", value: ncCriticas, icon: TriangleAlert, tone: "danger" as const },
  ];

  const TONE_STYLE = { teal: "bg-teal-tint text-teal-deep", amber: "bg-amber-tint text-amber", danger: "bg-danger-tint text-danger" };

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, tone }) => (
        <div key={label} className="card flex flex-col gap-3 p-4">
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${TONE_STYLE[tone]}`}>
            <Icon size={17} strokeWidth={2} />
          </span>
          <div>
            <p className="font-display text-2xl font-semibold tabular-nums text-ink">
              {inspections === null ? "—" : value}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
