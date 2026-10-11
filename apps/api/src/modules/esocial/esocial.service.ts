import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@hydra/db";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateEsocialEventDto } from "./dto/esocial.dto";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";

@Injectable()
export class EsocialService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.ESOCIAL_READ, tenantId);
    return this.prisma.esocialEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  create(tenantId: string, dto: CreateEsocialEventDto, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.ESOCIAL_WRITE, dto.companyId);
    return this.prisma.esocialEvent.create({
      data: {
        ...dto,
        payload: (dto.payload ?? undefined) as Prisma.InputJsonValue | undefined,
        tenantId,
        createdById: userId,
      },
    });
  }

  /**
   * Simula a transmissão ao eSocial (fila de fato exigiria certificado digital
   * e o webservice do governo — fora do escopo do MVP). Marca como SENT e,
   * de forma determinística, gera um recibo para permitir testar o cockpit.
   */
  async transmit(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.ESOCIAL_TRANSMIT, tenantId);
    const event = await this.prisma.esocialEvent.findFirst({ where: { ...where, id } });
    if (!event) throw new NotFoundException("Evento não encontrado.");

    return this.prisma.esocialEvent.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        receiptNumber: `1.2.${Date.now()}`,
      },
    });
  }
}
