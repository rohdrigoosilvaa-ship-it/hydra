import { useEffect, type FormEvent, type ReactNode } from "react";

/** Janela por cima da página: faixa de título em degradê, conteúdo e rodapé com Cancelar / Salvar. */
export function FormModal({
  title,
  onClose,
  onSubmit,
  saving = false,
  canSave = true,
  error,
  children,
  saveLabel = "Salvar",
  size = "max-w-3xl",
}: {
  title: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  saving?: boolean;
  canSave?: boolean;
  error?: string | null;
  children: ReactNode;
  saveLabel?: string;
  size?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-10" role="dialog" aria-modal="true" aria-label={title}>
      <form onSubmit={onSubmit} className={`w-full ${size} overflow-hidden rounded-lg bg-paper-raised shadow-2xl`}>
        <div className="bg-gradient-to-r from-teal-deep via-teal to-teal-deep px-6 py-4 text-center font-display text-sm font-semibold uppercase tracking-[0.2em] text-white">
          {title}
        </div>
        <div className="flex flex-col gap-5 px-6 py-5">{children}</div>
        {error && <p className="px-6 pb-2 text-sm text-amber" role="alert">{error}</p>}
        <div className="flex items-center justify-end gap-6 border-t border-line px-6 py-4">
          <button type="button" onClick={onClose} className="text-base font-medium text-ink-muted hover:text-ink">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !canSave} className="text-base font-semibold text-teal-deep hover:underline disabled:opacity-50">
            {saving ? "Salvando…" : saveLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Rótulo pequeno em maiúsculas, como nos formulários em janela. */
export function ModalField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1 font-display text-[11px] font-bold uppercase tracking-wide text-teal-deep">
        {required && <span aria-hidden>★</span>}
        {label}
      </span>
      {children}
    </label>
  );
}
