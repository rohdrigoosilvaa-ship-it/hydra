import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { put } from "@vercel/blob";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { companyScopeWhere } from "../org/scope.util";
import { ContractsService } from "./contracts.service";
import { ContractsPdfService } from "./contracts-pdf.service";
import type { SignContractDto } from "./dto/contract-signature.dto";

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
export class ContractSignaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contracts: ContractsService,
    private readonly contractsPdf: ContractsPdfService,
  ) {}

  /** Gera (ou rotaciona) o link público de assinatura do CONTRATANTE — o admin copia e envia manualmente. */
  async requestContratanteLink(tenantId: string, contractId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.CONTRACT_WRITE, tenantId);
    const contract = await this.prisma.contract.findFirst({ where: { ...where, id: contractId } });
    if (!contract) throw new NotFoundException("Contrato não encontrado.");

    const existing = await this.prisma.contractSignature.findUnique({
      where: { contractId_role: { contractId, role: "CONTRATANTE" } },
    });
    if (existing?.signedAt) throw new ConflictException("O CONTRATANTE já assinou este contrato.");

    const rawToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + LINK_TTL_MS);
    await this.prisma.contractSignature.upsert({
      where: { contractId_role: { contractId, role: "CONTRATANTE" } },
      update: { signerName: contract.repNome, signerCpf: contract.repCpf, tokenHash: hashToken(rawToken), expiresAt, signedAt: null },
      create: {
        tenantId,
        contractId,
        role: "CONTRATANTE",
        signerName: contract.repNome,
        signerCpf: contract.repCpf,
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    });

    return { link: `${webOrigin()}/assinar/${rawToken}`, expiresAt };
  }

  /** CONTRATADA assina autenticada, dentro do app — sem link, vinculada ao usuário logado. */
  async signAsContratada(
    tenantId: string,
    contractId: string,
    dto: SignContractDto,
    assignments: RoleAssignmentClaim[],
    userId: string,
    ip: string | undefined,
    userAgent: string | undefined,
  ) {
    const where = companyScopeWhere(assignments, PERMISSIONS.CONTRACT_WRITE, tenantId);
    const contract = await this.prisma.contract.findFirst({ where: { ...where, id: contractId } });
    if (!contract) throw new NotFoundException("Contrato não encontrado.");

    const existing = await this.prisma.contractSignature.findUnique({
      where: { contractId_role: { contractId, role: "CONTRATADA" } },
    });
    if (existing?.signedAt) throw new ConflictException("Este contrato já foi assinado como CONTRATADA.");

    const issuer = await this.prisma.contractIssuer.findUnique({ where: { tenantId } });
    const signatureImage = parseDataUrlPng(dto.signatureImageBase64);
    const contentHash = await this.contractsPdf.computeContentHash(tenantId, contractId);

    const bothSigned = await this.prisma.$transaction(async (tx) => {
      await tx.contractSignature.upsert({
        where: { contractId_role: { contractId, role: "CONTRATADA" } },
        update: {
          signerName: issuer?.repNome ?? "",
          signerCpf: issuer?.repCpf,
          signedByUserId: userId,
          signedAt: new Date(),
          signatureImage,
          signatureMethod: dto.signatureMethod,
          contentHash,
          ip,
          userAgent,
        },
        create: {
          tenantId,
          contractId,
          role: "CONTRATADA",
          signerName: issuer?.repNome ?? "",
          signerCpf: issuer?.repCpf,
          signedByUserId: userId,
          signedAt: new Date(),
          signatureImage,
          signatureMethod: dto.signatureMethod,
          contentHash,
          ip,
          userAgent,
        },
      });
      const all = await tx.contractSignature.findMany({ where: { contractId } });
      return all.some((s) => s.role === "CONTRATANTE" && s.signedAt) && all.some((s) => s.role === "CONTRATADA" && s.signedAt);
    });

    if (bothSigned) await this.regenerateSignedPdf(tenantId, contractId);
    return this.getStatus(tenantId, contractId, assignments);
  }

  /** Assinatura pública do CONTRATANTE via token — autorização é o próprio token, sem sessão. */
  async signAsContratanteByToken(rawToken: string, dto: SignContractDto, ip: string | undefined, userAgent: string | undefined) {
    const tokenHash = hashToken(rawToken);
    const sig = await this.prisma.contractSignature.findUnique({ where: { tokenHash } });
    if (!sig) throw new NotFoundException("Link de assinatura não encontrado.");
    if (sig.signedAt) throw new ConflictException("Este contrato já foi assinado.");
    if (sig.expiresAt && sig.expiresAt < new Date()) throw new UnauthorizedException("Link de assinatura expirado.");

    const signatureImage = parseDataUrlPng(dto.signatureImageBase64);
    const contentHash = await this.contractsPdf.computeContentHash(sig.tenantId, sig.contractId);

    const bothSigned = await this.prisma.$transaction(async (tx) => {
      await tx.contractSignature.update({
        where: { id: sig.id },
        data: { signedAt: new Date(), signatureImage, signatureMethod: dto.signatureMethod, contentHash, ip, userAgent },
      });
      const all = await tx.contractSignature.findMany({ where: { contractId: sig.contractId } });
      return all.some((s) => s.role === "CONTRATANTE" && s.signedAt) && all.some((s) => s.role === "CONTRATADA" && s.signedAt);
    });

    if (bothSigned) await this.regenerateSignedPdf(sig.tenantId, sig.contractId);
    return { success: true };
  }

  /** Resumo restrito pra tela pública de assinatura ler e consentir — nunca vaza dados internos. */
  async getPublicSummary(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const sig = await this.prisma.contractSignature.findUnique({ where: { tokenHash } });
    if (!sig) return { status: "not_found" as const };
    if (sig.signedAt) return { status: "already_signed" as const };
    if (sig.expiresAt && sig.expiresAt < new Date()) return { status: "expired" as const };

    const contract = await this.contractsPdf.previewForSigning(sig.tenantId, sig.contractId);
    return { status: "pending" as const, contract };
  }

  async getStatus(tenantId: string, contractId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.CONTRACT_READ, tenantId);
    const contract = await this.prisma.contract.findFirst({ where: { ...where, id: contractId } });
    if (!contract) throw new NotFoundException("Contrato não encontrado.");

    const signatures = await this.prisma.contractSignature.findMany({ where: { contractId } });
    return signatures.map((s) => ({
      role: s.role,
      signerName: s.signerName,
      signedAt: s.signedAt,
      linkPending: !!s.tokenHash && !s.signedAt,
      linkExpiresAt: s.expiresAt,
    }));
  }

  private async regenerateSignedPdf(tenantId: string, contractId: string) {
    const { buffer, filename } = await this.contractsPdf.generate(tenantId, contractId, null);
    const blob = await put(`contracts/${tenantId}/${contractId}/${Date.now()}-${filename}`, buffer, {
      access: "public",
      contentType: "application/pdf",
    });
    const pdfSha256 = createHash("sha256").update(buffer).digest("hex");
    await this.contracts.savePdfUrl(tenantId, contractId, blob.url, pdfSha256);
  }
}
