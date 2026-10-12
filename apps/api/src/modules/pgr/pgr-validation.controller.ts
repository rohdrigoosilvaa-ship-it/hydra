import { Controller, Get, Param } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { PgrValidationService } from "./pgr-validation.service";

@Controller("pgr")
export class PgrValidationController {
  constructor(private readonly validation: PgrValidationService) {}

  /** Checklist de validação do PGR (regras sobre os dados já cadastrados). */
  @Get(":pgrId/inconsistencies")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  inconsistencies(@CurrentUser() user: HydraRequestUser, @Param("pgrId") pgrId: string) {
    return this.validation.analyzeInconsistencies(user.tenantId, pgrId, user.assignments);
  }
}
