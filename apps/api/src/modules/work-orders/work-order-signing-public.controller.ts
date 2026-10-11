import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { Public } from "../../core/decorators/public.decorator";
import { WorkOrderSignaturesService } from "./work-order-signatures.service";
import { SignWorkOrderDto } from "./dto/work-order.dto";

/** Rota pública (sem login) usada pelo colaborador pra ler e assinar a Ordem de Serviço via QR code/link. */
@Controller("work-orders/assinatura")
export class WorkOrderSigningPublicController {
  constructor(private readonly signatures: WorkOrderSignaturesService) {}

  @Public()
  @Get(":token")
  getSummary(@Param("token") token: string) {
    return this.signatures.getPublicSummary(token);
  }

  @Public()
  @Post(":token")
  sign(@Param("token") token: string, @Body() dto: SignWorkOrderDto, @Req() req: Request) {
    return this.signatures.signByToken(token, dto, req.ip, req.headers["user-agent"]);
  }
}
