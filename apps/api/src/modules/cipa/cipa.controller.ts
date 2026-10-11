import { Body, Controller, Get, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { CipaService } from "./cipa.service";
import { CreateCipaMemberDto, CreateCipaTermDto } from "./dto/cipa.dto";

@Controller("cipa/terms")
export class CipaController {
  constructor(private readonly cipa: CipaService) {}

  @Get()
  @RequirePermission(PERMISSIONS.CIPA_READ)
  list(@CurrentUser() user: HydraRequestUser) {
    return this.cipa.listTerms(user.tenantId, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.CIPA_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateCipaTermDto) {
    return this.cipa.createTerm(user.tenantId, dto, user.assignments);
  }

  @Post("members")
  @RequirePermission(PERMISSIONS.CIPA_WRITE)
  addMember(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateCipaMemberDto) {
    return this.cipa.addMember(user.tenantId, dto, user.assignments);
  }
}
