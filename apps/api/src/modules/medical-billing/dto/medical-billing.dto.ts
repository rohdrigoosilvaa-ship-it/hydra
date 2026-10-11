import { IsNumber, IsOptional, IsString, Matches, Min } from "class-validator";

export class CreateMedicalBillDto {
  @IsString()
  providerId!: string;

  @IsString()
  companyId!: string;

  @Matches(/^\d{4}-\d{2}$/, { message: "referenceMonth deve estar no formato AAAA-MM" })
  referenceMonth!: string;

  @IsNumber()
  @Min(0)
  totalAmount!: number;
}

export class GlossMedicalBillDto {
  @IsNumber()
  @Min(0)
  glossAmount!: number;

  @IsOptional()
  @IsString()
  glossReason?: string;
}
