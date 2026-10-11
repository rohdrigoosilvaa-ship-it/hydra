import { Injectable, NotFoundException } from "@nestjs/common";
import PDFDocument from "pdfkit";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { companyScopeWhere } from "../org/scope.util";
import { buildContractContext, hashResolvedClauses, resolveClauses, resolveTemplate } from "./contract-tokens.util";
import { PROTECSEG_LETTERHEAD_JPEG_BASE64 } from "../../core/pdf/protecseg-letterhead";

const MARGIN = 50; // margem lateral (esquerda/direita) — o papel timbrado não tem elementos nas laterais
const PAGE_WIDTH = 595.28; // A4 pt
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Reserva de espaço pras faixas verdes onduladas do papel timbrado no topo/rodapé da página
// (medidas no arquivo original: ~76pt no topo, ~72pt no rodapé, no ponto mais fundo da onda/logo).
const MARGIN_TOP = 100;
const MARGIN_BOTTOM = 105;
const LETTERHEAD_BUFFER = Buffer.from(PROTECSEG_LETTERHEAD_JPEG_BASE64, "base64");

const COLOR_INK = "#2a2a2a";
const COLOR_MUTED = "#777777";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

function sanitizeForFilename(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

@Injectable()
export class ContractsPdfService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `assignments: null` pula a checagem de RBAC/escopo por empresa — usado só
   * pelo fluxo público de assinatura, onde a autorização já foi validada pelo
   * token em si (ver loadContextForSigning).
   */
  private async loadContext(tenantId: string, id: string, assignments: RoleAssignmentClaim[] | null) {
    const where = assignments ? companyScopeWhere(assignments, PERMISSIONS.CONTRACT_READ, tenantId) : { tenantId };
    const contract = await this.prisma.contract.findFirst({
      where: { ...where, id },
      include: {
        template: { include: { clauses: { orderBy: { order: "asc" } } } },
        services: { include: { serviceItem: true }, orderBy: { serviceItem: { order: "asc" } } },
      },
    });
    if (!contract) throw new NotFoundException("Contrato não encontrado.");

    const issuer = await this.prisma.contractIssuer.findUnique({ where: { tenantId } });

    const servicesLista = contract.services
      .map((s, i) => `${LETTERS[i] ?? i + 1}) ${resolveTemplate(s.serviceItem.text, buildContractContext(contract, issuer, ""))}`)
      .join("\n");

    const context = buildContractContext(contract, issuer, servicesLista);
    return { contract, context };
  }

  /** Prévia em texto puro (título + cláusulas já resolvidas), usada pela tela "Visualizar Contrato" antes de gerar o PDF. */
  async preview(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const { contract, context } = await this.loadContext(tenantId, id, assignments);
    const clauses = resolveClauses(contract.template.clauses, context);
    return { templateName: contract.template.name, clauses };
  }

  /** Igual a preview(), mas sem RBAC — usado pela página pública de assinatura (autorizada pelo token). */
  async previewForSigning(tenantId: string, id: string) {
    const { contract, context } = await this.loadContext(tenantId, id, null);
    const clauses = resolveClauses(contract.template.clauses, context);
    return {
      templateName: contract.template.name,
      razaoSocial: contract.razaoSocial,
      cnpj: contract.cnpj,
      contratadaNome: context.CONTRATADA_NOME,
      valorMensalidade: contract.valorMensalidade,
      dataInicio: contract.dataInicio,
      dataVencimento: contract.dataVencimento,
      clauses,
    };
  }

  /** SHA-256 do texto resolvido das cláusulas — prova do que o signatário leu e assinou. */
  async computeContentHash(tenantId: string, id: string): Promise<string> {
    const { contract, context } = await this.loadContext(tenantId, id, null);
    return hashResolvedClauses(resolveClauses(contract.template.clauses, context));
  }

  async generate(tenantId: string, id: string, assignments: RoleAssignmentClaim[] | null) {
    const { contract, context } = await this.loadContext(tenantId, id, assignments);
    const signatures = await this.prisma.contractSignature.findMany({
      where: { tenantId, contractId: id, signedAt: { not: null } },
    });
    const buffer = await this.render(contract.template.name, contract.template.clauses, context, signatures);
    const filename = `CONTRATO_${sanitizeForFilename(contract.razaoSocial)}.pdf`;
    return { buffer, filename };
  }

  private render(
    templateName: string,
    clauses: { order: number; title: string; body: string }[],
    context: Record<string, string>,
    signatures: {
      role: string;
      signerName: string;
      signerCpf: string | null;
      signatureImage: Buffer | Uint8Array | null;
      signedAt: Date | null;
      ip: string | null;
      contentHash: string | null;
    }[] = [],
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
      drawLetterhead(); // primeira página (o evento "pageAdded" já disparou dentro do construtor)
      doc.on("pageAdded", drawLetterhead); // páginas seguintes, criadas via ensureSpace()

      function ensureSpace(height: number) {
        const bottom = PAGE_HEIGHT - MARGIN_BOTTOM;
        if (doc.y + height > bottom) doc.addPage();
      }

      function paragraph(rawText: string, opts: { bold?: boolean; align?: "left" | "justify" | "center" } = {}) {
        if (!rawText.trim()) return;
        // Helvetica (fonte padrão do PDF) só reconhece acentos compostos (NFC) — texto decomposto
        // (NFD, comum em input de macOS/navegador) vira glifo quebrado sem essa normalização.
        const text = rawText.normalize("NFC");
        const font = opts.bold ? "Helvetica-Bold" : "Helvetica";
        const align = opts.align ?? "justify";
        const height = doc.heightOfString(text, { width: CONTENT_WIDTH, align });
        ensureSpace(height + 4);
        doc.x = MARGIN;
        doc.font(font).fontSize(9.5).fillColor(COLOR_INK).text(text, MARGIN, doc.y, { width: CONTENT_WIDTH, align });
        doc.moveDown(0.5);
      }

      function letteredList(rawItems: string[]) {
        for (const rawItem of rawItems) {
          const item = rawItem.normalize("NFC");
          const height = doc.heightOfString(item, { width: CONTENT_WIDTH - 16 });
          ensureSpace(height + 4);
          doc.x = MARGIN;
          doc.font("Helvetica").fontSize(9.5).fillColor(COLOR_INK).text(item, MARGIN, doc.y, { width: CONTENT_WIDTH });
        }
        doc.moveDown(0.4);
      }

      function clauseTitle(rawText: string) {
        const text = rawText.normalize("NFC");
        ensureSpace(24);
        doc.x = MARGIN;
        doc.font("Helvetica-Bold").fontSize(10.5).fillColor(COLOR_INK).text(text, MARGIN, doc.y, { width: CONTENT_WIDTH });
        doc.moveDown(0.4);
      }

      // ---- Título do documento ----
      doc.font("Helvetica-Bold").fontSize(13).fillColor(COLOR_INK).text(templateName.normalize("NFC").toUpperCase(), MARGIN, doc.y, {
        width: CONTENT_WIDTH,
        align: "center",
      });
      doc.moveDown(1.2);

      // ---- Cláusulas (a de order 0, sem título, é o preâmbulo/qualificação das partes) ----
      for (const clause of clauses) {
        if (clause.title) clauseTitle(resolveTemplate(clause.title, context));

        const [before, after] = clause.body.split("{{SERVICOS_LISTA}}");
        const beforeResolved = resolveTemplate(before ?? "", context);
        for (const p of beforeResolved.split("\n\n")) paragraph(p.trim());

        if (after !== undefined) {
          letteredList(context.SERVICOS_LISTA ? context.SERVICOS_LISTA.split("\n") : []);
          const afterResolved = resolveTemplate(after, context);
          for (const p of afterResolved.split("\n\n")) paragraph(p.trim());
        }
      }

      // ---- Local e data ----
      doc.moveDown(0.5);
      paragraph(`${context.CONTRATADA_CIDADE || context.CIDADE}, ${context.DATA_ASSINATURA_EXTENSO}.`, { align: "left" });
      doc.moveDown(2);

      // ---- Assinaturas lado a lado (CONTRATANTE | CONTRATADA) ----
      const contratanteSig = signatures.find((s) => s.role === "CONTRATANTE");
      const contratadaSig = signatures.find((s) => s.role === "CONTRATADA");
      const colWidth = CONTENT_WIDTH / 2 - 15;
      const SIG_IMG_HEIGHT = 40;
      ensureSpace(70 + SIG_IMG_HEIGHT);
      const sigY = doc.y + SIG_IMG_HEIGHT;

      function drawSignatureImage(sig: (typeof signatures)[number] | undefined, x: number) {
        if (!sig?.signatureImage) return;
        try {
          doc.image(Buffer.from(sig.signatureImage), x, sigY - SIG_IMG_HEIGHT - 2, {
            fit: [colWidth, SIG_IMG_HEIGHT],
            align: "center",
            valign: "bottom",
          });
        } catch {
          // imagem inválida/corrompida — segue sem desenhar, a linha em branco já serve de fallback
        }
      }
      drawSignatureImage(contratanteSig, MARGIN);
      drawSignatureImage(contratadaSig, MARGIN + colWidth + 30);

      doc.moveTo(MARGIN, sigY).lineTo(MARGIN + colWidth, sigY).strokeColor(COLOR_INK).lineWidth(0.75).stroke();
      doc.moveTo(MARGIN + colWidth + 30, sigY).lineTo(MARGIN + colWidth + 30 + colWidth, sigY).strokeColor(COLOR_INK).lineWidth(0.75).stroke();
      doc.font("Helvetica").fontSize(9).fillColor(COLOR_INK);
      doc.text((context.RAZAO_SOCIAL ?? "").normalize("NFC"), MARGIN, sigY + 6, { width: colWidth, align: "center" });
      doc.text((context.CONTRATADA_NOME ?? "").normalize("NFC"), MARGIN + colWidth + 30, sigY + 6, { width: colWidth, align: "center" });
      doc.fillColor(COLOR_MUTED).fontSize(8);
      doc.text("CONTRATANTE", MARGIN, sigY + 20, { width: colWidth, align: "center" });
      doc.text("CONTRATADA", MARGIN + colWidth + 30, sigY + 20, { width: colWidth, align: "center" });
      doc.y = sigY + 45;

      // ---- Testemunhas ----
      doc.moveDown(1);
      ensureSpace(20);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(COLOR_INK).text("Testemunhas:", MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.moveDown(1.5);
      for (let i = 0; i < 2; i++) {
        ensureSpace(45);
        const y = doc.y;
        doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_WIDTH, y).strokeColor(COLOR_INK).lineWidth(0.75).stroke();
        doc.font("Helvetica").fontSize(8.5).fillColor(COLOR_MUTED);
        doc.text("Nome completo", MARGIN, y + 6, { width: CONTENT_WIDTH / 2 });
        doc.text("RG", MARGIN, y + 20, { width: CONTENT_WIDTH / 2 });
        doc.y = y + 45;
      }

      // ---- Anexo — Assinatura Eletrônica (só quando há ao menos 1 assinatura registrada) ----
      if (signatures.length > 0) {
        doc.addPage();
        doc.font("Helvetica-Bold").fontSize(12).fillColor(COLOR_INK).text("ANEXO — ASSINATURA ELETRÔNICA", MARGIN, doc.y, {
          width: CONTENT_WIDTH,
          align: "center",
        });
        doc.moveDown(1);
        paragraph(
          "Este documento foi assinado eletronicamente pelas partes abaixo identificadas, nos termos do art. 10, " +
            "§ 2º, da Medida Provisória nº 2.200-2, de 24 de agosto de 2001, que confere validade jurídica à " +
            "assinatura eletrônica simples entre as partes que a ela anuírem.",
        );
        doc.moveDown(1);

        const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "medium",
          timeZone: "America/Sao_Paulo",
        });
        for (const role of ["CONTRATANTE", "CONTRATADA"] as const) {
          const sig = role === "CONTRATANTE" ? contratanteSig : contratadaSig;
          ensureSpace(30);
          clauseTitle(role);
          if (!sig?.signedAt) {
            paragraph("Aguardando assinatura.", { align: "left" });
            continue;
          }
          paragraph(`Nome: ${sig.signerName}`, { align: "left" });
          if (sig.signerCpf) paragraph(`CPF: ${sig.signerCpf}`, { align: "left" });
          paragraph(`Assinado em: ${dateTimeFormatter.format(sig.signedAt)}`, { align: "left" });
          if (sig.ip) paragraph(`Endereço IP: ${sig.ip}`, { align: "left" });
          if (sig.contentHash) paragraph(`Hash do conteúdo assinado (SHA-256): ${sig.contentHash}`, { align: "left" });
          doc.moveDown(0.5);
        }
      }

      // ---- Rodapé com numeração de página ----
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        const originalBottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        const footerY = PAGE_HEIGHT - MARGIN_BOTTOM + 15; // dentro da margem reservada, acima da faixa verde do timbrado
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
