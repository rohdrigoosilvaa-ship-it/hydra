/**
 * Lockup de marca oficial do ProtecOne (produto) sob a ProtecSeg (empresa).
 *
 * Ativos em `public/`: `logo-mark.png` (capacete recortado da logo oficial,
 * sem fundo) e `logo-full.png` (lockup completo "PROTECONE" oficial, sem
 * fundo). Nenhum dos dois foi redesenhado — apenas recortados/copiados do
 * arquivo enviado pelo usuário. Não alterar proporções nem cores aqui.
 */
const FULL_SIZE = { sm: "h-10", lg: "h-16" } as const;

export function Logo({ variant = "full", size = "sm" }: { variant?: "full" | "mark"; size?: "sm" | "lg" }) {
  if (variant === "mark") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-deep p-1.5">
        <img src="/logo-mark.png" alt="ProtecOne" className="h-full w-full object-contain" />
      </div>
    );
  }

  return <img src="/logo-full.png" alt="ProtecOne" className={`${FULL_SIZE[size]} w-auto object-contain`} />;
}
