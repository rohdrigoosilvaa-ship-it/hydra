import { useEffect, useRef } from "react";
import { AlignCenter, AlignJustify, AlignLeft, Bold, Heading1, Heading2, Italic, List, ListOrdered, Redo2, Underline, Undo2, type LucideIcon } from "lucide-react";

/** Editor de texto simples (negrito, itálico, títulos, listas, alinhamento). Guarda o conteúdo como HTML. */
export function RichTextEditor({ value, onChange, minHeight = "22rem" }: { value: string; onChange: (html: string) => void; minHeight?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef<string | null>(null);

  // só reescreve o conteúdo quando o valor vem de fora (carregamento / restaurar padrão), não a cada tecla
  useEffect(() => {
    if (ref.current && value !== last.current) {
      ref.current.innerHTML = value;
      last.current = value;
    }
  }, [value]);

  const run = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };
  const emit = () => {
    const html = ref.current?.innerHTML ?? "";
    last.current = html;
    onChange(html);
  };

  const tool = (label: string, Icon: LucideIcon, command: string, arg?: string) => (
    <button
      key={label}
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => run(command, arg)}
      className="flex h-8 w-8 items-center justify-center rounded text-ink-muted hover:bg-teal-tint hover:text-teal-deep"
    >
      <Icon size={16} />
    </button>
  );

  return (
    <div className="overflow-hidden rounded-md border border-line bg-paper-raised">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-paper px-2 py-1.5">
        {tool("Desfazer", Undo2, "undo")}
        {tool("Refazer", Redo2, "redo")}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        {tool("Negrito", Bold, "bold")}
        {tool("Itálico", Italic, "italic")}
        {tool("Sublinhado", Underline, "underline")}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        {tool("Título", Heading1, "formatBlock", "h1")}
        {tool("Subtítulo", Heading2, "formatBlock", "h2")}
        {tool("Parágrafo", AlignLeft, "formatBlock", "p")}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        {tool("Lista com marcadores", List, "insertUnorderedList")}
        {tool("Lista numerada", ListOrdered, "insertOrderedList")}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        {tool("Alinhar à esquerda", AlignLeft, "justifyLeft")}
        {tool("Centralizar", AlignCenter, "justifyCenter")}
        {tool("Justificar", AlignJustify, "justifyFull")}
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label="Texto do documento"
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        className="prose-editor max-w-none overflow-y-auto px-6 py-4 text-sm leading-relaxed text-ink outline-none"
        style={{ minHeight, maxHeight: "32rem" }}
      />
    </div>
  );
}
