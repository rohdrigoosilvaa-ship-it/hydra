import { useRef, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Upload, X } from "lucide-react";
import { api } from "../lib/api";
import type { RiskCategory } from "../lib/types";

interface ParsedRiskRow {
  rowNumber: number;
  sheetName: string;
  category: RiskCategory | null;
  companyName?: string;
  branchName?: string;
  gheName?: string;
  departmentName?: string;
  positionName?: string;
  hazardName?: string;
  hazardAgent?: string;
  probability?: number;
  severity?: number;
  classification?: string;
}

interface RiskImportRowResult {
  rowNumber: number;
  data: ParsedRiskRow;
  status: "new" | "update" | "error";
  errors: string[];
}

interface RiskImportResult {
  fileName?: string;
  totalRows: number;
  newCount: number;
  updatedCount: number;
  errorCount: number;
  rows: RiskImportRowResult[];
  sheetsFound?: string[];
  sheetsIgnored?: string[];
}

const CATEGORY_LABEL: Record<string, string> = {
  FISICO: "Físico",
  QUIMICO: "Químico",
  BIOLOGICO: "Biológico",
  ERGONOMICO: "Ergonômico",
  ACIDENTE: "Acidente",
};

const STATUS_LABEL: Record<RiskImportRowResult["status"], string> = {
  new: "Novo",
  update: "Atualização",
  error: "Erro",
};
const STATUS_STYLE: Record<RiskImportRowResult["status"], string> = {
  new: "bg-teal-tint text-teal-deep",
  update: "bg-amber-tint text-amber",
  error: "bg-red-100 text-red-700",
};

export function ImportPgrRisksWizard({
  pgrId,
  onClose,
  onImported,
}: {
  pgrId: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [preview, setPreview] = useState<RiskImportResult | null>(null);
  const [confirmed, setConfirmed] = useState<RiskImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    setPreview(null);
    setConfirmed(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await api.postForm<RiskImportResult>(`/pgr/risks-import/${pgrId}/preview`, formData);
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao ler a planilha.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const rowsToImport = preview.rows.filter((r) => r.status === "new" || r.status === "update").map((r) => r.data);
      const result = await api.post<RiskImportResult>(`/pgr/risks-import/${pgrId}/confirm`, {
        fileName: preview.fileName,
        rows: rowsToImport,
      });
      setConfirmed(result);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao confirmar a importação.");
    } finally {
      setLoading(false);
    }
  }

  const errorRows = preview?.rows.filter((r) => r.status === "error") ?? [];
  const importableCount = preview ? preview.newCount + preview.updatedCount : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-lg border border-line bg-paper-raised shadow-lg">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">Importar Inventário de Riscos</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!preview && !confirmed && (
            <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-line py-14 text-center">
              <FileSpreadsheet size={36} className="text-ink-muted" />
              <div>
                <p className="text-sm font-medium text-ink">Selecione a planilha do modelo (.xlsx)</p>
                <p className="mt-1 max-w-md text-xs text-ink-muted">
                  Lê as abas Físico, Químico, Biológico, Ergonômico e Acidente, identifica GHE, Setor, Cargo e Perigo/Agente de
                  cada linha e mostra uma prévia antes de gravar no inventário deste PGR.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <button
                type="button"
                className="btn-primary flex items-center gap-1.5"
                disabled={loading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={15} /> {loading ? "Lendo planilha…" : "Selecionar arquivo"}
              </button>
              {error && <p className="text-sm text-amber">{error}</p>}
            </div>
          )}

          {preview && !confirmed && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-ink-muted">
                Pré-visualização da importação — <span className="font-medium text-ink">{preview.fileName}</span>
                {preview.sheetsFound && preview.sheetsFound.length > 0 && (
                  <> · abas lidas: {preview.sheetsFound.join(", ")}</>
                )}
              </p>
              <SummaryBadges result={preview} />

              {errorRows.length > 0 && (
                <div className="rounded-md border border-amber/40 bg-amber-tint px-4 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber">
                    Linhas com problema ({errorRows.length}) — não serão importadas
                  </p>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-ink-muted">
                          <th className="py-1 pr-3">Aba / Linha</th>
                          <th className="py-1 pr-3">Perigo</th>
                          <th className="py-1">Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {errorRows.map((r) => (
                          <tr key={`${r.data.sheetName}-${r.rowNumber}`} className="border-t border-amber/20">
                            <td className="py-1 pr-3 text-ink-muted">
                              {r.data.sheetName} / {r.rowNumber}
                            </td>
                            <td className="py-1 pr-3">{r.data.hazardName || "—"}</td>
                            <td className="py-1 text-amber">{r.errors.join(" ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-lg border border-line">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-paper text-xs uppercase tracking-wide text-ink-muted">
                      <th className="px-3 py-2 font-medium">Grupo</th>
                      <th className="px-3 py-2 font-medium">GHE</th>
                      <th className="px-3 py-2 font-medium">Setor</th>
                      <th className="px-3 py-2 font-medium">Cargo</th>
                      <th className="px-3 py-2 font-medium">Perigo/Fator de Risco</th>
                      <th className="px-3 py-2 font-medium">P × S</th>
                      <th className="px-3 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows
                      .filter((r) => r.status !== "error")
                      .map((r) => (
                        <tr key={`${r.data.sheetName}-${r.rowNumber}`} className="border-b border-line last:border-none">
                          <td className="px-3 py-2 text-ink-muted">
                            {r.data.category ? CATEGORY_LABEL[r.data.category] : "—"}
                          </td>
                          <td className="px-3 py-2 text-ink">{r.data.gheName ?? "—"}</td>
                          <td className="px-3 py-2 text-ink-muted">{r.data.departmentName ?? "—"}</td>
                          <td className="px-3 py-2 text-ink-muted">{r.data.positionName ?? "—"}</td>
                          <td className="px-3 py-2 text-ink-muted">{r.data.hazardName ?? "—"}</td>
                          <td className="px-3 py-2 font-mono text-xs text-ink-muted">
                            {r.data.probability ?? "—"} × {r.data.severity ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                              {STATUS_LABEL[r.status]}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {error && <p className="text-sm text-amber">{error}</p>}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={loading || importableCount === 0}
                  onClick={handleConfirm}
                >
                  {loading ? "Importando…" : `Confirmar Importação (${importableCount})`}
                </button>
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {confirmed && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <CheckCircle2 size={40} className="text-teal-deep" />
              <p className="font-display text-lg font-semibold text-ink">Importação concluída</p>
              <SummaryBadges result={confirmed} />
              <button type="button" className="btn-primary mt-2" onClick={onClose}>
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryBadges({ result }: { result: RiskImportResult }) {
  const items: { label: string; value: number; className: string }[] = [
    { label: "Total na planilha", value: result.totalRows, className: "bg-line text-ink" },
    { label: "Novos", value: result.newCount, className: "bg-teal-tint text-teal-deep" },
    { label: "Atualizados", value: result.updatedCount, className: "bg-amber-tint text-amber" },
    { label: "Com erro", value: result.errorCount, className: "bg-red-100 text-red-700" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <span key={it.label} className={`rounded-md px-3 py-1.5 text-xs font-medium ${it.className}`}>
          {it.value} {it.label}
        </span>
      ))}
    </div>
  );
}
