import { useState } from "react";
import { Star, Upload } from "lucide-react";
import type { InspectionTemplateItem } from "../../lib/types";

type AnswerItem = Pick<InspectionTemplateItem, "responseType" | "options" | "rows" | "scaleMin" | "scaleMax" | "scaleMinLabel" | "scaleMaxLabel">;

const pill = (on: boolean) =>
  `rounded-md border px-3 py-2 text-sm font-medium transition-colors ${on ? "border-teal bg-teal-tint text-teal-deep" : "border-line text-ink-muted hover:text-ink"}`;

function parseGrid(value: string): Record<string, string> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/**
 * Campo de resposta dos tipos livres (texto, escolha, lista, escala, classificação, grade, data, hora e upload).
 * `onChange` atualiza a tela; `onCommit` é chamado quando a resposta deve ser gravada (ao sair do campo ou ao escolher).
 */
export function AnswerInput({
  item,
  name,
  value,
  onChange,
  onCommit,
  preview = false,
}: {
  item: AnswerItem;
  name: string;
  value: string;
  onChange: (v: string) => void;
  onCommit: (v: string) => void;
  /** Na prévia o upload é só ilustrativo; na aplicação o envio é feito pelo bloco de anexos do item. */
  preview?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const selected = value ? value.split(",").filter(Boolean) : [];
  const commitNow = (v: string) => {
    onChange(v);
    onCommit(v);
  };

  switch (item.responseType) {
    case "TEXTO_CURTO":
      return <input className="input mt-3 w-full" value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => onCommit(value)} />;
    case "TEXTO_LONGO":
    case "TEXTO_LIVRE":
      return <textarea className="input mt-3 w-full" rows={3} value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => onCommit(value)} />;
    case "NUMERO":
    case "NOTA":
      return <input type="number" className="input mt-3 w-full" value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => onCommit(value)} />;
    case "DATA":
      return <input type="date" className="input mt-3 w-full sm:w-52" value={value} onChange={(e) => commitNow(e.target.value)} />;
    case "HORA":
      return <input type="time" className="input mt-3 w-full sm:w-40" value={value} onChange={(e) => commitNow(e.target.value)} />;
    case "SELECAO_UNICA":
    case "SELECAO_MULTIPLA": {
      const single = item.responseType === "SELECAO_UNICA";
      return (
        <div className="mt-3 flex flex-col gap-1.5">
          {item.options.map((o) => (
            <label key={o} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-ink">
              <input
                type={single ? "radio" : "checkbox"}
                name={name}
                checked={selected.includes(o)}
                onChange={() => commitNow(single ? o : (selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]).join(","))}
              />
              {o}
            </label>
          ))}
        </div>
      );
    }
    case "LISTA_SUSPENSA":
      return (
        <select className="input mt-3 w-full sm:w-72" value={value} onChange={(e) => commitNow(e.target.value)}>
          <option value="">Selecione…</option>
          {item.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    case "ESCALA": {
      const min = item.scaleMin ?? 1;
      const max = item.scaleMax ?? 5;
      return (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {item.scaleMinLabel && <span className="text-xs text-ink-muted">{item.scaleMinLabel}</span>}
          {Array.from({ length: max - min + 1 }, (_, i) => String(min + i)).map((n) => (
            <button key={n} type="button" className={`${pill(value === n)} w-11 px-0`} onClick={() => commitNow(n)}>
              {n}
            </button>
          ))}
          {item.scaleMaxLabel && <span className="text-xs text-ink-muted">{item.scaleMaxLabel}</span>}
        </div>
      );
    }
    case "CLASSIFICACAO": {
      const max = item.scaleMax ?? 5;
      const current = Number(value) || 0;
      return (
        <div className="mt-3 flex gap-1" onMouseLeave={() => setHover(0)}>
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
            const on = n <= (hover || current);
            return (
              <button
                key={n}
                type="button"
                aria-label={`${n} de ${max}`}
                onMouseEnter={() => setHover(n)}
                onClick={() => commitNow(current === n ? "" : String(n))}
                className={on ? "text-amber" : "text-line-strong"}
              >
                <Star size={26} fill={on ? "currentColor" : "none"} />
              </button>
            );
          })}
        </div>
      );
    }
    case "GRADE": {
      const grid = parseGrid(value);
      const set = (row: string, col: string) => commitNow(JSON.stringify({ ...grid, [row]: col }));
      return (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th />
                {item.options.map((c) => (
                  <th key={c} className="px-2 pb-1 text-center text-xs font-medium text-ink-muted">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {item.rows.map((r) => (
                <tr key={r} className="border-t border-line">
                  <td className="py-2 pr-3 text-ink">{r}</td>
                  {item.options.map((c) => (
                    <td key={c} className="px-2 text-center">
                      <input type="radio" name={`${name}-${r}`} aria-label={`${r}: ${c}`} checked={grid[r] === c} onChange={() => set(r, c)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "UPLOAD":
      return preview ? (
        <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-line px-3 py-3 text-sm text-ink-muted">
          <Upload size={16} /> Selecionar arquivo
          <input type="file" className="hidden" />
        </label>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
          <Upload size={14} /> Envie o arquivo no campo de anexos abaixo.
        </p>
      );
    default:
      return null;
  }
}

/** Resumo legível da grade, para telas que só mostram a resposta. */
export function formatGridAnswer(value: string): string {
  return Object.entries(parseGrid(value))
    .map(([r, c]) => `${r}: ${c}`)
    .join(" · ");
}
