import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, FileDown, Package, PackageCheck, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { api } from "../lib/api";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import { StatTile } from "../components/ui/cards";
import type { EpiStockItem } from "../lib/types";

type Situacao = "vigente" | "proximo" | "vencido" | "sem-data";

const SITUACAO_LABEL: Record<Situacao, string> = {
  vigente: "Em dia",
  proximo: "Vence em breve",
  vencido: "Vencido",
  "sem-data": "Sem validade",
};
const SITUACAO_STYLE: Record<Situacao, string> = {
  vigente: "bg-teal-tint text-teal-deep",
  proximo: "bg-amber-tint text-amber",
  vencido: "bg-danger-tint text-danger",
  "sem-data": "bg-line text-ink-muted",
};

function classify(expiresAt: string | null): Situacao {
  if (!expiresAt) return "sem-data";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiresAt.slice(0, 10) + "T00:00:00");
  const days = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "vencido";
  if (days <= 30) return "proximo";
  return "vigente";
}

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—");

/** Controle de EPI: estoque de equipamentos com CA, quantidade e vencimento. */
export function EpiStockPage() {
  const [items, setItems] = useState<EpiStockItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EpiStockItem | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const selectedCompanyId = useCompanyFilterStore((s) => s.selectedCompanyId);

  async function load() {
    setItems(await api.get<EpiStockItem[]>("/epi/stock"));
  }
  useEffect(() => {
    load().catch(() => setItems([]));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (items ?? []).filter((i) => !q || [i.name, i.ca, i.category].some((v) => v?.toLowerCase().includes(q)));
  }, [items, search]);

  const totals = useMemo(() => {
    const list = items ?? [];
    return {
      itens: list.length,
      unidades: list.reduce((sum, i) => sum + i.quantity, 0),
      proximo: list.filter((i) => classify(i.expiresAt) === "proximo").length,
      vencido: list.filter((i) => classify(i.expiresAt) === "vencido").length,
    };
  }, [items]);

  async function handleDownloadReport() {
    setError(null);
    setDownloading(true);
    try {
      const { blob, filename } = await api.getBlob(selectedCompanyId ? `/epi/stock/report/pdf?companyId=${encodeURIComponent(selectedCompanyId)}` : "/epi/stock/report/pdf");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar o documento.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete(item: EpiStockItem) {
    if (!window.confirm(`Excluir "${item.name}" do estoque?`)) return;
    setError(null);
    try {
      await api.del(`/epi/stock/${item.id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Controle de EPI</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">Estoque de EPIs: item, CA, quantidade e vencimento. A relação em PDF sai com a logo da empresa selecionada no topo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleDownloadReport} disabled={downloading} className="btn-secondary flex shrink-0 items-center gap-1.5">
            <FileDown size={15} /> {downloading ? "Gerando…" : "Baixar relação (PDF)"}
          </button>
          <button onClick={() => setEditing("new")} className="btn-primary flex shrink-0 items-center gap-1.5">
            <Plus size={15} /> Novo item
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Itens no estoque" value={totals.itens} icon={Package} />
        <StatTile label="Unidades em estoque" value={totals.unidades} icon={PackageCheck} />
        <StatTile label="Vencem em até 30 dias" value={totals.proximo} icon={CalendarClock} tone="amber" />
        <StatTile label="Vencidos" value={totals.vencido} icon={AlertTriangle} tone="danger" />
      </div>

      <div className="mt-5 flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input w-full pl-9" placeholder="Buscar por item, CA ou categoria" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-amber" role="alert">{error}</p>}

      <div className="mt-4 panel">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-paper text-xs font-medium uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3.5">Item</th>
              <th className="px-4 py-3.5">CA</th>
              <th className="px-4 py-3.5">Categoria</th>
              <th className="px-4 py-3.5">Quantidade</th>
              <th className="px-4 py-3.5">Vencimento</th>
              <th className="px-4 py-3.5">Situação</th>
              <th className="px-4 py-3.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items && filtered.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-ink-muted" colSpan={7}>
                  {items.length === 0 ? "Nenhum EPI no estoque ainda. Clique em “Novo item”." : "Nenhum item encontrado."}
                </td>
              </tr>
            )}
            {filtered.map((item) => {
              const situacao = classify(item.expiresAt);
              return (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-4 py-3.5 font-medium text-ink">{item.name}</td>
                  <td className="px-4 py-3.5 text-ink-muted">{item.ca ?? "—"}</td>
                  <td className="px-4 py-3.5 text-ink-muted">{item.category ?? "—"}</td>
                  <td className="px-4 py-3.5 tabular-nums text-ink">{item.quantity}</td>
                  <td className="px-4 py-3.5 text-ink-muted">{formatDate(item.expiresAt)}</td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${SITUACAO_STYLE[situacao]}`}>{SITUACAO_LABEL[situacao]}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(item)} title="Editar" aria-label={`Editar ${item.name}`} className="rounded-md p-1.5 text-ink-muted hover:bg-teal-tint hover:text-ink">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(item)} title="Excluir" aria-label={`Excluir ${item.name}`} className="rounded-md p-1.5 text-ink-muted hover:bg-danger-tint hover:text-danger">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <StockItemModal
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function StockItemModal({ item, onClose, onSaved }: { item: EpiStockItem | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name ?? "");
  const [ca, setCa] = useState(item?.ca ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 0));
  const [expiresAt, setExpiresAt] = useState(item?.expiresAt?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      name: name.trim(),
      ca: ca.trim() || (item ? null : undefined),
      category: category.trim() || (item ? null : undefined),
      quantity: Math.max(0, Math.round(Number(quantity) || 0)),
      expiresAt: expiresAt || (item ? null : undefined),
      notes: notes.trim() || (item ? null : undefined),
    };
    try {
      if (item) await api.patch(`/epi/stock/${item.id}`, body);
      else await api.post("/epi/stock", body);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={item ? "Editar item" : "Novo item"}>
      <form onSubmit={handleSubmit} className="card flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto">
        <div className="flex items-start justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{item ? "Editar item" : "Novo item de estoque"}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-ink-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Item *</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Capacete de segurança" required autoFocus />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">CA</span>
            <input className="input" value={ca} onChange={(e) => setCa(e.target.value)} placeholder="Nº do Certificado de Aprovação" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Categoria</span>
            <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex.: Proteção da cabeça" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Quantidade em estoque</span>
            <input type="number" min={0} step={1} className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Vencimento</span>
            <input type="date" className="input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Observação</span>
          <textarea className="input min-h-[70px] resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {error && <p className="text-sm text-amber" role="alert">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={saving || name.trim().length < 2} className="btn-primary">
            {saving ? "Salvando…" : "Salvar"}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
