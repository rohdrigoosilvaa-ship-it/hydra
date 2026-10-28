import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@hydra/db";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateMedicalExamDto, UpdateMedicalExamDto } from "./dto/health.dto";
import { assertCompanyInScope, relatedCompanyScopeWhere } from "../org/scope.util";

/** Exames ocupacionais lançados. Exame com data vira um ASO emitido nessa data (aparece no painel da empresa). */
@Injectable()
export class MedicalExamsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], employeeId?: string, companyId?: string) {
    const scope = relatedCompanyScopeWhere(assignments, PERMISSIONS.HEALTH_READ, tenantId, "employee");
    const where: Prisma.MedicalExamWhereInput = {
      AND: [scope, ...(employeeId ? [{ employeeId }] : []), ...(companyId ? [{ employee: { companyId } }] : [])],
    };
    return this.prisma.medicalExam.findMany({
      where,
      include: { aso: true },
      orderBy: [{ performedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    });
  }

  async create(tenantId: string, dto: CreateMedicalExamDto, userId: string, assignments: RoleAssignmentClaim[]) {
    const employee = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, tenantId } });
    if (!employee) throw new NotFoundException("Colaborador não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.HEALTH_WRITE, employee.companyId);

    return this.prisma.$transaction(async (tx) => {
      const exam = await tx.medicalExam.create({
        data: {
          ...dto,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
          performedAt: dto.performedAt ? new Date(dto.performedAt) : undefined,
          nextDueAt: dto.nextDueAt ? new Date(dto.nextDueAt) : undefined,
          tenantId,
          createdById: userId,
        },
      });
      await this.syncAso(tx, tenantId, exam);
      return tx.medicalExam.findUniqueOrThrow({ where: { id: exam.id }, include: { aso: true } });
    });
  }

  async update(tenantId: string, id: string, dto: UpdateMedicalExamDto, assignments: RoleAssignmentClaim[]) {
    await this.assertWritable(tenantId, id, assignments);
    const date = (v: string | null | undefined) => (v === undefined ? undefined : v ? new Date(v) : null);
    return this.prisma.$transaction(async (tx) => {
      const exam = await tx.medicalExam.update({
        where: { id },
        data: {
          type: dto.type,
          result: dto.result,
          scheduledAt: date(dto.scheduledAt),
          performedAt: date(dto.performedAt),
          nextDueAt: date(dto.nextDueAt),
        },
      });
      await this.syncAso(tx, tenantId, exam);
      return tx.medicalExam.findUniqueOrThrow({ where: { id }, include: { aso: true } });
    });
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    await this.assertWritable(tenantId, id, assignments);
    await this.prisma.$transaction([
      this.prisma.aso.deleteMany({ where: { examId: id } }),
      this.prisma.medicalExam.delete({ where: { id } }),
    ]);
    return { success: true };
  }

  /** Exame com data realizada = ASO emitido nessa data; sem data, não há ASO. */
  private async syncAso(tx: Prisma.TransactionClient, tenantId: string, exam: { id: string; performedAt: Date | null; result: "APTO" | "INAPTO" | "PENDENTE" }) {
    if (!exam.performedAt) {
      await tx.aso.deleteMany({ where: { examId: exam.id } });
      return;
    }
    await tx.aso.upsert({
      where: { examId: exam.id },
      update: { issuedAt: exam.performedAt, result: exam.result },
      create: { tenantId, examId: exam.id, issuedAt: exam.performedAt, result: exam.result },
    });
  }

  private async assertWritable(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const exam = await this.prisma.medicalExam.findFirst({ where: { id, tenantId }, include: { employee: { select: { companyId: true } } } });
    if (!exam) throw new NotFoundException("Exame não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.HEALTH_WRITE, exam.employee.companyId);
    return exam;
  }
}
