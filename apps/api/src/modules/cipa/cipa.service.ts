import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateCipaMemberDto, CreateCipaTermDto } from "./dto/cipa.dto";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";

@Injectable()
export class CipaService {
  constructor(private readonly prisma: PrismaService) {}

  listTerms(tenantId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.CIPA_READ, tenantId);
    return this.prisma.cipaTerm.findMany({
      where,
      include: { members: true },
      orderBy: { startDate: "desc" },
    });
  }

  createTerm(tenantId: string, dto: CreateCipaTermDto, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.CIPA_WRITE, dto.companyId);
    return this.prisma.cipaTerm.create({
      data: { ...dto, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate), tenantId },
    });
  }

  async addMember(tenantId: string, dto: CreateCipaMemberDto, assignments: RoleAssignmentClaim[]) {
    const term = await this.prisma.cipaTerm.findFirst({ where: { id: dto.termId, tenantId } });
    if (!term) throw new NotFoundException("Mandato da CIPA não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.CIPA_WRITE, term.companyId);
    return this.prisma.cipaMember.create({ data: { ...dto, tenantId } });
  }
}
