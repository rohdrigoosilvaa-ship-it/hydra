import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

interface Entry {
  id: string;
  code: string;
  description: string;
  riskGrade: number;
  digits: string;
  textNorm: string;
}

@Injectable()
export class CnaeService {
  private catalog: Entry[] | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async load(): Promise<Entry[]> {
    if (this.catalog) return this.catalog;
    const rows = await this.prisma.cnaeNr04.findMany({ orderBy: { code: "asc" } });
    const entries = rows.map((r) => ({ ...r, digits: r.code.replace(/\D/g, ""), textNorm: normalize(r.description) }));
    if (entries.length > 0) this.catalog = entries;
    return entries;
  }

  /** Quantos CNAE a tabela tem (0 = a lista da NR-04 ainda não foi carregada). */
  async count() {
    return (await this.load()).length;
  }

  /** Busca por código (com ou sem pontuação) ou por palavras da descrição, sem diferenciar acento. */
  async search(query?: string) {
    const catalog = await this.load();
    const raw = (query ?? "").trim();
    const strip = ({ digits: _d, textNorm: _t, ...rest }: Entry) => rest;
    if (!raw) return catalog.slice(0, 50).map(strip);
    const digits = raw.replace(/\D/g, "");
    const words = normalize(raw).split(/\s+/).filter(Boolean);
    const byCode = digits.length >= 2 && digits.length === raw.replace(/[\s.\-/]/g, "").length;
    return catalog
      .filter((e) => (byCode ? e.digits.startsWith(digits) : words.every((w) => e.textNorm.includes(w) || e.code.includes(w))))
      .slice(0, 50)
      .map(strip);
  }
}
