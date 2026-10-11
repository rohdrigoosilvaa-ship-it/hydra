import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateCatDto } from "./dto/occurrence.dto";
import { assertCompanyInScope, relatedCompanyScopeWhere } from "../org/scope.util";

@Injectable()
export class CatService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[]) {
    const where = relatedCompanyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_READ, tenantId, "occurrence");
    return this.prisma.cat.findMany({
      where,
      include: { occurrence: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(tenantId: string, dto: CreateCatDto, userId: string, assignments: RoleAssignmentClaim[]) {
    const occurrence = await this.prisma.occurrence.findFirst({
      where: { id: dto.occurrenceId, tenantId, deletedAt: null },
    });
    if (!occurrence) throw new NotFoundException("Ocorrência não encontrada.");
    assertCompanyInScope(assignments, PERMISSIONS.OCCURRENCE_WRITE, occurrence.companyId);
    return this.prisma.cat.create({ data: { ...dto, tenantId, createdById: userId } });
  }

  async send(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = relatedCompanyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_WRITE, tenantId, "occurrence");
    const cat = await this.prisma.cat.findFirst({ where: { ...where, id } });
    if (!cat) throw new NotFoundException("CAT não encontrada.");
    return this.prisma.cat.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });
  }
}
