import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";

@Injectable()
export class ContractTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.contractTemplate.findMany({
      where: { tenantId, active: true },
      orderBy: { name: "asc" },
      include: {
        clauses: { orderBy: { order: "asc" } },
        serviceItems: { orderBy: { order: "asc" } },
      },
    });
  }

  async get(tenantId: string, id: string) {
    const template = await this.prisma.contractTemplate.findFirst({
      where: { tenantId, id },
      include: {
        clauses: { orderBy: { order: "asc" } },
        serviceItems: { orderBy: { order: "asc" } },
      },
    });
    if (!template) throw new NotFoundException("Modelo de contrato não encontrado.");
    return template;
  }
}
