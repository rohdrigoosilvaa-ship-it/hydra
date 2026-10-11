import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { put } from "@vercel/blob";
import { createHash } from "crypto";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { ContractsService } from "./contracts.service";
import { ContractsPdfService } from "./contracts-pdf.service";
import { CreateContractDto, UpdateContractDto } from "./dto/contract.dto";

@Controller("contracts")
export class ContractsController {
  constructor(
    private readonly contracts: ContractsService,
    private readonly contractsPdf: ContractsPdfService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.CONTRACT_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId?: string) {
    return this.contracts.list(user.tenantId, user.assignments, companyId);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.CONTRACT_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.contracts.get(user.tenantId, id, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.CONTRACT_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateContractDto) {
    return this.contracts.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.CONTRACT_WRITE)
  update(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: UpdateContractDto) {
    return this.contracts.update(user.tenantId, id, dto, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.CONTRACT_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.contracts.remove(user.tenantId, id, user.assignments);
  }

  @Get(":id/preview")
  @RequirePermission(PERMISSIONS.CONTRACT_READ)
  preview(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.contractsPdf.preview(user.tenantId, id, user.assignments);
  }

  @Post(":id/pdf")
  @RequirePermission(PERMISSIONS.CONTRACT_WRITE)
  async generatePdf(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    const { buffer, filename } = await this.contractsPdf.generate(user.tenantId, id, user.assignments);
    const blob = await put(`contracts/${user.tenantId}/${id}/${Date.now()}-${filename}`, buffer, {
      access: "public",
      contentType: "application/pdf",
    });
    const pdfSha256 = createHash("sha256").update(buffer).digest("hex");
    return this.contracts.savePdfUrl(user.tenantId, id, blob.url, pdfSha256);
  }
}
