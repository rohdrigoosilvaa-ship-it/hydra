import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { BranchesService } from "./branches.service";
import { CreateBranchDto } from "./dto/org.dto";

@Controller("branches")
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ORG_BRANCH_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId?: string) {
    return this.branches.list(user.tenantId, user.assignments, companyId);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.ORG_BRANCH_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.branches.get(user.tenantId, id, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.ORG_BRANCH_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateBranchDto) {
    return this.branches.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.ORG_BRANCH_WRITE)
  update(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Body() dto: Partial<CreateBranchDto>,
  ) {
    return this.branches.update(user.tenantId, id, dto, user.id, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.ORG_BRANCH_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.branches.remove(user.tenantId, id, user.id, user.assignments);
  }
}
