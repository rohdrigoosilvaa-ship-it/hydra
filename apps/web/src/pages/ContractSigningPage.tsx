import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import type { ContractSigningPublicSummary } from "../lib/types";
import { SignaturePad, type SignaturePadHandle } from "../components/contracts/SignaturePad";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Step = "consent" | "sign" | "done";

export function ContractSigningPage() {
  const { token } = useParams<{ token: string }>();
  const [summary, setSummary] = useState<ContractSigningPublicSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("consent");
  const [showClauses, setShowClauses] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const padRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    if (!token) return;
    api
      .get<ContractSigningPublicSummary>(`/assinatura/${token}`)
      .then(setSummary)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Não foi possível carregar o contrato."));
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
      await api.post(`/assinatura/${token}`, {
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
            <p className="text-sm text-amber">Este link de assinatura expirou. Peça um novo link à ProtecSeg.</p>
          </div>
        )}

        {summary?.status === "already_signed" && (
          <div className="card flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 size={32} className="text-teal-deep" />
            <p className="font-display text-lg font-semibold text-ink">Este contrato já foi assinado</p>
            <p className="text-sm text-ink-muted">Não é necessário assinar novamente.</p>
          </div>
        )}

        {summary?.status === "pending" && summary.contract && step !== "done" && (
          <>
            <div className="mb-6 text-center">
              <h1 className="font-display text-2xl font-semibold text-ink">{summary.contract.templateName}</h1>
              <p className="mt-1 text-sm text-teal-deep">{summary.contract.razaoSocial}</p>
            </div>

            <div className="card flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-ink-muted">CNPJ</p>
                  <p className="font-medium text-ink">{summary.contract.cnpj}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Contratada</p>
                  <p className="font-medium text-ink">{summary.contract.contratadaNome}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Mensalidade</p>
                  <p className="font-medium text-ink">{currency.format(summary.contract.valorMensalidade)}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Início</p>
                  <p className="font-medium text-ink">{new Date(summary.contract.dataInicio).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowClauses((v) => !v)}
                className="flex items-center justify-center gap-1.5 text-sm text-teal-deep hover:underline"
              >
                {showClauses ? "Ocultar cláusulas do contrato" : "Ler o contrato completo"}
                {showClauses ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showClauses && (
                <div className="max-h-80 overflow-y-auto rounded-md border border-line p-3">
                  {summary.contract.clauses.map((clause, i) => (
                    <div key={i} className="mt-3 first:mt-0">
                      {clause.title && <p className="font-semibold text-ink">{clause.title}</p>}
                      <p className="mt-1 whitespace-pre-line text-xs text-ink-muted">{clause.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {step === "consent" && (
              <div className="card mt-4 flex flex-col gap-4">
                <div className="rounded-md border-l-2 border-teal bg-teal-tint p-3">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-teal-deep">
                    <ShieldCheck size={15} /> Assinatura Eletrônica
                  </p>
                  <p className="mt-1.5 text-xs text-ink-muted">
                    Ao assinar eletronicamente este documento, nos termos do art. 10, § 2º, da Medida Provisória nº
                    2.200-2, de 24 de agosto de 2001, você concorda com todos os termos do contrato acima. Serão
                    registrados o seu nome, CPF, data/hora, endereço IP e um hash do conteúdo assinado como
                    comprovante.
                  </p>
                  <label className="mt-2 flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                    Li o contrato e concordo com a assinatura eletrônica
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
            <p className="font-display text-lg font-semibold text-ink">Assinatura registrada com sucesso</p>
            <p className="text-sm text-ink-muted">Obrigado — o contrato foi assinado eletronicamente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
