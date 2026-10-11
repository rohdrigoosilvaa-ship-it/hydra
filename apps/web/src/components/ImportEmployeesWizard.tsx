import { useRef, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Upload, X } from "lucide-react";
import { api } from "../lib/api";

interface ParsedRow {
  rowNumber: number;
  matricula?: string;
  companyName?: string;
  branchName?: string;
  sex?: string;
  name?: string;
  departmentName?: string;
  positionName?: string;
  birthDate?: string;
  cpf?: string;
  admittedAt?: string;
  inactivatedAt?: string;
  situacao?: string;
}

interface ImportRowResult {
  rowNumber: number;
  data: ParsedRow;
  status: "new" | "update" | "error" | "duplicate";
  errors: string[];
  companyWillBeCreated?: boolean;
}

interface ImportResult {
  fileName?: string;
  totalRows: number;
  newCount: number;
  updatedCount: number;
  errorCount: number;
  duplicateCount: number;
  rows: ImportRowResult[];
}

const STATUS_LABEL: Record<ImportRowResult["status"], string> = {
  new: "Novo",
  update: "Atualização",
  error: "Erro",
  duplicate: "Duplicado",
};

const STATUS_STYLE: Record<ImportRowResult["status"], string> = {
  new: "bg-teal-tint text-teal-deep",
  update: "bg-amber-tint text-amber",
  error: "bg-red-100 text-red-700",
  duplicate: "bg-line text-ink-muted",
};

export function ImportEmployeesWizard({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [confirmed, setConfirmed] = useState<ImportResult | null>(null);
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
      const result = await api.postForm<ImportResult>("/employees/import/preview", formData);
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
      const result = await api.post<ImportResult>("/employees/import/confirm", {
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

  const errorRows = preview?.rows.filter((r) => r.status === "error" || r.status === "duplicate") ?? [];
  const importableCount = preview ? preview.newCount + preview.updatedCount : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg border border-line bg-paper-raised shadow-lg">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">Importar Colaboradores</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!preview && !confirmed && (
            <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-line py-14 text-center">
              <FileSpreadsheet size={36} className="text-ink-muted" />
              <div>
                <p className="text-sm font-medium text-ink">Selecione a planilha de colaboradores (.xlsx)</p>
                <p className="mt-1 text-xs text-ink-muted">
                  O sistema lê as colunas, identifica novos e existentes por CPF, e mostra uma prévia antes de gravar.
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
              </p>
              <SummaryBadges result={preview} />

              {errorRows.length > 0 && (
                <div className="rounded-md border border-amber/40 bg-amber-tint px-4 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber">
                    Registros com problema ({errorRows.length}) — não serão importados
                  </p>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-ink-muted">
                          <th className="py-1 pr-3">Linha</th>
                          <th className="py-1 pr-3">Nome</th>
                          <th className="py-1">Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {errorRows.map((r) => (
                          <tr key={r.rowNumber} className="border-t border-amber/20">
                            <td className="py-1 pr-3">{r.rowNumber}</td>
                            <td className="py-1 pr-3">{r.data.name || "—"}</td>
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
                      <th className="px-3 py-2 font-medium">Nome</th>
                      <th className="px-3 py-2 font-medium">CPF</th>
                      <th className="px-3 py-2 font-medium">Nascimento</th>
                      <th className="px-3 py-2 font-medium">Admissão</th>
                      <th className="px-3 py-2 font-medium">Unidade</th>
                      <th className="px-3 py-2 font-medium">Setor</th>
                      <th className="px-3 py-2 font-medium">Cargo</th>
                      <th className="px-3 py-2 font-medium">Situação</th>
                      <th className="px-3 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows
                      .filter((r) => r.status !== "error" && r.status !== "duplicate")
                      .map((r) => (
                        <tr key={r.rowNumber} className="border-b border-line last:border-none">
                          <td className="px-3 py-2 text-ink">{r.data.name}</td>
                          <td className="px-3 py-2 font-mono text-xs text-ink-muted">{r.data.cpf}</td>
                          <td className="px-3 py-2 text-ink-muted">{r.data.birthDate}</td>
                          <td className="px-3 py-2 text-ink-muted">{r.data.admittedAt}</td>
                          <td className="px-3 py-2 text-ink-muted">{r.data.branchName ?? "—"}</td>
                          <td className="px-3 py-2 text-ink-muted">{r.data.departmentName ?? "—"}</td>
                          <td className="px-3 py-2 text-ink-muted">{r.data.positionName ?? "—"}</td>
                          <td className="px-3 py-2 text-ink-muted">{r.data.situacao ?? "Ativo"}</td>
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

function SummaryBadges({ result }: { result: ImportResult }) {
  const items: { label: string; value: number; className: string }[] = [
    { label: "Total na planilha", value: result.totalRows, className: "bg-line text-ink" },
    { label: "Novos", value: result.newCount, className: "bg-teal-tint text-teal-deep" },
    { label: "Atualizados", value: result.updatedCount, className: "bg-amber-tint text-amber" },
    { label: "Com erro", value: result.errorCount, className: "bg-red-100 text-red-700" },
    { label: "Duplicados", value: result.duplicateCount, className: "bg-line text-ink-muted" },
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
