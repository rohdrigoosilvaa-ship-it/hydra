import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Check, Copy, FileDown, Pencil, Plus, QrCode, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { EpiCatalogItem, EpiDelivery, EpiDeliveryItem } from "../lib/types";

const CUSTOM_OPTION = "__custom__";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/** Soma meses a uma data ISO em UTC, evitando o off-by-one de fuso horário. */
function suggestExpiryDate(baseIso: string, months: number): string {
  const base = new Date(baseIso);
  const result = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, base.getUTCDate()));
  return result.toISOString().slice(0, 10);
}

type Situacao = "vigente" | "proximo" | "vencido" | "sem-data";

function classifyExpiry(expiresAt: string | null): Situacao {
  if (!expiresAt) return "sem-data";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiresAt);
  expiry.setHours(0, 0, 0, 0);
  const dias = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (dias < 0) return "vencido";
  if (dias <= 30) return "proximo";
  return "vigente";
}

const SITUACAO_STYLE: Record<Situacao, string> = {
  vigente: "bg-teal-tint text-teal-deep",
  proximo: "bg-amber-tint text-amber",
  vencido: "bg-red-100 text-red-700",
  "sem-data": "bg-line text-ink-muted",
};

const SITUACAO_LABEL: Record<Situacao, string> = {
  vigente: "Vigente",
  proximo: "Próximo da troca",
  vencido: "Vencido",
  "sem-data": "Sem data",
};

function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper"
    >
      {copied ? <Check size={13} className="text-teal-deep" /> : <Copy size={13} />}
      {copied ? "Copiado" : "Copiar link"}
    </button>
  );
}

export function EpiDeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState<EpiDelivery | null>(null);
  const [showNewItem, setShowNewItem] = useState(false);
  const [editingItem, setEditingItem] = useState<EpiDeliveryItem | null>(null);
  const [editingDate, setEditingDate] = useState(false);
  const [qrLink, setQrLink] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setDelivery(await api.get<EpiDelivery>(`/epi/deliveries/${id}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRemoveItem(itemId: string) {
    if (!id) return;
    await api.del(`/epi/deliveries/${id}/items/${itemId}`);
    load();
  }

  async function handleGerarQr() {
    if (!id) return;
    const { link } = await api.post<{ link: string }>(`/epi/deliveries/${id}/signatures/link`, {});
    setQrLink(link);
  }

  async function handleGerarPdf() {
    if (!id) return;
    await api.post(`/epi/deliveries/${id}/pdf`, {});
    load();
  }

  async function handleExcluir() {
    if (!id || !delivery) return;
    const aviso =
      delivery.signingStatus === "ASSINADA"
        ? `Esta ficha já foi assinada eletronicamente por "${delivery.employeeName}". Excluir vai apagar a ficha e a assinatura registrada — essa ação não pode ser desfeita. Continuar?`
        : `Excluir a ficha de EPI de "${delivery.employeeName}"?`;
    if (!window.confirm(aviso)) return;
    await api.del(`/epi/deliveries/${id}`);
    navigate("/epi");
  }

  if (!delivery) return <p className="text-sm text-ink-muted">Carregando…</p>;

  const isSigned = delivery.signingStatus === "ASSINADA";

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate("/epi")} className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
        <ArrowLeft size={13} /> Voltar
      </button>

      <div className="card mt-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">{delivery.employeeName}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
              Ficha de entrega de EPI — {formatDate(delivery.deliveryDate)}
              {!isSigned && (
                <button onClick={() => setEditingDate(true)} className="text-ink-muted hover:text-teal-deep">
                  <Pencil size={12} />
                </button>
              )}
            </p>
          </div>
          <button onClick={handleExcluir} className="text-ink-muted hover:text-danger">
            <Trash2 size={16} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
          <div>
            <p className="text-xs text-ink-muted">Setor</p>
            <p className="font-medium text-ink">{delivery.departmentName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Função</p>
            <p className="font-medium text-ink">{delivery.positionName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Admissão</p>
            <p className="font-medium text-ink">{formatDate(delivery.admittedAt)}</p>
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink">EPI's</h2>
          {!isSigned && (
            <button onClick={() => setShowNewItem(true)} className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs">
              <Plus size={13} /> Novo EPI
            </button>
          )}
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-paper text-xs font-medium uppercase tracking-wide text-ink-muted">
                <th className="px-3 py-2.5">EPI</th>
                <th className="px-3 py-2.5">CA</th>
                <th className="px-3 py-2.5">Qtd.</th>
                <th className="px-3 py-2.5">Periodicidade</th>
                <th className="px-3 py-2.5">Próxima troca</th>
                <th className="px-3 py-2.5">Situação</th>
                <th className="px-3 py-2.5">Observação</th>
                {!isSigned && <th className="px-3 py-2.5" />}
                {!isSigned && <th className="px-3 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {delivery.items.length === 0 && (
                <tr><td className="px-3 py-6 text-center text-ink-muted" colSpan={isSigned ? 7 : 9}>Nenhum EPI adicionado ainda.</td></tr>
              )}
              {delivery.items.map((item) => {
                const situacao = classifyExpiry(item.expiresAt);
                return (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-3 py-2.5 text-ink">{item.catalogItem?.name ?? item.epiName}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-ink-muted">{item.ca ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-ink-muted">{item.quantity ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-ink-muted">
                    {item.periodicityMonths ? `${item.periodicityMonths} ${item.periodicityMonths === 1 ? "mês" : "meses"}` : "—"}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-ink-muted">{formatDate(item.expiresAt)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SITUACAO_STYLE[situacao]}`}>
                      {SITUACAO_LABEL[situacao]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-ink-muted">{item.observation ?? "—"}</td>
                  {!isSigned && (
                    <td className="px-3 py-2.5">
                      <button onClick={() => setEditingItem(item)} className="text-ink-muted hover:text-teal-deep">
                        <Pencil size={13} />
                      </button>
                    </td>
                  )}
                  {!isSigned && (
                    <td className="px-3 py-2.5">
                      <button onClick={() => handleRemoveItem(item.id)} className="text-ink-muted hover:text-danger">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-4">
        <h2 className="font-display text-base font-semibold text-ink">Assinatura e PDF</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {!isSigned ? (
            <button onClick={handleGerarQr} className="btn-secondary flex items-center gap-1.5 text-xs">
              <QrCode size={14} /> Gerar QR de assinatura
            </button>
          ) : (
            <span className="rounded-full bg-teal-tint px-3 py-1.5 text-xs font-medium text-teal-deep">
              Assinada eletronicamente com sucesso
            </span>
          )}
          <button onClick={handleGerarPdf} className="btn-secondary flex items-center gap-1.5 text-xs">
            <FileDown size={14} /> Gerar PDF
          </button>
          {delivery.pdfUrl && (
            <a href={delivery.pdfUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-teal-deep hover:underline">
              Baixar PDF
            </a>
          )}
        </div>

        {qrLink && (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-line bg-paper p-5">
            <QRCodeSVG value={qrLink} size={220} />
            <p className="text-center text-xs text-ink-muted">
              Peça pro colaborador escanear com o celular dele pra ler e assinar a ficha.
            </p>
            <div className="flex items-center gap-2">
              <input readOnly value={qrLink} className="input text-xs" style={{ width: 280 }} onFocus={(e) => e.target.select()} />
              <CopyLinkButton link={qrLink} />
            </div>
          </div>
        )}
      </div>

      {showNewItem && (
        <EpiItemModal
          deliveryId={id!}
          deliveryDate={delivery.deliveryDate}
          onClose={() => setShowNewItem(false)}
          onSaved={() => {
            setShowNewItem(false);
            load();
          }}
        />
      )}

      {editingItem && (
        <EpiItemModal
          deliveryId={id!}
          deliveryDate={delivery.deliveryDate}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null);
            load();
          }}
        />
      )}

      {editingDate && (
        <EditDeliveryDateModal
          deliveryId={id!}
          currentDate={delivery.deliveryDate}
          onClose={() => setEditingDate(false)}
          onSaved={() => {
            setEditingDate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function EpiItemModal({
  deliveryId,
  deliveryDate,
  item,
  onClose,
  onSaved,
}: {
  deliveryId: string;
  deliveryDate: string;
  item?: EpiDeliveryItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!item;
  const [catalog, setCatalog] = useState<EpiCatalogItem[]>([]);
  const [selected, setSelected] = useState(item ? item.epiCatalogItemId ?? CUSTOM_OPTION : "");
  const [customName, setCustomName] = useState(item && !item.epiCatalogItemId ? item.epiName : "");
  const [ca, setCa] = useState(item?.ca ?? "");
  const [quantity, setQuantity] = useState(item?.quantity ?? "");
  const [periodicityMonths, setPeriodicityMonths] = useState(item?.periodicityMonths?.toString() ?? "");
  const [expiresAt, setExpiresAt] = useState(item?.expiresAt?.slice(0, 10) ?? "");
  const [observation, setObservation] = useState(item?.observation ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePeriodicityChange(value: string) {
    setPeriodicityMonths(value);
    const months = parseInt(value, 10);
    if (Number.isInteger(months) && months > 0) {
      setExpiresAt(suggestExpiryDate(deliveryDate, months));
    }
  }

  useEffect(() => {
    api.get<EpiCatalogItem[]>("/epi/catalog").then(setCatalog);
  }, []);

  const groupedByCategory = catalog.reduce<Record<string, EpiCatalogItem[]>>((acc, catalogItem) => {
    (acc[catalogItem.category] ??= []).push(catalogItem);
    return acc;
  }, {});

  async function handleSubmit() {
    const catalogItem = catalog.find((c) => c.id === selected);
    const epiName = selected === CUSTOM_OPTION ? customName.trim() : catalogItem?.name ?? "";
    if (!epiName) {
      setError("Selecione um EPI ou digite o nome.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const periodicity = periodicityMonths ? parseInt(periodicityMonths, 10) : undefined;
      if (isEditing) {
        await api.patch(`/epi/deliveries/${deliveryId}/items/${item!.id}`, {
          epiCatalogItemId: selected === CUSTOM_OPTION ? null : selected || null,
          epiName,
          ca: ca || null,
          quantity: quantity || null,
          expiresAt: expiresAt || null,
          periodicityMonths: periodicity ?? null,
          observation: observation || null,
        });
      } else {
        await api.post(`/epi/deliveries/${deliveryId}/items`, {
          epiCatalogItemId: selected === CUSTOM_OPTION ? undefined : selected || undefined,
          epiName,
          ca: ca || undefined,
          quantity: quantity || undefined,
          expiresAt: expiresAt || undefined,
          periodicityMonths: periodicity,
          observation: observation || undefined,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-base font-semibold text-ink">{isEditing ? "Editar EPI" : "Novo EPI"}</h3>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">EPI</span>
            <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Selecione um EPI</option>
              {Object.entries(groupedByCategory).map(([category, items]) => (
                <optgroup key={category} label={category}>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </optgroup>
              ))}
              <option value={CUSTOM_OPTION}>Outro (digitar)…</option>
            </select>
          </label>

          {selected === CUSTOM_OPTION && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Nome do EPI</span>
              <input className="input" value={customName} onChange={(e) => setCustomName(e.target.value)} />
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">CA do EPI</span>
            <input className="input" value={ca} onChange={(e) => setCa(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Quantidade</span>
            <input className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Periodicidade preventiva para troca (meses)</span>
            <input
              type="number"
              min={1}
              className="input"
              placeholder="Ex.: 6"
              value={periodicityMonths}
              onChange={(e) => handlePeriodicityChange(e.target.value)}
            />
            <span className="text-xs text-ink-muted">
              Preenche a próxima troca automaticamente a partir da data de entrega — pode ajustar depois.
            </span>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Próxima troca (vencimento)</span>
            <input type="date" className="input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Observação</span>
            <textarea className="input" rows={2} value={observation} onChange={(e) => setObservation(e.target.value)} />
          </label>
        </div>

        {error && <p className="mt-2 text-xs text-amber">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditDeliveryDateModal({
  deliveryId,
  currentDate,
  onClose,
  onSaved,
}: {
  deliveryId: string;
  currentDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [deliveryDate, setDeliveryDate] = useState(currentDate.slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/epi/deliveries/${deliveryId}`, { deliveryDate });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-base font-semibold text-ink">Editar data da entrega</h3>

        <label className="mt-4 flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Data da Entrega</span>
          <input type="date" className="input" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
        </label>

        {error && <p className="mt-2 text-xs text-amber">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
