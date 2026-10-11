import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { Public } from "../../core/decorators/public.decorator";
import { EpiSignaturesService } from "./epi-signatures.service";
import { SignEpiDeliveryDto } from "./dto/epi.dto";

/** Rota pública (sem login) usada pelo colaborador pra ler e assinar a ficha de EPI via QR code/link. */
@Controller("epi/assinatura")
export class EpiSigningPublicController {
  constructor(private readonly signatures: EpiSignaturesService) {}

  @Public()
  @Get(":token")
  getSummary(@Param("token") token: string) {
    return this.signatures.getPublicSummary(token);
  }

  @Public()
  @Post(":token")
  sign(@Param("token") token: string, @Body() dto: SignEpiDeliveryDto, @Req() req: Request) {
    return this.signatures.signByToken(token, dto, req.ip, req.headers["user-agent"]);
  }
}
