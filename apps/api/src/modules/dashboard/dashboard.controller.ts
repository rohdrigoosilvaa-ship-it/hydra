import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /** Sem @RequirePermission — qualquer usuário autenticado pode ver, cada um
   * enxerga colaboradores conforme o próprio escopo (ver DashboardService). */
  @Get("companies")
  companies(@CurrentUser() user: HydraRequestUser) {
    return this.dashboard.companiesSummary(user.tenantId, user.assignments);
  }

  /** KPIs do dashboard executivo — ver ExecutiveSummary no service. */
  @Get("summary")
  summary(@CurrentUser() user: HydraRequestUser) {
    return this.dashboard.executiveSummary(user.tenantId, user.assignments);
  }
}
