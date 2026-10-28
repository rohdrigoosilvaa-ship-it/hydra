import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@hydra/db";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateMedicalExamDto, UpdateMedicalExamDto } from "./dto/health.dto";
import { assertCompanyInScope, relatedCompanyScopeWhere } from "../org/scope.util";

const addYear = (d: Date) => {
  const n = new Date(d);
  n.setUTCFullYear(n.getUTCFullYear() + 1);
  return n;
};

/**
 * Exames ocupacionais lançados. Regra de vencimento: 1 ano depois do exame (e, no admissional, 1 ano após a admissão).
 * Exame com data e resultado definido (Apto/Inapto) vira um ASO emitido nessa data (aparece no painel da empresa).
 */
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
      const performedAt = dto.performedAt ? new Date(dto.performedAt) : undefined;
      const exam = await tx.medicalExam.create({
        data: {
          ...dto,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
          performedAt,
          // sem vencimento informado: 1 ano depois do exame (demissional não tem próximo exame)
          nextDueAt: dto.nextDueAt ? new Date(dto.nextDueAt) : performedAt && dto.type !== "DEMISSIONAL" ? addYear(performedAt) : undefined,
          tenantId,
          createdById: userId,
        },
      });
      await this.syncAso(tx, tenantId, exam);
      return tx.medicalExam.findUniqueOrThrow({ where: { id: exam.id }, include: { aso: true } });
    });
  }

  /**
   * Lança o exame admissional de cada colaborador da empresa que tem data de admissão e ainda não tem esse exame:
   * data do exame = data de admissão, vencimento = 1 ano depois. O resultado fica Pendente até alguém confirmar.
   */
  async syncAdmissions(tenantId: string, companyId: string, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.HEALTH_WRITE, companyId);
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, companyId, deletedAt: null, status: { not: "TERMINATED" } },
      select: { id: true, admittedAt: true, medicalExams: { where: { type: "ADMISSIONAL" }, select: { id: true } } },
    });
    let created = 0;
    let withoutAdmission = 0;
    for (const emp of employees) {
      if (!emp.admittedAt) {
        withoutAdmission++;
        continue;
      }
      if (emp.medicalExams.length) continue;
      await this.prisma.medicalExam.create({
        data: {
          tenantId,
          employeeId: emp.id,
          type: "ADMISSIONAL",
          performedAt: emp.admittedAt,
          nextDueAt: addYear(emp.admittedAt),
          result: "PENDENTE",
          createdById: userId,
        },
      });
      created++;
    }
    return { created, withoutAdmission };
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

  /** Exame com data e resultado Apto/Inapto = ASO emitido nessa data; pendente ou sem data, não há ASO. */
  private async syncAso(tx: Prisma.TransactionClient, tenantId: string, exam: { id: string; performedAt: Date | null; result: "APTO" | "INAPTO" | "PENDENTE" }) {
    if (!exam.performedAt || exam.result === "PENDENTE") {
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
