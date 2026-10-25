import * as T from "./pgr-pdf.templates";

/** Capítulos do texto padrão que podem ser editados pelo usuário (número → título). */
export const MODEL_CHAPTERS: Record<number, string> = {
  1: "1. INTRODUÇÃO",
  2: "2. OBJETIVOS",
  3: "3. ABRANGÊNCIA",
  4: "4. DEFINIÇÕES",
  7: "7. DIVULGAÇÕES DO PROGRAMA",
  8: "8. REGISTRO",
  9: "9. GARANTIA DE IMPLEMENTAÇÃO DO PROGRAMA DE GERENCIAMENTO DE RISCO",
  10: "10. CONSIDERAÇÕES GERAIS",
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const p = (s: string) => `<p>${esc(s)}</p>`;
const term = (t: { term: string; text: string }) => `<p><strong>${esc(t.term)}</strong>${esc(t.text)}</p>`;

/** Texto padrão do PGR (os mesmos capítulos que o PDF usa), em HTML, para o editor. */
export function defaultModelHtml(): string {
  const parts: string[] = [];
  const chapter = (n: number, body: string) => parts.push(`<h1>${esc(MODEL_CHAPTERS[n]!)}</h1>${body}`);
  chapter(1, T.INTRODUCAO.map(p).join(""));
  chapter(2, p(T.OBJETIVOS_INTRO) + `<ul>${T.OBJETIVOS.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>`);
  chapter(3, T.ABRANGENCIA_PARAGRAFOS.map(p).join("") + T.ABRANGENCIA_TIPOS.map(term).join(""));
  chapter(4, T.DEFINICOES.map(term).join("") + T.DEFINICOES_FINAIS.map(p).join(""));
  chapter(7, T.DIVULGACOES.map(p).join(""));
  chapter(8, T.REGISTRO.map(p).join(""));
  chapter(9, p(T.GARANTIA_IMPLEMENTACAO));
  chapter(10, T.CONSIDERACOES_GERAIS.map(p).join(""));
  return parts.join("\n");
}

export interface Block {
  type: "h1" | "h2" | "p" | "li";
  text: string;
}

const decode = (s: string) =>
  s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

/** HTML do editor → blocos simples (título, subtítulo, parágrafo, item de lista) para o PDF. */
export function htmlToBlocks(html: string): Block[] {
  let s = html.replace(/\r?\n/g, " ").replace(/<(script|style)[\s\S]*?<\/\1>/gi, "");
  s = s
    .replace(/<h1[^>]*>/gi, "\n§h1§")
    .replace(/<h[2-6][^>]*>/gi, "\n§h2§")
    .replace(/<li[^>]*>/gi, "\n§li§")
    .replace(/<(p|div|tr|br|ul|ol|table)[^>]*\/?>/gi, "\n§p§")
    .replace(/<\/(p|div|h[1-6]|li|tr|ul|ol|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  const blocks: Block[] = [];
  for (const raw of s.split("\n")) {
    const m = raw.match(/^§(h1|h2|li|p)§/);
    const text = decode(raw.replace(/^§(h1|h2|li|p)§/, "")).replace(/\s+/g, " ").trim();
    if (!text) continue;
    blocks.push({ type: (m?.[1] as Block["type"]) ?? "p", text });
  }
  return blocks;
}

export interface ParsedModel {
  chapters: Map<number, Block[]>;
  extra: { title: string; blocks: Block[] }[];
}

/** Separa o texto editado por capítulo (h1 que começa com o número) e capítulos novos criados pelo usuário. */
export function parseModel(html: string | null | undefined): ParsedModel {
  const out: ParsedModel = { chapters: new Map(), extra: [] };
  if (!html?.trim()) return out;
  let current: { n: number | null; title: string; blocks: Block[] } | null = null;
  const flush = () => {
    if (!current) return;
    if (current.n !== null && MODEL_CHAPTERS[current.n]) out.chapters.set(current.n, current.blocks);
    else if (current.blocks.length || current.title) out.extra.push({ title: current.title, blocks: current.blocks });
    current = null;
  };
  for (const b of htmlToBlocks(html)) {
    if (b.type === "h1") {
      flush();
      const n = b.text.match(/^\s*(\d+)\s*[.\-–]/);
      current = { n: n ? Number(n[1]) : null, title: b.text, blocks: [] };
    } else if (current) current.blocks.push(b);
    else current = { n: null, title: "", blocks: [b] };
  }
  flush();
  return out;
}
