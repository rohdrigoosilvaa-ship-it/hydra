import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Check, Copy, Plus, Send, Trash2, X } from "lucide-react";
import { api } from "../lib/api";
import type { Employee, PsychosocialSurveyDetail, PsychosocialSurveyStatus } from "../lib/types";

const STATUS_LABEL: Record<PsychosocialSurveyStatus, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativa",
  CLOSED: "Encerrada",
};
const STATUS_STYLE: Record<PsychosocialSurveyStatus, string> = {
  DRAFT: "bg-line text-ink-muted",
  ACTIVE: "bg-teal-tint text-teal-deep",
  CLOSED: "bg-amber-tint text-amber",
};

export function PsychosocialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<PsychosocialSurveyDetail | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    const data = await api.get<PsychosocialSurveyDetail>(`/psicossocial/surveys/${id}`);
    setSurvey(data);
    const emps = await api.get<Employee[]>(`/employees?companyId=${encodeURIComponent(data.companyId)}`);
    setEmployees(emps.filter((e) => e.status === "ACTIVE"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!survey) return <p className="text-sm text-ink-muted">Carregando…</p>;

  const questionsByDimension = survey.questions.reduce<Record<string, typeof survey.questions>>((acc, q) => {
    (acc[q.dimension] ??= []).push(q);
    return acc;
  }, {});

  const invited = survey.invites.length;
  const responded = survey.invites.filter((i) => i.respondedAt).length;
  const pct = invited > 0 ? Math.round((responded / invited) * 100) : 0;

  async function handleSendAll() {
    if (!id) return;
    setInviteResult(null);
    const res = await api.post<{ invited: number; alreadyInvited: number }>(`/psicossocial/surveys/${id}/invites`, {});
    setInviteResult(`${res.invited} convite(s) enviado(s). ${res.alreadyInvited} já haviam sido convidados.`);
    load();
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{survey.title}</h1>
          <p className="mt-1 flex items-center gap-2 font-mono text-xs text-ink-muted">
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[survey.status]}`}>
              {STATUS_LABEL[survey.status]}
            </span>
            {survey.questions.length} perguntas · {responded}/{invited} respostas ({pct}%)
          </p>
          {survey.description && <p className="mt-2 text-sm text-ink-muted">{survey.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSendAll} className="btn-secondary flex items-center gap-1.5">
            <Send size={15} /> Enviar para todos ativos
          </button>
          <button onClick={() => setShowInviteForm((v) => !v)} className="btn-primary flex items-center gap-1.5">
            <Plus size={15} /> Convidar colaboradores
          </button>
        </div>
      </div>
      {inviteResult && (
        <p className="mt-3 rounded-md border-l-2 border-teal bg-teal-tint px-3 py-2 text-sm text-ink">{inviteResult}</p>
      )}

      {showInviteForm && (
        <InviteForm
          surveyId={survey.id}
          employees={employees}
          alreadyInvited={new Set(survey.invites.map((i) => i.employeeId))}
          onClose={() => setShowInviteForm(false)}
          onSent={(msg) => {
            setShowInviteForm(false);
            setInviteResult(msg);
            load();
          }}
        />
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Perguntas</h2>
          <button
            className="btn-secondary flex items-center gap-1.5 text-xs"
            onClick={() => setShowQuestionForm((v) => !v)}
          >
            <Plus size={13} /> {showQuestionForm ? "Fechar" : "Adicionar pergunta"}
          </button>
        </div>
        <p className="mt-1 rounded-md border-l-2 border-amber bg-amber-tint px-3 py-2 text-xs text-ink-muted">
          As perguntas abaixo marcadas [Exemplo] são fictícias, geradas para pré-visualização — substitua pelo
          questionário oficial (ex.: HSE-IT) antes de usar em produção.
        </p>

        {showQuestionForm && (
          <NewQuestionForm
            surveyId={survey.id}
            onClose={() => setShowQuestionForm(false)}
            onCreated={() => {
              setShowQuestionForm(false);
              load();
            }}
          />
        )}

        <div className="mt-3 flex flex-col gap-4">
          {Object.entries(questionsByDimension).map(([dimension, questions]) => (
            <div key={dimension} className="rounded-xl border border-line bg-paper-raised shadow-sm p-4">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-ink-muted">{dimension}</p>
              <ul className="flex flex-col gap-1.5">
                {questions.map((q) => (
                  <li key={q.id} className="flex items-start justify-between gap-2 text-sm">
                    <span className="text-ink">{q.text}</span>
                    <button
                      onClick={async () => {
                        if (!window.confirm("Remover esta pergunta?")) return;
                        await api.del(`/psicossocial/questions/${q.id}`);
                        load();
                      }}
                      className="shrink-0 text-ink-muted hover:text-amber"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {survey.questions.length === 0 && <p className="text-sm text-ink-muted">Nenhuma pergunta cadastrada.</p>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-ink">Participação</h2>
        <div className="mt-3 panel">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-medium">Colaborador</th>
                <th className="px-4 py-3 font-medium">Enviado em</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Link</th>
              </tr>
            </thead>
            <tbody>
              {survey.invites.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-ink-muted" colSpan={4}>
                    Nenhum convite enviado ainda.
                  </td>
                </tr>
              )}
              {survey.invites.map((i) => (
                <tr key={i.id} className="border-b border-line last:border-none">
                  <td className="px-4 py-3 text-ink">{i.employeeName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                    {new Date(i.sentAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    {i.respondedAt ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-teal-deep">
                        <Check size={13} /> Respondido
                      </span>
                    ) : (
                      <span className="text-xs text-ink-muted">Pendente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!i.respondedAt && <CopyLinkButton link={i.link} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(link).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="flex items-center gap-1 text-xs text-teal-deep hover:underline"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copiado" : "Copiar link"}
    </button>
  );
}

function NewQuestionForm({
  surveyId,
  onClose,
  onCreated,
}: {
  surveyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [dimension, setDimension] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/psicossocial/questions", { surveyId, dimension, text });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-3 flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm sm:col-span-1">
          <span className="text-ink-muted">Dimensão</span>
          <input
            className="input"
            value={dimension}
            onChange={(e) => setDimension(e.target.value)}
            placeholder="ex.: Demandas"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-ink-muted">Pergunta</span>
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} required />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary text-xs">
          {saving ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary text-xs">
          Cancelar
        </button>
        {error && <p className="text-sm text-amber">{error}</p>}
      </div>
    </form>
  );
}

function InviteForm({
  surveyId,
  employees,
  alreadyInvited,
  onClose,
  onSent,
}: {
  surveyId: string;
  employees: Employee[];
  alreadyInvited: Set<string>;
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSend() {
    if (selected.size === 0) return;
    setSending(true);
    setError(null);
    try {
      const res = await api.post<{ invited: number; alreadyInvited: number }>(
        `/psicossocial/surveys/${surveyId}/invites`,
        { employeeIds: Array.from(selected) },
      );
      onSent(`${res.invited} convite(s) enviado(s). ${res.alreadyInvited} já haviam sido convidados.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar convites.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card mt-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-ink-muted">Selecionar colaboradores</h3>
        <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink">
          <X size={16} />
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto rounded-md border border-line">
        {employees.length === 0 && <p className="p-3 text-sm text-ink-muted">Nenhum colaborador ativo encontrado.</p>}
        {employees.map((e) => (
          <label
            key={e.id}
            className="flex items-center gap-2 border-b border-line px-3 py-2 text-sm last:border-none hover:bg-teal-tint"
          >
            <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
            <span className="text-ink">{e.name}</span>
            {alreadyInvited.has(e.id) && <span className="ml-auto text-xs text-ink-muted">já convidado</span>}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" disabled={sending || selected.size === 0} onClick={handleSend} className="btn-primary">
          {sending ? "Enviando…" : `Enviar (${selected.size})`}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancelar
        </button>
        {error && <p className="text-sm text-amber">{error}</p>}
      </div>
    </div>
  );
}
