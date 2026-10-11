import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { del, put } from "@vercel/blob";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateCompanyDto } from "./dto/org.dto";
import { allowedCompanyIds, hasTenantWideAccess, isCompanyInScope } from "./scope.util";

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[]) {
    const where = this.scopedIdWhere(tenantId, assignments, PERMISSIONS.ORG_COMPANY_READ);
    return this.prisma.company.findMany({
      where,
      orderBy: { name: "asc" },
    });
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    if (!isCompanyInScope(assignments, PERMISSIONS.ORG_COMPANY_READ, id)) {
      throw new NotFoundException("Empresa não encontrada.");
    }
    const company = await this.prisma.company.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!company) throw new NotFoundException("Empresa não encontrada.");
    return this.attachAuditNames(company);
  }

  /** Só administradores com escopo TENANT podem cadastrar novas empresas. */
  create(tenantId: string, dto: CreateCompanyDto, userId: string, assignments: RoleAssignmentClaim[]) {
    if (!hasTenantWideAccess(assignments, PERMISSIONS.ORG_COMPANY_WRITE)) {
      throw new ForbiddenException("Apenas administradores podem cadastrar novas empresas.");
    }
    return this.prisma.company.create({
      data: {
        ...dto,
        dataContrato: dto.dataContrato ? new Date(dto.dataContrato) : undefined,
        tenantId,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<CreateCompanyDto>,
    userId: string,
    assignments: RoleAssignmentClaim[],
  ) {
    await this.get(tenantId, id, assignments);
    return this.prisma.company.update({
      where: { id },
      data: {
        ...dto,
        dataContrato: dto.dataContrato ? new Date(dto.dataContrato) : undefined,
        updatedById: userId,
      },
    });
  }

  /** Só administradores com escopo TENANT podem remover empresas. */
  async remove(tenantId: string, id: string, userId: string, assignments: RoleAssignmentClaim[]) {
    if (!hasTenantWideAccess(assignments, PERMISSIONS.ORG_COMPANY_WRITE)) {
      throw new ForbiddenException("Apenas administradores podem remover empresas.");
    }
    await this.get(tenantId, id, assignments);
    return this.prisma.company.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: userId },
    });
  }

  async uploadLogo(
    tenantId: string,
    id: string,
    file: Express.Multer.File,
    userId: string,
    assignments: RoleAssignmentClaim[],
  ) {
    const company = await this.get(tenantId, id, assignments);
    if (company.logoUrl) await del(company.logoUrl);
    const pathname = `company-logos/${tenantId}/${id}/${Date.now()}-${file.originalname}`;
    const blob = await put(pathname, file.buffer, { access: "public", contentType: file.mimetype });
    return this.prisma.company.update({
      where: { id },
      data: { logoUrl: blob.url, updatedById: userId },
    });
  }

  async removeLogo(tenantId: string, id: string, userId: string, assignments: RoleAssignmentClaim[]) {
    const company = await this.get(tenantId, id, assignments);
    if (company.logoUrl) await del(company.logoUrl);
    return this.prisma.company.update({
      where: { id },
      data: { logoUrl: null, updatedById: userId },
    });
  }

  /**
   * Para Company, o "companyId" do escopo É o próprio `id` do registro —
   * por isso não dá para reaproveitar `companyScopeWhere` (que espera um
   * campo `companyId` estrangeiro); filtramos por `id: { in: [...] }`.
   */
  private scopedIdWhere(tenantId: string, assignments: RoleAssignmentClaim[], permission: typeof PERMISSIONS.ORG_COMPANY_READ) {
    const base = { tenantId, deletedAt: null } as const;
    if (hasTenantWideAccess(assignments, permission)) return base;
    return { ...base, id: { in: allowedCompanyIds(assignments, permission) } };
  }

  /**
   * createdById/updatedById são apenas strings (sem relação no Prisma —
   * mesmo padrão de Employee, ver comentário no schema), então o nome
   * precisa ser resolvido manualmente para a seção "Log" da ficha da empresa.
   */
  private async attachAuditNames<T extends { createdById: string | null; updatedById: string | null }>(
    company: T,
  ) {
    const ids = [company.createdById, company.updatedById].filter((v): v is string => !!v);
    if (ids.length === 0) return { ...company, createdByName: null, updatedByName: null };

    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const nameOf = (id: string | null) => (id ? (users.find((u) => u.id === id)?.name ?? null) : null);

    return {
      ...company,
      createdByName: nameOf(company.createdById),
      updatedByName: nameOf(company.updatedById),
    };
  }
}
