import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { Permission } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";
import type {
  CreatePsychosocialQuestionDto,
  CreatePsychosocialSurveyDto,
  SendInvitesDto,
  SubmitResponseDto,
  UpdatePsychosocialQuestionDto,
  UpdatePsychosocialSurveyDto,
} from "./dto/psychosocial.dto";

/**
 * Perguntas fictícias/de exemplo — 7 dimensões no espírito do instrumento
 * HSE-IT, só para pré-visualização do formato da pesquisa. NÃO é o
 * questionário oficial validado — substituir quando o cliente fornecer.
 */
export const SAMPLE_QUESTIONS: { dimension: string; text: string }[] = [
  { dimension: "Demandas", text: "[Exemplo] Tenho prazos impossíveis de cumprir no meu trabalho." },
  { dimension: "Demandas", text: "[Exemplo] Preciso trabalhar de forma muito intensa para dar conta das minhas tarefas." },
  { dimension: "Demandas", text: "[Exemplo] Deixo de fazer pausas por causa da quantidade de trabalho que tenho." },
  { dimension: "Controle", text: "[Exemplo] Posso decidir quando fazer uma pausa." },
  { dimension: "Controle", text: "[Exemplo] Tenho liberdade para decidir como realizar o meu trabalho." },
  { dimension: "Controle", text: "[Exemplo] Tenho alguma influência sobre o ritmo do meu trabalho." },
  { dimension: "Apoio da Chefia", text: "[Exemplo] Recebo apoio e feedback da minha liderança sobre o meu trabalho." },
  { dimension: "Apoio da Chefia", text: "[Exemplo] Consigo conversar com minha liderança sobre algo que me incomodou no trabalho." },
  { dimension: "Apoio da Chefia", text: "[Exemplo] Minha liderança me incentiva no trabalho." },
  { dimension: "Apoio dos Colegas", text: "[Exemplo] Se o trabalho fica difícil, meus colegas me ajudam." },
  { dimension: "Apoio dos Colegas", text: "[Exemplo] Recebo a ajuda e o apoio que preciso dos meus colegas." },
  { dimension: "Apoio dos Colegas", text: "[Exemplo] Meus colegas estão dispostos a me ouvir sobre problemas relacionados ao trabalho." },
  { dimension: "Relacionamentos", text: "[Exemplo] Sofro assédio pessoal na forma de palavras ou comportamento indesejado." },
  { dimension: "Relacionamentos", text: "[Exemplo] Existem atritos ou conflitos entre colegas de trabalho." },
  { dimension: "Relacionamentos", text: "[Exemplo] As relações no trabalho são tensas." },
  { dimension: "Papel", text: "[Exemplo] Sei claramente o que se espera de mim no trabalho." },
  { dimension: "Papel", text: "[Exemplo] Sei como fazer meu trabalho corretamente." },
  { dimension: "Papel", text: "[Exemplo] Entendo claramente qual é o meu papel e minhas responsabilidades." },
  { dimension: "Mudança", text: "[Exemplo] Tenho a oportunidade de opinar sobre mudanças que afetam o meu trabalho." },
  { dimension: "Mudança", text: "[Exemplo] Quando são feitas mudanças no trabalho, sei claramente como elas vão funcionar na prática." },
  { dimension: "Mudança", text: "[Exemplo] Sou consultado(a) sobre mudanças propostas relacionadas ao meu trabalho." },
];

function webOrigin(): string {
  return process.env.WEB_ORIGIN ?? "http://localhost:5173";
}

/** Mascara o CPF antes de persistir — nunca gravamos o CPF completo (LGPD). */
function maskCpf(cpf: string | undefined): string | undefined {
  const digits = (cpf ?? "").replace(/\D/g, "");
  if (digits.length !== 11) return undefined;
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9, 11)}`;
}

@Injectable()
export class PsychosocialService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.PSYCHOSOCIAL_READ, tenantId);
    return this.prisma.psychosocialSurvey.findMany({
      where: { ...where, deletedAt: null },
      include: { _count: { select: { questions: true, invites: true, responses: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.PSYCHOSOCIAL_READ, tenantId);
    const survey = await this.prisma.psychosocialSurvey.findFirst({
      where: { ...where, id, deletedAt: null },
      include: {
        questions: { orderBy: [{ dimension: "asc" }, { order: "asc" }] },
        invites: { orderBy: { sentAt: "desc" } },
        _count: { select: { responses: true } },
      },
    });
    if (!survey) throw new NotFoundException("Pesquisa não encontrada.");

    const employeeIds = survey.invites.map((i) => i.employeeId);
    const employees = employeeIds.length
      ? await this.prisma.employee.findMany({ where: { id: { in: employeeIds } }, select: { id: true, name: true } })
      : [];
    const nameById = new Map(employees.map((e) => [e.id, e.name]));

    return {
      ...survey,
      invites: survey.invites.map((i) => ({
        id: i.id,
        employeeId: i.employeeId,
        employeeName: nameById.get(i.employeeId) ?? "Colaborador",
        sentAt: i.sentAt,
        respondedAt: i.respondedAt,
        link: `${webOrigin()}/pesquisa/${i.token}`,
      })),
    };
  }

  async create(
    tenantId: string,
    dto: CreatePsychosocialSurveyDto,
    userId: string,
    assignments: RoleAssignmentClaim[],
  ) {
    assertCompanyInScope(assignments, PERMISSIONS.PSYCHOSOCIAL_WRITE, dto.companyId);

    const survey = await this.prisma.psychosocialSurvey.create({
      data: {
        tenantId,
        companyId: dto.companyId,
        branchId: dto.branchId,
        title: dto.title,
        description: dto.description,
        startDate: dto.startDate,
        endDate: dto.endDate,
        createdById: userId,
      },
    });

    if (dto.useSampleQuestions !== false) {
      await this.prisma.psychosocialQuestion.createMany({
        data: SAMPLE_QUESTIONS.map((q, index) => ({
          tenantId,
          surveyId: survey.id,
          dimension: q.dimension,
          text: q.text,
          order: index,
        })),
      });
    }

    return this.get(tenantId, survey.id, assignments);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdatePsychosocialSurveyDto,
    assignments: RoleAssignmentClaim[],
  ) {
    await this.findOwned(tenantId, id, assignments, PERMISSIONS.PSYCHOSOCIAL_WRITE);
    await this.prisma.psychosocialSurvey.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: dto.status,
      },
    });
    return this.get(tenantId, id, assignments);
  }

  async addQuestion(tenantId: string, dto: CreatePsychosocialQuestionDto, assignments: RoleAssignmentClaim[]) {
    await this.findOwned(tenantId, dto.surveyId, assignments, PERMISSIONS.PSYCHOSOCIAL_WRITE);
    return this.prisma.psychosocialQuestion.create({
      data: { tenantId, surveyId: dto.surveyId, dimension: dto.dimension, text: dto.text, order: dto.order ?? 0 },
    });
  }

  async updateQuestion(
    tenantId: string,
    id: string,
    dto: UpdatePsychosocialQuestionDto,
    assignments: RoleAssignmentClaim[],
  ) {
    const question = await this.prisma.psychosocialQuestion.findFirst({ where: { id, tenantId } });
    if (!question) throw new NotFoundException("Pergunta não encontrada.");
    await this.findOwned(tenantId, question.surveyId, assignments, PERMISSIONS.PSYCHOSOCIAL_WRITE);
    return this.prisma.psychosocialQuestion.update({ where: { id }, data: dto });
  }

  async removeQuestion(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const question = await this.prisma.psychosocialQuestion.findFirst({ where: { id, tenantId } });
    if (!question) throw new NotFoundException("Pergunta não encontrada.");
    await this.findOwned(tenantId, question.surveyId, assignments, PERMISSIONS.PSYCHOSOCIAL_WRITE);
    await this.prisma.psychosocialQuestion.delete({ where: { id } });
    return { success: true };
  }

  async sendInvites(tenantId: string, id: string, dto: SendInvitesDto, assignments: RoleAssignmentClaim[]) {
    const survey = await this.findOwned(tenantId, id, assignments, PERMISSIONS.PSYCHOSOCIAL_WRITE);

    const employees = dto.employeeIds?.length
      ? await this.prisma.employee.findMany({
          where: { id: { in: dto.employeeIds }, tenantId, companyId: survey.companyId, deletedAt: null },
        })
      : await this.prisma.employee.findMany({
          where: {
            tenantId,
            companyId: survey.companyId,
            branchId: survey.branchId ?? undefined,
            status: "ACTIVE",
            deletedAt: null,
          },
        });

    if (employees.length === 0) {
      throw new ConflictException("Nenhum colaborador encontrado para convidar.");
    }

    const existing = await this.prisma.psychosocialInvite.findMany({
      where: { surveyId: id, employeeId: { in: employees.map((e) => e.id) } },
      select: { employeeId: true },
    });
    const alreadyInvited = new Set(existing.map((e) => e.employeeId));
    const toInvite = employees.filter((e) => !alreadyInvited.has(e.id));

    if (toInvite.length > 0) {
      await this.prisma.psychosocialInvite.createMany({
        data: toInvite.map((e) => ({ tenantId, surveyId: id, employeeId: e.id })),
      });
    }

    if (survey.status === "DRAFT") {
      await this.prisma.psychosocialSurvey.update({ where: { id }, data: { status: "ACTIVE" } });
    }

    return { invited: toInvite.length, alreadyInvited: alreadyInvited.size };
  }

  /** Endpoint público (sem tenant/auth) — o colaborador acessa pelo link do convite. */
  async getPublicSurvey(token: string) {
    const invite = await this.prisma.psychosocialInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException("Convite não encontrado.");
    if (invite.respondedAt) throw new ConflictException("Esta pesquisa já foi respondida com este link.");

    const survey = await this.prisma.psychosocialSurvey.findFirst({
      where: { id: invite.surveyId, deletedAt: null },
      include: { questions: { orderBy: [{ dimension: "asc" }, { order: "asc" }] } },
    });
    if (!survey || survey.status === "CLOSED") {
      throw new NotFoundException("Esta pesquisa não está mais disponível.");
    }

    const [company, branches, departments, positions, ghes] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: survey.companyId }, select: { name: true } }),
      this.prisma.branch.findMany({
        where: { tenantId: invite.tenantId, companyId: survey.companyId, deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.department.findMany({
        where: { tenantId: invite.tenantId, companyId: survey.companyId, deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.position.findMany({
        where: { tenantId: invite.tenantId, companyId: survey.companyId, deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.ghe.findMany({
        where: { tenantId: invite.tenantId, pgr: { companyId: survey.companyId, deletedAt: null } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      title: survey.title,
      description: survey.description,
      companyName: company?.name ?? "",
      questions: survey.questions.map((q) => ({ id: q.id, dimension: q.dimension, text: q.text })),
      branches,
      departments,
      positions,
      ghes,
    };
  }

  async submitResponse(token: string, dto: SubmitResponseDto) {
    const invite = await this.prisma.psychosocialInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException("Convite não encontrado.");
    if (invite.respondedAt) throw new ConflictException("Esta pesquisa já foi respondida com este link.");
    if (!dto.consent) {
      throw new ConflictException("É necessário aceitar o termo de consentimento (LGPD) para enviar a avaliação.");
    }

    const questions = await this.prisma.psychosocialQuestion.findMany({
      where: { surveyId: invite.surveyId },
      select: { id: true },
    });
    const validIds = new Set(questions.map((q) => q.id));
    if (dto.answers.length === 0 || dto.answers.some((a) => !validIds.has(a.questionId))) {
      throw new ConflictException("Resposta inválida para esta pesquisa.");
    }

    await this.prisma.$transaction(async (tx) => {
      const response = await tx.psychosocialResponse.create({
        data: {
          tenantId: invite.tenantId,
          surveyId: invite.surveyId,
          cpfMasked: maskCpf(dto.cpf),
          branchId: dto.branchId,
          departmentId: dto.departmentId,
          positionId: dto.positionId,
          gheId: dto.gheId,
        },
      });
      await tx.psychosocialAnswer.createMany({
        data: dto.answers.map((a) => ({
          tenantId: invite.tenantId,
          responseId: response.id,
          questionId: a.questionId,
          value: a.value,
        })),
      });
      await tx.psychosocialInvite.update({ where: { id: invite.id }, data: { respondedAt: new Date() } });
    });

    return { success: true };
  }

  private async findOwned(
    tenantId: string,
    id: string,
    assignments: RoleAssignmentClaim[],
    permission: Permission,
  ) {
    const where = companyScopeWhere(assignments, permission, tenantId);
    const survey = await this.prisma.psychosocialSurvey.findFirst({ where: { ...where, id, deletedAt: null } });
    if (!survey) throw new NotFoundException("Pesquisa não encontrada.");
    return survey;
  }
}
