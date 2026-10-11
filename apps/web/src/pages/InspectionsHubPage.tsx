import { useState } from "react";
import { ClipboardList, Eye, FileWarning, Image as ImageIcon, ListChecks, LayoutGrid, Plus } from "lucide-react";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import { OverviewTab } from "../components/inspections/OverviewTab";
import { TemplatesTab } from "../components/inspections/TemplatesTab";
import { NewInspectionTab } from "../components/inspections/NewInspectionTab";
import { CompletedInspectionsTab } from "../components/inspections/CompletedInspectionsTab";
import { NonConformitiesTab } from "../components/inspections/NonConformitiesTab";
import { EvidenceTab } from "../components/inspections/EvidenceTab";
import { BehaviorObservationsTab } from "../components/inspections/BehaviorObservationsTab";

type Tab = "overview" | "new" | "templates" | "completed" | "non-conformities" | "behavior" | "evidence";

const TABS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Visão Geral", icon: LayoutGrid },
  { id: "new", label: "Nova Inspeção", icon: Plus },
  { id: "templates", label: "Modelos / Roteiros", icon: ListChecks },
  { id: "completed", label: "Inspeções Realizadas", icon: ClipboardList },
  { id: "non-conformities", label: "Não Conformidades", icon: FileWarning },
  { id: "behavior", label: "Observações Comportamentais", icon: Eye },
  { id: "evidence", label: "Evidências", icon: ImageIcon },
];

export function InspectionsHubPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const selectedCompanyId = useCompanyFilterStore((s) => s.selectedCompanyId) ?? undefined;

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Inspeções</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Checklists de inspeção de campo, não conformidades e evidências — tudo em um só lugar.
        </p>
      </div>

      <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === id ? "bg-teal text-white" : "bg-paper-raised text-ink-muted hover:bg-teal-tint/60 hover:text-ink"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "overview" && <OverviewTab companyId={selectedCompanyId} />}
        {tab === "new" && <NewInspectionTab companyId={selectedCompanyId} onFinished={() => setTab("completed")} />}
        {tab === "templates" && <TemplatesTab companyId={selectedCompanyId} />}
        {tab === "completed" && <CompletedInspectionsTab companyId={selectedCompanyId} />}
        {tab === "non-conformities" && <NonConformitiesTab companyId={selectedCompanyId} />}
        {tab === "behavior" && <BehaviorObservationsTab companyId={selectedCompanyId} />}
        {tab === "evidence" && <EvidenceTab companyId={selectedCompanyId} />}
      </div>
    </div>
  );
}
