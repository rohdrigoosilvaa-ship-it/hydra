import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import type { HydraRole, ScopeType, UserStatus } from "@hydra/db";

const HYDRA_ROLES: HydraRole[] = [
  "SUPER_ADMIN",
  "ADMIN_EMPRESA",
  "GESTOR_SST",
  "ENGENHEIRO",
  "TECNICO_SST",
  "MEDICO",
  "ENFERMEIRO",
  "RH",
  "GESTOR",
  "COLABORADOR",
  "PRESTADOR",
  "CLINICA",
  "FINANCEIRO",
  "COMERCIAL",
];

/** Só TENANT (acesso a todas as empresas) e COMPANY (uma empresa) — filial/unidade
 * ficam para um refinamento futuro do cadastro de usuários. */
const ASSIGNABLE_SCOPE_TYPES: ScopeType[] = ["TENANT", "COMPANY"];

const USER_STATUSES: UserStatus[] = ["ACTIVE", "INVITED", "SUSPENDED"];

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsIn(HYDRA_ROLES)
  role!: HydraRole;

  @IsIn(ASSIGNABLE_SCOPE_TYPES)
  scopeType!: ScopeType;

  /** Obrigatório quando scopeType = COMPANY (o id da empresa). */
  @IsOptional()
  @IsString()
  scopeId?: string;
}

export class SetUserStatusDto {
  @IsIn(USER_STATUSES)
  status!: UserStatus;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsIn(HYDRA_ROLES)
  role?: HydraRole;

  @IsOptional()
  @IsIn(ASSIGNABLE_SCOPE_TYPES)
  scopeType?: ScopeType;

  /** Obrigatório quando scopeType = COMPANY (o id da empresa). */
  @IsOptional()
  @IsString()
  scopeId?: string;
}
