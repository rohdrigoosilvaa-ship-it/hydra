import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateGheDto, UpdateGheDto } from "./dto/pgr.dto";
import { assertCompanyInScope, relatedCompanyScopeWhere } from "../org/scope.util";

const FUNCTIONS_INCLUDE = {
  functions: { include: { department: true, position: true } },
} as const;

interface GheOwner {
  pgrId: string | null;
  ltcatId: string | null;
}

@Injectable()
export class GheService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], pgrId?: string) {
    const where = relatedCompanyScopeWhere(assignments, PERMISSIONS.PGR_READ, tenantId, "pgr") as {
      pgr?: Record<string, unknown>;
    } & Record<string, unknown>;
    return this.prisma.ghe.findMany({
      // Mescla deletedAt: null no filtro de pgr já existente (RBAC tenant-wide
      // ou por empresa) — um PGR excluído (soft-delete) não pode vazar aqui.
      // `pgrId: { not: null }` é a guarda contra GHEs de LTCAT: sem isso, o
      // escopo tenant-wide (`{ tenantId }`, sem filtro de relação) devolveria
      // também os GHEs que pertencem a um Ltcat, não a um Pgr.
      where: { ...where, pgr: { ...where.pgr, deletedAt: null }, pgrId: pgrId ?? { not: null } },
      include: FUNCTIONS_INCLUDE,
      orderBy: { name: "asc" },
    });
  }

  async assertPgrEditable(tenantId: string, pgrId: string, assignments: RoleAssignmentClaim[]) {
    const pgr = await this.prisma.pgr.findFirst({ where: { id: pgrId, tenantId, deletedAt: null } });
    if (!pgr) throw new NotFoundException("PGR não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.PGR_WRITE, pgr.companyId);
    return pgr;
  }

  async assertLtcatEditable(tenantId: string, ltcatId: string, assignments: RoleAssignmentClaim[]) {
    const ltcat = await this.prisma.ltcat.findFirst({ where: { id: ltcatId, tenantId, deletedAt: null } });
    if (!ltcat) throw new NotFoundException("LTCAT não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.LTCAT_WRITE, ltcat.companyId);
    return ltcat;
  }

  /** Um GHE pertence a exatamente um dos dois — ramifica pra validação certa conforme o dono. */
  async assertGheOwnerEditable(tenantId: string, ghe: GheOwner, assignments: RoleAssignmentClaim[]) {
    if (ghe.pgrId) return this.assertPgrEditable(tenantId, ghe.pgrId, assignments);
    if (ghe.ltcatId) return this.assertLtcatEditable(tenantId, ghe.ltcatId, assignments);
    throw new NotFoundException("GHE sem PGR ou LTCAT associado.");
  }

  private async assertGheEditable(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const ghe = await this.prisma.ghe.findFirst({ where: { id, tenantId } });
    if (!ghe) throw new NotFoundException("GHE não encontrado.");
    await this.assertGheOwnerEditable(tenantId, ghe, assignments);
    return ghe;
  }

  async create(tenantId: string, dto: CreateGheDto, assignments: RoleAssignmentClaim[]) {
    if (!dto.pgrId && !dto.ltcatId) throw new BadRequestException("Informe pgrId ou ltcatId.");
    if (dto.pgrId && dto.ltcatId) throw new BadRequestException("Um GHE pertence a um PGR ou a um LTCAT, nunca aos dois.");
    if (dto.pgrId) await this.assertPgrEditable(tenantId, dto.pgrId, assignments);
    else await this.assertLtcatEditable(tenantId, dto.ltcatId!, assignments);
    return this.prisma.ghe.create({ data: { ...dto, tenantId }, include: FUNCTIONS_INCLUDE });
  }

  async update(tenantId: string, id: string, dto: UpdateGheDto, assignments: RoleAssignmentClaim[]) {
    await this.assertGheEditable(tenantId, id, assignments);
    return this.prisma.ghe.update({ where: { id }, data: dto, include: FUNCTIONS_INCLUDE });
  }
}
