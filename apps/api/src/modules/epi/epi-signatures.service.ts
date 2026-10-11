import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { put } from "@vercel/blob";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { companyScopeWhere } from "../org/scope.util";
import { EpiDeliveriesService } from "./epi-deliveries.service";
import { EpiPdfService } from "./epi-pdf.service";
import type { SignEpiDeliveryDto } from "./dto/epi.dto";

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
export class EpiSignaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveries: EpiDeliveriesService,
    private readonly epiPdf: EpiPdfService,
  ) {}

  /** Gera (ou rotaciona) o link/QR de assinatura do colaborador — sem login, escaneado no celular dele. */
  async requestSigningLink(tenantId: string, deliveryId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.EPI_WRITE, tenantId);
    const delivery = await this.prisma.epiDelivery.findFirst({ where: { ...where, id: deliveryId } });
    if (!delivery) throw new NotFoundException("Ficha de EPI não encontrada.");

    const existing = await this.prisma.epiDeliverySignature.findUnique({ where: { deliveryId } });
    if (existing?.signedAt) throw new ConflictException("Esta ficha já foi assinada.");

    const employee = await this.prisma.employee.findUnique({ where: { id: delivery.employeeId } });
    const rawToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + LINK_TTL_MS);
    await this.prisma.epiDeliverySignature.upsert({
      where: { deliveryId },
      update: { signerName: delivery.employeeName, signerCpf: employee?.cpf, tokenHash: hashToken(rawToken), expiresAt, signedAt: null },
      create: {
        tenantId,
        deliveryId,
        signerName: delivery.employeeName,
        signerCpf: employee?.cpf,
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    });

    return { link: `${webOrigin()}/epi/assinar/${rawToken}`, expiresAt };
  }

  /** Assinatura pública via token — autorização é o próprio token, sem sessão. */
  async signByToken(rawToken: string, dto: SignEpiDeliveryDto, ip: string | undefined, userAgent: string | undefined) {
    const tokenHash = hashToken(rawToken);
    const sig = await this.prisma.epiDeliverySignature.findUnique({ where: { tokenHash } });
    if (!sig) throw new NotFoundException("Link de assinatura não encontrado.");
    if (sig.signedAt) throw new ConflictException("Esta ficha já foi assinada.");
    if (sig.expiresAt && sig.expiresAt < new Date()) throw new UnauthorizedException("Link de assinatura expirado.");

    const signatureImage = parseDataUrlPng(dto.signatureImageBase64);
    const contentHash = await this.epiPdf.computeContentHash(sig.tenantId, sig.deliveryId);

    await this.prisma.epiDeliverySignature.update({
      where: { id: sig.id },
      data: { signedAt: new Date(), signatureImage, signatureMethod: dto.signatureMethod, contentHash, ip, userAgent },
    });

    await this.regenerateSignedPdf(sig.tenantId, sig.deliveryId);
    return { success: true };
  }

  /** Resumo restrito pra tela pública de assinatura ler e consentir — nunca vaza dados internos. */
  async getPublicSummary(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const sig = await this.prisma.epiDeliverySignature.findUnique({ where: { tokenHash } });
    if (!sig) return { status: "not_found" as const };
    if (sig.signedAt) return { status: "already_signed" as const };
    if (sig.expiresAt && sig.expiresAt < new Date()) return { status: "expired" as const };

    const delivery = await this.epiPdf.previewForSigning(sig.tenantId, sig.deliveryId);
    return { status: "pending" as const, delivery };
  }

  private async regenerateSignedPdf(tenantId: string, deliveryId: string) {
    const { buffer, filename } = await this.epiPdf.generate(tenantId, deliveryId, null);
    const blob = await put(`epi/${tenantId}/${deliveryId}/${Date.now()}-${filename}`, buffer, {
      access: "public",
      contentType: "application/pdf",
    });
    const pdfSha256 = createHash("sha256").update(buffer).digest("hex");
    await this.deliveries.savePdfUrl(tenantId, deliveryId, blob.url, pdfSha256);
  }
}
