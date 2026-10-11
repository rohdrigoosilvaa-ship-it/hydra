import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import * as argon2 from "argon2";
import type { UserStatus } from "@hydra/db";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateUserDto, UpdateUserDto } from "./dto/users.dto";
import { allowedCompanyIds, assertCompanyInScope, hasTenantWideAccess } from "./scope.util";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Um administrador de empresa (escopo COMPANY) só vê/gerencia usuários com
   * pelo menos um vínculo nas empresas do seu próprio escopo — nunca a lista
   * inteira do tenant.
   */
  list(tenantId: string, assignments: RoleAssignmentClaim[]) {
    const where = hasTenantWideAccess(assignments, PERMISSIONS.ORG_USER_MANAGE)
      ? { tenantId, deletedAt: null }
      : {
          tenantId,
          deletedAt: null,
          roleAssignments: {
            some: {
              scopeType: "COMPANY" as const,
              scopeId: { in: allowedCompanyIds(assignments, PERMISSIONS.ORG_USER_MANAGE) },
            },
          },
        };
    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        roleAssignments: { select: { id: true, role: true, scopeType: true, scopeId: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async create(tenantId: string, dto: CreateUserDto, assignments: RoleAssignmentClaim[]) {
    const creatorIsTenantWide = hasTenantWideAccess(assignments, PERMISSIONS.ORG_USER_MANAGE);

    if (dto.scopeType === "TENANT" && !creatorIsTenantWide) {
      throw new ForbiddenException(
        "Apenas administradores com acesso a todas as empresas podem criar usuários com esse nível de acesso.",
      );
    }
    if (dto.scopeType === "COMPANY") {
      if (!dto.scopeId) throw new BadRequestException("Informe a empresa do usuário.");
      assertCompanyInScope(assignments, PERMISSIONS.ORG_USER_MANAGE, dto.scopeId);
    }

    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });
    if (existing) throw new ConflictException("Já existe um usuário com este e-mail.");

    const passwordHash = await argon2.hash(dto.password);
    return this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        name: dto.name,
        passwordHash,
        roleAssignments: {
          create: {
            tenantId,
            role: dto.role,
            scopeType: dto.scopeType,
            scopeId: dto.scopeType === "COMPANY" ? dto.scopeId : null,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        roleAssignments: { select: { id: true, role: true, scopeType: true, scopeId: true } },
      },
    });
  }

  async setStatus(tenantId: string, id: string, status: UserStatus, assignments: RoleAssignmentClaim[]) {
    const user = await this.findVisible(tenantId, id, assignments);
    if (!user) throw new NotFoundException("Usuário não encontrado.");
    return this.prisma.user.update({ where: { id }, data: { status } });
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto, assignments: RoleAssignmentClaim[]) {
    const target = await this.prisma.user.findFirst({
      where: this.visibleWhere(tenantId, id, assignments),
      include: { roleAssignments: true },
    });
    if (!target) throw new NotFoundException("Usuário não encontrado.");

    const creatorIsTenantWide = hasTenantWideAccess(assignments, PERMISSIONS.ORG_USER_MANAGE);
    if (dto.scopeType === "TENANT" && !creatorIsTenantWide) {
      throw new ForbiddenException(
        "Apenas administradores com acesso a todas as empresas podem conceder esse nível de acesso.",
      );
    }

    if (dto.email && dto.email !== target.email) {
      const existing = await this.prisma.user.findUnique({
        where: { tenantId_email: { tenantId, email: dto.email } },
      });
      if (existing) throw new ConflictException("Já existe um usuário com este e-mail.");
    }

    if (dto.role !== undefined || dto.scopeType !== undefined) {
      if (!dto.role || !dto.scopeType) {
        throw new BadRequestException("Informe perfil e escopo de acesso.");
      }
      if (dto.scopeType === "COMPANY") {
        if (!dto.scopeId) throw new BadRequestException("Informe a empresa do usuário.");
        assertCompanyInScope(assignments, PERMISSIONS.ORG_USER_MANAGE, dto.scopeId);
      }
      const scopeId = dto.scopeType === "COMPANY" ? dto.scopeId! : null;
      const current = target.roleAssignments[0];
      if (current) {
        await this.prisma.roleAssignment.update({
          where: { id: current.id },
          data: { role: dto.role, scopeType: dto.scopeType, scopeId },
        });
      } else {
        await this.prisma.roleAssignment.create({
          data: { tenantId, userId: id, role: dto.role, scopeType: dto.scopeType, scopeId },
        });
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        email: dto.email ?? undefined,
        passwordHash: dto.password ? await argon2.hash(dto.password) : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        roleAssignments: { select: { id: true, role: true, scopeType: true, scopeId: true } },
      },
    });
  }

  async remove(tenantId: string, id: string, currentUserId: string, assignments: RoleAssignmentClaim[]) {
    if (id === currentUserId) {
      throw new BadRequestException("Você não pode excluir seu próprio usuário.");
    }
    const user = await this.findVisible(tenantId, id, assignments);
    if (!user) throw new NotFoundException("Usuário não encontrado.");
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: "SUSPENDED" },
    });
    return { ok: true };
  }

  private visibleWhere(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    return hasTenantWideAccess(assignments, PERMISSIONS.ORG_USER_MANAGE)
      ? { tenantId, deletedAt: null, id }
      : {
          tenantId,
          deletedAt: null,
          id,
          roleAssignments: {
            some: {
              scopeType: "COMPANY" as const,
              scopeId: { in: allowedCompanyIds(assignments, PERMISSIONS.ORG_USER_MANAGE) },
            },
          },
        };
  }

  private findVisible(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    return this.prisma.user.findFirst({ where: this.visibleWhere(tenantId, id, assignments) });
  }
}
