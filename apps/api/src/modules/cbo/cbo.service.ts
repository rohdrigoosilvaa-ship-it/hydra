import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";

@Injectable()
export class CboService {
  constructor(private readonly prisma: PrismaService) {}

  /** Catálogo público, sem tenantId — busca por código ou palavra-chave no título. */
  search(query?: string) {
    const term = query?.trim();
    return this.prisma.cboOccupation.findMany({
      where: term
        ? {
            OR: [
              { code: { contains: term, mode: "insensitive" } },
              { title: { contains: term, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { title: "asc" },
      take: 50,
    });
  }
}
