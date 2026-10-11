import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { Public } from "../../core/decorators/public.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { PsychosocialService } from "./psychosocial.service";
import {
  CreatePsychosocialQuestionDto,
  CreatePsychosocialSurveyDto,
  SendInvitesDto,
  SubmitResponseDto,
  UpdatePsychosocialQuestionDto,
  UpdatePsychosocialSurveyDto,
} from "./dto/psychosocial.dto";

@Controller("psicossocial")
export class PsychosocialController {
  constructor(private readonly psychosocial: PsychosocialService) {}

  @Get("surveys")
  @RequirePermission(PERMISSIONS.PSYCHOSOCIAL_READ)
  list(@CurrentUser() user: HydraRequestUser) {
    return this.psychosocial.list(user.tenantId, user.assignments);
  }

  @Get("surveys/:id")
  @RequirePermission(PERMISSIONS.PSYCHOSOCIAL_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.psychosocial.get(user.tenantId, id, user.assignments);
  }

  @Post("surveys")
  @RequirePermission(PERMISSIONS.PSYCHOSOCIAL_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreatePsychosocialSurveyDto) {
    return this.psychosocial.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Patch("surveys/:id")
  @RequirePermission(PERMISSIONS.PSYCHOSOCIAL_WRITE)
  update(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: UpdatePsychosocialSurveyDto) {
    return this.psychosocial.update(user.tenantId, id, dto, user.assignments);
  }

  @Post("questions")
  @RequirePermission(PERMISSIONS.PSYCHOSOCIAL_WRITE)
  addQuestion(@CurrentUser() user: HydraRequestUser, @Body() dto: CreatePsychosocialQuestionDto) {
    return this.psychosocial.addQuestion(user.tenantId, dto, user.assignments);
  }

  @Patch("questions/:id")
  @RequirePermission(PERMISSIONS.PSYCHOSOCIAL_WRITE)
  updateQuestion(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Body() dto: UpdatePsychosocialQuestionDto,
  ) {
    return this.psychosocial.updateQuestion(user.tenantId, id, dto, user.assignments);
  }

  @Delete("questions/:id")
  @RequirePermission(PERMISSIONS.PSYCHOSOCIAL_WRITE)
  removeQuestion(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.psychosocial.removeQuestion(user.tenantId, id, user.assignments);
  }

  @Post("surveys/:id/invites")
  @RequirePermission(PERMISSIONS.PSYCHOSOCIAL_WRITE)
  sendInvites(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: SendInvitesDto) {
    return this.psychosocial.sendInvites(user.tenantId, id, dto, user.assignments);
  }

  @Public()
  @Get("responder/:token")
  getPublicSurvey(@Param("token") token: string) {
    return this.psychosocial.getPublicSurvey(token);
  }

  @Public()
  @Post("responder/:token")
  submitResponse(@Param("token") token: string, @Body() dto: SubmitResponseDto) {
    return this.psychosocial.submitResponse(token, dto);
  }
}
