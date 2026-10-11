import { useRef, useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, X } from "lucide-react";
import { api } from "../lib/api";

interface RowResult {
  rowNumber: number;
  label: string;
  status: "new" | "update" | "error";
  errors: string[];
}

interface SheetResult {
  key: string;
  title: string;
  total: number;
  created: number;
  updated: number;
  errorCount: number;
  rows: RowResult[];
}

interface LoadResult {
  dryRun: boolean;
  fileName?: string;
  created: number;
  updated: number;
  errorCount: number;
  sheets: SheetResult[];
}

/**
 * Carga de dados em lote — a mesma planilha (Empresas, Unidade, Setor, Cargo e
 * Funcionários) alimenta todas as telas de cadastro. Primeiro valida sem gravar
 * (pré-visualização) e só grava depois da confirmação.
 */
export function DataLoadWizard({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<LoadResult | null>(null);
  const [done, setDone] = useState<LoadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(f: File, dryRun: boolean) {
    const form = new FormData();
    form.append("file", f);
    return api.postForm<LoadResult>(`/data-load?dryRun=${dryRun}`, form);
  }

  async function handleFile(f: File) {
    setLoading(true);
    setError(null);
    setFile(f);
    try {
      setPreview(await send(f, true));
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Erro ao ler a planilha.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      setDone(await send(file, false));
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadTemplate() {
    try {
      const { blob, filename } = await api.getBlob("/data-load/template");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao baixar o modelo.");
    }
  }

  const result = done ?? preview;
  const importable = preview ? preview.created + preview.updated : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg border border-line bg-paper-raised shadow-lg">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">Carga de dados</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-ink-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!result && (
            <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-line py-12 text-center">
              <FileSpreadsheet size={36} className="text-ink-muted" />
              <div>
                <p className="font-medium text-ink">Envie a planilha de carga (.xlsx)</p>
                <p className="mt-1 max-w-md text-sm text-ink-muted">
                  Uma única planilha com as abas Carga Empresas, Unidade, Setor, Cargo e Funcionarios. Tudo é
                  vinculado por CNPJ, código e CPF, e continua editável nas telas depois.
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <div className="flex items-center gap-2">
                <button type="button" className="btn-primary" disabled={loading} onClick={() => inputRef.current?.click()}>
                  {loading ? "Validando…" : "Escolher arquivo"}
                </button>
                <button type="button" className="btn-secondary flex items-center gap-1.5" onClick={downloadTemplate}>
                  <Download size={15} /> Baixar modelo
                </button>
              </div>
              {error && <p className="max-w-lg text-sm text-amber">{error}</p>}
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4">
              {done ? (
                <div className="flex items-center gap-2 text-teal-deep">
                  <CheckCircle2 size={22} />
                  <p className="font-display text-lg font-semibold text-ink">Carga concluída</p>
                </div>
              ) : (
                <p className="text-sm text-ink-muted">
                  Pré-visualização — <span className="font-medium text-ink">{result.fileName}</span>. Nada foi gravado
                  ainda.
                </p>
              )}

              <div className="flex flex-wrap gap-2 text-xs font-medium">
                <span className="rounded-md bg-teal-tint px-3 py-1.5 text-teal-deep">{result.created} novos</span>
                <span className="rounded-md bg-amber-tint px-3 py-1.5 text-amber">{result.updated} atualizados</span>
                <span className="rounded-md bg-red-100 px-3 py-1.5 text-red-700">{result.errorCount} com erro</span>
              </div>

              {result.sheets.map((s) => (
                <div key={s.key} className="overflow-hidden rounded-lg border border-line">
                  <div className="flex items-center justify-between bg-paper px-4 py-2 text-sm">
                    <span className="font-medium text-ink">{s.title}</span>
                    <span className="text-xs text-ink-muted">
                      {s.total} linhas · {s.created} novos · {s.updated} atualizados · {s.errorCount} com erro
                    </span>
                  </div>
                  {s.errorCount > 0 && (
                    <div className="max-h-44 overflow-y-auto border-t border-line bg-amber-tint/40 px-4 py-2">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-ink-muted">
                            <th className="py-1 pr-3">Linha</th>
                            <th className="py-1 pr-3">Registro</th>
                            <th className="py-1">Motivo (linha não será importada)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.rows
                            .filter((r) => r.status === "error")
                            .map((r) => (
                              <tr key={r.rowNumber} className="border-t border-amber/20">
                                <td className="py-1 pr-3">{r.rowNumber}</td>
                                <td className="py-1 pr-3">{r.label}</td>
                                <td className="py-1 text-amber">{r.errors.join(" ")}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}

              {error && <p className="text-sm text-amber">{error}</p>}

              <div className="flex items-center gap-3">
                {done ? (
                  <button type="button" className="btn-primary" onClick={onClose}>
                    Fechar
                  </button>
                ) : (
                  <>
                    <button type="button" className="btn-primary" disabled={loading || importable === 0} onClick={handleConfirm}>
                      {loading ? "Importando…" : `Confirmar carga (${importable})`}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={loading}
                      onClick={() => {
                        setPreview(null);
                        setFile(null);
                      }}
                    >
                      Escolher outro arquivo
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
