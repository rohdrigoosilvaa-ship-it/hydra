import type { HydraRole, ScopeType } from "@hydra/db";

export interface RoleAssignmentClaim {
  role: HydraRole;
  scopeType: ScopeType;
  scopeId: string | null;
}

/** Payload assinado no access token. */
export interface AccessTokenPayload {
  sub: string; // userId
  tenantId: string;
  email: string;
  assignments: RoleAssignmentClaim[];
}

/** O que fica disponível em `req.hydraUser` depois do AuthGuard. */
export interface HydraRequestUser {
  id: string;
  tenantId: string;
  email: string;
  assignments: RoleAssignmentClaim[];
}
