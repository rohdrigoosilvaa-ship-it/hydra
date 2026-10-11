import { KeyboardEvent, useState } from "react";

const CREATE_NEW = "__create_new__";

interface Option {
  id: string;
  name: string;
}

/**
 * <select> com uma opção "+ Novo…" que revela um campo para criar o item na hora.
 * Usa <div>, não <form> — este componente sempre é usado dentro de outro <form>
 * (ex.: o de colaborador), e <form> aninhado é HTML inválido: o clique no botão
 * "Criar" acabava submetendo o form de fora e recarregando a página.
 */
export function CreatableSelect({
  label,
  options,
  value,
  onChange,
  onCreate,
  placeholder = "Nenhum",
  createLabel = "+ Novo…",
}: {
  label: string;
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  onCreate: (name: string) => Promise<Option>;
  placeholder?: string;
  createLabel?: string;
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  function handleSelectChange(selected: string) {
    if (selected === CREATE_NEW) {
      setCreating(true);
      return;
    }
    onChange(selected);
  }

  async function handleCreate() {
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      const created = await onCreate(newName.trim());
      onChange(created.id);
      setNewName("");
      setCreating(false);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    }
  }

  if (creating) {
    return (
      <div className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">{label}</span>
        <div className="flex gap-1.5">
          <input
            autoFocus
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Nome do novo ${label.toLowerCase()}`}
          />
          <button type="button" disabled={saving} onClick={handleCreate} className="btn-primary shrink-0 px-3 text-xs">
            {saving ? "…" : "Criar"}
          </button>
          <button type="button" className="btn-secondary shrink-0 px-3 text-xs" onClick={() => setCreating(false)}>
            X
          </button>
        </div>
      </div>
    );
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-ink-muted">{label}</span>
      <select className="input" value={value} onChange={(e) => handleSelectChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
        <option value={CREATE_NEW}>{createLabel}</option>
      </select>
    </label>
  );
}
