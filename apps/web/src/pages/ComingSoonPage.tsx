import { Construction } from "lucide-react";

export function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-1 text-sm text-ink-muted">{description}</p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line bg-paper-raised py-16 text-center">
        <Construction size={28} className="text-ink-muted" />
        <p className="text-sm font-medium text-ink">Em desenvolvimento</p>
        <p className="max-w-sm text-xs text-ink-muted">
          Este recurso faz parte do roteiro do Módulo NR-01 e será liberado em uma próxima etapa.
        </p>
      </div>
    </div>
  );
}
