import { useEffect, useRef, useState } from "react";
import { Check, Copy, Eye, FileDown, Link2, Pencil, PenLine, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import type { Contract, ContractComputedStatus, ContractPreview, ContractSigningStatus } from "../../lib/types";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";

const STATUS_LABEL: Record<ContractComputedStatus, string> = {
  ATIVO: "Ativo",
  PROXIMO_VENCIMENTO: "Próximo do vencimento",
  VENCIDO: "Vencido",
  CANCELADO: "Cancelado",
};
const STATUS_STYLE: Record<ContractComputedStatus, string> = {
  ATIVO: "bg-teal-tint text-teal-deep",
  PROXIMO_VENCIMENTO: "bg-amber-tint text-amber",
  VENCIDO: "bg-danger-tint text-danger",
  CANCELADO: "bg-line text-ink-muted",
};

const SIGNING_LABEL: Record<ContractSigningStatus, string> = {
  NAO_ENVIADO: "Não enviado",
  AGUARDANDO_ASSINATURAS: "Aguardando assinaturas",
  ASSINADO: "Assinado",
};
const SIGNING_STYLE: Record<ContractSigningStatus, string> = {
  NAO_ENVIADO: "bg-line text-ink-muted",
  AGUARDANDO_ASSINATURAS: "bg-amber-tint text-amber",
  ASSINADO: "bg-teal-tint text-teal-deep",
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

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

export function ContractsListTab({
  companyId,
  onEdit,
}: {
  companyId?: string;
  onEdit: (contractId: string) => void;
}) {
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [previewing, setPreviewing] = useState<ContractPreview | null>(null);
  const [linkModal, setLinkModal] = useState<{ razaoSocial: string; link: string; expiresAt: string } | null>(null);
  const [signingContractId, setSigningContractId] = useState<string | null>(null);
  const [signError, setSignError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const padRef = useRef<SignaturePadHandle>(null);

  async function load() {
    const path = companyId ? `/contracts?companyId=${encodeURIComponent(companyId)}` : "/contracts";
    setContracts(await api.get<Contract[]>(path));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function handleVisualizar(id: string) {
    setPreviewing(await api.get<ContractPreview>(`/contracts/${id}/preview`));
  }

  async function handleGerarPdf(id: string) {
    await api.post(`/contracts/${id}/pdf`, {});
    load();
  }

  async function handleExcluir(id: string, razaoSocial: string) {
    if (!window.confirm(`Tem certeza que deseja excluir o contrato de "${razaoSocial}"?`)) return;
    await api.del(`/contracts/${id}`);
    load();
  }

  async function handleSolicitarAssinatura(c: Contract) {
    const { link, expiresAt } = await api.post<{ link: string; expiresAt: string }>(
      `/contracts/${c.id}/signatures/contratante/link`,
      {},
    );
    setLinkModal({ razaoSocial: c.razaoSocial, link, expiresAt });
    load();
  }

  async function handleConfirmarAssinaturaContratada() {
    if (!signingContractId) return;
    const signature = padRef.current?.getSignature();
    if (!signature) {
      setSignError("Desenhe sua assinatura ou digite seu nome antes de confirmar.");
      return;
    }
    setSigning(true);
    setSignError(null);
    try {
      await api.post(`/contracts/${signingContractId}/signatures/contratada/sign`, {
        signatureImageBase64: signature.dataUrl,
        signatureMethod: signature.method,
      });
      setSigningContractId(null);
      load();
    } catch (err) {
      setSignError(err instanceof Error ? err.message : "Erro ao registrar a assinatura.");
    } finally {
      setSigning(false);
    }
  }

  if (previewing) {
    return (
      <div className="max-w-3xl">
        <button onClick={() => setPreviewing(null)} className="text-xs text-ink-muted hover:text-ink">
          ← Voltar
        </button>
        <div className="card mt-3 max-h-[70vh] overflow-y-auto">
          <h2 className="text-center font-display text-lg font-semibold text-ink">{previewing.templateName}</h2>
          {previewing.clauses.map((clause, i) => (
            <div key={i} className="mt-4">
              {clause.title && <p className="font-semibold text-ink">{clause.title}</p>}
              <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">{clause.body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setLinkModal(null)}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-base font-semibold text-ink">Link de assinatura — {linkModal.razaoSocial}</h3>
            <p className="mt-1 text-xs text-ink-muted">
              Envie este link ao CONTRATANTE (WhatsApp, e-mail etc.). Válido até{" "}
              {new Date(linkModal.expiresAt).toLocaleString("pt-BR")}.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input readOnly value={linkModal.link} className="input flex-1 text-xs" onFocus={(e) => e.target.select()} />
              <CopyLinkButton link={linkModal.link} />
            </div>
            <button onClick={() => setLinkModal(null)} className="mt-4 text-xs text-ink-muted hover:text-ink">
              Fechar
            </button>
          </div>
        </div>
      )}

      {signingContractId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSigningContractId(null)}
        >
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-base font-semibold text-ink">Assinar como CONTRATADA</h3>
            <p className="mt-1 text-xs text-ink-muted">Desenhe sua assinatura ou digite seu nome completo.</p>
            <div className="mt-3">
              <SignaturePad ref={padRef} />
            </div>
            {signError && <p className="mt-2 text-xs text-amber">{signError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setSigningContractId(null)} className="text-xs text-ink-muted hover:text-ink">
                Cancelar
              </button>
              <button
                onClick={handleConfirmarAssinaturaContratada}
                disabled={signing}
                className="btn-primary px-4 py-1.5 text-xs"
              >
                {signing ? "Assinando…" : "Confirmar assinatura"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-paper text-xs font-medium uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3.5">Empresa</th>
              <th className="px-4 py-3.5">CNPJ</th>
              <th className="px-4 py-3.5">Valor</th>
              <th className="px-4 py-3.5">Início</th>
              <th className="px-4 py-3.5">Vencimento</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Assinatura</th>
              <th className="px-4 py-3.5">Ações</th>
            </tr>
          </thead>
          <tbody>
            {contracts?.length === 0 && (
              <tr><td className="px-4 py-8 text-center text-ink-muted" colSpan={8}>Nenhum contrato cadastrado ainda.</td></tr>
            )}
            {contracts?.map((c) => (
              <tr key={c.id} className="border-t border-line transition-colors hover:bg-paper">
                <td className="px-4 py-3.5 font-medium text-ink">{c.razaoSocial}</td>
                <td className="px-4 py-3.5 font-mono text-xs text-ink-muted">{c.cnpj}</td>
                <td className="px-4 py-3.5 font-mono text-xs text-ink-muted">{currency.format(c.valorMensalidade)}</td>
                <td className="px-4 py-3.5 font-mono text-xs text-ink-muted">{formatDate(c.dataInicio)}</td>
                <td className="px-4 py-3.5 font-mono text-xs text-ink-muted">{formatDate(c.dataVencimento)}</td>
                <td className="px-4 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[c.computedStatus]}`}>
                    {STATUS_LABEL[c.computedStatus]}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${SIGNING_STYLE[c.signingStatus]}`}>
                    {SIGNING_LABEL[c.signingStatus]}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5 text-ink-muted">
                    <button title="Visualizar" onClick={() => handleVisualizar(c.id)} className="hover:text-ink"><Eye size={14} /></button>
                    <button title="Editar" onClick={() => onEdit(c.id)} className="hover:text-ink"><Pencil size={14} /></button>
                    <button title="Gerar PDF" onClick={() => handleGerarPdf(c.id)} className="hover:text-teal-deep"><FileDown size={14} /></button>
                    {c.pdfUrl && (
                      <a title="Baixar PDF" href={c.pdfUrl} target="_blank" rel="noreferrer" className="text-teal-deep hover:underline">
                        Baixar
                      </a>
                    )}
                    {c.signingStatus !== "ASSINADO" && (
                      <>
                        <button
                          title="Solicitar assinatura do CONTRATANTE"
                          onClick={() => handleSolicitarAssinatura(c)}
                          className="hover:text-teal-deep"
                        >
                          <Link2 size={14} />
                        </button>
                        <button
                          title="Assinar como CONTRATADA"
                          onClick={() => {
                            setSignError(null);
                            setSigningContractId(c.id);
                          }}
                          className="hover:text-teal-deep"
                        >
                          <PenLine size={14} />
                        </button>
                      </>
                    )}
                    <button title="Excluir" onClick={() => handleExcluir(c.id, c.razaoSocial)} className="hover:text-danger"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
