import { Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "crypto";
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

const RISK_LEVEL_LABEL: Record<string, string> = {
  LOW: "Baixo",
  MEDIUM: "Médio",
  HIGH: "Alto",
  CRITICAL: "Crítico",
  IRRELEVANT: "Irrelevante",
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

function fmtDate(d: Date | null | undefined): string {
  return d ? dateFmt.format(d) : "";
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
export class WorkOrderPdfService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadContext(tenantId: string, id: string, assignments: RoleAssignmentClaim[] | null) {
    const where = assignments ? companyScopeWhere(assignments, PERMISSIONS.WORK_ORDER_READ, tenantId) : { tenantId };
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { ...where, id },
      include: {
        riskItems: { orderBy: { createdAt: "asc" } },
        epiItems: { orderBy: { createdAt: "asc" } },
        signature: true,
      },
    });
    if (!workOrder) throw new NotFoundException("Ordem de Serviço não encontrada.");

    const [company, employee, creator] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: workOrder.companyId } }),
      this.prisma.employee.findUnique({ where: { id: workOrder.employeeId }, include: { branch: true } }),
      workOrder.createdById ? this.prisma.user.findUnique({ where: { id: workOrder.createdById } }) : Promise.resolve(null),
    ]);

    return { workOrder, company, employee, creator };
  }

  /** Resumo restrito pra tela pública de assinatura — nome, empresa e itens, nada mais. */
  async previewForSigning(tenantId: string, id: string) {
    const { workOrder, company } = await this.loadContext(tenantId, id, null);
    return {
      employeeName: workOrder.employeeName,
      departmentName: workOrder.departmentName,
      positionName: workOrder.positionName,
      companyName: company?.name ?? "",
      issueDate: workOrder.issueDate,
      riskItems: workOrder.riskItems.map((r) => ({
        hazardName: r.hazardName,
        hazardCategory: r.hazardCategory,
        riskLevel: r.riskLevel,
      })),
      epiItems: workOrder.epiItems.map((i) => ({ epiName: i.epiName, ca: i.ca })),
    };
  }

  /** SHA-256 do conteúdo da OS (riscos + EPIs) — prova do que o colaborador assinou. */
  async computeContentHash(tenantId: string, id: string): Promise<string> {
    const { workOrder } = await this.loadContext(tenantId, id, null);
    const text = [
      ...workOrder.riskItems.map((r) => [r.hazardName, r.hazardCategory, r.riskLevel].join("|")),
      ...workOrder.epiItems.map((i) => [i.epiName, i.ca ?? ""].join("|")),
    ].join("\n");
    return createHash("sha256").update(text, "utf8").digest("hex");
  }

  async generate(tenantId: string, id: string, assignments: RoleAssignmentClaim[] | null) {
    const { workOrder, company, employee, creator } = await this.loadContext(tenantId, id, assignments);
    const buffer = await this.render(workOrder, company, employee, creator);
    const filename = `ORDEM_SERVICO_${sanitizeForFilename(workOrder.employeeName)}.pdf`;
    return { buffer, filename };
  }

  private render(
    workOrder: Awaited<ReturnType<typeof this.loadContext>>["workOrder"],
    company: Awaited<ReturnType<typeof this.loadContext>>["company"],
    employee: Awaited<ReturnType<typeof this.loadContext>>["employee"],
    creator: Awaited<ReturnType<typeof this.loadContext>>["creator"],
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
          doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLOR_INK).text((value || "—").normalize("NFC"), x, y + 12, { width: colWidth - 10 });
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

      function table(headers: { label: string; width: number }[], rows: string[][]) {
        ensureSpace(24);
        let x = MARGIN;
        const headerY = doc.y;
        doc.rect(MARGIN, headerY, CONTENT_WIDTH, 20).fill("#e8f0ec");
        doc.fillColor(COLOR_INK).font("Helvetica-Bold").fontSize(8);
        for (const col of headers) {
          doc.text(col.label, x + 3, headerY + 6, { width: col.width - 6 });
          x += col.width;
        }
        doc.y = headerY + 22;

        for (const values of rows) {
          const rowHeight = Math.max(18, ...values.map((v, i) => doc.heightOfString(v, { width: headers[i]!.width - 6 }) + 8));
          ensureSpace(rowHeight);
          const rowY = doc.y;
          doc.strokeColor("#dddddd").lineWidth(0.5).moveTo(MARGIN, rowY).lineTo(MARGIN + CONTENT_WIDTH, rowY).stroke();
          x = MARGIN;
          doc.font("Helvetica").fontSize(8).fillColor(COLOR_INK);
          values.forEach((v, i) => {
            doc.text(v, x + 3, rowY + 4, { width: headers[i]!.width - 6 });
            x += headers[i]!.width;
          });
          doc.y = rowY + rowHeight;
        }
        doc.moveDown(1);
      }

      // ---- Título ----
      doc.font("Helvetica-Bold").fontSize(13).fillColor(COLOR_INK).text(
        "ORDEM DE SERVIÇO — NR-01",
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
      fieldRow([
        ["UNIDADE", employee?.branch?.name ?? ""],
        ["SETOR", workOrder.departmentName ?? ""],
      ]);
      doc.moveDown(0.5);

      // ---- 2. Identificação do trabalhador ----
      sectionTitle("2. IDENTIFICAÇÃO DO TRABALHADOR");
      fieldRow([
        ["NOME COMPLETO", workOrder.employeeName],
        ["CPF", employee?.cpf ?? ""],
      ]);
      fieldRow([
        ["CARGO/FUNÇÃO", workOrder.positionName ?? ""],
        ["DATA DA ORDEM", fmtDate(workOrder.issueDate)],
      ]);
      doc.moveDown(0.5);

      // ---- 3. Riscos identificados na função ----
      sectionTitle("3. RISCOS IDENTIFICADOS NA FUNÇÃO");
      if (workOrder.riskItems.length === 0) {
        paragraph("Nenhum risco identificado no PGR de referência para esta função.");
      } else {
        table(
          [
            { label: "Perigo/Fator de risco", width: 170 },
            { label: "Categoria", width: 85 },
            { label: "Nível", width: 60 },
            { label: "Possíveis lesões/agravos", width: CONTENT_WIDTH - 170 - 85 - 60 },
          ],
          workOrder.riskItems.map((r) => [
            r.hazardName.normalize("NFC"),
            (RISK_CATEGORY_LABEL[r.hazardCategory] ?? r.hazardCategory).normalize("NFC"),
            (RISK_LEVEL_LABEL[r.riskLevel] ?? r.riskLevel).normalize("NFC"),
            (r.typicalInjuries ?? "—").normalize("NFC"),
          ]),
        );
      }

      // ---- 4. EPIs exigidos pela função ----
      sectionTitle("4. EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL EXIGIDOS");
      if (workOrder.epiItems.length === 0) {
        paragraph("Nenhum EPI cadastrado como exigido para este cargo.");
      } else {
        table(
          [
            { label: "EPI", width: 280 },
            { label: "CA", width: 100 },
            { label: "Periodicidade", width: CONTENT_WIDTH - 280 - 100 },
          ],
          workOrder.epiItems.map((i) => [
            i.epiName.normalize("NFC"),
            i.ca ?? "—",
            i.periodicityMonths ? `${i.periodicityMonths} ${i.periodicityMonths === 1 ? "mês" : "meses"}` : "—",
          ]),
        );
      }

      // ---- 5. Declaração ----
      sectionTitle("5. DECLARAÇÃO DE CIÊNCIA");
      paragraph(
        "Declaro que fui orientado(a) e tenho ciência dos riscos ocupacionais aos quais estou exposto(a) no " +
          "exercício da minha função, bem como dos Equipamentos de Proteção Individual (EPIs) exigidos e das " +
          "medidas de prevenção e controle adotadas pela organização, comprometendo-me a seguir as orientações " +
          "de segurança e a utilizar corretamente os equipamentos fornecidos, conforme a NR-01 e a NR-06.",
      );

      // ---- Assinaturas ----
      const colWidth = CONTENT_WIDTH / 2 - 15;
      const SIG_IMG_HEIGHT = 40;
      ensureSpace(70 + SIG_IMG_HEIGHT);
      const sigY = doc.y + SIG_IMG_HEIGHT;

      if (workOrder.signature?.signatureImage) {
        try {
          doc.image(Buffer.from(workOrder.signature.signatureImage), MARGIN, sigY - SIG_IMG_HEIGHT - 2, {
            fit: [colWidth, SIG_IMG_HEIGHT],
            align: "center",
            valign: "bottom",
          });
        } catch {
          // imagem inválida — segue com a linha em branco
        }
      }

      doc.moveTo(MARGIN, sigY).lineTo(MARGIN + colWidth, sigY).strokeColor(COLOR_INK).lineWidth(0.75).stroke();
      doc.moveTo(MARGIN + colWidth + 30, sigY).lineTo(MARGIN + colWidth + 30 + colWidth, sigY).strokeColor(COLOR_INK).lineWidth(0.75).stroke();
      doc.font("Helvetica").fontSize(9).fillColor(COLOR_INK);
      doc.text(workOrder.employeeName.normalize("NFC"), MARGIN, sigY + 6, { width: colWidth, align: "center" });
      doc.text((creator?.name ?? "").normalize("NFC"), MARGIN + colWidth + 30, sigY + 6, { width: colWidth, align: "center" });
      doc.fillColor(COLOR_MUTED).fontSize(8);
      doc.text("TRABALHADOR", MARGIN, sigY + 20, { width: colWidth, align: "center" });
      doc.text("RESPONSÁVEL PELA EMISSÃO", MARGIN + colWidth + 30, sigY + 20, { width: colWidth, align: "center" });
      doc.y = sigY + 45;

      // ---- Anexo de assinatura eletrônica (só se já assinada) ----
      if (workOrder.signature?.signedAt) {
        doc.addPage();
        doc.font("Helvetica-Bold").fontSize(12).fillColor(COLOR_INK).text("ANEXO — ASSINATURA ELETRÔNICA", MARGIN, doc.y, {
          width: CONTENT_WIDTH,
          align: "center",
        });
        doc.moveDown(1);
        paragraph(
          "Esta Ordem de Serviço foi assinada eletronicamente pelo trabalhador identificado abaixo, nos termos do " +
            "art. 10, § 2º, da Medida Provisória nº 2.200-2, de 24 de agosto de 2001, que confere validade jurídica " +
            "à assinatura eletrônica simples entre as partes que a ela anuírem.",
        );
        doc.moveDown(1);
        const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "medium",
          timeZone: "America/Sao_Paulo",
        });
        paragraph(`Nome: ${workOrder.signature.signerName}`);
        if (workOrder.signature.signerCpf) paragraph(`CPF: ${workOrder.signature.signerCpf}`);
        paragraph(`Assinado em: ${dateTimeFormatter.format(workOrder.signature.signedAt)}`);
        if (workOrder.signature.ip) paragraph(`Endereço IP: ${workOrder.signature.ip}`);
        if (workOrder.signature.contentHash) paragraph(`Hash do conteúdo assinado (SHA-256): ${workOrder.signature.contentHash}`);
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
