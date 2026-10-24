import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { CompaniesService } from "./companies.service";
import { CreateCompanyDto } from "./dto/org.dto";

@Controller("companies")
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ORG_COMPANY_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("withCounts") withCounts?: string) {
    return withCounts === "true"
      ? this.companies.listWithCounts(user.tenantId, user.assignments)
      : this.companies.list(user.tenantId, user.assignments);
  }

  @Get(":id/summary")
  @RequirePermission(PERMISSIONS.ORG_COMPANY_READ)
  summary(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.companies.summary(user.tenantId, id, user.assignments);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.ORG_COMPANY_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.companies.get(user.tenantId, id, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.ORG_COMPANY_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateCompanyDto) {
    return this.companies.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.ORG_COMPANY_WRITE)
  update(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Body() dto: Partial<CreateCompanyDto>,
  ) {
    return this.companies.update(user.tenantId, id, dto, user.id, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.ORG_COMPANY_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.companies.remove(user.tenantId, id, user.id, user.assignments);
  }

  @Post(":id/logo")
  @RequirePermission(PERMISSIONS.ORG_COMPANY_WRITE)
  @UseInterceptors(FileInterceptor("file"))
  uploadLogo(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("Envie um arquivo.");
    return this.companies.uploadLogo(user.tenantId, id, file, user.id, user.assignments);
  }

  @Delete(":id/logo")
  @RequirePermission(PERMISSIONS.ORG_COMPANY_WRITE)
  removeLogo(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.companies.removeLogo(user.tenantId, id, user.id, user.assignments);
  }
}
