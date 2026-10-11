import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateProviderDto, RequestProviderContractDto } from "./dto/providers.dto";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Catálogo de prestadores — compartilhado por todo o tenant, não por empresa. */
  list(tenantId: string) {
    return this.prisma.provider.findMany({
      where: { tenantId, deletedAt: null },
      include: { contracts: true },
      orderBy: { name: "asc" },
    });
  }

  create(tenantId: string, dto: CreateProviderDto) {
    return this.prisma.provider.create({ data: { ...dto, tenantId } });
  }

  /** "Solicitar contratação" do HydraNET — cria o contrato em rascunho. */
  async requestContract(
    tenantId: string,
    dto: RequestProviderContractDto,
    userId: string,
    assignments: RoleAssignmentClaim[],
  ) {
    const provider = await this.prisma.provider.findFirst({
      where: { id: dto.providerId, tenantId, deletedAt: null },
    });
    if (!provider) throw new NotFoundException("Prestador não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.PROVIDER_WRITE, dto.companyId);

    return this.prisma.providerContract.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        tenantId,
        createdById: userId,
      },
    });
  }

  listContracts(tenantId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.PROVIDER_READ, tenantId);
    return this.prisma.providerContract.findMany({
      where,
      include: { provider: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async activateContract(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.PROVIDER_WRITE, tenantId);
    const contract = await this.prisma.providerContract.findFirst({ where: { ...where, id } });
    if (!contract) throw new NotFoundException("Contrato não encontrado.");
    return this.prisma.providerContract.update({ where: { id }, data: { status: "ACTIVE" } });
  }
}
