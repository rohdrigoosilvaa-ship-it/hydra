import { Controller, Get, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { SearchService } from "./search.service";

@Controller("search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  /** Sem @RequirePermission fixo — cada categoria só é buscada se o usuário
   * tiver a permissão correspondente (ver SearchService). */
  @Get()
  get(@CurrentUser() user: HydraRequestUser, @Query("q") q = "") {
    return this.search.search(user.tenantId, user.assignments, q);
  }
}
