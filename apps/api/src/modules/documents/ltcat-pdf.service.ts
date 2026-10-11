import { Injectable, NotFoundException } from "@nestjs/common";
import PDFDocument from "pdfkit";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { companyScopeWhere } from "../org/scope.util";
import { PROTECSEG_LETTERHEAD_JPEG_BASE64 } from "../../core/pdf/protecseg-letterhead";

const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4 pt
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const MARGIN_TOP = 100;
const MARGIN_BOTTOM = 105;
const LETTERHEAD_BUFFER = Buffer.from(PROTECSEG_LETTERHEAD_JPEG_BASE64, "base64");

const COLOR_INK = "#2a2a2a";
const COLOR_MUTED = "#777777";

const RISK_CATEGORY_LABEL: Record<string, string> = {
  FISICO: "Físico",
  QUIMICO: "Químico",
  BIOLOGICO: "Biológico",
  ERGONOMICO: "Ergonômico",
  ACIDENTE: "Acidente",
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

function fmtDate(d: Date | null | undefined): string {
  return d ? dateFmt.format(d) : "Não informado";
}

function naOrValue(v: string | null | undefined): string {
  return v && v.trim() ? v : "Não informado";
}

function sanitizeForFilename(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

@Injectable()
export class LtcatPdfService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadContext(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.LTCAT_READ, tenantId);
    const ltcat = await this.prisma.ltcat.findFirst({
      where: { ...where, id, deletedAt: null },
      include: {
        ghes: true,
        agents: { include: { ghe: true }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!ltcat) throw new NotFoundException("LTCAT não encontrado.");

    const company = await this.prisma.company.findUnique({ where: { id: ltcat.companyId } });
    return { ltcat, company };
  }

  async generate(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const { ltcat, company } = await this.loadContext(tenantId, id, assignments);
    const buffer = await this.render(ltcat, company);
    const filename = `LTCAT_${sanitizeForFilename(ltcat.title)}.pdf`;
    return { buffer, filename };
  }

  private render(
    ltcat: Awaited<ReturnType<typeof this.loadContext>>["ltcat"],
    company: Awaited<ReturnType<typeof this.loadContext>>["company"],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN, right: MARGIN },
        bufferPages: true,
      });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      function drawLetterhead() {
        doc.image(LETTERHEAD_BUFFER, 0, 0, { width: PAGE_WIDTH, height: PAGE_HEIGHT });
      }
      drawLetterhead();
      doc.on("pageAdded", drawLetterhead);

      function ensureSpace(height: number) {
        const bottom = PAGE_HEIGHT - MARGIN_BOTTOM;
        if (doc.y + height > bottom) doc.addPage();
      }

      function sectionTitle(text: string) {
        ensureSpace(24);
        doc.font("Helvetica-Bold").fontSize(10.5).fillColor(COLOR_INK).text(text.normalize("NFC"), MARGIN, doc.y, { width: CONTENT_WIDTH });
        doc.moveDown(0.5);
      }

      function fieldRow(pairs: [string, string][]) {
        const colWidth = CONTENT_WIDTH / pairs.length;
        ensureSpace(30);
        const y = doc.y;
        pairs.forEach(([label, value], i) => {
          const x = MARGIN + i * colWidth;
          doc.font("Helvetica").fontSize(8).fillColor(COLOR_MUTED).text(label.normalize("NFC"), x, y, { width: colWidth - 10 });
          doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLOR_INK).text(naOrValue(value).normalize("NFC"), x, y + 12, { width: colWidth - 10 });
        });
        doc.y = y + 32;
      }

      function paragraph(text: string) {
        const t = text.normalize("NFC");
        const height = doc.heightOfString(t, { width: CONTENT_WIDTH, align: "justify" });
        ensureSpace(height + 4);
        doc.font("Helvetica").fontSize(8.5).fillColor(COLOR_INK).text(t, MARGIN, doc.y, { width: CONTENT_WIDTH, align: "justify" });
        doc.moveDown(0.6);
      }

      // ---- Título ----
      doc.font("Helvetica-Bold").fontSize(13).fillColor(COLOR_INK).text(
        "LAUDO TÉCNICO DAS CONDIÇÕES AMBIENTAIS DE TRABALHO — LTCAT",
        MARGIN,
        doc.y,
        { width: CONTENT_WIDTH, align: "center" },
      );
      doc.moveDown(1.2);

      // ---- 1. Identificação da organização ----
      sectionTitle("1. IDENTIFICAÇÃO DA ORGANIZAÇÃO");
      fieldRow([
        ["EMPRESA", company?.name ?? ""],
        ["CNPJ", company?.cnpj ?? ""],
      ]);
      doc.moveDown(0.5);

      // ---- 2. Identificação do documento ----
      sectionTitle("2. IDENTIFICAÇÃO DO DOCUMENTO");
      fieldRow([
        ["TÍTULO", ltcat.title],
        ["CÓDIGO", ltcat.code ?? ""],
      ]);
      fieldRow([
        ["EMITIDO EM", ltcat.issuedAt ? fmtDate(ltcat.issuedAt) : ""],
        ["ART", ltcat.artNumber ?? ""],
      ]);
      fieldRow([
        ["ELABORADO POR", ltcat.preparedBy ?? ""],
        ["APROVADO POR", ltcat.approvedBy ?? ""],
      ]);
      fieldRow([
        ["RESPONSÁVEL TÉCNICO", ltcat.technicalResponsibleName ?? ""],
        ["REGISTRO PROFISSIONAL", ltcat.technicalResponsibleRegistry ?? ""],
      ]);
      doc.moveDown(0.5);

      // ---- 3. Agentes ambientais por GHE ----
      sectionTitle("3. AGENTES AMBIENTAIS IDENTIFICADOS (NR-09)");
      if (ltcat.agents.length === 0) {
        paragraph("Nenhum agente ambiental cadastrado ainda.");
      } else {
        const cols = [
          { label: "GHE", width: 75 },
          { label: "Agente", width: 90 },
          { label: "Categoria", width: 60 },
          { label: "Intensidade/Conc.", width: 75 },
          { label: "Limite de Tolerância", width: 80 },
          { label: "EPI eficaz", width: CONTENT_WIDTH - 75 - 90 - 60 - 75 - 80 },
        ];
        ensureSpace(24);
        let x = MARGIN;
        const headerY = doc.y;
        doc.rect(MARGIN, headerY, CONTENT_WIDTH, 20).fill("#e8f0ec");
        doc.fillColor(COLOR_INK).font("Helvetica-Bold").fontSize(7.5);
        for (const col of cols) {
          doc.text(col.label, x + 3, headerY + 6, { width: col.width - 6 });
          x += col.width;
        }
        doc.y = headerY + 22;

        for (const agent of ltcat.agents) {
          const values = [
            (agent.ghe?.name ?? "—").normalize("NFC"),
            agent.agentName.normalize("NFC"),
            (RISK_CATEGORY_LABEL[agent.agentCategory] ?? agent.agentCategory).normalize("NFC"),
            (agent.intensityConcentration ?? "—").normalize("NFC"),
            (agent.toleranceLimit ?? "—").normalize("NFC"),
            (agent.effectiveEpi ?? "—").normalize("NFC"),
          ];
          const rowHeight = Math.max(18, ...values.map((v, i) => doc.heightOfString(v, { width: cols[i]!.width - 6 }) + 8));
          ensureSpace(rowHeight);
          const rowY = doc.y;
          doc.strokeColor("#dddddd").lineWidth(0.5).moveTo(MARGIN, rowY).lineTo(MARGIN + CONTENT_WIDTH, rowY).stroke();
          x = MARGIN;
          doc.font("Helvetica").fontSize(7.5).fillColor(COLOR_INK);
          values.forEach((v, i) => {
            doc.text(v, x + 3, rowY + 4, { width: cols[i]!.width - 6 });
            x += cols[i]!.width;
          });
          doc.y = rowY + rowHeight;
        }
        doc.moveDown(1);

        for (const agent of ltcat.agents) {
          if (!agent.measurementMethod && !agent.exposureTechnique && !agent.conclusion) continue;
          ensureSpace(40);
          doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLOR_INK).text(
            `${agent.ghe?.name ?? "—"} — ${agent.agentName}`.normalize("NFC"),
            MARGIN,
            doc.y,
            { width: CONTENT_WIDTH },
          );
          doc.moveDown(0.2);
          if (agent.measurementMethod) paragraph(`Método de medição: ${agent.measurementMethod}`);
          if (agent.exposureTechnique) paragraph(`Técnica de avaliação: ${agent.exposureTechnique}`);
          if (agent.conclusion) paragraph(`Conclusão: ${agent.conclusion}`);
          doc.moveDown(0.3);
        }
      }

      // ---- Rodapé com numeração de página ----
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        const originalBottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        const footerY = PAGE_HEIGHT - MARGIN_BOTTOM + 15;
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(COLOR_MUTED)
          .text(`Página ${i + 1} de ${totalPages}`, MARGIN, footerY, { width: CONTENT_WIDTH, align: "right", lineBreak: false });
        doc.page.margins.bottom = originalBottomMargin;
      }

      doc.end();
    });
  }
}
