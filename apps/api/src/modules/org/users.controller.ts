import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { UsersService } from "./users.service";
import { CreateUserDto, SetUserStatusDto, UpdateUserDto } from "./dto/users.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ORG_USER_MANAGE)
  list(@CurrentUser() user: HydraRequestUser) {
    return this.users.list(user.tenantId, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.ORG_USER_MANAGE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateUserDto) {
    return this.users.create(user.tenantId, dto, user.assignments);
  }

  @Patch(":id/status")
  @RequirePermission(PERMISSIONS.ORG_USER_MANAGE)
  setStatus(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Body() dto: SetUserStatusDto,
  ) {
    return this.users.setStatus(user.tenantId, id, dto.status, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.ORG_USER_MANAGE)
  update(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(user.tenantId, id, dto, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.ORG_USER_MANAGE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.users.remove(user.tenantId, id, user.id, user.assignments);
  }
}
