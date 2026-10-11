import { IsIn, IsObject, IsOptional, IsString } from "class-validator";
import type { EsocialEventType } from "@hydra/db";

const EVENT_TYPES: EsocialEventType[] = ["S2210", "S2220", "S2221", "S2230", "S2240"];

export class CreateEsocialEventDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsIn(EVENT_TYPES)
  eventType!: EsocialEventType;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
