import { IsDateString, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import type { EmployeeDocumentType } from "@hydra/db";

const DOCUMENT_TYPES: EmployeeDocumentType[] = ["RG", "ASO", "PPP", "TREINAMENTO", "OUTRO"];

export class CreateEmployeeDocumentDto {
  @IsString()
  employeeId!: string;

  @IsIn(DOCUMENT_TYPES)
  type!: EmployeeDocumentType;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
