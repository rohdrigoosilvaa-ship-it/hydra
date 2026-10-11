import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { api } from "../../lib/api";
import type { ContractTemplate } from "../../lib/types";

export function ContractTemplatesTab() {
  const [templates, setTemplates] = useState<ContractTemplate[] | null>(null);

  useEffect(() => {
    api.get<ContractTemplate[]>("/contracts/templates").then(setTemplates);
  }, []);

  return (
    <div>
      <p className="text-sm text-ink-muted">
        Modelos de contrato disponíveis — as cláusulas seguem fixas, só os dados variáveis mudam por contrato. Novos
        modelos (Treinamentos, Consultoria avulsa etc.) entram aqui numa fase futura.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {templates?.length === 0 && <p className="text-sm text-ink-muted">Nenhum modelo cadastrado ainda.</p>}
        {templates?.map((t) => (
          <div key={t.id} className="card">
            <div className="flex items-start gap-2.5">
              <span className="rounded-md bg-teal-tint p-2 text-teal-deep"><FileText size={16} /></span>
              <div>
                <p className="font-medium text-ink">{t.name}</p>
                {t.description && <p className="mt-0.5 text-xs text-ink-muted">{t.description}</p>}
                <p className="mt-1.5 text-xs text-ink-muted">
                  {t.clauses.length} cláusula(s) · {t.serviceItems.length} serviço(s) no catálogo
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
