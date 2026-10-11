import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { PgrAiService } from "./pgr-ai.service";
import {
  EvaluateRiskDto,
  ImproveActivityDescriptionDto,
  SuggestConsequencesDto,
  SuggestControlsDto,
  SuggestHazardsDto,
  SuggestSourcesDto,
} from "./dto/pgr-ai.dto";

@Controller("pgr/ai")
export class PgrAiController {
  constructor(private readonly ai: PgrAiService) {}

  @Post("suggest-hazards")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  suggestHazards(@Body() dto: SuggestHazardsDto) {
    return this.ai.suggestHazards(dto);
  }

  @Post("suggest-consequences")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  suggestConsequences(@Body() dto: SuggestConsequencesDto) {
    return this.ai.suggestConsequences(dto);
  }

  @Post("suggest-sources")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  suggestSources(@Body() dto: SuggestSourcesDto) {
    return this.ai.suggestSources(dto);
  }

  @Post("suggest-controls")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  suggestControls(@Body() dto: SuggestControlsDto) {
    return this.ai.suggestControls(dto);
  }

  @Post("improve-activity")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  improveActivity(@Body() dto: ImproveActivityDescriptionDto) {
    return this.ai.improveActivityDescription(dto);
  }

  @Post("evaluate-risk")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  evaluateRisk(@Body() dto: EvaluateRiskDto) {
    return this.ai.evaluateRisk(dto);
  }

  @Get("analyze-inconsistencies/:pgrId")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  analyzeInconsistencies(@CurrentUser() user: HydraRequestUser, @Param("pgrId") pgrId: string) {
    return this.ai.analyzeInconsistencies(user.tenantId, pgrId, user.assignments);
  }
}
