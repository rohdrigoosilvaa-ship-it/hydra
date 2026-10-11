import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, ChevronRight, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import type { PsychosocialPublicSurvey } from "../lib/types";

const SCALE = [
  { value: 1, label: "Nunca" },
  { value: 2, label: "Raramente" },
  { value: 3, label: "Às vezes" },
  { value: 4, label: "Frequentemente" },
  { value: 5, label: "Sempre" },
];

function formatCpf(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 9);
  const p4 = digits.slice(9, 11);
  let out = p1;
  if (p2) out += `.${p2}`;
  if (p3) out += `.${p3}`;
  if (p4) out += `-${p4}`;
  return out;
}

type Step = "identify" | "questions" | "done";

export function PsychosocialResponsePage() {
  const { token } = useParams<{ token: string }>();
  const [survey, setSurvey] = useState<PsychosocialPublicSurvey | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("identify");

  // Identificação
  const [cpf, setCpf] = useState("");
  const [branchId, setBranchId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [gheId, setGheId] = useState("");
  const [consent, setConsent] = useState(false);

  // Respostas
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .get<PsychosocialPublicSurvey>(`/psicossocial/responder/${token}`)
      .then(setSurvey)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Não foi possível carregar a pesquisa."));
  }, [token]);

  const questionsByDimension = survey
    ? survey.questions.reduce<Record<string, typeof survey.questions>>((acc, q) => {
        (acc[q.dimension] ??= []).push(q);
        return acc;
      }, {})
    : {};

  const allAnswered = survey ? survey.questions.every((q) => answers[q.id] !== undefined) : false;
  const cpfValid = cpf.replace(/\D/g, "").length === 11;
  const canStart = cpfValid && consent;

  async function handleSubmit() {
    if (!token || !survey || !allAnswered) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(`/psicossocial/responder/${token}`, {
        cpf: cpf.replace(/\D/g, ""),
        branchId: branchId || undefined,
        departmentId: departmentId || undefined,
        positionId: positionId || undefined,
        gheId: gheId || undefined,
        consent: true,
        answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
      });
      setStep("done");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao enviar respostas.");
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

        {!loadError && !survey && <p className="text-center text-sm text-ink-muted">Carregando…</p>}

        {survey && (
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-semibold text-ink">{survey.title}</h1>
            {survey.companyName && <p className="mt-1 text-sm text-teal-deep">{survey.companyName}</p>}
          </div>
        )}

        {survey && step === "identify" && (
          <div className="card flex flex-col gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Identificação</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Preencha seus dados para iniciar a avaliação. Seu CPF será mascarado para proteção de dados (LGPD).
              </p>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">CPF</span>
              <input
                className="input"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
            </label>

            {survey.branches.length > 0 && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink-muted">Unidade</span>
                <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                  <option value="">Selecione a unidade</option>
                  {survey.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {survey.departments.length > 0 && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink-muted">Setor</span>
                <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  <option value="">Selecione o setor</option>
                  {survey.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {survey.positions.length > 0 && (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-ink-muted">Cargo</span>
                  <select className="input" value={positionId} onChange={(e) => setPositionId(e.target.value)}>
                    <option value="">Selecione o cargo</option>
                    {survey.positions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {survey.ghes.length > 0 && (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-ink-muted">GHE</span>
                  <select className="input" value={gheId} onChange={(e) => setGheId(e.target.value)}>
                    <option value="">Selecione o GHE</option>
                    {survey.ghes.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="rounded-md border-l-2 border-teal bg-teal-tint p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-teal-deep">
                <ShieldCheck size={15} /> Termo de Consentimento (LGPD)
              </p>
              <p className="mt-1.5 text-xs text-ink-muted">
                Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), declaro que estou ciente de
                que meus dados pessoais (CPF parcialmente mascarado, unidade, setor e cargo) serão coletados
                exclusivamente para fins de avaliação de riscos psicossociais no ambiente de trabalho. Os dados serão
                tratados de forma confidencial, armazenados com segurança e utilizados apenas para análises
                estatísticas agregadas. O CPF é mascarado antes do armazenamento, garantindo a pseudonimização dos
                dados.
              </p>
              <label className="mt-2 flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                Li e concordo com o tratamento dos meus dados
              </label>
            </div>

            <button
              type="button"
              disabled={!canStart}
              onClick={() => setStep("questions")}
              className="btn-primary flex items-center justify-center gap-1.5"
            >
              Iniciar Avaliação <ChevronRight size={15} />
            </button>
            {!cpfValid && cpf.length > 0 && <p className="text-center text-xs text-amber">CPF incompleto.</p>}
          </div>
        )}

        {survey && step === "questions" && (
          <div className="flex flex-col gap-6">
            <div className="card">
              <p className="rounded-md border-l-2 border-teal bg-teal-tint px-3 py-2 text-xs text-ink-muted">
                Suas respostas são anônimas — não é possível identificar quem respondeu o quê. Responda com
                sinceridade; leva poucos minutos.
              </p>
            </div>

            {Object.entries(questionsByDimension).map(([dimension, questions]) => (
              <div key={dimension} className="card">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-wide text-ink-muted">{dimension}</p>
                <div className="flex flex-col gap-4">
                  {questions.map((q) => (
                    <div key={q.id}>
                      <p className="text-sm text-ink">{q.text}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {SCALE.map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: s.value }))}
                            className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                              answers[q.id] === s.value
                                ? "border-teal-deep bg-teal-tint text-teal-deep font-medium"
                                : "border-line text-ink-muted hover:bg-teal-tint"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex flex-col items-center gap-3 pb-6">
              <button
                type="button"
                disabled={!allAnswered || submitting}
                onClick={handleSubmit}
                className="btn-primary w-full max-w-xs"
              >
                {submitting ? "Enviando…" : "Enviar respostas"}
              </button>
              {!allAnswered && <p className="text-xs text-ink-muted">Responda todas as perguntas para enviar.</p>}
              {submitError && <p className="text-sm text-amber">{submitError}</p>}
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="card flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 size={32} className="text-teal-deep" />
            <p className="font-display text-lg font-semibold text-ink">Respostas enviadas com sucesso</p>
            <p className="text-sm text-ink-muted">Obrigado por participar. Suas respostas são anônimas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
