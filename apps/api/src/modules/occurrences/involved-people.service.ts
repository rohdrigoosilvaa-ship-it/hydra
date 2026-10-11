import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateInvolvedPersonDto } from "./dto/occurrence.dto";
import { assertCompanyInScope } from "../org/scope.util";

@Injectable()
export class InvolvedPeopleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateInvolvedPersonDto, assignments: RoleAssignmentClaim[]) {
    const occurrence = await this.prisma.occurrence.findFirst({
      where: { id: dto.occurrenceId, tenantId, deletedAt: null },
    });
    if (!occurrence) throw new NotFoundException("Ocorrência não encontrada.");
    assertCompanyInScope(assignments, PERMISSIONS.OCCURRENCE_WRITE, occurrence.companyId);

    return this.prisma.occurrenceInvolvedPerson.create({ data: { ...dto, tenantId } });
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const person = await this.prisma.occurrenceInvolvedPerson.findFirst({
      where: { id, tenantId },
      include: { occurrence: true },
    });
    if (!person) throw new NotFoundException("Pessoa envolvida não encontrada.");
    assertCompanyInScope(assignments, PERMISSIONS.OCCURRENCE_WRITE, person.occurrence.companyId);
    await this.prisma.occurrenceInvolvedPerson.delete({ where: { id } });
    return { success: true };
  }
}
