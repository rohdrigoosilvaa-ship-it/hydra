import { IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class CreateEpiDeliveryDto {
  @IsString()
  companyId!: string;

  @IsString()
  employeeId!: string;

  @IsDateString()
  deliveryDate!: string;
}

export class CreateEpiDeliveryItemDto {
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
  @IsString()
  quantity?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  periodicityMonths?: number;

  @IsOptional()
  @IsString()
  observation?: string;
}

export class UpdateEpiDeliveryDto {
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;
}

export class UpdateEpiDeliveryItemDto {
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
  @IsString()
  quantity?: string | null;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  periodicityMonths?: number | null;

  @IsOptional()
  @IsString()
  observation?: string | null;
}

export class SignEpiDeliveryDto {
  /** Data URL "data:image/png;base64,..." — canvas assinado (desenho ou nome digitado). */
  @IsString()
  @IsNotEmpty()
  signatureImageBase64!: string;

  @IsIn(["DRAWN", "TYPED"])
  signatureMethod!: "DRAWN" | "TYPED";
}

export class CreateEpiStockItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  ca?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEpiStockItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  ca?: string | null;

  @IsOptional()
  @IsString()
  category?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  /** null remove a validade. */
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
