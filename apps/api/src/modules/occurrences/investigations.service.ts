import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateInvestigationDto } from "./dto/occurrence.dto";
import { assertCompanyInScope } from "../org/scope.util";

@Injectable()
export class InvestigationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateInvestigationDto, userId: string, assignments: RoleAssignmentClaim[]) {
    const occurrence = await this.prisma.occurrence.findFirst({
      where: { id: dto.occurrenceId, tenantId, deletedAt: null },
    });
    if (!occurrence) throw new NotFoundException("Ocorrência não encontrada.");
    assertCompanyInScope(assignments, PERMISSIONS.OCCURRENCE_WRITE, occurrence.companyId);

    const [investigation] = await this.prisma.$transaction([
      this.prisma.investigation.create({ data: { ...dto, tenantId, createdById: userId } }),
      this.prisma.occurrence.update({ where: { id: dto.occurrenceId }, data: { status: "INVESTIGATING" } }),
    ]);
    return investigation;
  }
}
