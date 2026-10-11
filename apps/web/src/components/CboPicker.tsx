import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { CboOccupation } from "../lib/types";

/** Campo de texto com busca ao vivo no catálogo CBO — usado no cadastro de Cargo. */
export function CboPicker({
  value,
  onChange,
  onSelectOccupation,
}: {
  value: string;
  onChange: (code: string) => void;
  onSelectOccupation?: (occupation: CboOccupation) => void;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CboOccupation[]>([]);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setQuery(value), [value]);

  function handleInput(text: string) {
    setQuery(text);
    onChange(text);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    timeoutRef.current = setTimeout(async () => {
      const data = await api.get<CboOccupation[]>(`/cbo?search=${encodeURIComponent(text.trim())}`);
      setResults(data);
      setOpen(true);
    }, 300);
  }

  function handlePick(occ: CboOccupation) {
    setQuery(occ.code);
    onChange(occ.code);
    onSelectOccupation?.(occ);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        className="input"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Código ou nome da ocupação…"
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-60 w-full min-w-[320px] overflow-y-auto rounded-md border border-line bg-paper-raised shadow-md">
          {results.map((occ) => (
            <button
              key={occ.id}
              type="button"
              onClick={() => handlePick(occ)}
              className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-teal-tint"
            >
              <span className="font-mono text-xs text-ink-muted">{occ.code}</span>
              <span className="text-ink">{occ.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
