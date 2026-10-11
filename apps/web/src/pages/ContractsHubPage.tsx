import { useState } from "react";
import { ClipboardList, FileText, Plus } from "lucide-react";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import { NewContractTab } from "../components/contracts/NewContractTab";
import { ContractsListTab } from "../components/contracts/ContractsListTab";
import { ContractTemplatesTab } from "../components/contracts/ContractTemplatesTab";

type Tab = "new" | "list" | "templates";

const TABS: { id: Tab; label: string; icon: typeof Plus }[] = [
  { id: "new", label: "Novo Contrato", icon: Plus },
  { id: "list", label: "Contratos Cadastrados", icon: ClipboardList },
  { id: "templates", label: "Modelos de Contrato", icon: FileText },
];

export function ContractsHubPage() {
  const [tab, setTab] = useState<Tab>("list");
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const selectedCompanyId = useCompanyFilterStore((s) => s.selectedCompanyId) ?? undefined;

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Contratos</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Gerador de contratos — preencha os dados uma vez, o PDF é gerado automaticamente a partir do modelo padrão.
        </p>
      </div>

      <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setTab(id);
              if (id !== "new") setEditingContractId(null);
            }}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === id ? "bg-teal text-white" : "bg-paper-raised text-ink-muted hover:bg-teal-tint/60 hover:text-ink"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "new" && (
          <NewContractTab
            editingContractId={editingContractId}
            onFinished={() => {
              setEditingContractId(null);
              setTab("list");
            }}
          />
        )}
        {tab === "list" && (
          <ContractsListTab
            companyId={selectedCompanyId}
            onEdit={(id) => {
              setEditingContractId(id);
              setTab("new");
            }}
          />
        )}
        {tab === "templates" && <ContractTemplatesTab />}
      </div>
    </div>
  );
}
