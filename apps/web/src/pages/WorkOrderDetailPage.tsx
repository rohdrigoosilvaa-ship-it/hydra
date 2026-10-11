import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Check, Copy, FileDown, QrCode, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { RiskCategory, RiskLevel, WorkOrder } from "../lib/types";

const RISK_CATEGORY_LABEL: Record<RiskCategory, string> = {
  FISICO: "Físico",
  QUIMICO: "Químico",
  BIOLOGICO: "Biológico",
  ERGONOMICO: "Ergonômico",
  ACIDENTE: "Acidente",
};
const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  LOW: "Baixo",
  MEDIUM: "Médio",
  HIGH: "Alto",
  CRITICAL: "Crítico",
};
const RISK_LEVEL_STYLE: Record<RiskLevel, string> = {
  LOW: "bg-teal-tint text-teal-deep",
  MEDIUM: "bg-amber-tint text-amber",
  HIGH: "bg-amber-tint text-amber",
  CRITICAL: "bg-[color-mix(in_srgb,var(--amber)_18%,transparent)] text-amber",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
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

export function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [qrLink, setQrLink] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setWorkOrder(await api.get<WorkOrder>(`/work-orders/${id}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRemoveRiskItem(itemId: string) {
    if (!id) return;
    await api.del(`/work-orders/${id}/risk-items/${itemId}`);
    load();
  }

  async function handleRemoveEpiItem(itemId: string) {
    if (!id) return;
    await api.del(`/work-orders/${id}/epi-items/${itemId}`);
    load();
  }

  async function handleGerarQr() {
    if (!id) return;
    const { link } = await api.post<{ link: string }>(`/work-orders/${id}/signatures/link`, {});
    setQrLink(link);
  }

  async function handleGerarPdf() {
    if (!id) return;
    await api.post(`/work-orders/${id}/pdf`, {});
    load();
  }

  async function handleExcluir() {
    if (!id || !workOrder) return;
    const aviso =
      workOrder.signingStatus === "ASSINADA"
        ? `Esta Ordem de Serviço já foi assinada eletronicamente por "${workOrder.employeeName}". Excluir vai apagar a ordem e a assinatura registrada — essa ação não pode ser desfeita. Continuar?`
        : `Excluir a Ordem de Serviço de "${workOrder.employeeName}"?`;
    if (!window.confirm(aviso)) return;
    await api.del(`/work-orders/${id}`);
    navigate("/ordens-servico");
  }

  if (!workOrder) return <p className="text-sm text-ink-muted">Carregando…</p>;

  const isSigned = workOrder.signingStatus === "ASSINADA";

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate("/ordens-servico")} className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
        <ArrowLeft size={13} /> Voltar
      </button>

      <div className="card mt-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">{workOrder.employeeName}</h1>
            <p className="mt-1 text-sm text-ink-muted">Ordem de Serviço — {formatDate(workOrder.issueDate)}</p>
          </div>
          <button onClick={handleExcluir} className="text-ink-muted hover:text-danger">
            <Trash2 size={16} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
          <div>
            <p className="text-xs text-ink-muted">Setor</p>
            <p className="font-medium text-ink">{workOrder.departmentName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Função</p>
            <p className="font-medium text-ink">{workOrder.positionName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Admissão</p>
            <p className="font-medium text-ink">{formatDate(workOrder.admittedAt)}</p>
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <h2 className="font-display text-base font-semibold text-ink">Riscos identificados na função</h2>
        <p className="mt-1 text-xs text-ink-muted">Puxados automaticamente do PGR aprovado da empresa.</p>

        <div className="mt-3 overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-paper text-xs font-medium uppercase tracking-wide text-ink-muted">
                <th className="px-3 py-2.5">Perigo/Fator de risco</th>
                <th className="px-3 py-2.5">Categoria</th>
                <th className="px-3 py-2.5">Nível</th>
                {!isSigned && <th className="px-3 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {workOrder.riskItems.length === 0 && (
                <tr><td className="px-3 py-6 text-center text-ink-muted" colSpan={isSigned ? 3 : 4}>Nenhum risco identificado para esta função no PGR de referência.</td></tr>
              )}
              {workOrder.riskItems.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-3 py-2.5 text-ink">{item.hazardName}</td>
                  <td className="px-3 py-2.5 text-xs text-ink-muted">{RISK_CATEGORY_LABEL[item.hazardCategory]}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_STYLE[item.riskLevel]}`}>
                      {RISK_LEVEL_LABEL[item.riskLevel]}
                    </span>
                  </td>
                  {!isSigned && (
                    <td className="px-3 py-2.5">
                      <button onClick={() => handleRemoveRiskItem(item.id)} className="text-ink-muted hover:text-danger">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-4">
        <h2 className="font-display text-base font-semibold text-ink">EPIs exigidos pela função</h2>
        <p className="mt-1 text-xs text-ink-muted">Puxados automaticamente do cadastro de EPIs exigidos do cargo.</p>

        <div className="mt-3 overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-paper text-xs font-medium uppercase tracking-wide text-ink-muted">
                <th className="px-3 py-2.5">EPI</th>
                <th className="px-3 py-2.5">CA</th>
                <th className="px-3 py-2.5">Periodicidade</th>
                {!isSigned && <th className="px-3 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {workOrder.epiItems.length === 0 && (
                <tr><td className="px-3 py-6 text-center text-ink-muted" colSpan={isSigned ? 3 : 4}>Nenhum EPI cadastrado como exigido para este cargo.</td></tr>
              )}
              {workOrder.epiItems.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-3 py-2.5 text-ink">{item.epiName}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-ink-muted">{item.ca ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-ink-muted">
                    {item.periodicityMonths ? `${item.periodicityMonths} ${item.periodicityMonths === 1 ? "mês" : "meses"}` : "—"}
                  </td>
                  {!isSigned && (
                    <td className="px-3 py-2.5">
                      <button onClick={() => handleRemoveEpiItem(item.id)} className="text-ink-muted hover:text-danger">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
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
          {workOrder.pdfUrl && (
            <a href={workOrder.pdfUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-teal-deep hover:underline">
              Baixar PDF
            </a>
          )}
        </div>

        {qrLink && (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-line bg-paper p-5">
            <QRCodeSVG value={qrLink} size={220} />
            <p className="text-center text-xs text-ink-muted">
              Peça pro colaborador escanear com o celular dele pra ler e assinar a ordem.
            </p>
            <div className="flex items-center gap-2">
              <input readOnly value={qrLink} className="input text-xs" style={{ width: 280 }} onFocus={(e) => e.target.select()} />
              <CopyLinkButton link={qrLink} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
