import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateLtcatAgentDto, UpdateLtcatAgentDto } from "./dto/documents.dto";
import { assertCompanyInScope, relatedCompanyScopeWhere } from "../org/scope.util";

@Injectable()
export class LtcatAgentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], ltcatId?: string) {
    const where = relatedCompanyScopeWhere(assignments, PERMISSIONS.LTCAT_READ, tenantId, "ltcat");
    return this.prisma.ltcatAgent.findMany({
      where: { ...where, ...(ltcatId ? { ltcatId } : {}) },
      include: { ghe: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(tenantId: string, dto: CreateLtcatAgentDto, userId: string, assignments: RoleAssignmentClaim[]) {
    const ltcat = await this.prisma.ltcat.findFirst({ where: { id: dto.ltcatId, tenantId, deletedAt: null } });
    if (!ltcat) throw new NotFoundException("LTCAT não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.LTCAT_WRITE, ltcat.companyId);

    return this.prisma.ltcatAgent.create({
      data: { ...dto, tenantId, createdById: userId, updatedById: userId },
      include: { ghe: true },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateLtcatAgentDto, userId: string, assignments: RoleAssignmentClaim[]) {
    const agent = await this.prisma.ltcatAgent.findFirst({ where: { id, tenantId }, include: { ltcat: true } });
    if (!agent) throw new NotFoundException("Agente ambiental não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.LTCAT_WRITE, agent.ltcat.companyId);

    return this.prisma.ltcatAgent.update({
      where: { id },
      data: { ...dto, updatedById: userId },
      include: { ghe: true },
    });
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const agent = await this.prisma.ltcatAgent.findFirst({ where: { id, tenantId }, include: { ltcat: true } });
    if (!agent) throw new NotFoundException("Agente ambiental não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.LTCAT_WRITE, agent.ltcat.companyId);

    await this.prisma.ltcatAgent.delete({ where: { id } });
    return { success: true };
  }
}
