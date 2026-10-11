import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { del } from "@vercel/blob";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";
import type { CreateContractDto, UpdateContractDto } from "./dto/contract.dto";
import type { Contract } from "@hydra/db";

const MS_PER_DAY = 86_400_000;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/** "01/10/2026 + 12 meses" vence em 30/09/2027 — um dia antes do aniversário. */
function computeDataVencimento(dataInicio: Date, prazoMeses: number): Date {
  return new Date(addMonths(dataInicio, prazoMeses).getTime() - MS_PER_DAY);
}

export type ContractComputedStatus = "ATIVO" | "PROXIMO_VENCIMENTO" | "VENCIDO" | "CANCELADO";

function computeStatus(contract: Contract): ContractComputedStatus {
  if (contract.status === "CANCELADO") return "CANCELADO";
  const diasParaVencer = Math.ceil((contract.dataVencimento.getTime() - Date.now()) / MS_PER_DAY);
  if (diasParaVencer < 0) return "VENCIDO";
  if (diasParaVencer <= 30) return "PROXIMO_VENCIMENTO";
  return "ATIVO";
}

export type ContractSigningStatus = "NAO_ENVIADO" | "AGUARDANDO_ASSINATURAS" | "ASSINADO";

function computeSigningStatus(signatures: { role: string; signedAt: Date | null }[]): ContractSigningStatus {
  if (signatures.length === 0) return "NAO_ENVIADO";
  const contratanteAssinado = signatures.some((s) => s.role === "CONTRATANTE" && s.signedAt);
  const contratadaAssinada = signatures.some((s) => s.role === "CONTRATADA" && s.signedAt);
  if (contratanteAssinado && contratadaAssinada) return "ASSINADO";
  return "AGUARDANDO_ASSINATURAS";
}

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    const where = companyScopeWhere(assignments, PERMISSIONS.CONTRACT_READ, tenantId);
    const contracts = await this.prisma.contract.findMany({
      where: { ...where, ...(companyId ? { companyId } : {}) },
      orderBy: { dataVencimento: "asc" },
      include: { signatures: { select: { role: true, signedAt: true } } },
    });
    // signatures nunca vai pro front (tokenHash/imagem em bytes não têm nada a fazer numa listagem) —
    // só o signingStatus computado a partir delas.
    return contracts.map(({ signatures, ...c }) => ({
      ...c,
      computedStatus: computeStatus(c),
      signingStatus: computeSigningStatus(signatures),
    }));
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.CONTRACT_READ, tenantId);
    const contract = await this.prisma.contract.findFirst({
      where: { ...where, id },
      include: {
        template: { include: { clauses: { orderBy: { order: "asc" } }, serviceItems: { orderBy: { order: "asc" } } } },
        services: { include: { serviceItem: true } },
        signatures: { select: { role: true, signedAt: true } },
      },
    });
    if (!contract) throw new NotFoundException("Contrato não encontrado.");
    const { signatures, ...rest } = contract;
    return { ...rest, computedStatus: computeStatus(contract), signingStatus: computeSigningStatus(signatures) };
  }

  async create(tenantId: string, dto: CreateContractDto, userId: string, assignments: RoleAssignmentClaim[]) {
    if (dto.companyId) assertCompanyInScope(assignments, PERMISSIONS.CONTRACT_WRITE, dto.companyId);
    const { serviceItemIds, ...rest } = dto;
    const dataInicio = new Date(dto.dataInicio);
    const prazoMeses = dto.prazoMeses ?? 12;

    return this.prisma.contract.create({
      data: {
        ...rest,
        tenantId,
        dataInicio,
        prazoMeses,
        dataVencimento: computeDataVencimento(dataInicio, prazoMeses),
        dataVencimentoPrimeiraParcela: dto.dataVencimentoPrimeiraParcela
          ? new Date(dto.dataVencimentoPrimeiraParcela)
          : undefined,
        createdById: userId,
        services: serviceItemIds?.length
          ? { createMany: { data: serviceItemIds.map((serviceItemId) => ({ tenantId, serviceItemId })) } }
          : undefined,
      },
      include: { services: true },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateContractDto, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.CONTRACT_WRITE, tenantId);
    const existing = await this.prisma.contract.findFirst({ where: { ...where, id } });
    if (!existing) throw new NotFoundException("Contrato não encontrado.");
    if (dto.companyId) assertCompanyInScope(assignments, PERMISSIONS.CONTRACT_WRITE, dto.companyId);

    const signatures = await this.prisma.contractSignature.findMany({ where: { contractId: id } });
    if (signatures.some((s) => s.signedAt)) {
      throw new ConflictException("Contrato já possui assinatura registrada e não pode mais ser editado.");
    }
    // Link do CONTRATANTE pendente (ainda não assinado): editar o contrato revoga o link em
    // aberto, pra ninguém assinar dados que acabaram de mudar — é preciso solicitar um novo depois.
    const pendingLink = signatures.find((s) => s.role === "CONTRATANTE" && s.tokenHash && !s.signedAt);

    const { serviceItemIds, status, ...rest } = dto;
    const dataInicio = dto.dataInicio ? new Date(dto.dataInicio) : existing.dataInicio;
    const prazoMeses = dto.prazoMeses ?? existing.prazoMeses;

    return this.prisma.$transaction(async (tx) => {
      if (serviceItemIds) {
        await tx.contractSelectedService.deleteMany({ where: { contractId: id } });
        if (serviceItemIds.length) {
          await tx.contractSelectedService.createMany({
            data: serviceItemIds.map((serviceItemId) => ({ tenantId, contractId: id, serviceItemId })),
          });
        }
      }

      if (pendingLink) {
        await tx.contractSignature.update({ where: { id: pendingLink.id }, data: { tokenHash: null, expiresAt: null } });
      }

      return tx.contract.update({
        where: { id },
        data: {
          ...rest,
          status,
          dataInicio,
          prazoMeses,
          dataVencimento: computeDataVencimento(dataInicio, prazoMeses),
          dataVencimentoPrimeiraParcela: dto.dataVencimentoPrimeiraParcela
            ? new Date(dto.dataVencimentoPrimeiraParcela)
            : undefined,
        },
        include: { services: true },
      });
    });
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.CONTRACT_WRITE, tenantId);
    const contract = await this.prisma.contract.findFirst({ where: { ...where, id } });
    if (!contract) throw new NotFoundException("Contrato não encontrado.");
    if (contract.pdfUrl) await del(contract.pdfUrl);
    await this.prisma.contract.delete({ where: { id } });
    return { success: true };
  }

  async savePdfUrl(tenantId: string, id: string, pdfUrl: string, pdfSha256?: string) {
    const existing = await this.prisma.contract.findFirst({ where: { tenantId, id } });
    if (existing?.pdfUrl) await del(existing.pdfUrl);
    return this.prisma.contract.update({
      where: { id },
      data: { pdfUrl, pdfGeneratedAt: new Date(), ...(pdfSha256 ? { pdfSha256 } : {}) },
    });
  }
}
