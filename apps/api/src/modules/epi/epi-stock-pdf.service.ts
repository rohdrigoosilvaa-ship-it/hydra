import { Injectable, NotFoundException } from "@nestjs/common";
import PDFDocument from "pdfkit";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { assertCompanyInScope } from "../org/scope.util";
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
const COLOR_LINE = "#c9d6cf";
const COLOR_HEADER_BG = "#d5e6dc";
const COLOR_ROW_ALT = "#f4f8f6";
const COLOR_DANGER = "#c22b2b";
const COLOR_WARN = "#c8660a";

const COLUMNS = [
  { key: "name", label: "Item", width: 170, align: "left" },
  { key: "ca", label: "CA", width: 62, align: "left" },
  { key: "category", label: "Categoria", width: 98, align: "left" },
  { key: "quantity", label: "Qtd.", width: 38, align: "center" },
  { key: "expiresAt", label: "Vencimento", width: 62, align: "center" },
  { key: "situation", label: "Situação", width: 65, align: "center" },
] as const;

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const stampFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

type Situation = "Vencido" | "Vence em breve" | "Em dia" | "Sem validade";

function situationOf(expiresAt: Date | null, now: Date): Situation {
  if (!expiresAt) return "Sem validade";
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const expiry = Date.UTC(expiresAt.getUTCFullYear(), expiresAt.getUTCMonth(), expiresAt.getUTCDate());
  const days = Math.round((expiry - today) / 86_400_000);
  if (days < 0) return "Vencido";
  if (days <= 30) return "Vence em breve";
  return "Em dia";
}

/** Relação de EPIs em estoque (PDF), com o timbrado ProtecSeg. */
@Injectable()
export class EpiStockPdfService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Com `companyId`, o documento sai com a identidade da empresa cliente (logo e nome) no lugar do
   * timbrado ProtecSeg. Sem empresa, mantém o timbrado ProtecSeg.
   */
  async generate(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    let client: { name: string; logo: Buffer | null } | null = null;
    if (companyId) {
      assertCompanyInScope(assignments, PERMISSIONS.EPI_READ, companyId);
      const company = await this.prisma.company.findFirst({ where: { id: companyId, tenantId } });
      if (!company) throw new NotFoundException("Empresa não encontrada.");
      client = { name: company.name, logo: await this.fetchLogo(company.logoUrl) };
    }
    const items = await this.prisma.epiStockItem.findMany({ where: { tenantId }, orderBy: [{ name: "asc" }, { createdAt: "asc" }] });
    const now = new Date();
    const buffer = await this.render(items, now, client);
    const stamp = now.toISOString().slice(0, 10);
    return { buffer, filename: `RELACAO_ESTOQUE_EPI_${stamp}.pdf` };
  }

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
    items: Awaited<ReturnType<PrismaService["epiStockItem"]["findMany"]>>,
    now: Date,
    client: { name: string; logo: Buffer | null } | null,
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

      const drawLetterhead = () => {
        if (!client) {
          doc.image(LETTERHEAD_BUFFER, 0, 0, { width: PAGE_WIDTH, height: PAGE_HEIGHT });
          return;
        }
        // Identidade da empresa cliente: logo à esquerda, nome ao lado e uma linha verde sob o cabeçalho.
        let textX = MARGIN;
        if (client.logo) {
          try {
            doc.image(client.logo, MARGIN, 30, { fit: [110, 50], valign: "center" });
            textX = MARGIN + 124;
          } catch {
            // formato que o pdfkit não lê (ex.: webp/svg) — segue só com o nome
          }
        }
        doc
          .font("Helvetica-Bold")
          .fontSize(13)
          .fillColor(COLOR_INK)
          .text(client.name.normalize("NFC"), textX, 48, { width: PAGE_WIDTH - MARGIN - textX, lineBreak: false, ellipsis: true });
        doc.moveTo(MARGIN, 88).lineTo(PAGE_WIDTH - MARGIN, 88).strokeColor("#0e9f4a").lineWidth(1.5).stroke();
        doc.x = MARGIN;
        doc.y = MARGIN_TOP;
      };
      drawLetterhead();
      doc.on("pageAdded", drawLetterhead);

      const bottom = PAGE_HEIGHT - MARGIN_BOTTOM;
      const tableHeader = () => {
        const y = doc.y;
        doc.rect(MARGIN, y, CONTENT_WIDTH, 20).fill(COLOR_HEADER_BG);
        let x = MARGIN;
        for (const col of COLUMNS) {
          doc
            .font("Helvetica-Bold")
            .fontSize(8.5)
            .fillColor(COLOR_INK)
            .text(col.label, x + 4, y + 6, { width: col.width - 8, align: col.align, lineBreak: false });
          x += col.width;
        }
        doc.y = y + 20;
      };

      // título e resumo
      doc.font("Helvetica-Bold").fontSize(15).fillColor(COLOR_INK).text("Relação de EPIs em estoque", MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.moveDown(0.2);
      doc.font("Helvetica").fontSize(9).fillColor(COLOR_MUTED).text(`Emitido em ${stampFmt.format(now)}`, { width: CONTENT_WIDTH });
      doc.moveDown(0.6);

      const rows = items.map((i) => ({ item: i, situation: situationOf(i.expiresAt, now) }));
      const units = items.reduce((sum, i) => sum + i.quantity, 0);
      const expired = rows.filter((r) => r.situation === "Vencido").length;
      const soon = rows.filter((r) => r.situation === "Vence em breve").length;
      doc
        .font("Helvetica")
        .fontSize(9.5)
        .fillColor(COLOR_INK)
        .text(
          `${items.length} item(ns) cadastrado(s) · ${units} unidade(s) em estoque · ${expired} vencido(s) · ${soon} vencendo em até 30 dias`,
          { width: CONTENT_WIDTH },
        );
      doc.moveDown(0.8);

      if (items.length === 0) {
        doc.font("Helvetica").fontSize(10).fillColor(COLOR_MUTED).text("Nenhum EPI cadastrado no estoque.", { width: CONTENT_WIDTH });
      } else {
        tableHeader();
        rows.forEach(({ item, situation }, index) => {
          const cells = {
            name: item.name,
            ca: item.ca ?? "—",
            category: item.category ?? "—",
            quantity: String(item.quantity),
            expiresAt: item.expiresAt ? dateFmt.format(item.expiresAt) : "—",
            situation,
          } as const;
          doc.font("Helvetica").fontSize(9);
          const height = Math.max(
            20,
            ...COLUMNS.map((c) => doc.heightOfString(cells[c.key], { width: c.width - 8 }) + 10),
          );
          if (doc.y + height > bottom) {
            doc.addPage();
            tableHeader();
          }
          const y = doc.y;
          if (index % 2 === 1) doc.rect(MARGIN, y, CONTENT_WIDTH, height).fill(COLOR_ROW_ALT);
          let x = MARGIN;
          for (const col of COLUMNS) {
            const color = col.key === "situation" ? (situation === "Vencido" ? COLOR_DANGER : situation === "Vence em breve" ? COLOR_WARN : COLOR_INK) : COLOR_INK;
            doc
              .font(col.key === "situation" && situation !== "Em dia" && situation !== "Sem validade" ? "Helvetica-Bold" : "Helvetica")
              .fontSize(9)
              .fillColor(color)
              .text(cells[col.key], x + 4, y + 5, { width: col.width - 8, align: col.align });
            x += col.width;
          }
          doc.moveTo(MARGIN, y + height).lineTo(MARGIN + CONTENT_WIDTH, y + height).strokeColor(COLOR_LINE).lineWidth(0.5).stroke();
          doc.y = y + height;
        });
      }

      doc.end();
    });
  }
}
