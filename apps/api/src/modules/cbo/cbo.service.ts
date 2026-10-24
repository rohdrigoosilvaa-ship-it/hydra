import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

interface CatalogEntry {
  id: string;
  code: string;
  title: string;
  description: string | null;
  haystack: string;
  titleNorm: string;
}

@Injectable()
export class CboService {
  private catalog: CatalogEntry[] | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async load(): Promise<CatalogEntry[]> {
    if (this.catalog) return this.catalog;
    const rows = await this.prisma.cboOccupation.findMany({ orderBy: { title: "asc" } });
    const entries = rows.map((r) => ({
      ...r,
      titleNorm: normalize(r.title),
      haystack: `${r.code} ${normalize(r.title)}`,
    }));
    // catálogo vazio não é guardado: pode ser a carga ainda não ter rodado
    if (entries.length > 0) this.catalog = entries;
    return entries;
  }

  /**
   * Catálogo público, sem tenantId. Busca por código ou por palavras do nome, sem diferenciar
   * acento nem maiúscula ("tecnico seguranca" acha "Técnico em segurança do trabalho").
   * Quem começa com o que foi digitado vem primeiro.
   */
  async search(query?: string) {
    const catalog = await this.load();
    const term = normalize(query ?? "");
    if (!term) return catalog.slice(0, 50).map(({ haystack: _h, titleNorm: _t, ...rest }) => rest);
    const words = term.split(/\s+/).filter(Boolean);
    return catalog
      .filter((e) => words.every((w) => e.haystack.includes(w)))
      .sort((a, b) => {
        const rank = (e: CatalogEntry) => (e.code.startsWith(term) ? 0 : e.titleNorm.startsWith(term) ? 1 : e.titleNorm.split(/\s+/).some((w) => w.startsWith(words[0]!)) ? 2 : 3);
        return rank(a) - rank(b) || a.title.localeCompare(b.title, "pt-BR");
      })
      .slice(0, 50)
      .map(({ haystack: _h, titleNorm: _t, ...rest }) => rest);
  }
}
