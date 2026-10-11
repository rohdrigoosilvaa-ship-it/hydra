import { IsDateString, IsNumber, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateInvoiceDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsString()
  @MinLength(2)
  description!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsDateString()
  dueDate!: string;
}
