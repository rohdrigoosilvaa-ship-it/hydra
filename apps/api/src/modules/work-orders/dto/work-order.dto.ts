import { IsDateString, IsIn, IsNotEmpty, IsString } from "class-validator";

export class CreateWorkOrderDto {
  @IsString()
  companyId!: string;

  @IsString()
  employeeId!: string;

  @IsDateString()
  issueDate!: string;
}

export class SignWorkOrderDto {
  /** Data URL "data:image/png;base64,..." — canvas assinado (desenho ou nome digitado). */
  @IsString()
  @IsNotEmpty()
  signatureImageBase64!: string;

  @IsIn(["DRAWN", "TYPED"])
  signatureMethod!: "DRAWN" | "TYPED";
}
