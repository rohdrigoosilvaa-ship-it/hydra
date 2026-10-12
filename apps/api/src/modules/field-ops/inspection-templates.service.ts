import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { ChecklistTemplateStatus, InspectionItemType, Prisma } from "@hydra/db";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";
import type {
  CreateInspectionTemplateDto,
  ReplaceChecklistStructureDto,
  StructureItemDto,
  UpdateInspectionTemplateDto,
  UpdateInspectionTemplateItemDto,
} from "./dto/field-ops.dto";

const FULL = {
  sections: { orderBy: { order: "asc" } },
  items: { orderBy: { order: "asc" } },
  _count: { select: { inspections: true } },
} satisfies Prisma.InspectionTemplateInclude;

type FullTemplate = Prisma.InspectionTemplateGetPayload<{ include: typeof FULL }>;

/** Tipos que escolhem entre opções cadastradas. */
const CHOICE_TYPES: InspectionItemType[] = ["SELECAO_UNICA", "SELECAO_MULTIPLA"];

@Injectable()
export class InspectionTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_READ, tenantId);
    return this.prisma.inspectionTemplate.findMany({
      where: {
        ...where,
        active: true,
        ...(companyId ? { OR: [{ companyId }, { companyId: null }] } : {}),
      },
      include: FULL,
      orderBy: [{ name: "asc" }, { version: "desc" }],
    });
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_READ, tenantId);
    const template = await this.prisma.inspectionTemplate.findFirst({ where: { ...where, id }, include: FULL });
    if (!template) throw new NotFoundException("Modelo de checklist não encontrado.");
    return template;
  }

  /** Modelo arquivado (inclusive versão substituída) não recebe alterações — só pode ser duplicado ou reativado. */
  private assertNotArchived(template: FullTemplate) {
    if (template.status === "ARQUIVADO") {
      throw new BadRequestException("Modelo arquivado não pode ser editado. Duplique-o ou use a versão mais recente.");
    }
  }

  /** Usuários ativos do tenant (só id e nome) para escolher o responsável pelo modelo. */
  responsibles(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  async history(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    await this.get(tenantId, id, assignments);
    return this.prisma.inspectionTemplateHistory.findMany({
      where: { templateId: id, tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  // ---------------------------------------------------------------- criação

  async create(tenantId: string, dto: CreateInspectionTemplateDto, userId: string, assignments: RoleAssignmentClaim[]) {
    if (dto.companyId) assertCompanyInScope(assignments, PERMISSIONS.OCCURRENCE_WRITE, dto.companyId);
    const name = dto.name?.trim();
    if (!name || name.length < 2) throw new BadRequestException("Informe o nome do checklist.");
    return this.prisma.$transaction(async (tx) => {
      const code = await this.nextCode(tx, tenantId);
      const created = await tx.inspectionTemplate.create({
        data: {
          tenantId,
          companyId: dto.companyId,
          name,
          description: dto.description,
          category: dto.category,
          frequency: dto.frequency,
          branchId: dto.branchId,
          departmentId: dto.departmentId,
          process: dto.process,
          responsibleId: dto.responsibleId,
          ncCreation: dto.ncCreation,
          createdById: userId,
          code,
          status: "RASCUNHO",
          sections: { create: [{ tenantId, name: "Geral", order: 0 }] },
        },
      });
      await this.log(tx, tenantId, created.id, userId, "CRIADO", `Modelo ${code} criado como rascunho.`);
      return tx.inspectionTemplate.findUniqueOrThrow({ where: { id: created.id }, include: FULL });
    });
  }

  async duplicate(tenantId: string, id: string, userId: string, assignments: RoleAssignmentClaim[]) {
    const source = await this.loadWritable(tenantId, id, assignments);
    return this.prisma.$transaction(async (tx) => {
      const code = await this.nextCode(tx, tenantId);
      const copy = await tx.inspectionTemplate.create({
        data: {
          tenantId,
          companyId: source.companyId,
          name: `Cópia de ${source.name}`.slice(0, 255),
          description: source.description,
          category: source.category,
          frequency: source.frequency,
          branchId: source.branchId,
          departmentId: source.departmentId,
          process: source.process,
          responsibleId: source.responsibleId,
          ncCreation: source.ncCreation,
          createdById: userId,
          code,
          status: "RASCUNHO",
        },
      });
      await this.copyStructure(tx, tenantId, source, copy.id);
      await this.log(tx, tenantId, copy.id, userId, "DUPLICADO", `Criado a partir de ${source.code ?? source.name} (versão ${source.version}).`);
      return tx.inspectionTemplate.findUniqueOrThrow({ where: { id: copy.id }, include: FULL });
    });
  }

  // ---------------------------------------------------------------- edição

  async update(
    tenantId: string,
    id: string,
    dto: UpdateInspectionTemplateDto,
    userId: string,
    assignments: RoleAssignmentClaim[],
  ) {
    const template = await this.loadWritable(tenantId, id, assignments);
    this.assertNotArchived(template);
    return this.prisma.$transaction(async (tx) => {
      const { target } = await this.resolveEditable(tx, tenantId, template, userId);
      await tx.inspectionTemplate.update({
        where: { id: target.id },
        data: {
          name: dto.name,
          description: dto.description,
          category: dto.category,
          frequency: dto.frequency,
          branchId: dto.branchId,
          departmentId: dto.departmentId,
          process: dto.process,
          responsibleId: dto.responsibleId,
          ncCreation: dto.ncCreation,
        },
      });
      await this.log(tx, tenantId, target.id, userId, "DADOS_ALTERADOS", "Dados cadastrais alterados.");
      return tx.inspectionTemplate.findUniqueOrThrow({ where: { id: target.id }, include: FULL });
    });
  }

  /**
   * Salva seções e perguntas de uma vez (criar, alterar, reordenar e remover).
   * - Modelo ATIVO que já foi aplicado não é alterado: cria-se uma nova versão e as aplicações antigas ficam intactas.
   * - Numa edição direta, pergunta já respondida não pode ser removida nem ter tipo/opções alterados.
   */
  async replaceStructure(
    tenantId: string,
    templateId: string,
    dto: ReplaceChecklistStructureDto,
    userId: string,
    assignments: RoleAssignmentClaim[],
  ) {
    const template = await this.loadWritable(tenantId, templateId, assignments);
    this.assertNotArchived(template);
    this.validateStructure(dto);

    return this.prisma.$transaction(async (tx) => {
      const { target, sectionIds, itemIds } = await this.resolveEditable(tx, tenantId, template, userId);
      const incomingSectionId = (id?: string) => (id ? (sectionIds.get(id) ?? id) : undefined);
      const incomingItemId = (id?: string) => (id ? (itemIds.get(id) ?? id) : undefined);

      const existingSections = await tx.inspectionTemplateSection.findMany({ where: { templateId: target.id } });
      const existingItems = await tx.inspectionTemplateItem.findMany({
        where: { templateId: target.id },
        include: { _count: { select: { responses: true } } },
      });
      const sectionById = new Map(existingSections.map((s) => [s.id, s]));
      const itemById = new Map(existingItems.map((i) => [i.id, i]));

      const keptItems = new Set<string>();
      for (const incoming of dto.items) {
        const id = incomingItemId(incoming.id);
        if (!id) continue;
        const current = itemById.get(id);
        if (!current) throw new NotFoundException("Pergunta não encontrada neste modelo.");
        if (keptItems.has(id)) throw new BadRequestException("Pergunta repetida na estrutura.");
        keptItems.add(id);
        const locked = current._count.responses > 0;
        const sameOptions = JSON.stringify(current.options) === JSON.stringify(incoming.options ?? []);
        if (locked && (current.responseType !== incoming.responseType || !sameOptions)) {
          throw new BadRequestException(
            `A pergunta "${current.text}" já foi respondida em aplicações — só o texto dela pode ser alterado diretamente. Para mudar o tipo, ative uma nova versão do modelo ou crie outra pergunta.`,
          );
        }
      }
      const removedItems = existingItems.filter((i) => !keptItems.has(i.id));
      const blocked = removedItems.find((i) => i._count.responses > 0);
      if (blocked) {
        throw new BadRequestException(`A pergunta "${blocked.text}" já foi respondida em aplicações e não pode ser removida.`);
      }

      // seções: atualiza as existentes, cria as novas e remove as que saíram
      const sectionIdByKey = new Map<string, string>();
      const keptSections = new Set<string>();
      for (const [order, section] of dto.sections.entries()) {
        const existingId = incomingSectionId(section.id);
        if (existingId && sectionById.has(existingId)) {
          keptSections.add(existingId);
          await tx.inspectionTemplateSection.update({ where: { id: existingId }, data: { name: section.name.trim(), order } });
          sectionIdByKey.set(section.key, existingId);
        } else {
          const created = await tx.inspectionTemplateSection.create({
            data: { tenantId, templateId: target.id, name: section.name.trim(), order },
          });
          sectionIdByKey.set(section.key, created.id);
        }
      }

      if (removedItems.length) {
        await tx.inspectionTemplateItem.deleteMany({ where: { id: { in: removedItems.map((i) => i.id) } } });
      }
      const removedSections = existingSections.filter((s) => !keptSections.has(s.id));
      if (removedSections.length) {
        await tx.inspectionTemplateSection.deleteMany({ where: { id: { in: removedSections.map((s) => s.id) } } });
      }

      // perguntas: 1ª passada grava tudo; 2ª passada liga as regras condicionais (que apontam para ids)
      const itemIdByKey = new Map<string, string>();
      for (const [order, item] of dto.items.entries()) {
        const data = this.itemData(item, order, sectionIdByKey);
        const existingId = incomingItemId(item.id);
        if (existingId) {
          await tx.inspectionTemplateItem.update({ where: { id: existingId }, data });
          itemIdByKey.set(item.key, existingId);
        } else {
          const created = await tx.inspectionTemplateItem.create({ data: { ...data, tenantId, templateId: target.id } });
          itemIdByKey.set(item.key, created.id);
        }
      }
      for (const item of dto.items) {
        const conditionItemId = item.conditionKey ? (itemIdByKey.get(item.conditionKey) ?? null) : null;
        await tx.inspectionTemplateItem.update({
          where: { id: itemIdByKey.get(item.key)! },
          data: conditionItemId
            ? { conditionItemId, conditionOperator: item.conditionOperator ?? "IGUAL", conditionValue: item.conditionValue ?? "" }
            : { conditionItemId: null, conditionOperator: null, conditionValue: null },
        });
      }

      await this.log(
        tx,
        tenantId,
        target.id,
        userId,
        "ESTRUTURA_ALTERADA",
        `Estrutura salva: ${dto.sections.length} seção(ões) e ${dto.items.length} pergunta(s).`,
      );
      return tx.inspectionTemplate.findUniqueOrThrow({ where: { id: target.id }, include: FULL });
    });
  }

  /**
   * Ciclo de vida: rascunho → ativo ⇄ inativo → arquivado. Só modelo ativo aparece para aplicação.
   * Ativar exige uma estrutura válida.
   */
  async changeStatus(
    tenantId: string,
    id: string,
    status: ChecklistTemplateStatus,
    userId: string,
    assignments: RoleAssignmentClaim[],
  ) {
    const template = await this.loadWritable(tenantId, id, assignments);
    const from = template.status;
    if (from === status) return template;
    const allowed: Record<ChecklistTemplateStatus, ChecklistTemplateStatus[]> = {
      RASCUNHO: ["ATIVO", "ARQUIVADO"],
      ATIVO: ["INATIVO", "ARQUIVADO"],
      INATIVO: ["ATIVO", "ARQUIVADO"],
      ARQUIVADO: ["INATIVO"],
    };
    if (!allowed[from].includes(status)) {
      throw new BadRequestException(`Não é possível mudar o modelo de ${from.toLowerCase()} para ${status.toLowerCase()}.`);
    }
    if (status === "ATIVO") this.assertActivatable(template);

    return this.prisma.$transaction(async (tx) => {
      await tx.inspectionTemplate.update({ where: { id }, data: { status } });
      await this.log(tx, tenantId, id, userId, "STATUS_ALTERADO", `Situação alterada de ${from} para ${status}.`);
      return tx.inspectionTemplate.findUniqueOrThrow({ where: { id }, include: FULL });
    });
  }

  async remove(tenantId: string, id: string, userId: string, assignments: RoleAssignmentClaim[]) {
    await this.loadWritable(tenantId, id, assignments);
    await this.prisma.$transaction(async (tx) => {
      await tx.inspectionTemplate.update({ where: { id }, data: { active: false, status: "ARQUIVADO" } });
      await this.log(tx, tenantId, id, userId, "EXCLUIDO", "Modelo removido da lista.");
    });
    return { success: true };
  }

  /**
   * Edição pontual de uma pergunta (texto, seção, subtítulo e anexo) — mantida por compatibilidade.
   * Tipo e opções ficam travados porque aplicações já respondidas dependem deles.
   */
  async updateItem(
    tenantId: string,
    templateId: string,
    itemId: string,
    dto: UpdateInspectionTemplateItemDto,
    assignments: RoleAssignmentClaim[],
  ) {
    await this.loadWritable(tenantId, templateId, assignments);
    const item = await this.prisma.inspectionTemplateItem.findFirst({ where: { id: itemId, templateId } });
    if (!item) throw new NotFoundException("Item não encontrado neste modelo.");
    return this.prisma.inspectionTemplateItem.update({
      where: { id: itemId },
      data: { text: dto.text, blockLabel: dto.blockLabel, category: dto.category, allowPhoto: dto.allowPhoto },
    });
  }

  // ---------------------------------------------------------------- internos

  private async loadWritable(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_WRITE, tenantId);
    const template = await this.prisma.inspectionTemplate.findFirst({ where: { ...where, id }, include: FULL });
    if (!template) throw new NotFoundException("Modelo de checklist não encontrado.");
    return template;
  }

  /** CHK-0001, CHK-0002… por tenant (o maior número já usado + 1). */
  private async nextCode(tx: Prisma.TransactionClient, tenantId: string): Promise<string> {
    const rows = await tx.inspectionTemplate.findMany({ where: { tenantId, code: { startsWith: "CHK-" } }, select: { code: true } });
    const max = rows.reduce((m, r) => Math.max(m, Number(r.code!.slice(4)) || 0), 0);
    return `CHK-${String(max + 1).padStart(4, "0")}`;
  }

  private async log(
    tx: Prisma.TransactionClient,
    tenantId: string,
    templateId: string,
    userId: string,
    action: string,
    details: string,
  ) {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { name: true } });
    await tx.inspectionTemplateHistory.create({
      data: { tenantId, templateId, userId, userName: user?.name ?? null, action, details },
    });
  }

  /**
   * Devolve o modelo que deve receber a alteração. Se ele está ATIVO e já foi aplicado, cria uma nova versão
   * (cópia com versão+1), arquiva a anterior e devolve também o mapa de ids antigos → ids da cópia.
   */
  private async resolveEditable(tx: Prisma.TransactionClient, tenantId: string, template: FullTemplate, userId: string) {
    const sectionIds = new Map<string, string>();
    const itemIds = new Map<string, string>();
    if (template.status !== "ATIVO" || template._count.inspections === 0) {
      return { target: template, versioned: false, sectionIds, itemIds };
    }
    const next = await tx.inspectionTemplate.create({
      data: {
        tenantId,
        companyId: template.companyId,
        name: template.name,
        description: template.description,
        category: template.category,
        frequency: template.frequency,
        branchId: template.branchId,
        departmentId: template.departmentId,
        process: template.process,
        responsibleId: template.responsibleId,
        ncCreation: template.ncCreation,
        createdById: userId,
        code: template.code,
        version: template.version + 1,
        previousVersionId: template.id,
        status: "ATIVO",
      },
    });
    const maps = await this.copyStructure(tx, tenantId, template, next.id);
    maps.sections.forEach((v, k) => sectionIds.set(k, v));
    maps.items.forEach((v, k) => itemIds.set(k, v));
    await tx.inspectionTemplate.update({ where: { id: template.id }, data: { status: "ARQUIVADO" } });
    await this.log(tx, tenantId, template.id, userId, "NOVA_VERSAO", `Substituído pela versão ${next.version} (a versão ${template.version} foi arquivada e as aplicações já feitas continuam nela).`);
    await this.log(tx, tenantId, next.id, userId, "NOVA_VERSAO", `Versão ${next.version} criada a partir da versão ${template.version}.`);
    const target = await tx.inspectionTemplate.findUniqueOrThrow({ where: { id: next.id }, include: FULL });
    return { target, versioned: true, sectionIds, itemIds };
  }

  /** Copia seções e perguntas para outro modelo e devolve os mapas id antigo → id novo. */
  private async copyStructure(tx: Prisma.TransactionClient, tenantId: string, source: FullTemplate, targetId: string) {
    const sections = new Map<string, string>();
    const items = new Map<string, string>();
    for (const section of source.sections) {
      const created = await tx.inspectionTemplateSection.create({
        data: { tenantId, templateId: targetId, name: section.name, order: section.order },
      });
      sections.set(section.id, created.id);
    }
    for (const item of source.items) {
      const created = await tx.inspectionTemplateItem.create({
        data: {
          tenantId,
          templateId: targetId,
          sectionId: item.sectionId ? sections.get(item.sectionId) : null,
          order: item.order,
          text: item.text,
          instruction: item.instruction,
          responseType: item.responseType,
          category: item.category,
          options: item.options,
          blockLabel: item.blockLabel,
          allowPhoto: item.allowPhoto,
          allowComment: item.allowComment,
          allowActionPlan: item.allowActionPlan,
          required: item.required,
          weight: item.weight,
          scaleMin: item.scaleMin,
          scaleMax: item.scaleMax,
          conditionOperator: item.conditionOperator,
          conditionValue: item.conditionValue,
        },
      });
      items.set(item.id, created.id);
    }
    for (const item of source.items) {
      if (!item.conditionItemId) continue;
      const target = items.get(item.conditionItemId);
      if (target) await tx.inspectionTemplateItem.update({ where: { id: items.get(item.id)! }, data: { conditionItemId: target } });
    }
    return { sections, items };
  }

  private itemData(item: StructureItemDto, order: number, sectionIdByKey: Map<string, string>) {
    const isScale = item.responseType === "ESCALA";
    return {
      order,
      sectionId: item.sectionKey ? (sectionIdByKey.get(item.sectionKey) ?? null) : null,
      text: item.text.trim(),
      instruction: item.instruction?.trim() || null,
      responseType: item.responseType,
      options: CHOICE_TYPES.includes(item.responseType) ? (item.options ?? []).map((o) => o.trim()).filter(Boolean) : [],
      required: item.required ?? false,
      weight: item.weight ?? null,
      allowComment: item.allowComment ?? true,
      allowPhoto: item.allowPhoto ?? false,
      allowActionPlan: item.allowActionPlan ?? false,
      scaleMin: isScale ? (item.scaleMin ?? 1) : null,
      scaleMax: isScale ? (item.scaleMax ?? 5) : null,
      blockLabel: item.blockLabel ?? null,
      category: item.category ?? null,
    };
  }

  private validateStructure(dto: ReplaceChecklistStructureDto) {
    const sectionKeys = new Set(dto.sections.map((s) => s.key));
    if (sectionKeys.size !== dto.sections.length) throw new BadRequestException("Seções com a mesma chave.");
    const seen = new Set<string>();
    for (const [index, item] of dto.items.entries()) {
      const label = `Pergunta ${index + 1}`;
      if (seen.has(item.key)) throw new BadRequestException(`${label}: chave repetida.`);
      if (item.sectionKey && !sectionKeys.has(item.sectionKey)) throw new BadRequestException(`${label}: seção inexistente.`);
      if (CHOICE_TYPES.includes(item.responseType) && (item.options ?? []).map((o) => o.trim()).filter(Boolean).length < 2) {
        throw new BadRequestException(`${label}: informe pelo menos 2 opções.`);
      }
      if (item.responseType === "ESCALA" && (item.scaleMax ?? 5) <= (item.scaleMin ?? 1)) {
        throw new BadRequestException(`${label}: o máximo da escala deve ser maior que o mínimo.`);
      }
      if (item.conditionKey && !seen.has(item.conditionKey)) {
        throw new BadRequestException(`${label}: a regra condicional deve apontar para uma pergunta anterior.`);
      }
      seen.add(item.key);
    }
  }

  private assertActivatable(template: FullTemplate) {
    if (template.items.length === 0) {
      throw new BadRequestException("Adicione pelo menos uma pergunta antes de ativar o modelo.");
    }
    const empty = template.items.find((i) => i.text.trim().length < 2);
    if (empty) throw new BadRequestException("Há pergunta sem enunciado. Complete a estrutura antes de ativar.");
  }
}
