import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@hydra/db";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateMedicalExamDto, MedicalExamItemDto, UpdateMedicalExamDto } from "./dto/health.dto";
import { assertCompanyInScope, relatedCompanyScopeWhere } from "../org/scope.util";

const addMonths = (d: Date, n: number) => {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() + n);
  return r;
};

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
      include: { aso: true, items: { orderBy: { name: "asc" } } },
      orderBy: [{ performedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    });
  }

  async create(tenantId: string, dto: CreateMedicalExamDto, userId: string, assignments: RoleAssignmentClaim[]) {
    const employee = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, tenantId } });
    if (!employee) throw new NotFoundException("Colaborador não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.HEALTH_WRITE, employee.companyId);

    return this.prisma.$transaction(async (tx) => {
      const performedAt = dto.performedAt ? new Date(dto.performedAt) : undefined;
      const { items, ...examData } = dto;
      const exam = await tx.medicalExam.create({
        data: {
          ...examData,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
          performedAt,
          // sem vencimento informado: 1 ano depois do exame (demissional não tem próximo exame)
          nextDueAt: dto.nextDueAt ? new Date(dto.nextDueAt) : performedAt && dto.type !== "DEMISSIONAL" ? addYear(performedAt) : undefined,
          tenantId,
          createdById: userId,
        },
      });
      if (items) await this.replaceItems(tx, tenantId, exam.id, employee.positionId, exam.performedAt, items);
      await this.syncAso(tx, tenantId, exam);
      return tx.medicalExam.findUniqueOrThrow({ where: { id: exam.id }, include: { aso: true, items: true } });
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
    const current = await this.assertWritable(tenantId, id, assignments);
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
      if (dto.items) await this.replaceItems(tx, tenantId, id, current.employee.positionId, exam.performedAt, dto.items);
      await this.syncAso(tx, tenantId, exam);
      return tx.medicalExam.findUniqueOrThrow({ where: { id }, include: { aso: true, items: true } });
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

  /**
   * Troca os exames complementares do exame. A data padrão é a do exame; o vencimento padrão é a data mais a
   * periodicidade do mesmo exame no cargo do colaborador (12 meses se o cargo não o tiver).
   */
  private async replaceItems(tx: Prisma.TransactionClient, tenantId: string, examId: string, positionId: string | null, examDate: Date | null, items: MedicalExamItemDto[]) {
    const periods = new Map(
      (positionId ? await tx.positionExam.findMany({ where: { positionId } }) : []).map((p) => [p.name.trim().toLowerCase(), p.periodicityMonths]),
    );
    await tx.medicalExamItem.deleteMany({ where: { examId } });
    const rows = items
      .filter((i) => i.name.trim())
      .map((i) => {
        const performedAt = i.performedAt === undefined ? examDate : i.performedAt ? new Date(i.performedAt) : null;
        const months = periods.get(i.name.trim().toLowerCase()) ?? 12;
        const nextDueAt = i.nextDueAt === undefined ? (performedAt ? addMonths(performedAt, months) : null) : i.nextDueAt ? new Date(i.nextDueAt) : null;
        return { tenantId, examId, name: i.name.trim(), performedAt, nextDueAt };
      });
    if (rows.length) await tx.medicalExamItem.createMany({ data: rows });
  }

  /**
   * Controle de exames por colaborador: para cada exame que o cargo exige (vindo dos riscos do PGR ou lançado no
   * cargo), a última vez que foi feito e quando vence. Sem registro, aparece como "Sem registro".
   */
  async control(tenantId: string, assignments: RoleAssignmentClaim[], companyId: string) {
    assertCompanyInScope(assignments, PERMISSIONS.HEALTH_READ, companyId);
    const [employees, hazards] = await Promise.all([
      this.prisma.employee.findMany({
        where: { tenantId, companyId, deletedAt: null, status: { not: "TERMINATED" }, positionId: { not: null } },
        select: {
          id: true, name: true, positionId: true,
          position: { select: { name: true, exams: { select: { name: true, periodicityMonths: true, hazardId: true } } } },
          medicalExams: { select: { items: { select: { name: true, performedAt: true, nextDueAt: true } } } },
        },
        orderBy: { name: "asc" },
      }),
      this.prisma.hazard.findMany({ where: { tenantId }, select: { id: true, name: true } }),
    ]);
    const hazardName = new Map(hazards.map((h) => [h.id, h.name]));
    const today = new Date();
    const rows: {
      employeeId: string; employeeName: string; positionName: string | null; exam: string; periodicityMonths: number; origin: string | null;
      lastPerformedAt: Date | null; nextDueAt: Date | null; status: "EM_DIA" | "VENCENDO" | "VENCIDO" | "SEM_REGISTRO";
    }[] = [];
    for (const emp of employees) {
      const done = emp.medicalExams.flatMap((e) => e.items).filter((i) => i.performedAt);
      for (const req of emp.position?.exams ?? []) {
        const last = done
          .filter((i) => i.name.trim().toLowerCase() === req.name.trim().toLowerCase())
          .sort((a, b) => b.performedAt!.getTime() - a.performedAt!.getTime())[0];
        const nextDueAt = last ? (last.nextDueAt ?? addMonths(last.performedAt!, req.periodicityMonths)) : null;
        const days = nextDueAt ? Math.floor((nextDueAt.getTime() - today.getTime()) / 86_400_000) : null;
        rows.push({
          employeeId: emp.id,
          employeeName: emp.name,
          positionName: emp.position?.name ?? null,
          exam: req.name,
          periodicityMonths: req.periodicityMonths,
          origin: req.hazardId ? (hazardName.get(req.hazardId) ?? null) : null,
          lastPerformedAt: last?.performedAt ?? null,
          nextDueAt,
          status: !last ? "SEM_REGISTRO" : days! < 0 ? "VENCIDO" : days! <= 30 ? "VENCENDO" : "EM_DIA",
        });
      }
    }
    return rows;
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
    const exam = await this.prisma.medicalExam.findFirst({ where: { id, tenantId }, include: { employee: { select: { companyId: true, positionId: true } } } });
    if (!exam) throw new NotFoundException("Exame não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.HEALTH_WRITE, exam.employee.companyId);
    return exam;
  }
}
