import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import type { RiskCategory, RiskLevel, WorkOrderSigningPublicSummary } from "../lib/types";
import { SignaturePad, type SignaturePadHandle } from "../components/contracts/SignaturePad";

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

type Step = "consent" | "sign" | "done";

export function WorkOrderSigningPage() {
  const { token } = useParams<{ token: string }>();
  const [summary, setSummary] = useState<WorkOrderSigningPublicSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("consent");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const padRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    if (!token) return;
    api
      .get<WorkOrderSigningPublicSummary>(`/work-orders/assinatura/${token}`)
      .then(setSummary)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Não foi possível carregar a ordem."));
  }, [token]);

  async function handleSubmit() {
    if (!token) return;
    const signature = padRef.current?.getSignature();
    if (!signature) {
      setSubmitError("Desenhe sua assinatura ou digite seu nome antes de confirmar.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(`/work-orders/assinatura/${token}`, {
        signatureImageBase64: signature.dataUrl,
        signatureMethod: signature.method,
      });
      setStep("done");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao registrar a assinatura.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-2xl">
        {loadError && (
          <div className="card text-center">
            <p className="text-sm text-amber">{loadError}</p>
          </div>
        )}

        {!loadError && !summary && <p className="text-center text-sm text-ink-muted">Carregando…</p>}

        {summary?.status === "not_found" && (
          <div className="card text-center">
            <p className="text-sm text-amber">Link de assinatura não encontrado.</p>
          </div>
        )}

        {summary?.status === "expired" && (
          <div className="card text-center">
            <p className="text-sm text-amber">Este link de assinatura expirou. Peça um novo QR code à empresa.</p>
          </div>
        )}

        {summary?.status === "already_signed" && (
          <div className="card flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 size={32} className="text-teal-deep" />
            <p className="font-display text-lg font-semibold text-ink">Esta Ordem de Serviço já foi assinada</p>
            <p className="text-sm text-ink-muted">Não é necessário assinar novamente.</p>
          </div>
        )}

        {summary?.status === "pending" && summary.workOrder && step !== "done" && (
          <>
            <div className="mb-6 text-center">
              <h1 className="font-display text-2xl font-semibold text-ink">Ordem de Serviço</h1>
              <p className="mt-1 text-sm text-teal-deep">{summary.workOrder.employeeName}</p>
            </div>

            <div className="card flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-ink-muted">Empresa</p>
                  <p className="font-medium text-ink">{summary.workOrder.companyName}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Setor</p>
                  <p className="font-medium text-ink">{summary.workOrder.departmentName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Função</p>
                  <p className="font-medium text-ink">{summary.workOrder.positionName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Data da ordem</p>
                  <p className="font-medium text-ink">{formatDate(summary.workOrder.issueDate)}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-ink">Riscos identificados na função</p>
                <div className="overflow-hidden rounded-md border border-line">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-paper text-ink-muted">
                        <th className="px-2.5 py-2">Perigo/Fator de risco</th>
                        <th className="px-2.5 py-2">Categoria</th>
                        <th className="px-2.5 py-2">Nível</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.workOrder.riskItems.length === 0 && (
                        <tr><td className="px-2.5 py-2 text-ink-muted" colSpan={3}>Nenhum risco identificado.</td></tr>
                      )}
                      {summary.workOrder.riskItems.map((item, i) => (
                        <tr key={i} className="border-t border-line">
                          <td className="px-2.5 py-2 text-ink">{item.hazardName}</td>
                          <td className="px-2.5 py-2 text-ink-muted">{RISK_CATEGORY_LABEL[item.hazardCategory]}</td>
                          <td className="px-2.5 py-2 text-ink-muted">{RISK_LEVEL_LABEL[item.riskLevel]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-ink">EPIs exigidos</p>
                <div className="overflow-hidden rounded-md border border-line">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-paper text-ink-muted">
                        <th className="px-2.5 py-2">EPI</th>
                        <th className="px-2.5 py-2">CA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.workOrder.epiItems.length === 0 && (
                        <tr><td className="px-2.5 py-2 text-ink-muted" colSpan={2}>Nenhum EPI exigido.</td></tr>
                      )}
                      {summary.workOrder.epiItems.map((item, i) => (
                        <tr key={i} className="border-t border-line">
                          <td className="px-2.5 py-2 text-ink">{item.epiName}</td>
                          <td className="px-2.5 py-2 font-mono text-ink-muted">{item.ca ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {step === "consent" && (
              <div className="card mt-4 flex flex-col gap-4">
                <div className="rounded-md border-l-2 border-teal bg-teal-tint p-3">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-teal-deep">
                    <ShieldCheck size={15} /> Assinatura Eletrônica
                  </p>
                  <p className="mt-1.5 text-xs text-ink-muted">
                    Declaro que fui orientado(a) e tenho ciência dos riscos ocupacionais e dos EPIs exigidos para a
                    minha função, listados acima. Ao assinar eletronicamente, nos termos do art. 10, § 2º, da Medida
                    Provisória nº 2.200-2/2001, serão registrados meu nome, CPF, data/hora, endereço IP e um hash do
                    conteúdo como comprovante.
                  </p>
                  <label className="mt-2 flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                    Li e concordo com a ciência e a assinatura eletrônica
                  </label>
                </div>
                <button type="button" disabled={!consent} onClick={() => setStep("sign")} className="btn-primary">
                  Continuar para assinatura
                </button>
              </div>
            )}

            {step === "sign" && (
              <div className="card mt-4 flex flex-col gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink">Assine abaixo</h2>
                  <p className="mt-1 text-sm text-ink-muted">Desenhe sua assinatura ou digite seu nome completo.</p>
                </div>
                <SignaturePad ref={padRef} />
                <button type="button" disabled={submitting} onClick={handleSubmit} className="btn-primary">
                  {submitting ? "Enviando…" : "Confirmar assinatura"}
                </button>
                {submitError && <p className="text-center text-sm text-amber">{submitError}</p>}
              </div>
            )}
          </>
        )}

        {step === "done" && (
          <div className="card flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 size={32} className="text-teal-deep" />
            <p className="font-display text-lg font-semibold text-ink">Ordem de Serviço assinada eletronicamente com sucesso</p>
            <p className="text-sm text-ink-muted">Obrigado — sua ciência foi registrada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
