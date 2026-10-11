import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";
import { calcularDimensionamentoCipa } from "./cipa-dimensionamento.util";
import { addDays, gerarCronogramaCipa } from "./cipa-schedule.util";
import type { CreateCipaElectionDto, UpdateCipaElectionDto } from "./dto/cipa-election.dto";

@Injectable()
export class CipaElectionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    const where = companyScopeWhere(assignments, PERMISSIONS.CIPA_READ, tenantId);
    return this.prisma.cipaElection.findMany({
      where: { ...where, ...(companyId ? { companyId } : {}) },
      orderBy: { posseDate: "desc" },
    });
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.CIPA_READ, tenantId);
    const election = await this.prisma.cipaElection.findFirst({
      where: { ...where, id },
      include: { steps: { orderBy: { order: "asc" } } },
    });
    if (!election) throw new NotFoundException("Eleição da CIPA não encontrada.");

    const empregados = await this.prisma.employee.count({
      where: { tenantId, companyId: election.companyId, status: { not: "TERMINATED" } },
    });
    const dimensionamento = calcularDimensionamentoCipa(election.grauRisco, empregados);

    return { ...election, empregados, dimensionamento };
  }

  async create(tenantId: string, dto: CreateCipaElectionDto, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.CIPA_WRITE, dto.companyId);
    const posseDate = this.resolvePosseDate(dto.type, dto.posseDate, dto.dataTerminoMandatoAtual);
    const dataTerminoMandatoAtual = dto.dataTerminoMandatoAtual ? new Date(dto.dataTerminoMandatoAtual) : null;
    const steps = gerarCronogramaCipa({ type: dto.type, posseDate, dataTerminoMandatoAtual });

    return this.prisma.cipaElection.create({
      data: {
        tenantId,
        companyId: dto.companyId,
        branchId: dto.branchId,
        type: dto.type,
        grauRisco: dto.grauRisco,
        gestaoLabel: dto.gestaoLabel,
        posseDate,
        dataTerminoMandatoAtual,
        createdById: userId,
        steps: { createMany: { data: steps.map((s) => ({ ...s, tenantId })) } },
      },
      include: { steps: { orderBy: { order: "asc" } } },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateCipaElectionDto, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.CIPA_WRITE, tenantId);
    const existing = await this.prisma.cipaElection.findFirst({ where: { ...where, id }, include: { steps: true } });
    if (!existing) throw new NotFoundException("Eleição da CIPA não encontrada.");

    const type = dto.type ?? existing.type;
    const dataTerminoMandatoAtual =
      dto.dataTerminoMandatoAtual !== undefined
        ? dto.dataTerminoMandatoAtual
          ? new Date(dto.dataTerminoMandatoAtual)
          : null
        : existing.dataTerminoMandatoAtual;
    const posseDate = this.resolvePosseDate(
      type,
      dto.posseDate ?? existing.posseDate.toISOString(),
      dataTerminoMandatoAtual?.toISOString(),
    );

    const scheduleChanged = type !== existing.type || posseDate.getTime() !== existing.posseDate.getTime();

    return this.prisma.$transaction(async (tx) => {
      if (scheduleChanged) {
        const concluidoPorEtapa = new Map(existing.steps.filter((s) => s.concluido).map((s) => [s.etapa, true]));
        const novosSteps = gerarCronogramaCipa({ type, posseDate, dataTerminoMandatoAtual }).map((s) => ({
          ...s,
          concluido: concluidoPorEtapa.has(s.etapa),
        }));
        await tx.cipaElectionScheduleStep.deleteMany({ where: { electionId: id } });
        await tx.cipaElectionScheduleStep.createMany({
          data: novosSteps.map((s) => ({ ...s, tenantId, electionId: id })),
        });
      }

      return tx.cipaElection.update({
        where: { id },
        data: {
          branchId: dto.branchId,
          type,
          grauRisco: dto.grauRisco,
          gestaoLabel: dto.gestaoLabel,
          posseDate,
          dataTerminoMandatoAtual,
        },
        include: { steps: { orderBy: { order: "asc" } } },
      });
    });
  }

  async toggleStep(tenantId: string, electionId: string, stepId: string, concluido: boolean, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.CIPA_WRITE, tenantId);
    const election = await this.prisma.cipaElection.findFirst({ where: { ...where, id: electionId } });
    if (!election) throw new NotFoundException("Eleição da CIPA não encontrada.");

    const step = await this.prisma.cipaElectionScheduleStep.findFirst({ where: { id: stepId, electionId } });
    if (!step) throw new NotFoundException("Etapa do cronograma não encontrada.");

    return this.prisma.cipaElectionScheduleStep.update({ where: { id: stepId }, data: { concluido } });
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.CIPA_WRITE, tenantId);
    const election = await this.prisma.cipaElection.findFirst({ where: { ...where, id } });
    if (!election) throw new NotFoundException("Eleição da CIPA não encontrada.");
    await this.prisma.cipaElection.delete({ where: { id } });
    return { success: true };
  }

  private resolvePosseDate(type: "PRIMEIRA" | "RENOVACAO", posseDate?: string, dataTerminoMandatoAtual?: string): Date {
    if (type === "RENOVACAO") {
      if (!dataTerminoMandatoAtual) {
        throw new BadRequestException("Informe a data de término do mandato atual para uma eleição de renovação.");
      }
      return addDays(new Date(dataTerminoMandatoAtual), 1);
    }
    if (!posseDate) {
      throw new BadRequestException("Informe a data de posse para a primeira eleição da CIPA.");
    }
    return new Date(posseDate);
  }
}
