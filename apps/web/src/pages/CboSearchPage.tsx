import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { api } from "../lib/api";
import type { CboOccupation } from "../lib/types";

export function CboSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CboOccupation[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function search(term: string) {
    setLoading(true);
    try {
      const data = await api.get<CboOccupation[]>(`/cbo?search=${encodeURIComponent(term.trim())}`);
      setResults(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    search("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Consultar CBO</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Classificação Brasileira de Ocupações — pesquise por código ou palavra-chave.
      </p>

      <label className="mt-4 flex max-w-md items-center gap-2 rounded-md border border-line bg-paper-raised px-3 py-2">
        <Search size={15} className="text-ink-muted" />
        <input
          className="w-full bg-transparent text-sm outline-none"
          placeholder="Ex.: 7841-05 ou motorista"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-paper-raised">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="px-4 py-6 text-ink-muted" colSpan={3}>Buscando…</td></tr>
            )}
            {!loading && results?.length === 0 && (
              <tr><td className="px-4 py-6 text-ink-muted" colSpan={3}>Nenhuma ocupação encontrada.</td></tr>
            )}
            {!loading && results?.map((occ) => (
              <tr key={occ.id} className="border-b border-line last:border-none">
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{occ.code}</td>
                <td className="px-4 py-3 text-ink">{occ.title}</td>
                <td className="px-4 py-3 text-ink-muted">{occ.description ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        Mostrando até 50 resultados. Refine a busca para encontrar uma ocupação específica.
      </p>
    </div>
  );
}
