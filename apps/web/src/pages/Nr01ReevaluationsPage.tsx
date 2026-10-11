import { RefreshCw } from "lucide-react";

const REASONS = [
  "Ação implementada",
  "Mudança organizacional",
  "Mudança de processo",
  "Ocorrência relevante",
  "Periodicidade",
  "Necessidade técnica",
];

export function Nr01ReevaluationsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Reavaliações</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">
        Programe a reavaliação de um risco quando uma medida for implementada, um processo mudar, ou por
        periodicidade. Fecha o ciclo de gerenciamento contínuo — nenhuma ação deve ser considerada eficaz só por ter
        sido concluída, sem uma reavaliação que confirme a redução do risco.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REASONS.map((reason) => (
          <div key={reason} className="rounded-lg border border-line bg-paper-raised p-4 text-sm text-ink-muted">
            {reason}
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line bg-paper-raised py-16 text-center">
        <RefreshCw size={28} className="text-ink-muted" />
        <p className="text-sm font-medium text-ink">Nenhuma reavaliação programada</p>
        <p className="max-w-sm text-xs text-ink-muted">
          O agendamento e acompanhamento de reavaliações está em desenvolvimento — a estrutura de navegação já está
          pronta para receber esse fluxo.
        </p>
      </div>
    </div>
  );
}
