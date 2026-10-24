import { COLOR_CHOICES, ICON_CHOICES } from "../../lib/appearance";

/** Escolha de cor e ícone (cadastro de ambientes e cargos). */
export function AppearancePicker({
  color,
  icon,
  onColor,
  onIcon,
}: {
  color: string;
  icon: string;
  onColor: (c: string) => void;
  onIcon: (i: string) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5 text-sm">
        <span className="text-ink-muted">Cor</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor">
          {COLOR_CHOICES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={`Cor ${c}`}
              onClick={() => onColor(c)}
              className={`h-7 w-7 rounded-full border-2 transition-transform ${color === c ? "scale-110 border-ink" : "border-transparent"}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 text-sm">
        <span className="text-ink-muted">Ícone</span>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Ícone">
          {ICON_CHOICES.map(({ name, label, icon: Icon }) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={icon === name}
              aria-label={label}
              title={label}
              onClick={() => onIcon(name)}
              className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
                icon === name ? "border-teal bg-teal-tint text-teal-deep" : "border-line text-ink-muted hover:text-ink"
              }`}
            >
              <Icon size={17} />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
