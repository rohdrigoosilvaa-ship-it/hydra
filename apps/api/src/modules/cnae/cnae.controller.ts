import { Controller, Get, Query } from "@nestjs/common";
import { CnaeService } from "./cnae.service";

@Controller("cnae")
export class CnaeController {
  constructor(private readonly cnae: CnaeService) {}

  /** Catálogo público de referência (NR-04, Quadro I): qualquer usuário autenticado pode consultar. */
  @Get()
  async search(@Query("search") search?: string) {
    const [items, total] = await Promise.all([this.cnae.search(search), this.cnae.count()]);
    return { items, loaded: total > 0 };
  }
}
