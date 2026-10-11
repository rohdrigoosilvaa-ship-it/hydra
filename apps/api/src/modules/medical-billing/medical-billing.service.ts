import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateMedicalBillDto, GlossMedicalBillDto } from "./dto/medical-billing.dto";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";

@Injectable()
export class MedicalBillingService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.MEDICAL_BILL_READ, tenantId);
    return this.prisma.medicalBill.findMany({
      where,
      include: { provider: true },
      orderBy: { submittedAt: "desc" },
    });
  }

  create(tenantId: string, dto: CreateMedicalBillDto, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.MEDICAL_BILL_WRITE, dto.companyId);
    return this.prisma.medicalBill.create({ data: { ...dto, tenantId, createdById: userId } });
  }

  async approve(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.MEDICAL_BILL_APPROVE, tenantId);
    const bill = await this.prisma.medicalBill.findFirst({ where: { ...where, id } });
    if (!bill) throw new NotFoundException("Conta médica não encontrada.");
    return this.prisma.medicalBill.update({
      where: { id },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
  }

  async gloss(tenantId: string, id: string, dto: GlossMedicalBillDto, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.MEDICAL_BILL_APPROVE, tenantId);
    const bill = await this.prisma.medicalBill.findFirst({ where: { ...where, id } });
    if (!bill) throw new NotFoundException("Conta médica não encontrada.");
    return this.prisma.medicalBill.update({
      where: { id },
      data: { status: "GLOSSED", glossAmount: dto.glossAmount, glossReason: dto.glossReason },
    });
  }
}
