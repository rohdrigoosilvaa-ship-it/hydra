import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { api } from "../../lib/api";
import { RichTextEditor } from "../ui/RichTextEditor";
import type { PgrDetail } from "../../lib/types";
import { SectionCard } from "./pgr-shared";

/** Texto do documento: o modelo padrão do PGR, editável — o que for escrito aqui vai para o PDF. */
export function PgrModeloTab({ pgr, onChanged }: { pgr: PgrDetail; onChanged: () => void }) {
  const [html, setHtml] = useState<string>(pgr.modelHtml ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!pgr.modelHtml) api.get<{ html: string }>("/pgr/model-default").then((r) => setHtml(r.html)).catch(() => undefined);
  }, [pgr.modelHtml]);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await api.patch(`/pgr/${pgr.id}`, { modelHtml: html });
      setMessage("Texto salvo. Ele já vale para o próximo PDF.");
      onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function restore() {
    if (!window.confirm("Voltar ao texto padrão? O que você escreveu será perdido.")) return;
    const r = await api.get<{ html: string }>("/pgr/model-default");
    setHtml(r.html);
  }

  return (
    <SectionCard
      title="Texto do documento"
      subtitle="Capítulos do texto padrão do PGR (Introdução, Objetivos, Abrangência, Definições, Divulgações, Registro, Garantia e Considerações). Edite ou acrescente texto; títulos novos viram capítulos extras no final."
      icon={FileText}
      actions={
        <div className="flex gap-2">
          <button type="button" className="btn-secondary text-xs" onClick={restore}>Voltar ao padrão</button>
          <button type="button" className="btn-primary text-xs" onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar texto"}</button>
        </div>
      }
    >
      <RichTextEditor value={html} onChange={setHtml} />
      {message && <p className="mt-3 text-sm text-ink-muted" role="status">{message}</p>}
    </SectionCard>
  );
}
