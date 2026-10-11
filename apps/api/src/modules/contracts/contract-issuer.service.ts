import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import type { UpsertContractIssuerDto } from "./dto/contract.dto";

@Injectable()
export class ContractIssuerService {
  constructor(private readonly prisma: PrismaService) {}

  get(tenantId: string) {
    return this.prisma.contractIssuer.findUnique({ where: { tenantId } });
  }

  upsert(tenantId: string, dto: UpsertContractIssuerDto) {
    return this.prisma.contractIssuer.upsert({
      where: { tenantId },
      create: { ...dto, tenantId },
      update: dto,
    });
  }
}
