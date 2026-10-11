import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class CreatePositionRequiredEpiDto {
  @IsOptional()
  @IsString()
  epiCatalogItemId?: string;

  @IsString()
  @IsNotEmpty()
  epiName!: string;

  @IsOptional()
  @IsString()
  ca?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  periodicityMonths?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePositionRequiredEpiDto {
  @IsOptional()
  @IsString()
  epiCatalogItemId?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  epiName?: string;

  @IsOptional()
  @IsString()
  ca?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  periodicityMonths?: number | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
