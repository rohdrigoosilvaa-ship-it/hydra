import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { EvidenceService } from "./evidence.service";
import { CreateEvidenceDto } from "./dto/field-ops.dto";
import type { EvidenceSourceType } from "@hydra/db";

@Controller("field-ops/evidence")
export class EvidenceController {
  constructor(private readonly evidence: EvidenceService) {}

  @Get()
  @RequirePermission(PERMISSIONS.OCCURRENCE_READ)
  list(
    @CurrentUser() user: HydraRequestUser,
    @Query("companyId") companyId?: string,
    @Query("sourceType") sourceType?: EvidenceSourceType,
    @Query("sourceId") sourceId?: string,
  ) {
    return this.evidence.list(user.tenantId, user.assignments, { companyId, sourceType, sourceId });
  }

  @Post()
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  @UseInterceptors(FileInterceptor("file"))
  upload(
    @CurrentUser() user: HydraRequestUser,
    @Body() dto: CreateEvidenceDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("Envie um arquivo.");
    return this.evidence.upload(user.tenantId, dto, file, user.id, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.evidence.remove(user.tenantId, id, user.assignments);
  }
}
