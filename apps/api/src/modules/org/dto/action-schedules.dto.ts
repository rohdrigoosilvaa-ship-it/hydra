import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min, MinLength, ValidateNested } from "class-validator";

export class ActionScheduleItemDto {
  @IsString() @MinLength(1) what!: string;
  @IsOptional() @IsString() why?: string;
  @IsOptional() @IsString() place?: string;
  @IsOptional() @IsString() how?: string;
  @IsOptional() @IsString() responsible?: string;
  @IsOptional() @IsNumber() @Min(0) totalCost?: number | null;
  @IsOptional() @IsString() followUp?: string;
  @IsOptional() @IsInt() @Min(0) @Max(5) priority?: number;
  @IsArray() @ArrayMaxSize(60) @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { each: true }) months!: string[];
}

export class SaveActionScheduleDto {
  @IsString() companyId!: string;
  @IsString() @MinLength(2) name!: string;
  @IsString() @MinLength(2) author!: string;
  @IsDateString() elaboratedAt!: string;
  @IsIn(["GERAL", "W5H2"]) type!: "GERAL" | "W5H2";
  /** Primeiro dia do mês inicial (AAAA-MM-01). */
  @IsDateString() startMonth!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(300) @ValidateNested({ each: true }) @Type(() => ActionScheduleItemDto)
  items!: ActionScheduleItemDto[];
}

export class SetActionScheduleModeDto {
  @IsIn(["DRAFT", "DEFINED"]) mode!: "DRAFT" | "DEFINED";
}

export class ImportActionScheduleDto {
  @IsString() sourceId!: string;
  @IsString() targetCompanyId!: string;
}
