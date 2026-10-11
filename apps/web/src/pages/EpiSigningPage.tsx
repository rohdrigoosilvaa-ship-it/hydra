import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import type { EpiSigningPublicSummary } from "../lib/types";
import { SignaturePad, type SignaturePadHandle } from "../components/contracts/SignaturePad";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

type Step = "consent" | "sign" | "done";

export function EpiSigningPage() {
  const { token } = useParams<{ token: string }>();
  const [summary, setSummary] = useState<EpiSigningPublicSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("consent");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const padRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    if (!token) return;
    api
      .get<EpiSigningPublicSummary>(`/epi/assinatura/${token}`)
      .then(setSummary)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Não foi possível carregar a ficha."));
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
      await api.post(`/epi/assinatura/${token}`, {
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
            <p className="font-display text-lg font-semibold text-ink">Esta ficha já foi assinada</p>
            <p className="text-sm text-ink-muted">Não é necessário assinar novamente.</p>
          </div>
        )}

        {summary?.status === "pending" && summary.delivery && step !== "done" && (
          <>
            <div className="mb-6 text-center">
              <h1 className="font-display text-2xl font-semibold text-ink">Ficha de Entrega de EPI</h1>
              <p className="mt-1 text-sm text-teal-deep">{summary.delivery.employeeName}</p>
            </div>

            <div className="card flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-ink-muted">Empresa</p>
                  <p className="font-medium text-ink">{summary.delivery.companyName}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Setor</p>
                  <p className="font-medium text-ink">{summary.delivery.departmentName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Função</p>
                  <p className="font-medium text-ink">{summary.delivery.positionName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Data da entrega</p>
                  <p className="font-medium text-ink">{formatDate(summary.delivery.deliveryDate)}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-ink">EPIs entregues</p>
                <div className="overflow-hidden rounded-md border border-line">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-paper text-ink-muted">
                        <th className="px-2.5 py-2">EPI</th>
                        <th className="px-2.5 py-2">CA</th>
                        <th className="px-2.5 py-2">Qtd.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.delivery.items.map((item, i) => (
                        <tr key={i} className="border-t border-line">
                          <td className="px-2.5 py-2 text-ink">{item.epiName}</td>
                          <td className="px-2.5 py-2 font-mono text-ink-muted">{item.ca ?? "—"}</td>
                          <td className="px-2.5 py-2 text-ink-muted">{item.quantity ?? "—"}</td>
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
                    Declaro que recebi gratuitamente os EPIs listados acima, adequados aos riscos da minha atividade,
                    e fui orientado(a) sobre seu uso correto conforme a NR-06. Ao assinar eletronicamente, nos termos
                    do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001, serão registrados meu nome, CPF, data/hora,
                    endereço IP e um hash do conteúdo como comprovante.
                  </p>
                  <label className="mt-2 flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                    Li e concordo com o recebimento e a assinatura eletrônica
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
            <p className="font-display text-lg font-semibold text-ink">Ficha de EPI assinada eletronicamente com sucesso</p>
            <p className="text-sm text-ink-muted">Obrigado — o recebimento foi registrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
