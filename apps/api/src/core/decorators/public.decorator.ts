import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Libera um endpoint do AuthGuard global — usar só em login/refresh/health. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
