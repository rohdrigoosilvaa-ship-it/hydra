import { useState } from "react";
import { ClipboardList, Eye, Image as ImageIcon, Plus } from "lucide-react";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import { OverviewTab } from "../components/inspections/OverviewTab";
import { TemplatesTab } from "../components/inspections/TemplatesTab";
import { NewInspectionTab } from "../components/inspections/NewInspectionTab";
import { CompletedInspectionsTab } from "../components/inspections/CompletedInspectionsTab";
import { NonConformitiesTab } from "../components/inspections/NonConformitiesTab";
import { EvidenceTab } from "../components/inspections/EvidenceTab";
import { BehaviorObservationsTab } from "../components/inspections/BehaviorObservationsTab";

type Tab = "overview" | "new" | "templates" | "completed" | "non-conformities" | "behavior" | "evidence";

/** As quatro páginas do menu CheckHub — cada uma mostra um conjunto de abas do módulo de inspeções. */
export type CheckHubView = "dashboard" | "criar-checklist" | "checklists-aplicados" | "planos-de-acao";

const VIEWS: Record<
  CheckHubView,
  { title: string; subtitle: string; tabs: { id: Tab; label: string; icon: typeof Plus }[] }
> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Visão geral dos checklists, não conformidades e planos de ação.",
    tabs: [{ id: "overview", label: "Visão Geral", icon: ClipboardList }],
  },
  "criar-checklist": {
    title: "Criar Checklist",
    subtitle: "Monte modelos reutilizáveis de checklist — cada um vira um roteiro ao aplicar uma inspeção.",
    tabs: [{ id: "templates", label: "Modelos / Roteiros", icon: ClipboardList }],
  },
  "checklists-aplicados": {
    title: "Checklists Aplicados",
    subtitle: "Aplique um checklist e acompanhe os resultados das inspeções realizadas.",
    tabs: [
      { id: "completed", label: "Aplicados", icon: ClipboardList },
      { id: "new", label: "Aplicar checklist", icon: Plus },
      { id: "behavior", label: "Observações Comportamentais", icon: Eye },
      { id: "evidence", label: "Evidências", icon: ImageIcon },
    ],
  },
  "planos-de-acao": {
    title: "Planos de Ação",
    subtitle: "Não conformidades encontradas nas inspeções e o plano de ação de cada uma.",
    tabs: [{ id: "non-conformities", label: "Não Conformidades", icon: ClipboardList }],
  },
};

export function InspectionsHubPage({ view = "dashboard" }: { view?: CheckHubView }) {
  const config = VIEWS[view];
  // "key" no router/pai não é necessário: o estado da aba reinicia quando a view muda.
  return <HubContent key={view} config={config} />;
}

function HubContent({ config }: { config: (typeof VIEWS)[CheckHubView] }) {
  const [tab, setTab] = useState<Tab>(config.tabs[0]!.id);
  const selectedCompanyId = useCompanyFilterStore((s) => s.selectedCompanyId) ?? undefined;

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{config.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{config.subtitle}</p>
      </div>

      {config.tabs.length > 1 && (
        <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
          {config.tabs.map(({ id, label, icon: Icon }) => (
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
      )}

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
