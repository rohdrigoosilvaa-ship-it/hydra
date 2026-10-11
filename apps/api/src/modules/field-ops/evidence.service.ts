import { Injectable, NotFoundException } from "@nestjs/common";
import { del, put } from "@vercel/blob";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";
import type { CreateEvidenceDto } from "./dto/field-ops.dto";
import type { EvidenceSourceType } from "@hydra/db";

@Injectable()
export class EvidenceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Sem sourceType/sourceId, lista todas as evidências da empresa (galeria agregada). */
  list(
    tenantId: string,
    assignments: RoleAssignmentClaim[],
    filters: { companyId?: string; sourceType?: EvidenceSourceType; sourceId?: string },
  ) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_READ, tenantId);
    return this.prisma.evidence.findMany({
      where: {
        ...where,
        ...(filters.companyId ? { companyId: filters.companyId } : {}),
        ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
        ...(filters.sourceId ? { sourceId: filters.sourceId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async upload(
    tenantId: string,
    dto: CreateEvidenceDto,
    file: Express.Multer.File,
    userId: string,
    assignments: RoleAssignmentClaim[],
  ) {
    if (dto.companyId) assertCompanyInScope(assignments, PERMISSIONS.OCCURRENCE_WRITE, dto.companyId);
    const pathname = `evidence/${tenantId}/${dto.sourceType}/${dto.sourceId}/${Date.now()}-${file.originalname}`;
    const blob = await put(pathname, file.buffer, { access: "public", contentType: file.mimetype });

    return this.prisma.evidence.create({
      data: {
        tenantId,
        companyId: dto.companyId,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        fileUrl: blob.url,
        fileName: file.originalname,
        mimeType: file.mimetype,
        caption: dto.caption,
        category: dto.category,
        uploadedById: userId,
      },
    });
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_WRITE, tenantId);
    const evidence = await this.prisma.evidence.findFirst({ where: { ...where, id } });
    if (!evidence) throw new NotFoundException("Evidência não encontrada.");
    await del(evidence.fileUrl);
    await this.prisma.evidence.delete({ where: { id } });
    return { success: true };
  }
}
