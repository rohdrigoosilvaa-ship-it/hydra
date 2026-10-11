import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";

@Injectable()
export class EpiCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.epiCatalogItem.findMany({
      where: { tenantId, active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }
}
