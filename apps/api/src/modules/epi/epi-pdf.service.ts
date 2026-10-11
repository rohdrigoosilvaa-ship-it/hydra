import { Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "crypto";
import PDFDocument from "pdfkit";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { companyScopeWhere } from "../org/scope.util";
import { PROTECSEG_EPI_FOOTER_JPEG_BASE64, PROTECSEG_EPI_HEADER_PNG_BASE64 } from "../../core/pdf/protecseg-epi-letterhead";

const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4 pt
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const MARGIN_TOP = 108;
const MARGIN_BOTTOM = 100;
const HEADER_BUFFER = Buffer.from(PROTECSEG_EPI_HEADER_PNG_BASE64, "base64");
const FOOTER_BUFFER = Buffer.from(PROTECSEG_EPI_FOOTER_JPEG_BASE64, "base64");

// Área livre à direita do título "FICHA DE EPI" no cabeçalho do timbrado — logo da empresa atendida.
const LOGO_BOX = { x: 428, y: 16, width: 150, height: 74 };

const BOX_PAD = 8;
const INNER_X = MARGIN + BOX_PAD;
const INNER_WIDTH = CONTENT_WIDTH - BOX_PAD * 2;
const BOX_TITLE_HEIGHT = 22;

const COLOR_INK = "#2a2a2a";
const COLOR_MUTED = "#777777";
const COLOR_BOX_BORDER = "#8fa89b";
const COLOR_BOX_TITLE_BG = "#e8f0ec";
const COLOR_TABLE_HEADER_BG = "#d5e6dc";

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
export class EpiPdfService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadContext(tenantId: string, id: string, assignments: RoleAssignmentClaim[] | null) {
    const where = assignments ? companyScopeWhere(assignments, PERMISSIONS.EPI_READ, tenantId) : { tenantId };
    const delivery = await this.prisma.epiDelivery.findFirst({
      where: { ...where, id },
      include: {
        items: { include: { catalogItem: true }, orderBy: { createdAt: "asc" } },
        signature: true,
      },
    });
    if (!delivery) throw new NotFoundException("Ficha de EPI não encontrada.");

    const [company, employee, creator] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: delivery.companyId } }),
      this.prisma.employee.findUnique({ where: { id: delivery.employeeId }, include: { branch: true } }),
      delivery.createdById ? this.prisma.user.findUnique({ where: { id: delivery.createdById } }) : Promise.resolve(null),
    ]);

    return { delivery, company, employee, creator };
  }

  /** Resumo restrito pra tela pública de assinatura — nome, empresa e itens, nada mais. */
  async previewForSigning(tenantId: string, id: string) {
    const { delivery, company } = await this.loadContext(tenantId, id, null);
    return {
      employeeName: delivery.employeeName,
      departmentName: delivery.departmentName,
      positionName: delivery.positionName,
      companyName: company?.name ?? "",
      deliveryDate: delivery.deliveryDate,
      items: delivery.items.map((i) => ({
        epiName: i.epiName,
        ca: i.ca,
        quantity: i.quantity,
        expiresAt: i.expiresAt,
        observation: i.observation,
      })),
    };
  }

  /** SHA-256 do conteúdo da ficha (itens entregues) — prova do que o colaborador assinou. */
  async computeContentHash(tenantId: string, id: string): Promise<string> {
    const { delivery } = await this.loadContext(tenantId, id, null);
    const text = delivery.items
      .map((i) => [i.epiName, i.ca ?? "", i.quantity ?? "", i.expiresAt?.toISOString() ?? "", i.observation ?? ""].join("|"))
      .join("\n");
    return createHash("sha256").update(text, "utf8").digest("hex");
  }

  async generate(tenantId: string, id: string, assignments: RoleAssignmentClaim[] | null) {
    const { delivery, company, employee, creator } = await this.loadContext(tenantId, id, assignments);
    const logoBuffer = await this.fetchLogo(company?.logoUrl ?? null);
    const buffer = await this.render(delivery, company, employee, creator, logoBuffer);
    const filename = `FICHA_EPI_${sanitizeForFilename(delivery.employeeName)}.pdf`;
    return { buffer, filename };
  }

  /** Busca os bytes do logo da empresa — se o download falhar, o PDF sai sem logo em vez de quebrar. */
  private async fetchLogo(logoUrl: string | null): Promise<Buffer | null> {
    if (!logoUrl) return null;
    try {
      const res = await fetch(logoUrl);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  private render(
    delivery: Awaited<ReturnType<typeof this.loadContext>>["delivery"],
    company: Awaited<ReturnType<typeof this.loadContext>>["company"],
    employee: Awaited<ReturnType<typeof this.loadContext>>["employee"],
    creator: Awaited<ReturnType<typeof this.loadContext>>["creator"],
    logoBuffer: Buffer | null,
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
        doc.image(HEADER_BUFFER, 2.7, 9.05, { width: 589.05, height: 86.94 });
        doc.save();
        doc.rect(0, 770.25, PAGE_WIDTH, 71.2).clip();
        doc.image(FOOTER_BUFFER, -154.7, 770.25, { width: 749.91, height: 71.2 });
        doc.restore();
        if (logoBuffer) {
          try {
            doc.image(logoBuffer, LOGO_BOX.x, LOGO_BOX.y, {
              fit: [LOGO_BOX.width, LOGO_BOX.height],
              align: "center",
              valign: "center",
            });
          } catch {
            // formato de imagem que o pdfkit não lê (ex.: webp/svg) — segue sem logo
          }
        }
      }
      drawLetterhead();
      doc.on("pageAdded", drawLetterhead);

      // ---- Caixas por seção ----
      let boxTop: number | null = null;
      // Quando a caixa atravessa uma quebra de página (ex.: tabela longa), redesenha o que
      // precisa se repetir no topo da continuação (cabeçalho da tabela).
      let onBoxContinued: (() => void) | null = null;

      function drawBoxBorder(bottomY: number) {
        if (boxTop === null) return;
        doc.rect(MARGIN, boxTop, CONTENT_WIDTH, bottomY - boxTop).strokeColor(COLOR_BOX_BORDER).lineWidth(0.8).stroke();
      }

      function ensureSpace(height: number) {
        const bottom = PAGE_HEIGHT - MARGIN_BOTTOM;
        if (doc.y + height <= bottom) return;
        if (boxTop !== null) {
          drawBoxBorder(doc.y);
          doc.addPage();
          boxTop = doc.y;
          doc.y = boxTop + BOX_PAD;
          onBoxContinued?.();
        } else {
          doc.addPage();
        }
      }

      function beginBox(title: string, minHeight = 70) {
        ensureSpace(minHeight);
        boxTop = doc.y;
        doc.rect(MARGIN, boxTop, CONTENT_WIDTH, BOX_TITLE_HEIGHT).fill(COLOR_BOX_TITLE_BG);
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(COLOR_INK)
          .text(title.normalize("NFC"), INNER_X, boxTop + 6.5, { width: INNER_WIDTH, lineBreak: false });
        doc.y = boxTop + BOX_TITLE_HEIGHT + BOX_PAD;
      }

      function endBox() {
        drawBoxBorder(doc.y + BOX_PAD - 2);
        doc.y = doc.y + BOX_PAD + 10;
        boxTop = null;
        onBoxContinued = null;
      }

      function fieldRow(pairs: [string, string][]) {
        const colWidth = INNER_WIDTH / pairs.length;
        ensureSpace(30);
        const y = doc.y;
        pairs.forEach(([label, value], i) => {
          const x = INNER_X + i * colWidth;
          doc.font("Helvetica").fontSize(8).fillColor(COLOR_MUTED).text(label.normalize("NFC"), x, y, { width: colWidth - 10 });
          doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLOR_INK).text((value || "—").normalize("NFC"), x, y + 12, { width: colWidth - 10 });
        });
        doc.y = y + 30;
      }

      function paragraph(text: string) {
        const t = text.normalize("NFC");
        const height = doc.heightOfString(t, { width: INNER_WIDTH, align: "justify" });
        ensureSpace(height + 4);
        doc.font("Helvetica").fontSize(8.5).fillColor(COLOR_INK).text(t, INNER_X, doc.y, { width: INNER_WIDTH, align: "justify" });
        doc.moveDown(0.6);
      }

      // ---- 1. Identificação da organização ----
      beginBox("1. IDENTIFICAÇÃO DA ORGANIZAÇÃO", 110);
      fieldRow([
        ["EMPRESA", company?.name ?? ""],
        ["CNPJ", company?.cnpj ?? ""],
      ]);
      fieldRow([
        ["UNIDADE", employee?.branch?.name ?? ""],
        ["SETOR", delivery.departmentName ?? ""],
      ]);
      endBox();

      // ---- 2. Identificação do trabalhador ----
      beginBox("2. IDENTIFICAÇÃO DO TRABALHADOR", 110);
      fieldRow([
        ["NOME COMPLETO", delivery.employeeName],
        ["CPF", employee?.cpf ?? ""],
      ]);
      fieldRow([
        ["CARGO/FUNÇÃO", delivery.positionName ?? ""],
        ["ADMISSÃO", fmtDate(delivery.admittedAt)],
      ]);
      endBox();

      // ---- 3. Registro de fornecimento ----
      beginBox("3. REGISTRO DE FORNECIMENTO", 100);
      const cols = [
        { label: "Data", width: 55 },
        { label: "EPI", width: 140 },
        { label: "CA", width: 50 },
        { label: "Qtd.", width: 35 },
        { label: "Próx. troca", width: 65 },
        { label: "Observação", width: INNER_WIDTH - 55 - 140 - 50 - 35 - 65 },
      ];
      function drawTableHeader() {
        let hx = INNER_X;
        const headerY = doc.y;
        doc.rect(INNER_X, headerY, INNER_WIDTH, 20).fill(COLOR_TABLE_HEADER_BG);
        doc.fillColor(COLOR_INK).font("Helvetica-Bold").fontSize(8);
        for (const col of cols) {
          doc.text(col.label, hx + 3, headerY + 6, { width: col.width - 6 });
          hx += col.width;
        }
        doc.y = headerY + 22;
      }
      ensureSpace(24);
      drawTableHeader();
      onBoxContinued = drawTableHeader;
      let x = INNER_X;

      for (const item of delivery.items) {
        const values = [
          fmtDate(delivery.deliveryDate),
          (item.catalogItem?.name ?? item.epiName).normalize("NFC"),
          item.ca ?? "",
          item.quantity ?? "",
          fmtDate(item.expiresAt),
          (item.observation ?? "").normalize("NFC"),
        ];
        const rowHeight = Math.max(
          18,
          ...values.map((v, i) => doc.heightOfString(v, { width: cols[i]!.width - 6 }) + 8),
        );
        ensureSpace(rowHeight);
        const rowY = doc.y;
        doc.strokeColor("#dddddd").lineWidth(0.5).moveTo(INNER_X, rowY).lineTo(INNER_X + INNER_WIDTH, rowY).stroke();
        x = INNER_X;
        doc.font("Helvetica").fontSize(8).fillColor(COLOR_INK);
        values.forEach((v, i) => {
          doc.text(v, x + 3, rowY + 4, { width: cols[i]!.width - 6 });
          x += cols[i]!.width;
        });
        doc.y = rowY + rowHeight;
      }
      endBox();

      // ---- 4. Declaração ----
      beginBox("4. DECLARAÇÃO DE RECEBIMENTO, ORIENTAÇÃO E RESPONSABILIDADE", 130);
      paragraph(
        "Declaro que recebi gratuitamente da organização os Equipamentos de Proteção Individual (EPIs) registrados " +
          "nesta ficha, adequados aos riscos ocupacionais da atividade e em condições de uso. Declaro também que fui " +
          "orientado(a) quanto à finalidade e ao uso correto dos equipamentos, incluindo, quando aplicável, seus " +
          "componentes, os riscos contra os quais oferecem proteção, suas restrições e limitações, forma de uso e " +
          "ajuste, manutenção e substituição, limpeza, higienização, guarda e conservação, conforme as orientações " +
          "do fabricante/importador e as disposições aplicáveis da NR-06. Comprometo-me a utilizar os EPIs somente " +
          "para a finalidade a que se destinam, cumprir as determinações da organização quanto ao uso adequado e " +
          "comunicar imediatamente qualquer extravio, dano ou alteração que torne o equipamento impróprio para uso.",
      );
      endBox();

      // ---- 5. Ciência e aceite (com assinaturas) ----
      beginBox("5. CIÊNCIA E ACEITE DO TRABALHADOR", 190);
      paragraph(
        "O registro desta ficha poderá ser realizado em meio físico ou por sistema eletrônico. O aceite eletrônico " +
          "deverá permitir a identificação do trabalhador e sua vinculação inequívoca ao respectivo registro de " +
          "fornecimento.",
      );
      doc.moveDown(0.5);

      const colWidth = INNER_WIDTH / 2 - 15;
      const SIG_IMG_HEIGHT = 40;
      ensureSpace(70 + SIG_IMG_HEIGHT);
      const sigY = doc.y + SIG_IMG_HEIGHT;

      if (delivery.signature?.signatureImage) {
        try {
          doc.image(Buffer.from(delivery.signature.signatureImage), INNER_X, sigY - SIG_IMG_HEIGHT - 2, {
            fit: [colWidth, SIG_IMG_HEIGHT],
            align: "center",
            valign: "bottom",
          });
        } catch {
          // imagem inválida — segue com a linha em branco
        }
      }

      doc.moveTo(INNER_X, sigY).lineTo(INNER_X + colWidth, sigY).strokeColor(COLOR_INK).lineWidth(0.75).stroke();
      doc.moveTo(INNER_X + colWidth + 30, sigY).lineTo(INNER_X + colWidth + 30 + colWidth, sigY).strokeColor(COLOR_INK).lineWidth(0.75).stroke();
      doc.font("Helvetica").fontSize(9).fillColor(COLOR_INK);
      doc.text(delivery.employeeName.normalize("NFC"), INNER_X, sigY + 6, { width: colWidth, align: "center" });
      doc.text((creator?.name ?? "").normalize("NFC"), INNER_X + colWidth + 30, sigY + 6, { width: colWidth, align: "center" });
      doc.fillColor(COLOR_MUTED).fontSize(8);
      doc.text("TRABALHADOR", INNER_X, sigY + 20, { width: colWidth, align: "center" });
      doc.text("RESPONSÁVEL PELO FORNECIMENTO", INNER_X + colWidth + 30, sigY + 20, { width: colWidth, align: "center" });
      doc.y = sigY + 34;
      endBox();

      // ---- 6. Observações ----
      beginBox("6. OBSERVAÇÕES", 90);
      paragraph(
        "CA aplicável ao EPI fornecido: o equipamento deve corresponder ao produto efetivamente entregue. A " +
          "seleção e o fornecimento devem considerar a avaliação dos riscos ocupacionais e os critérios de seleção " +
          "aplicáveis à organização.",
      );
      endBox();

      // ---- Anexo de assinatura eletrônica (só se já assinada) ----
      if (delivery.signature?.signedAt) {
        doc.addPage();
        beginBox("ANEXO — ASSINATURA ELETRÔNICA", 200);
        paragraph(
          "Esta ficha foi assinada eletronicamente pelo trabalhador identificado abaixo, nos termos do art. 10, " +
            "§ 2º, da Medida Provisória nº 2.200-2, de 24 de agosto de 2001, que confere validade jurídica à " +
            "assinatura eletrônica simples entre as partes que a ela anuírem.",
        );
        doc.moveDown(0.5);
        const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "medium",
          timeZone: "America/Sao_Paulo",
        });
        paragraph(`Nome: ${delivery.signature.signerName}`);
        if (delivery.signature.signerCpf) paragraph(`CPF: ${delivery.signature.signerCpf}`);
        paragraph(`Assinado em: ${dateTimeFormatter.format(delivery.signature.signedAt)}`);
        if (delivery.signature.ip) paragraph(`Endereço IP: ${delivery.signature.ip}`);
        if (delivery.signature.contentHash) paragraph(`Hash do conteúdo assinado (SHA-256): ${delivery.signature.contentHash}`);
        endBox();
      }

      // ---- Rodapé com numeração de página (acima da faixa verde do timbrado) ----
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        const originalBottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        const footerY = PAGE_HEIGHT - MARGIN_BOTTOM + 14;
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
