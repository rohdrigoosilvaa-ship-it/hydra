import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { Public } from "../../core/decorators/public.decorator";
import { ContractSignaturesService } from "./contract-signatures.service";
import { SignContractDto } from "./dto/contract-signature.dto";

/** Rota pública (sem login) usada pelo CONTRATANTE pra ler e assinar o contrato via link. */
@Controller("assinatura")
export class ContractSigningPublicController {
  constructor(private readonly signatures: ContractSignaturesService) {}

  @Public()
  @Get(":token")
  getSummary(@Param("token") token: string) {
    return this.signatures.getPublicSummary(token);
  }

  @Public()
  @Post(":token")
  sign(@Param("token") token: string, @Body() dto: SignContractDto, @Req() req: Request) {
    return this.signatures.signAsContratanteByToken(token, dto, req.ip, req.headers["user-agent"]);
  }
}
