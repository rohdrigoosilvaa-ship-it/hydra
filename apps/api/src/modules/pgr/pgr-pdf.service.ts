import { Injectable, NotFoundException } from "@nestjs/common";
import PDFDocument from "pdfkit";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { companyScopeWhere } from "../org/scope.util";
import * as T from "./pgr-pdf.templates";
import { POPPINS_BOLD_BASE64, POPPINS_SEMIBOLD_BASE64, POPPINS_REGULAR_BASE64 } from "./pgr-pdf.fonts";

const RISK_CATEGORY_LABEL: Record<string, string> = {
  FISICO: "Físico",
  QUIMICO: "Químico",
  BIOLOGICO: "Biológico",
  ERGONOMICO: "Ergonômico",
  ACIDENTE: "Acidente",
};
const EXPOSURE_TYPE_LABEL: Record<string, string> = {
  HABITUAL: "Habitual",
  EVENTUAL: "Eventual",
  INTERMITENTE: "Intermitente",
  PERMANENTE: "Permanente",
};
const EXPOSURE_TYPE_ABBR: Record<string, string> = { HABITUAL: "Hab", EVENTUAL: "Event", INTERMITENTE: "Int", PERMANENTE: "Perm" };
const EVALUATION_CRITERIA_LABEL: Record<string, string> = { QUALITATIVO: "Qualitativo", QUANTITATIVO: "Quantitativo" };
const EVALUATION_CRITERIA_ABBR: Record<string, string> = { QUALITATIVO: "Quali", QUANTITATIVO: "Quant" };
const RISK_LEVEL_LABEL: Record<string, string> = {
  LOW: "Risco Baixo",
  MEDIUM: "Risco Médio",
  HIGH: "Risco Alto",
  CRITICAL: "Risco Crítico",
  IRRELEVANT: "Risco Irrelevante",
};
const YES_NO_LABEL: Record<string, string> = { SIM: "Sim", NAO: "Não", NAO_SE_APLICA: "Não se aplica" };
const RISK_CLASSIFICATION: Record<string, string> = {
  IRRELEVANT: "Aceitável",
  LOW: "Tolerável",
  MEDIUM: "Moderado",
  HIGH: "Substancial",
  CRITICAL: "Intolerável",
};
// Escalas do modelo (4 níveis) — o cadastro aceita 1-4 (valores antigos de 5 são exibidos como o nível máximo).
const PROBABILITY_LABEL: Record<number, string> = { 1: "Ocasional", 2: "Intermitente", 3: "Habitual", 4: "Permanente", 5: "Permanente" };
const SEVERITY_LABEL: Record<number, string> = { 1: "Leve", 2: "Moderado", 3: "Sério", 4: "Severo", 5: "Severo" };

const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4 pt
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CONTENT_TOP = 58;
const CONTENT_BOTTOM = 790;

// Paleta do PGR Modelo (amostrada do documento de referência).
const C_INK = "#4d4d4d";
const C_BODY = "#444444";
const C_MUTED = "#6b6b6b";
const C_LINE = "#d9d9d9";
const C_GRAY_BAR = "#e6e6e6";
const C_GRAY_ROW = "#f5f5f5";
const C_GREEN = "#00994c";
const C_GREEN_DARK = "#00663d";
const C_GREEN_BRIGHT = "#00b050";
const C_YELLOW = "#f2c94c";
const C_ORANGE = "#e08a5b";
const C_RED = "#c2362b";
const C_BLUE = "#2f80ed";

const CATEGORY_COLOR: Record<string, string> = {
  FISICO: C_GREEN,
  QUIMICO: C_RED,
  BIOLOGICO: C_GREEN_DARK,
  ERGONOMICO: C_YELLOW,
  ACIDENTE: C_BLUE,
};
// Versão escurecida (texto sobre fundo branco) das cores acima.
const CATEGORY_TEXT_COLOR: Record<string, string> = {
  FISICO: C_GREEN_DARK,
  QUIMICO: C_RED,
  BIOLOGICO: C_GREEN_DARK,
  ERGONOMICO: "#8a6d00",
  ACIDENTE: C_BLUE,
};
const RISK_LEVEL_TEXT_COLOR: Record<string, string> = {
  LOW: C_GREEN_DARK,
  MEDIUM: "#8a6d00",
  HIGH: "#b4531a",
  CRITICAL: C_RED,
  IRRELEVANT: C_GREEN_DARK,
};
const LEVEL_COLOR: Record<number, string> = { 1: C_GREEN, 2: C_YELLOW, 3: C_ORANGE, 4: C_RED };
const LEVEL_TINT: Record<number, string> = { 1: "#f0f7f3", 2: "#fdf8e4", 3: "#faf1ec", 4: "#f9ecec" };
const MEDIDA_COLOR: Record<string, string> = {
  green1: C_GREEN_BRIGHT,
  green: C_GREEN,
  yellow: C_YELLOW,
  orange: C_ORANGE,
  red: C_RED,
};

const MONTH_ABBR = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

const nfc = (s: string | null | undefined): string => (s ?? "").normalize("NFC");

function naOrValue(v: string | null | undefined): string {
  return v && v.trim() ? nfc(v) : "Não informado";
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "Não informado";
  return new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatMonthYear(d: Date | null | undefined): string | null {
  if (!d) return null;
  const date = new Date(d);
  return `${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

function sanitizeForFilename(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

/** Meses da vigência (validFrom → validUntil), no máximo 36. Sem vigência, o ano corrente. Mesma regra da aba Cronograma. */
function cronogramaMonths(validFrom: Date | null, validUntil: Date | null): { year: number; month: number }[] {
  const now = new Date();
  const start = validFrom
    ? { year: validFrom.getUTCFullYear(), month: validFrom.getUTCMonth() + 1 }
    : { year: now.getFullYear(), month: 1 };
  const end = validUntil
    ? { year: validUntil.getUTCFullYear(), month: validUntil.getUTCMonth() + 1 }
    : { year: start.year, month: 12 };
  const months: { year: number; month: number }[] = [];
  let { year, month } = start;
  while ((year < end.year || (year === end.year && month <= end.month)) && months.length < 36) {
    months.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

/** Só PNG/JPEG entram no PDF (pdfkit) — qualquer outro formato é descartado. */
function isEmbeddableImage(buf: Buffer): boolean {
  return (
    (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) ||
    (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8)
  );
}

interface Cell {
  text?: string;
  runs?: { text: string; bold?: boolean }[];
  /** Linha final "Rótulo: valor" (rótulo em negrito) desenhada abaixo do texto — evita quebras de linha dentro de `runs`. */
  footer?: { label: string; value: string };
  w: number;
  font?: string;
  size?: number;
  color?: string;
  fill?: string;
  align?: "left" | "center" | "right" | "justify";
  valign?: "top" | "middle";
}

interface Attachment {
  fileName: string;
  buffer: Buffer | null;
}

@Injectable()
export class PgrPdfService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.PGR_READ, tenantId);
    const pgr = await this.prisma.pgr.findFirst({
      where: { ...where, id, deletedAt: null },
      include: {
        ghes: {
          include: {
            functions: { include: { department: true, position: true } },
            risks: { include: { hazard: true }, orderBy: { createdAt: "asc" } },
          },
          orderBy: { name: "asc" },
        },
        actions: true,
        cronograma: { include: { marks: true }, orderBy: { order: "asc" } },
      },
    });
    if (!pgr) throw new NotFoundException("PGR não encontrado.");

    const [company, branch] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: pgr.companyId } }),
      pgr.branchId ? this.prisma.branch.findUnique({ where: { id: pgr.branchId } }) : Promise.resolve(null),
    ]);

    const employees = await this.prisma.employee.findMany({
      where: { tenantId, companyId: pgr.companyId, status: "ACTIVE", deletedAt: null },
      select: { departmentId: true, positionId: true, department: { select: { name: true } }, position: { select: { name: true } } },
    });

    const evidences = await this.prisma.evidence.findMany({
      where: { tenantId, sourceType: "PGR", sourceId: id },
      orderBy: { createdAt: "asc" },
    });
    const attachments: Attachment[] = [];
    for (const ev of evidences) {
      attachments.push({ fileName: ev.fileName, buffer: await this.fetchImage(ev.fileUrl) });
    }

    const logoBuffer = await this.fetchImage(company?.logoUrl ?? null);
    const buffer = await this.render(pgr, company, branch, employees, logoBuffer, attachments);
    const filename = this.buildFilename(pgr, company, branch);
    return { buffer, filename };
  }

  /** Baixa uma imagem — se falhar ou não for PNG/JPEG, devolve null e o PDF segue sem ela. */
  private async fetchImage(url: string | null): Promise<Buffer | null> {
    if (!url) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return isEmbeddableImage(buf) ? buf : null;
    } catch {
      return null;
    }
  }

  private buildFilename(
    pgr: { version: number },
    company: { name: string } | null,
    branch: { name: string } | null,
  ): string {
    const empresa = sanitizeForFilename(company?.name ?? "EMPRESA");
    const unidade = sanitizeForFilename(branch?.name ?? "UNIDADE");
    const rev = String(Math.max(0, pgr.version - 1)).padStart(2, "0");
    return `PGR_${empresa}_${unidade}_REV${rev}.pdf`;
  }

  private render(
    pgr: any,
    company: any,
    branch: any,
    employees: { departmentId: string | null; positionId: string | null; department: { name: string } | null; position: { name: string } | null }[],
    logoBuffer: Buffer | null,
    attachments: Attachment[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: CONTENT_TOP, left: MARGIN, right: MARGIN, bottom: PAGE_HEIGHT - CONTENT_BOTTOM },
        autoFirstPage: false,
      });
      doc.registerFont("Poppins-Bold", Buffer.from(POPPINS_BOLD_BASE64, "base64"));
      doc.registerFont("Poppins-SemiBold", Buffer.from(POPPINS_SEMIBOLD_BASE64, "base64"));
      doc.registerFont("Poppins-Regular", Buffer.from(POPPINS_REGULAR_BASE64, "base64"));
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const legalName = nfc(company?.legalName ?? company?.name ?? "");
      const cnpj = branch?.cnpj ?? company?.cnpj ?? null;
      const vigenciaFrom = formatMonthYear(pgr.validFrom);
      const vigenciaUntil = formatMonthYear(pgr.validUntil);
      const footerLeft = `${legalName}${cnpj ? ` — CNPJ ${cnpj}` : ""}`;
      const footerRight = vigenciaFrom || vigenciaUntil ? `Vigência ${vigenciaFrom ?? "—"} a ${vigenciaUntil ?? "—"}` : "";

      // ---- Cabeçalho e rodapé de toda página (logo do cliente à esquerda) ----
      doc.on("pageAdded", () => {
        const originalBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0; // escrever abaixo da margem inferior dispararia nova página
        if (logoBuffer) {
          try {
            doc.image(logoBuffer, MARGIN, 14, { fit: [110, 28] });
          } catch {
            // logo com formato inesperado — segue sem quebrar o PDF
          }
        }
        doc
          .font("Poppins-SemiBold")
          .fontSize(8)
          .fillColor(C_INK)
          .text("PGR — Programa de Gerenciamento de Riscos", MARGIN, 25, { width: CONTENT_WIDTH, align: "right", lineBreak: false });
        doc.moveTo(0, 46.5).lineTo(PAGE_WIDTH, 46.5).lineWidth(0.6).strokeColor("#e5e5e5").stroke();

        doc.moveTo(0, 803).lineTo(PAGE_WIDTH, 803).lineWidth(0.6).strokeColor("#e5e5e5").stroke();
        doc.font("Helvetica").fontSize(7.5).fillColor(C_BODY);
        doc.text(footerLeft, MARGIN, 811, { width: CONTENT_WIDTH * 0.62, align: "left", lineBreak: false });
        doc.text(footerRight, MARGIN, 811, { width: CONTENT_WIDTH, align: "right", lineBreak: false });
        doc.page.margins.bottom = originalBottom;
        doc.x = MARGIN;
        doc.y = CONTENT_TOP;
      });

      // ------------------------------------------------------------------
      // Helpers de layout
      // ------------------------------------------------------------------
      function ensureSpace(height: number) {
        if (doc.y + height > CONTENT_BOTTOM) doc.addPage();
      }

      function gap(h: number) {
        doc.y += h;
        doc.x = MARGIN;
      }

      const bodyOpts = { width: CONTENT_WIDTH, align: "justify" as const, lineGap: 3 };

      function paragraph(text: string) {
        doc.font("Helvetica").fontSize(10);
        ensureSpace(Math.min(doc.heightOfString(nfc(text), bodyOpts), 40));
        // o cabeçalho/rodapé da página nova altera a fonte — reaplica antes de escrever
        doc.font("Helvetica").fontSize(10).fillColor(C_BODY).text(nfc(text), MARGIN, doc.y, bodyOpts);
        gap(6);
      }

      /** Termo em negrito + texto corrido, no mesmo parágrafo. */
      function termParagraph(term: string, text: string) {
        ensureSpace(40);
        // o espaço entre o termo e o texto vai para dentro do trecho em negrito (o pdfkit o perde na junção)
        const lead = text.startsWith(" ");
        const boldPart = nfc(term) + (lead ? " " : "");
        const rest = nfc(lead ? text.slice(1) : text);
        doc.font("Helvetica-Bold").fontSize(10).fillColor(C_BODY).text(boldPart, MARGIN, doc.y, { ...bodyOpts, continued: true });
        doc.font("Helvetica").text(rest, { ...bodyOpts, continued: false });
        gap(6);
      }

      function bullets(items: string[]) {
        for (const item of items) {
          doc.font("Helvetica").fontSize(10);
          const w = CONTENT_WIDTH - 26;
          const h = doc.heightOfString(nfc(item), { width: w, align: "justify", lineGap: 3 });
          ensureSpace(Math.min(h, 60));
          doc.font("Helvetica").fontSize(10).fillColor(C_BODY);
          const y = doc.y;
          doc.text("•", MARGIN + 8, y, { lineBreak: false });
          doc.text(nfc(item), MARGIN + 26, y, { width: w, align: "justify", lineGap: 3 });
          gap(4);
        }
        gap(2);
      }

      function heading1(text: string) {
        ensureSpace(60);
        doc.font("Poppins-Bold").fontSize(14).fillColor(C_GREEN_DARK).text(nfc(text), MARGIN, doc.y, { width: CONTENT_WIDTH });
        gap(8);
      }

      function heading2(text: string) {
        ensureSpace(50);
        doc.font("Poppins-SemiBold").fontSize(11.5).fillColor(C_BODY).text(nfc(text), MARGIN, doc.y, { width: CONTENT_WIDTH });
        gap(5);
      }

      function greenTitle(text: string) {
        ensureSpace(60);
        doc.font("Poppins-SemiBold").fontSize(14.5).fillColor(C_GREEN_DARK).text(nfc(text), MARGIN, doc.y, { width: CONTENT_WIDTH });
        gap(7);
      }

      function eyebrow(text: string) {
        doc.font("Poppins-SemiBold").fontSize(8).fillColor(C_GREEN).text(nfc(text).toUpperCase(), MARGIN, doc.y, {
          width: CONTENT_WIDTH,
          characterSpacing: 1.6,
        });
        gap(6);
      }

      /** Desenha uma linha de células (altura = a da maior célula) com quebra de página. Devolve a altura. */
      function drawRow(cells: Cell[], opts: { pad?: number; minH?: number; noBorder?: boolean; borderColor?: string; keepOnPage?: boolean } = {}): number {
        const pad = opts.pad ?? 6;
        let rowH = opts.minH ?? 0;
        const heights: number[] = [];
        for (const c of cells) {
          const font = c.font ?? "Helvetica";
          doc.font(c.runs ? "Helvetica-Bold" : font).fontSize(c.size ?? 9);
          const content = c.runs ? c.runs.map((r) => nfc(r.text)).join("") : nfc(c.text);
          let th = doc.heightOfString(content, { width: c.w - pad * 2, align: c.align ?? "left", lineGap: 2 });
          if (c.footer) {
            doc.font("Helvetica-Bold");
            th += 4 + doc.heightOfString(nfc(`${c.footer.label} ${c.footer.value}`), { width: c.w - pad * 2, lineGap: 2 });
          }
          heights.push(th);
          rowH = Math.max(rowH, th + pad * 2 - 2);
        }
        ensureSpace(rowH);
        const y = doc.y;
        let x = MARGIN;
        cells.forEach((c, i) => {
          if (c.fill) doc.rect(x, y, c.w, rowH).fill(c.fill);
          if (!opts.noBorder) doc.rect(x, y, c.w, rowH).lineWidth(0.6).strokeColor(opts.borderColor ?? C_LINE).stroke();
          const ty = c.valign === "top" ? y + pad - 1 : y + (rowH - heights[i]!) / 2;
          const textOpts = { width: c.w - pad * 2, align: c.align ?? ("left" as const), lineGap: 2 };
          doc.fillColor(c.color ?? C_BODY).fontSize(c.size ?? 9);
          if (c.runs && (c.align === "center" || c.align === "right")) {
            // o pdfkit não combina `continued` com alinhamento — posiciona os trechos à mão (linha única)
            const widths = c.runs.map((r) => {
              doc.font(r.bold ? "Helvetica-Bold" : "Helvetica").fontSize(c.size ?? 9);
              return doc.widthOfString(nfc(r.text));
            });
            const total = widths.reduce((a, b) => a + b, 0);
            let sx = c.align === "center" ? x + (c.w - total) / 2 : x + c.w - pad - total;
            c.runs.forEach((r, ri) => {
              doc.font(r.bold ? "Helvetica-Bold" : "Helvetica").fillColor(c.color ?? C_BODY).text(nfc(r.text), sx, ty, { lineBreak: false });
              sx += widths[ri]!;
            });
          } else if (c.runs) {
            c.runs.forEach((r, ri) => {
              doc.font(r.bold ? "Helvetica-Bold" : "Helvetica");
              if (ri === 0) doc.text(nfc(r.text), x + pad, ty, { ...textOpts, continued: ri < c.runs!.length - 1 });
              else doc.text(nfc(r.text), { ...textOpts, continued: ri < c.runs!.length - 1 });
            });
          } else {
            doc.font(c.font ?? "Helvetica").text(nfc(c.text), x + pad, ty, textOpts);
            if (c.footer) {
              const fy = doc.y + 4;
              doc.font("Helvetica-Bold").text(nfc(`${c.footer.label} `), x + pad, fy, { ...textOpts, continued: true });
              doc.font("Helvetica").text(nfc(c.footer.value), { ...textOpts, continued: false });
            }
          }
          x += c.w;
        });
        doc.y = y + rowH;
        doc.x = MARGIN;
        return rowH;
      }

      const frac = (f: number) => f * CONTENT_WIDTH;

      /** Barra de título de quadro (cinza, centralizada ou à esquerda). */
      function bar(text: string, opts: { fill?: string; color?: string; align?: "left" | "center"; font?: string; size?: number; minH?: number } = {}) {
        drawRow(
          [
            {
              text,
              w: CONTENT_WIDTH,
              fill: opts.fill ?? C_GRAY_BAR,
              color: opts.color ?? C_INK,
              align: opts.align ?? "center",
              font: opts.font ?? "Helvetica-Bold",
              size: opts.size ?? 9.5,
            },
          ],
          { minH: opts.minH ?? 24, borderColor: opts.fill ?? C_LINE },
        );
      }

      /** Linha "rótulo | valor" dos quadros de risco. */
      function labelRow(label: string, value: string) {
        drawRow([
          { text: label, w: frac(0.25), font: "Helvetica-Bold", color: C_INK, fill: "#ffffff" },
          { text: value, w: frac(0.75) },
        ]);
      }

      function listText(text: string): string {
        const lines = nfc(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        return lines.length > 1 ? lines.map((l) => `• ${l}`).join("\n") : lines[0] ?? "";
      }

      // ------------------------------------------------------------------
      // 1. Capa
      // ------------------------------------------------------------------
      doc.addPage();
      doc.rect(MARGIN, 152, 72, 5).fill(C_GREEN);
      doc.font("Poppins-Bold").fontSize(56).fillColor(C_INK).text("PGR", MARGIN, 168, { width: CONTENT_WIDTH, lineBreak: false });
      doc.font("Poppins-SemiBold").fontSize(15).fillColor(C_GREEN_DARK).text("Programa de Gerenciamento de Riscos", MARGIN, 248, { width: CONTENT_WIDTH, lineBreak: false });
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, MARGIN, 300, { fit: [200, 120] });
        } catch {
          // segue sem logo
        }
      }
      doc.font("Poppins-Bold").fontSize(16).fillColor("#222222").text(legalName.toUpperCase(), MARGIN, 466, { width: CONTENT_WIDTH });
      gap(12);
      doc.font("Helvetica").fontSize(11).fillColor(C_BODY);
      const coverLines = [
        `Elaborado: ${formatMonthYear(pgr.issuedAt ?? pgr.createdAt) ?? "Não informado"}`,
        `Início da vigência: ${vigenciaFrom ?? "Não informado"}`,
        `Fim da vigência: ${vigenciaUntil ?? "Não informado"}`,
      ];
      for (const line of coverLines) {
        doc.text(line, MARGIN, doc.y, { width: CONTENT_WIDTH });
        gap(5);
      }

      // ------------------------------------------------------------------
      // 2. Histórico de revisão
      // ------------------------------------------------------------------
      doc.addPage();
      doc.y = 52;
      drawRow(
        [{ text: "HISTÓRICO DE REVISÃO", w: CONTENT_WIDTH, font: "Poppins-SemiBold", size: 10.5, color: C_INK, fill: C_GRAY_BAR }],
        { minH: 28, pad: 8, borderColor: C_GRAY_BAR },
      );
      const hw = [frac(0.22), frac(0.26), frac(0.52)];
      drawRow(
        [
          { text: "REVISÃO", w: hw[0]!, font: "Helvetica-Bold", size: 10, fill: "#fafafa", color: C_INK },
          { text: "DATA", w: hw[1]!, font: "Helvetica-Bold", size: 10, fill: "#fafafa", color: C_INK },
          { text: "ITEM", w: hw[2]!, font: "Helvetica-Bold", size: 10, fill: "#fafafa", color: C_INK },
        ],
        { minH: 26, pad: 8 },
      );
      const revisionNumber = String(Math.max(0, pgr.version - 1)).padStart(2, "0");
      drawRow(
        [
          { text: revisionNumber, w: hw[0]!, size: 10 },
          { text: formatMonthYear(pgr.issuedAt ?? pgr.createdAt) ?? "", w: hw[1]!, size: 10 },
          { text: pgr.version > 1 ? "Revisão do documento" : "Elaboração do documento", w: hw[2]!, size: 10 },
        ],
        { minH: 26, pad: 8 },
      );
      for (let i = 0; i < 5; i++) {
        drawRow([{ text: "", w: hw[0]! }, { text: "", w: hw[1]! }, { text: "", w: hw[2]! }], { minH: 22 });
      }

      // ------------------------------------------------------------------
      // 3. Sumário
      // ------------------------------------------------------------------
      doc.addPage();
      doc.font("Poppins-Bold").fontSize(20).fillColor(C_INK).text("Sumário", MARGIN, 58, { width: CONTENT_WIDTH, align: "center" });
      gap(26);
      for (const entry of T.SUMARIO) {
        // número em negrito, resto normal ("5.1 - ANTECIPAÇÃO")
        const m = entry.match(/^(\d+(?:\.\d+)?)(\s*[-–]\s*)(.*)$/);
        doc.fontSize(11).fillColor(C_BODY);
        if (m) {
          doc.font("Helvetica-Bold").text(m[1]!, MARGIN, doc.y, { continued: true, width: CONTENT_WIDTH });
          doc.font("Helvetica").text(`${m[2]}${m[3]}`, { continued: false, width: CONTENT_WIDTH });
        } else {
          doc.font("Helvetica").text(entry, MARGIN, doc.y, { width: CONTENT_WIDTH });
        }
        gap(14);
      }

      // ------------------------------------------------------------------
      // 1 Introdução / 2 Objetivos
      // ------------------------------------------------------------------
      doc.addPage();
      heading1("1. INTRODUÇÃO");
      for (const p of T.INTRODUCAO) paragraph(p);
      gap(6);
      heading1("2. OBJETIVOS");
      paragraph(T.OBJETIVOS_INTRO);
      bullets(T.OBJETIVOS);

      // ---- 3 Abrangência / 4 Definições ----
      doc.addPage();
      heading1("3. ABRANGÊNCIA");
      for (const p of T.ABRANGENCIA_PARAGRAFOS) paragraph(p);
      for (const t of T.ABRANGENCIA_TIPOS) termParagraph(t.term, t.text);
      gap(8);
      heading1("4. DEFINIÇÕES");
      for (const d of T.DEFINICOES) termParagraph(d.term, d.text);
      for (const p of T.DEFINICOES_FINAIS) paragraph(p);

      // ---- 5 Estratégia e metodologia ----
      doc.addPage();
      heading1("5. ESTRATÉGIA E METODOLOGIA DE AÇÃO");
      heading2("5.1 Antecipação");
      paragraph(T.ESTRATEGIA.antecipacao);
      gap(4);
      heading2("5.2 Reconhecimento");
      for (const p of T.ESTRATEGIA.reconhecimento) paragraph(p);
      gap(4);
      heading2("5.3 Avaliação do Risco – ETAPA 1");
      paragraph(T.ESTRATEGIA.avaliacaoEtapa1);
      gap(4);
      heading2("5.3.1 Classificação dos riscos – ETAPA 2");
      paragraph(T.ESTRATEGIA.classificacaoLabel);
      gap(4);
      greenTitle("Matriz de Risco Utilizada");
      paragraph(T.ESTRATEGIA.matrizIntro);

      // ---- Tabelas de probabilidade e potencial de dano ----
      doc.addPage();
      doc.y = 52;
      drawProbabilidadeTables();
      gap(10);
      paragraph(T.TEXTO_NIVEIS);

      // ---- Matriz 4x4 ----
      doc.addPage();
      doc.y = 52;
      doc.font("Poppins-SemiBold").fontSize(11.5).fillColor(C_INK).text("SEVERIDADE / POTENCIAL DE DANO", MARGIN, doc.y, { width: CONTENT_WIDTH, align: "center" });
      gap(14);
      drawMatrix();
      gap(14);
      doc.font("Helvetica").fontSize(8.5).fillColor(C_BODY).text(T.MATRIZ_LEGENDA, MARGIN, doc.y, { width: CONTENT_WIDTH });
      gap(14);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(C_BODY).text("Exemplo de aplicação:", MARGIN, doc.y, { width: CONTENT_WIDTH });
      gap(4);
      for (const ex of T.EXEMPLO_APLICACAO) termParagraph(ex.term, ex.text);
      gap(8);
      greenTitle("Métodos de Controle e Ação");
      paragraph(T.METODOS_CONTROLE);

      // ---- Medidas sugeridas ----
      doc.addPage();
      doc.y = 52;
      drawRow(
        [
          { text: "G.R.", w: frac(0.12), font: "Helvetica", size: 9.5, fill: C_GRAY_BAR, color: C_INK },
          { text: "MEDIDAS SUGERIDAS", w: frac(0.88), font: "Helvetica", size: 9.5, fill: C_GRAY_BAR, color: C_INK, align: "center" },
        ],
        { minH: 24, borderColor: C_GRAY_BAR },
      );
      for (const m of T.MEDIDAS_SUGERIDAS) {
        drawRow(
          [
            { text: String(m.value), w: frac(0.12), font: "Helvetica-Bold", size: 9.5, fill: MEDIDA_COLOR[m.color], color: "#ffffff", align: "center" },
            { text: m.text, w: frac(0.88), size: 9, color: C_BODY },
          ],
          { minH: 40, pad: 7 },
        );
      }
      gap(10);
      paragraph(T.MEDIDAS_NOTA);

      // ------------------------------------------------------------------
      // 6. Inventário de Riscos — divisória + Unidade + GHEs
      // ------------------------------------------------------------------
      doc.addPage();
      doc.rect(MARGIN, 280, 54, 5).fill(C_GREEN);
      doc.font("Poppins-Bold").fontSize(30).fillColor(C_INK).text("Inventário de\nRiscos", MARGIN, 304, { width: CONTENT_WIDTH });

      drawUnidadePage();
      for (const ghe of pgr.ghes) drawGhePages(ghe);

      // ------------------------------------------------------------------
      // 7-10 + Pendências + 11 Responsáveis + 12 Anexos
      // ------------------------------------------------------------------
      doc.addPage();
      eyebrow("Conclusão PGR");
      heading1("7. DIVULGAÇÕES DO PROGRAMA");
      for (const p of T.DIVULGACOES) paragraph(p);
      gap(6);
      heading1("8. REGISTRO");
      for (const p of T.REGISTRO) paragraph(p);
      gap(6);
      heading1("9. GARANTIA DE IMPLEMENTAÇÃO DO PROGRAMA DE GERENCIAMENTO DE RISCO");
      paragraph(T.GARANTIA_IMPLEMENTACAO);
      gap(6);
      heading1("10. CONSIDERAÇÕES GERAIS");
      for (const p of T.CONSIDERACOES_GERAIS) paragraph(p);
      if (pgr.consideracoesFinais && pgr.consideracoesFinais.trim()) paragraph(pgr.consideracoesFinais);
      gap(6);
      ensureSpace(70);
      doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).lineWidth(0.8).strokeColor(C_INK).stroke();
      gap(10);
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(C_BODY).text(T.CONSIDERACOES_DESTAQUE, MARGIN, doc.y, { width: CONTENT_WIDTH, align: "justify", lineGap: 3 });
      gap(10);
      doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).lineWidth(0.8).strokeColor(C_INK).stroke();

      // ---- Pendências técnicas ----
      doc.addPage();
      heading2Green("Pendências técnicas desta revisão");
      const pendencias = collectPendencias();
      if (pendencias.length === 0) {
        paragraph("Nenhuma pendência técnica registrada nesta revisão.");
      } else {
        paragraph(T.PENDENCIAS_INTRO);
        pendencias.forEach((text, i) => {
          doc.font("Helvetica").fontSize(10);
          const w = CONTENT_WIDTH - 26;
          const h = doc.heightOfString(nfc(text), { width: w, align: "justify", lineGap: 3 });
          ensureSpace(h);
          doc.font("Helvetica").fontSize(10).fillColor(C_BODY);
          const y = doc.y;
          doc.text(`${i + 1}.`, MARGIN + 8, y, { lineBreak: false });
          doc.text(nfc(text), MARGIN + 26, y, { width: w, align: "justify", lineGap: 3 });
          gap(4);
        });
      }

      // ---- 11 Responsáveis ----
      doc.addPage();
      heading1("11. RESPONSÁVEIS");
      paragraph(T.RESPONSAVEIS_TEXTO);
      gap(56);
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(C_BODY).text("Responsável Técnico pelo Documento:", MARGIN, doc.y, { width: CONTENT_WIDTH });
      gap(60);
      drawSignatureLine([
        nfc(pgr.technicalResponsibleName).toUpperCase() || "NÃO INFORMADO",
        nfc(pgr.technicalResponsibleSpecialty).toUpperCase(),
        [pgr.technicalResponsibleCouncil, pgr.technicalResponsibleRegistry].filter(Boolean).join(" ") +
          (pgr.technicalResponsibleUf ? `/${pgr.technicalResponsibleUf}` : ""),
      ]);
      gap(60);
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(C_BODY).text("Responsável pela empresa", MARGIN, doc.y, { width: CONTENT_WIDTH });
      gap(56);
      drawSignatureLine([
        legalName.toUpperCase(),
        nfc(pgr.companyResponsibleName),
        nfc(pgr.companyResponsibleRole),
      ]);

      // ---- 12 Anexos ----
      doc.addPage();
      heading1("12. ANEXOS");
      gap(8);
      for (const item of T.ANEXOS_LISTA) {
        doc.font("Helvetica-Bold").fontSize(11).fillColor(C_INK).text(item, MARGIN, doc.y, { width: CONTENT_WIDTH });
        gap(8);
      }

      drawFichaEpiBlank();
      drawPlanoAcoes();
      drawCronograma();
      drawAnexosEnviados();

      doc.end();

      // ==================================================================
      // Funções de seção (declaradas após doc.end() — hoisting de function)
      // ==================================================================

      function heading2Green(text: string) {
        doc.font("Poppins-Bold").fontSize(14).fillColor(C_GREEN_DARK).text(nfc(text), MARGIN, doc.y, { width: CONTENT_WIDTH });
        gap(8);
      }

      function drawSignatureLine(lines: string[]) {
        ensureSpace(80);
        const lineX1 = 140;
        const lineX2 = 456;
        doc.moveTo(lineX1, doc.y).lineTo(lineX2, doc.y).lineWidth(0.9).strokeColor(C_INK).stroke();
        gap(8);
        for (const l of lines) {
          if (!l.trim()) continue;
          doc.font("Helvetica").fontSize(10.5).fillColor(C_BODY).text(l, MARGIN, doc.y, { width: CONTENT_WIDTH, align: "center" });
          gap(3);
        }
      }

      function drawProbabilidadeTables() {
        const tableW = (CONTENT_WIDTH - 14) / 2;
        const leftX = MARGIN;
        const rightX = MARGIN + tableW + 14;
        const top = doc.y;
        const barH = 22;
        const rowH = 44;

        const drawBar = (x: number, title: string) => {
          doc.rect(x, top, tableW, barH).fill(C_GRAY_BAR);
          doc.font("Helvetica").fontSize(9).fillColor(C_INK).text(title, x + 8, top + 6.5, { width: tableW - 16, lineBreak: false });
        };
        drawBar(leftX, "PROBABILIDADE");
        drawBar(rightX, "POTENCIAL DE DANO");

        T.TABELA_PROBABILIDADE.forEach((r, i) => {
          const y = top + barH + i * rowH;
          const nameW = 82;
          const lvlW = 20;
          doc.rect(leftX, y, lvlW, rowH).fill(LEVEL_COLOR[r.level]!);
          doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff").text(String(r.level), leftX, y + rowH / 2 - 5, { width: lvlW, align: "center", lineBreak: false });
          doc.rect(leftX + lvlW, y, nameW, rowH).fill(LEVEL_TINT[r.level]!);
          doc.font("Helvetica").fontSize(8.5).fillColor(C_INK).text(r.title, leftX + lvlW + 5, y + 10, { width: nameW - 8, lineBreak: false });
          doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C_BODY).text(r.subtitle, leftX + lvlW + 5, y + 22, { width: nameW - 8, lineBreak: false });
          doc.font("Helvetica").fontSize(7.5).fillColor(C_BODY).text(`${r.line1}\n${r.line2}`, leftX + lvlW + nameW + 5, y + 6, { width: tableW - lvlW - nameW - 10, lineGap: 1 });
          doc.rect(leftX, y, tableW, rowH).lineWidth(0.6).strokeColor(C_LINE).stroke();
        });

        T.TABELA_POTENCIAL_DANO.forEach((r, i) => {
          const y = top + barH + i * rowH;
          const lvlW = 20;
          const nameW = 124;
          doc.rect(rightX, y, lvlW, rowH).fill(LEVEL_COLOR[r.level]!);
          doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff").text(String(r.level), rightX, y + rowH / 2 - 5, { width: lvlW, align: "center", lineBreak: false });
          doc.rect(rightX + lvlW, y, nameW, rowH).fill(LEVEL_TINT[r.level]!);
          doc.font("Helvetica").fontSize(8.5).fillColor(C_INK).text(r.title, rightX + lvlW + 8, y + 10, { width: nameW - 12, lineBreak: false });
          doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C_BODY).text(r.subtitle, rightX + lvlW + 8, y + 22, { width: nameW - 12, lineBreak: false });
          doc.font("Helvetica").fontSize(8).fillColor(C_BODY).text(r.risk, rightX + lvlW + nameW + 8, y + rowH / 2 - 5, { width: tableW - lvlW - nameW - 12, lineBreak: false });
          doc.rect(rightX, y, tableW, rowH).lineWidth(0.6).strokeColor(C_LINE).stroke();
        });

        doc.y = top + barH + 4 * rowH + 4;
        doc.x = MARGIN;
      }

      function drawMatrix() {
        const labelW = 80;
        const cw = (CONTENT_WIDTH - labelW) / 4;
        const headH = 30;
        const rowH = 42;
        const x0 = MARGIN;
        const y0 = doc.y;
        const levelFill = (label: string, value: number) => {
          if (label === "Irrelevante") return C_GREEN_BRIGHT;
          if (label === "Baixo") return C_GREEN;
          if (label === "Médio") return C_YELLOW;
          if (label === "Alto") return C_ORANGE;
          return value >= 16 ? C_RED : C_GREEN;
        };
        for (let c = 0; c < 4; c++) {
          const x = x0 + labelW + c * cw;
          doc.rect(x, y0, cw, headH).fill(LEVEL_COLOR[c + 1]!);
          doc.font("Helvetica-Bold").fontSize(10).fillColor("#ffffff").text(String(c + 1), x, y0 + headH / 2 - 5, { width: cw, align: "center", lineBreak: false });
        }
        for (let r = 0; r < 4; r++) {
          const y = y0 + headH + r * rowH;
          doc.rect(x0, y, labelW, rowH).fill(LEVEL_COLOR[r + 1]!);
          doc.font("Helvetica-Bold").fontSize(10).fillColor("#ffffff").text(String(r + 1), x0, y + rowH / 2 - 5, { width: labelW, align: "center", lineBreak: false });
          for (let c = 0; c < 4; c++) {
            const cell = T.MATRIZ_RISCO[r]![c]!;
            const x = x0 + labelW + c * cw;
            doc.rect(x, y, cw, rowH).fill(levelFill(cell.label, cell.value));
            doc.rect(x, y, cw, rowH).lineWidth(0.8).strokeColor("#ffffff").stroke();
            doc.font("Helvetica").fontSize(9).fillColor("#ffffff").text(`${cell.value}\n${cell.label}`, x, y + 9, { width: cw, align: "center", lineGap: 3 });
          }
        }
        doc.y = y0 + headH + 4 * rowH;
        doc.x = MARGIN;
      }

      function drawUnidadePage() {
        doc.addPage();
        doc.rect(MARGIN, 50, CONTENT_WIDTH, 3).fill(C_GREEN_DARK);
        doc.y = 68;
        eyebrow("Unidade");
        const unitName = nfc(branch?.name ?? legalName);
        doc.font("Poppins-Bold").fontSize(16).fillColor("#222222").text(unitName.toUpperCase(), MARGIN, doc.y, { width: CONTENT_WIDTH });
        gap(8);
        doc.font("Helvetica").fontSize(10.5).fillColor(C_BODY);
        doc.text(legalName, MARGIN, doc.y, { width: CONTENT_WIDTH });
        if (cnpj) doc.text(cnpj, MARGIN, doc.y, { width: CONTENT_WIDTH });
        gap(10);

        const labeled = (label: string, lines: string[]) => {
          doc.font("Helvetica-Bold").fontSize(11).fillColor("#222222").text(label, MARGIN, doc.y, { width: CONTENT_WIDTH });
          gap(3);
          doc.font("Helvetica").fontSize(10.5).fillColor(C_BODY);
          for (const l of lines.filter(Boolean)) doc.text(nfc(l), MARGIN, doc.y, { width: CONTENT_WIDTH });
          gap(10);
        };
        const address = formatAddress(branch ?? company);
        labeled("Endereço", [address ?? "Não informado"]);
        const cnae = pgr.cnae ?? company?.cnae;
        const grau = pgr.grauRisco ?? company?.grauRisco;
        labeled("CNAE", [cnae ?? "Não informado", grau != null ? `Grau de Risco ${grau}` : ""]);

        if (company?.caracterizacaoProcessos) {
          doc.font("Helvetica-Bold").fontSize(11).fillColor("#222222").text("Atividade do estabelecimento", MARGIN, doc.y, { width: CONTENT_WIDTH });
          gap(3);
          paragraph(company.caracterizacaoProcessos);
          gap(4);
        }
        if (company?.descricaoLocal) {
          doc.font("Helvetica-Bold").fontSize(11).fillColor("#222222").text("Descrição do local", MARGIN, doc.y, { width: CONTENT_WIDTH });
          gap(3);
          paragraph(company.descricaoLocal);
          gap(4);
        }

        greenTitle("Caracterização dos processos e ambientes de trabalho");
        const headcount = new Map<string, { setor: string; cargo: string; count: number }>();
        for (const e of employees) {
          const key = `${e.departmentId ?? "—"}::${e.positionId ?? "—"}`;
          const existing = headcount.get(key);
          if (existing) existing.count += 1;
          else headcount.set(key, { setor: e.department?.name ?? "Não informado", cargo: e.position?.name ?? "Não informado", count: 1 });
        }
        const rows = Array.from(headcount.values()).sort((a, b) => a.setor.localeCompare(b.setor) || a.cargo.localeCompare(b.cargo));
        const w = [frac(0.34), frac(0.46), frac(0.2)];
        const noBorder = { noBorder: true };
        const lineH = (color: string, width: number) => {
          doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).lineWidth(width).strokeColor(color).stroke();
        };
        lineH(C_INK, 1.2);
        drawRow(
          [
            { text: "Setor", w: w[0]!, font: "Helvetica-Bold", color: "#222222", size: 10 },
            { text: "Cargo", w: w[1]!, font: "Helvetica-Bold", color: "#222222", size: 10 },
            { text: "Colaboradores", w: w[2]!, font: "Helvetica-Bold", color: "#222222", size: 10, align: "right" },
          ],
          { ...noBorder, minH: 26 },
        );
        let lastSetor = "";
        let total = 0;
        for (const r of rows) {
          lineH(C_LINE, 0.6);
          drawRow(
            [
              { text: r.setor === lastSetor ? "" : r.setor, w: w[0]!, size: 10 },
              { text: nfc(r.cargo).toUpperCase(), w: w[1]!, size: 10 },
              { text: String(r.count), w: w[2]!, size: 10, align: "right" },
            ],
            { ...noBorder, minH: 24 },
          );
          lastSetor = r.setor;
          total += r.count;
        }
        if (rows.length === 0) {
          drawRow([{ text: "Nenhum colaborador ativo cadastrado.", w: CONTENT_WIDTH, size: 10 }], { ...noBorder, minH: 24 });
        } else {
          lineH(C_LINE, 0.6);
          drawRow(
            [
              { text: "Total", w: w[0]!, font: "Helvetica-Bold", size: 10.5, color: "#222222" },
              { text: "", w: w[1]! },
              { text: String(total), w: w[2]!, font: "Helvetica-Bold", size: 10.5, color: "#222222", align: "right" },
            ],
            { ...noBorder, minH: 26 },
          );
        }
      }

      function drawGhePages(ghe: any) {
        doc.addPage();
        eyebrow("GHE");
        doc.font("Poppins-Bold").fontSize(17).fillColor("#111111").text(nfc(ghe.name).toUpperCase(), MARGIN, doc.y, { width: CONTENT_WIDTH });
        gap(12);

        if (ghe.localDescription || ghe.activityDescription) {
          if (ghe.localDescription) {
            drawRow([{ runs: [{ text: "Local ", bold: true }, { text: ghe.localDescription }], w: CONTENT_WIDTH, fill: C_GRAY_ROW, color: C_INK, size: 9.5 }], { pad: 8 });
          }
          if (ghe.activityDescription) {
            drawRow([{ text: ghe.activityDescription, w: CONTENT_WIDTH, align: "justify", size: 9.5, valign: "top" }], { pad: 8 });
          }
        }

        // Funções agrupadas por setor
        const bySetor = new Map<string, any[]>();
        for (const fn of ghe.functions) {
          const setor = fn.department?.name ?? "Não informado";
          const list = bySetor.get(setor) ?? [];
          list.push(fn);
          bySetor.set(setor, list);
        }
        for (const [setor, fns] of bySetor) {
          drawRow(
            [{ runs: [{ text: "Setor ", bold: true }, { text: setor }], w: CONTENT_WIDTH, fill: C_INK, color: "#ffffff", size: 10 }],
            { minH: 26, pad: 8, borderColor: C_INK },
          );
          for (const fn of fns) {
            const cargo = fn.position?.name ?? "Não informado";
            drawRow([{ runs: [{ text: "Cargo ", bold: true }, { text: nfc(cargo).toUpperCase() }], w: CONTENT_WIDTH, fill: C_GRAY_ROW, color: C_INK, size: 10 }], { minH: 26, pad: 8 });
            const activity = fn.activityDescription ?? fn.position?.description;
            if (activity) {
              drawRow([{ text: activity, w: CONTENT_WIDTH, align: "justify", size: 9.5, valign: "top" }], { pad: 8 });
            }
            if (fn.position?.cbo) {
              drawRow([{ runs: [{ text: "CBO: ", bold: true }, { text: fn.position.cbo }], w: CONTENT_WIDTH, color: C_INK, size: 9.5 }], { minH: 24, pad: 8 });
            }
          }
        }
        if (ghe.functions.length === 0) {
          drawRow([{ text: "Nenhum setor/cargo vinculado a este GHE.", w: CONTENT_WIDTH, color: C_MUTED, size: 9.5 }], { minH: 26, pad: 8 });
        }
        gap(14);

        ensureSpace(60);
        drawRow(
          [{ runs: [{ text: "Especificação dos perigos/fatores de risco · " }, { text: `GHE ${nfc(ghe.name).toUpperCase()}`, bold: true }], w: CONTENT_WIDTH, fill: C_GREEN_DARK, color: "#ffffff", size: 10, align: "center" }],
          { minH: 30, pad: 8, borderColor: C_GREEN_DARK },
        );
        gap(8);

        if (ghe.risks.length === 0) {
          paragraph("Nenhum risco avaliado para este GHE.");
          return;
        }
        for (const risk of ghe.risks) drawRiskTable(risk);

        // Quadro consolidado
        doc.addPage();
        bar("Quadro Consolidado", { align: "left", font: "Helvetica-Bold", size: 9.5 });
        drawRow([{ text: `Inventário de Risco - ${nfc(ghe.name).toUpperCase()}`, w: CONTENT_WIDTH, fill: C_GRAY_ROW, color: C_INK, font: "Helvetica-Bold", size: 9 }], { minH: 22 });
        const cw = [frac(0.2), frac(0.22), frac(0.09), frac(0.11), frac(0.14), frac(0.15), frac(0.09)];
        const head = (t: string, i: number, align: "left" | "center" = "left") =>
          ({ text: t, w: cw[i]!, font: "Helvetica-Bold", size: 8.5, color: C_INK, align }) as Cell;
        drawRow(
          [head("Perigo/Fator de Risco", 0), head("Fonte ou Circunstâncias", 1), head("Tipo Exp.", 2), head("Critério Avaliação", 3), head("Classificação do Efeito", 4), head("Frequência / Nível de Risco", 5), head("Classif.", 6)],
          { minH: 30, pad: 5 },
        );
        for (const r of ghe.risks) {
          const cat = r.hazard.category as string;
          drawRow(
            [
              { text: r.hazard.name, w: cw[0]!, size: 8.5, color: CATEGORY_TEXT_COLOR[cat] ?? C_BODY, align: "center" },
              { text: r.sourceCircumstances ?? "", w: cw[1]!, size: 8.5, align: "center" },
              { text: r.exposureType ? EXPOSURE_TYPE_ABBR[r.exposureType]! : "—", w: cw[2]!, size: 8.5, align: "center" },
              { text: r.evaluationCriteria ? EVALUATION_CRITERIA_ABBR[r.evaluationCriteria]! : "—", w: cw[3]!, size: 8.5, align: "center" },
              { text: `${SEVERITY_LABEL[r.severity] ?? r.severity}`, w: cw[4]!, size: 8.5, align: "center" },
              {
                text: `${PROBABILITY_LABEL[r.probability] ?? r.probability}\n${RISK_LEVEL_LABEL[r.riskLevel] ?? ""}`,
                w: cw[5]!,
                size: 8.5,
                align: "center",
                color: RISK_LEVEL_TEXT_COLOR[r.riskLevel] ?? C_BODY,
              },
              { text: r.classification ?? "A definir", w: cw[6]!, size: 8.5, align: "center" },
            ],
            { minH: 36, pad: 5 },
          );
        }
      }

      function drawRiskTable(risk: any) {
        const hazard = risk.hazard;
        const cat = hazard.category as string;
        const catColor = CATEGORY_COLOR[cat] ?? C_GREEN;
        const headColor = cat === "ERGONOMICO" ? "#3a3000" : "#ffffff";

        // "Ausência de agentes…" é só a declaração de inexistência: mostra o grupo e o perigo, nada mais.
        const isAbsence = /^aus.{1,2}ncia/i.test(nfc(hazard.name).trim());

        // Mantém o quadro de um risco junto, quando cabe numa página.
        ensureSpace(isAbsence ? 100 : 260);

        bar("Identificação");
        const hasCode = !!hazard.esocialCode;
        const hc = hasCode ? [frac(0.22), frac(0.3), frac(0.48)] : [frac(0.25), frac(0.75)];
        const headCells: Cell[] = [{ text: "Grupo", w: hc[0]!, font: "Helvetica-Bold", fill: catColor, color: headColor, align: "center", size: 9.5 }];
        const valCells: Cell[] = [{ text: RISK_CATEGORY_LABEL[cat] ?? cat, w: hc[0]!, align: "center", size: 9.5 }];
        if (hasCode) {
          headCells.push({ text: "Código eSocial", w: hc[1]!, font: "Helvetica-Bold", fill: catColor, color: headColor, align: "center", size: 9.5 });
          valCells.push({ text: hazard.esocialCode, w: hc[1]!, align: "center", size: 9.5 });
        }
        headCells.push({ text: "Perigo/Fator de Risco", w: hc[hc.length - 1]!, font: "Helvetica-Bold", fill: catColor, color: headColor, align: "center", size: 9.5 });
        valCells.push({ text: hazard.name, w: hc[hc.length - 1]!, align: "center", size: 9.5 });
        drawRow(headCells, { minH: 26, borderColor: catColor });
        drawRow(valCells, { minH: 28 });

        if (isAbsence) {
          gap(12);
          return;
        }

        const description = risk.description ?? hazard.description;
        if (description) labelRow("Descrição", description);
        if (risk.legalBasis) labelRow("Fundamentação legal", risk.legalBasis);
        const injuries = risk.typicalInjuries ?? hazard.damagePotential;
        if (injuries) labelRow("Possíveis lesões ou agravos à saúde", injuries);
        if (risk.sourceCircumstances) labelRow("Fontes ou circunstâncias", risk.sourceCircumstances);
        if (risk.propagationMeans) labelRow("Meio de propagação", risk.propagationMeans);

        const th = (t: string, w: number) => ({ text: t, w, font: "Helvetica-Bold", fill: C_GRAY_ROW, color: C_INK, align: "center" as const }) as Cell;
        bar("Avaliação");
        const t3 = [frac(0.32), frac(0.34), frac(0.34)];
        drawRow([th("Tempo de exposição", t3[0]!), th("Tipo de exposição", t3[1]!), th("Critério", t3[2]!)], { minH: 24 });
        drawRow(
          [
            { text: risk.exposureTime || "Não informado", w: t3[0]!, align: "center" },
            { text: risk.exposureType ? EXPOSURE_TYPE_LABEL[risk.exposureType]! : "Não informado", w: t3[1]!, align: "center" },
            { text: risk.evaluationCriteria ? EVALUATION_CRITERIA_LABEL[risk.evaluationCriteria]! : "Não informado", w: t3[2]!, align: "center" },
          ],
          { minH: 24 },
        );
        if (risk.exposureProfile) labelRow("Perfil de exposição", risk.exposureProfile);
        const q = [frac(0.25), frac(0.25), frac(0.25), frac(0.25)];
        drawRow([th("Classificação do Efeito", q[0]!), th("Frequência", q[1]!), th("Nível de Risco", q[2]!), th("Classificação", q[3]!)], { minH: 24 });
        drawRow(
          [
            { text: SEVERITY_LABEL[risk.severity] ?? String(risk.severity), w: q[0]!, align: "center" },
            { text: PROBABILITY_LABEL[risk.probability] ?? String(risk.probability), w: q[1]!, align: "center" },
            { text: RISK_LEVEL_LABEL[risk.riskLevel] ?? "", w: q[2]!, align: "center", font: "Helvetica-Bold", color: RISK_LEVEL_TEXT_COLOR[risk.riskLevel] ?? C_BODY },
            { text: RISK_CLASSIFICATION[risk.riskLevel] ?? risk.classification ?? "A definir", w: q[3]!, align: "center" },
          ],
          { minH: 24 },
        );

        bar("Prevenção e controle");
        const yn = (v: string | null | undefined) => YES_NO_LABEL[v ?? ""] ?? "Não se aplica";
        drawRow([th("Utiliza EPC", q[0]!), th("EPC eficaz", q[1]!), th("Utiliza EPI", q[2]!), th("EPI eficaz", q[3]!)], { minH: 24 });
        drawRow(
          [
            { text: yn(risk.usesEpc), w: q[0]!, align: "center" },
            { text: yn(risk.epcEffective), w: q[1]!, align: "center" },
            { text: yn(risk.usesEpi), w: q[2]!, align: "center" },
            { text: yn(risk.epiEffective), w: q[3]!, align: "center" },
          ],
          { minH: 24 },
        );
        const controls: [string, string | null][] = [
          ["Medidas administrativas", risk.adminControls],
          ["Medidas de engenharia", risk.engineeringControls],
          ["EPC", risk.epcMeasures],
          ["EPI", risk.epiMeasures],
          ["Ações necessárias", risk.requiredActions],
          ["Orientação", risk.guidance],
          ["Conclusão", risk.conclusion],
        ];
        for (const [label, value] of controls) if (value) labelRow(label, listText(value));
        gap(12);
      }

      function collectPendencias(): string[] {
        const out: string[] = [];
        for (const ghe of pgr.ghes) {
          const name = nfc(ghe.name).toUpperCase();
          if (ghe.risks.length === 0) out.push(`GHE ${name} — nenhum perigo/fator de risco avaliado no inventário.`);
          if (ghe.functions.length === 0) out.push(`GHE ${name} — nenhum setor/cargo vinculado ao grupo.`);
          if (ghe.functions.length > 0 && !ghe.activityDescription && ghe.functions.every((f: any) => !f.activityDescription && !f.position?.description)) {
            out.push(`GHE ${name} — descrição das atividades dos cargos não informada.`);
          }
          for (const r of ghe.risks) {
            // perigos "AUSENCIA DE AGENTES..." sao declaracoes de inexistencia - nao pedem medida de controle
            const isAbsence = /^aus.{1,2}ncia/i.test(nfc(r.hazard.name).trim());
            if (!isAbsence && !r.adminControls && !r.engineeringControls && !r.epcMeasures && !r.epiMeasures) {
              out.push(`GHE ${name} — definir as medidas de prevenção e controle para o perigo “${nfc(r.hazard.name)}”.`);
            }
          }
        }
        return out;
      }

      function drawFichaEpiBlank() {
        doc.addPage();
        const full = (text: string, extra: Partial<Cell> = {}): Cell => ({ text, w: CONTENT_WIDTH, ...extra });
        const thick = C_INK;
        drawRow([full("CONTROLE DE ENTREGA DE EPI - EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL", { align: "center", size: 9.5, color: C_INK })], { minH: 34, borderColor: thick, pad: 8 });
        drawRow(
          [
            { text: "CARGO / SETOR:", w: frac(0.28), size: 9.5 },
            { text: "DATA DA ADMISSÃO:", w: frac(0.36), size: 9.5 },
            { text: "DATA DA DEMISSÃO:", w: frac(0.36), size: 9.5 },
          ],
          { minH: 36, borderColor: thick, pad: 8 },
        );
        drawRow([full("NOME DA EMPRESA:", { size: 9.5 })], { minH: 36, borderColor: thick, pad: 8 });
        drawRow(
          [
            { text: "NOME DO FUNCIONÁRIO:", w: frac(0.74), size: 9.5 },
            { text: "MATRÍCULA:", w: frac(0.26), size: 9.5 },
          ],
          { minH: 36, borderColor: thick, pad: 8 },
        );
        drawRow([full("DECLARAÇÃO DE RECEBIMENTO", { align: "center", size: 9.5, color: C_INK })], { minH: 28, borderColor: thick, pad: 8 });

        // Corpo da declaração dentro de um quadro único
        const bodyTop = doc.y;
        const inner = CONTENT_WIDTH - 32;
        let y = bodyTop + 14;
        doc.font("Helvetica-Bold").fontSize(9).fillColor(C_BODY);
        const intro = nfc(T.FICHA_EPI_DECLARACAO_INTRO);
        doc.text(intro, MARGIN + 16, y, { width: inner, align: "justify", lineGap: 2.5 });
        y = doc.y + 8;
        T.FICHA_EPI_ITENS.forEach((item, i) => {
          doc.font("Helvetica-Bold").fontSize(9);
          doc.text(`${i + 1}.`, MARGIN + 22, y, { lineBreak: false });
          doc.text(nfc(item), MARGIN + 38, y, { width: inner - 22, align: "justify", lineGap: 2.5 });
          y = doc.y + 5;
        });
        y += 4;
        doc.font("Helvetica-Bold").fontSize(9).text(nfc(T.FICHA_EPI_TREINAMENTO), MARGIN + 16, y, { width: inner, align: "justify", lineGap: 2.5 });
        y = doc.y + 12;
        doc.text(T.FICHA_EPI_ACORDO, MARGIN + 16, y, { width: inner, align: "center" });
        y = doc.y + 18;
        const city = nfc(company?.cidade ?? branch?.city ?? "");
        doc.text(`${city ? `${city}, ` : ""}______ de ________________ ______.`, MARGIN + 16, y, { width: inner, align: "center" });
        y = doc.y + 42;
        doc.moveTo(MARGIN + 100, y).lineTo(PAGE_WIDTH - MARGIN - 100, y).lineWidth(0.9).strokeColor(C_INK).stroke();
        y += 6;
        doc.text("Assinatura do Funcionário", MARGIN + 16, y, { width: inner, align: "center" });
        y = doc.y + 14;
        doc.rect(MARGIN, bodyTop, CONTENT_WIDTH, y - bodyTop).lineWidth(0.8).strokeColor(thick).stroke();
        doc.y = y;

        // Segunda página: tabela de entregas
        doc.addPage();
        const tw = [frac(0.12), frac(0.16), frac(0.29), frac(0.15), frac(0.28)];
        const th = (t: string, i: number): Cell => ({ text: t, w: tw[i]!, size: 9.5, color: C_INK });
        drawRow([th("DATA", 0), th("QUANTIDADE", 1), th("EPI ENTREGUE", 2), th("Nº DO C.A.", 3), th("ASSINATURA DO FUNCIONÁRIO", 4)], { minH: 40, borderColor: thick, pad: 8 });
        for (let i = 0; i < 17; i++) {
          drawRow(tw.map((w) => ({ text: "", w }) as Cell), { minH: 30, borderColor: thick });
        }
      }

      function drawPlanoAcoes() {
        const fields: [string, string | null][] = [
          ["Procedimento de trabalho", pgr.procedimentoTrabalho],
          ["Treinamentos necessários", pgr.treinamentosNecessarios],
          ["EPIs recomendados", pgr.episRecomendados],
          ["Metas e prioridades", pgr.metasPrioridades],
        ];
        if (!fields.some(([, v]) => v && v.trim())) return;
        doc.addPage();
        heading2Green("Plano de ações e recomendações");
        for (const [label, value] of fields) {
          if (!value || !value.trim()) continue;
          heading2(label);
          paragraph(value);
          gap(4);
        }
      }

      function drawCronograma() {
        const months = cronogramaMonths(pgr.validFrom, pgr.validUntil);
        const items: any[] = pgr.cronograma;
        const firstW = frac(0.26);
        const monthW = (CONTENT_WIDTH - firstW) / 12;

        for (let start = 0; start < months.length; start += 12) {
          const chunk = months.slice(start, start + 12);
          const tableW = firstW + chunk.length * monthW;
          const drawHeader = () => {
            drawRow(
              [{ text: "PLANO DE AÇÃO - PGR", w: tableW, font: "Poppins-SemiBold", size: 9.5, color: "#ffffff", fill: C_INK }],
              { minH: 30, pad: 10, borderColor: C_INK },
            );
            drawRow(
              [
                { text: "", w: firstW, fill: C_GRAY_ROW },
                ...chunk.map((m) => ({ text: `${MONTH_ABBR[m.month - 1]}\n${m.year}`, w: monthW, font: "Helvetica-Bold", size: 8.5, fill: C_GRAY_ROW, color: C_INK, align: "center" as const }) as Cell),
              ],
              { minH: 34, pad: 4, borderColor: C_INK },
            );
          };
          doc.addPage();
          doc.y = 52;
          drawHeader();
          if (items.length === 0) {
            drawRow([{ text: "Nenhuma ação cadastrada no cronograma.", w: tableW, color: C_MUTED }], { minH: 30, pad: 8, borderColor: C_INK });
            continue;
          }
          for (const item of items) {
            const label = item.responsible ? `${item.description}\nResponsável: ${item.responsible}` : item.description;
            // quebra de página manual para repetir o cabeçalho
            doc.font("Helvetica").fontSize(8.5);
            const h = Math.max(doc.heightOfString(nfc(label), { width: firstW - 16, lineGap: 2 }) + 16, 40);
            if (doc.y + h > CONTENT_BOTTOM) {
              doc.addPage();
              doc.y = 52;
              drawHeader();
            }
            const rowTop = doc.y;
            drawRow(
              [
                {
                  text: item.description,
                  footer: item.responsible ? { label: "Responsável:", value: item.responsible } : undefined,
                  w: firstW,
                  size: 8.5,
                  valign: "top",
                },
                ...chunk.map((m) => ({ text: "", w: monthW }) as Cell),
              ],
              { minH: 40, pad: 8, borderColor: C_INK },
            );
            const rowH = doc.y - rowTop;
            chunk.forEach((m, ci) => {
              const marked = item.marks.some((mk: any) => mk.year === m.year && mk.month === m.month);
              if (!marked) return;
              const cx = MARGIN + firstW + ci * monthW + monthW / 2;
              doc.circle(cx, rowTop + rowH / 2, 2.6).lineWidth(0.9).strokeColor(C_GREEN).stroke();
            });
          }
        }
      }

      function drawAnexosEnviados() {
        for (const att of attachments) {
          doc.addPage();
          doc.font("Helvetica-Bold").fontSize(10).fillColor(C_INK).text(nfc(att.fileName), MARGIN, doc.y, { width: CONTENT_WIDTH });
          gap(10);
          if (att.buffer) {
            try {
              doc.image(att.buffer, MARGIN, doc.y, { fit: [CONTENT_WIDTH, CONTENT_BOTTOM - doc.y - 10], align: "center" });
              continue;
            } catch {
              // cai no aviso abaixo
            }
          }
          doc.font("Helvetica").fontSize(10).fillColor(C_MUTED).text("Arquivo não pôde ser incorporado ao PDF (formato de imagem não suportado).", MARGIN, doc.y, { width: CONTENT_WIDTH });
        }
      }

      function formatAddress(entity: any): string | null {
        if (!entity) return null;
        const street = [entity.address ?? entity.endereco, entity.numero].filter(Boolean).join(", ");
        const place = [entity.bairro, [entity.city ?? entity.cidade, entity.state ?? entity.estado].filter(Boolean).join("/")].filter(Boolean).join(" - ");
        const parts = [street, entity.complemento, place, entity.cep].filter(Boolean);
        return parts.length > 0 ? parts.join(" - ") : null;
      }
    });
  }
}
