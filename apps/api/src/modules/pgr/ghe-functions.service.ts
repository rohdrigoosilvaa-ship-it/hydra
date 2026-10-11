import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateGheFunctionDto, UpdateGheFunctionDto } from "./dto/pgr.dto";
import { GheService } from "./ghe.service";

const INCLUDE = { department: true, position: true } as const;

@Injectable()
export class GheFunctionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ghe: GheService,
  ) {}

  list(tenantId: string, gheId: string) {
    return this.prisma.gheFunction.findMany({
      where: { tenantId, gheId },
      include: INCLUDE,
      orderBy: { createdAt: "asc" },
    });
  }

  async create(tenantId: string, dto: CreateGheFunctionDto, assignments: RoleAssignmentClaim[]) {
    const ghe = await this.prisma.ghe.findFirst({ where: { id: dto.gheId, tenantId } });
    if (!ghe) throw new NotFoundException("GHE não encontrado.");
    await this.ghe.assertGheOwnerEditable(tenantId, ghe, assignments);
    return this.prisma.gheFunction.create({ data: { ...dto, tenantId }, include: INCLUDE });
  }

  async update(tenantId: string, id: string, dto: UpdateGheFunctionDto, assignments: RoleAssignmentClaim[]) {
    const entry = await this.prisma.gheFunction.findFirst({ where: { id, tenantId }, include: { ghe: true } });
    if (!entry) throw new NotFoundException("Vínculo de função não encontrado.");
    await this.ghe.assertGheOwnerEditable(tenantId, entry.ghe, assignments);
    return this.prisma.gheFunction.update({ where: { id }, data: dto, include: INCLUDE });
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const entry = await this.prisma.gheFunction.findFirst({ where: { id, tenantId }, include: { ghe: true } });
    if (!entry) throw new NotFoundException("Vínculo de função não encontrado.");
    await this.ghe.assertGheOwnerEditable(tenantId, entry.ghe, assignments);
    await this.prisma.gheFunction.delete({ where: { id } });
    return { ok: true };
  }
}
