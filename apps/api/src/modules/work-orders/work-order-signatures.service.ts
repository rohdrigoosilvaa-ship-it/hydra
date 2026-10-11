import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { put } from "@vercel/blob";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { companyScopeWhere } from "../org/scope.util";
import { WorkOrdersService } from "./work-orders.service";
import { WorkOrderPdfService } from "./work-order-pdf.service";
import type { SignWorkOrderDto } from "./dto/work-order.dto";

const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function webOrigin(): string {
  return process.env.WEB_ORIGIN ?? "http://localhost:5174";
}

function parseDataUrlPng(dataUrl: string): Buffer {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match?.[1]) throw new BadRequestException("Imagem de assinatura inválida.");
  return Buffer.from(match[1], "base64");
}

@Injectable()
export class WorkOrderSignaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workOrders: WorkOrdersService,
    private readonly workOrderPdf: WorkOrderPdfService,
  ) {}

  /** Gera (ou rotaciona) o link/QR de assinatura do colaborador — sem login, escaneado no celular dele. */
  async requestSigningLink(tenantId: string, workOrderId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.WORK_ORDER_WRITE, tenantId);
    const workOrder = await this.prisma.workOrder.findFirst({ where: { ...where, id: workOrderId } });
    if (!workOrder) throw new NotFoundException("Ordem de Serviço não encontrada.");

    const existing = await this.prisma.workOrderSignature.findUnique({ where: { workOrderId } });
    if (existing?.signedAt) throw new ConflictException("Esta Ordem de Serviço já foi assinada.");

    const employee = await this.prisma.employee.findUnique({ where: { id: workOrder.employeeId } });
    const rawToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + LINK_TTL_MS);
    await this.prisma.workOrderSignature.upsert({
      where: { workOrderId },
      update: { signerName: workOrder.employeeName, signerCpf: employee?.cpf, tokenHash: hashToken(rawToken), expiresAt, signedAt: null },
      create: {
        tenantId,
        workOrderId,
        signerName: workOrder.employeeName,
        signerCpf: employee?.cpf,
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    });

    return { link: `${webOrigin()}/ordens-servico/assinar/${rawToken}`, expiresAt };
  }

  /** Assinatura pública via token — autorização é o próprio token, sem sessão. */
  async signByToken(rawToken: string, dto: SignWorkOrderDto, ip: string | undefined, userAgent: string | undefined) {
    const tokenHash = hashToken(rawToken);
    const sig = await this.prisma.workOrderSignature.findUnique({ where: { tokenHash } });
    if (!sig) throw new NotFoundException("Link de assinatura não encontrado.");
    if (sig.signedAt) throw new ConflictException("Esta Ordem de Serviço já foi assinada.");
    if (sig.expiresAt && sig.expiresAt < new Date()) throw new UnauthorizedException("Link de assinatura expirado.");

    const signatureImage = parseDataUrlPng(dto.signatureImageBase64);
    const contentHash = await this.workOrderPdf.computeContentHash(sig.tenantId, sig.workOrderId);

    await this.prisma.workOrderSignature.update({
      where: { id: sig.id },
      data: { signedAt: new Date(), signatureImage, signatureMethod: dto.signatureMethod, contentHash, ip, userAgent },
    });

    await this.regenerateSignedPdf(sig.tenantId, sig.workOrderId);
    return { success: true };
  }

  /** Resumo restrito pra tela pública de assinatura ler e consentir — nunca vaza dados internos. */
  async getPublicSummary(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const sig = await this.prisma.workOrderSignature.findUnique({ where: { tokenHash } });
    if (!sig) return { status: "not_found" as const };
    if (sig.signedAt) return { status: "already_signed" as const };
    if (sig.expiresAt && sig.expiresAt < new Date()) return { status: "expired" as const };

    const workOrder = await this.workOrderPdf.previewForSigning(sig.tenantId, sig.workOrderId);
    return { status: "pending" as const, workOrder };
  }

  private async regenerateSignedPdf(tenantId: string, workOrderId: string) {
    const { buffer, filename } = await this.workOrderPdf.generate(tenantId, workOrderId, null);
    const blob = await put(`work-orders/${tenantId}/${workOrderId}/${Date.now()}-${filename}`, buffer, {
      access: "public",
      contentType: "application/pdf",
    });
    const pdfSha256 = createHash("sha256").update(buffer).digest("hex");
    await this.workOrders.savePdfUrl(tenantId, workOrderId, blob.url, pdfSha256);
  }
}
