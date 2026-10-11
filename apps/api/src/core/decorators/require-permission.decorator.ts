import { SetMetadata } from "@nestjs/common";
import type { Permission } from "../permissions/permissions";

export const PERMISSION_KEY = "requiredPermission";

/** Ex.: @RequirePermission('org.employee:write') — checado pelo PolicyGuard. */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(PERMISSION_KEY, permission);
