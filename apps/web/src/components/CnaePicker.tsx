import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { CnaeEntry } from "../lib/types";

/** Campo de CNAE com busca na tabela da NR-04 (código ou descrição); ao escolher, devolve o código e o grau de risco. */
export function CnaePicker({
  value,
  onChange,
  onPick,
  label,
}: {
  value: string;
  onChange: (code: string) => void;
  onPick?: (entry: CnaeEntry) => void;
  label: string;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CnaeEntry[]>([]);
  const [loaded, setLoaded] = useState(true);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<CnaeEntry | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setQuery(value), [value]);

  function handleInput(text: string) {
    setQuery(text);
    setPicked(null);
    onChange(text);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    timeoutRef.current = setTimeout(async () => {
      const data = await api.get<{ items: CnaeEntry[]; loaded: boolean }>(`/cnae?search=${encodeURIComponent(text.trim())}`);
      setResults(data.items);
      setLoaded(data.loaded);
      setOpen(true);
    }, 300);
  }

  function handlePick(entry: CnaeEntry) {
    // se foi digitada a subclasse (ex.: 4711-3/02), mantém o final "/02" junto da classe escolhida
    const typed = query.replace(/\D/g, "");
    const code = typed.length >= 7 && typed.startsWith(entry.code.replace(/\D/g, "")) ? `${entry.code}/${typed.slice(5, 7)}` : entry.code;
    setQuery(code);
    setPicked(entry);
    onChange(code);
    onPick?.(entry);
    setOpen(false);
  }

  return (
    <div className="relative flex flex-col gap-1 text-sm">
      <span className="text-ink-muted">{label}</span>
      <input
        className="input"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Digite o código ou a atividade (NR-04)…"
        aria-label={label}
      />
      {picked && (
        <p className="text-xs text-teal-deep">
          {picked.code} — {picked.description} · Grau de risco {picked.riskGrade} (NR-04)
        </p>
      )}
      {!loaded && <p className="text-xs text-ink-muted">A lista de CNAE da NR-04 ainda não foi carregada — digite o código manualmente.</p>}
      {loaded && !picked && query.trim().length >= 2 && results.length === 0 && !open && (
        <p className="text-xs text-ink-muted">Nenhum CNAE encontrado na NR-04 para “{query.trim()}”.</p>
      )}
      {open && results.length > 0 && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-64 w-full min-w-[340px] overflow-y-auto rounded-md border border-line bg-paper-raised shadow-md">
          {results.map((e) => (
            <button key={e.id} type="button" onClick={() => handlePick(e)} className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-teal-tint">
              <span className="flex w-full items-center justify-between gap-2">
                <span className="font-mono text-xs text-ink-muted">{e.code}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${e.riskGrade >= 3 ? "bg-danger-tint text-danger" : "bg-teal-tint text-teal-deep"}`}>GR {e.riskGrade}</span>
              </span>
              <span className="text-ink">{e.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
