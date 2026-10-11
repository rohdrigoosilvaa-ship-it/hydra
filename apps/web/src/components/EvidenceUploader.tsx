import { useEffect, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { Evidence, EvidenceSourceType } from "../lib/types";

export function EvidenceUploader({
  sourceType,
  sourceId,
  companyId,
}: {
  sourceType: EvidenceSourceType;
  sourceId: string;
  companyId?: string;
}) {
  const [items, setItems] = useState<Evidence[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const list = await api.get<Evidence[]>(
      `/field-ops/evidence?sourceType=${sourceType}&sourceId=${encodeURIComponent(sourceId)}`,
    );
    setItems(list);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceType, sourceId]);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sourceType", sourceType);
      formData.append("sourceId", sourceId);
      if (companyId) formData.append("companyId", companyId);
      await api.postForm("/field-ops/evidence", formData);
      await load();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remover esta evidência?")) return;
    await api.del(`/field-ops/evidence/${id}`);
    load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="btn-secondary flex cursor-pointer items-center gap-1.5 text-xs">
          <Camera size={14} />
          {uploading ? "Enviando…" : "Adicionar evidência"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      </div>

      {items && items.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((ev) => (
            <div key={ev.id} className="group relative overflow-hidden rounded-md border border-line">
              <a href={ev.fileUrl} target="_blank" rel="noreferrer">
                <img src={ev.fileUrl} alt={ev.fileName} className="aspect-square w-full object-cover" />
              </a>
              <button
                onClick={() => handleDelete(ev.id)}
                className="absolute right-1 top-1 rounded-md bg-ink/60 p-1 text-paper opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
