import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import type { CreateCrmLeadDto, CreateCrmTaskDto } from "./dto/crm.dto";
import type { CrmStage } from "@hydra/db";

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  listLeads(tenantId: string) {
    return this.prisma.crmLead.findMany({
      where: { tenantId },
      include: { tasks: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  createLead(tenantId: string, dto: CreateCrmLeadDto, userId: string) {
    return this.prisma.crmLead.create({ data: { ...dto, tenantId, createdById: userId } });
  }

  async updateStage(tenantId: string, id: string, stage: CrmStage) {
    const lead = await this.prisma.crmLead.findFirst({ where: { id, tenantId } });
    if (!lead) throw new NotFoundException("Lead não encontrado.");
    return this.prisma.crmLead.update({ where: { id }, data: { stage } });
  }

  async createTask(tenantId: string, dto: CreateCrmTaskDto) {
    const lead = await this.prisma.crmLead.findFirst({ where: { id: dto.leadId, tenantId } });
    if (!lead) throw new NotFoundException("Lead não encontrado.");
    return this.prisma.crmTask.create({
      data: { ...dto, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined, tenantId },
    });
  }

  async completeTask(tenantId: string, id: string) {
    const task = await this.prisma.crmTask.findFirst({ where: { id, tenantId } });
    if (!task) throw new NotFoundException("Tarefa não encontrada.");
    return this.prisma.crmTask.update({ where: { id }, data: { done: true } });
  }
}
