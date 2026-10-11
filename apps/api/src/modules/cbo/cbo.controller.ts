import { Controller, Get, Query } from "@nestjs/common";
import { CboService } from "./cbo.service";

@Controller("cbo")
export class CboController {
  constructor(private readonly cbo: CboService) {}

  /** Sem @RequirePermission — qualquer usuário autenticado pode consultar
   * (é um catálogo público de referência, não dado sensível do tenant). */
  @Get()
  search(@Query("search") search?: string) {
    return this.cbo.search(search);
  }
}
