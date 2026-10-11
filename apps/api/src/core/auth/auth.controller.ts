import { Body, Controller, Post, Req, Res, UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";
import { Public } from "../decorators/public.decorator";
import { CurrentUser } from "../decorators/current-user.decorator";
import { AuthService } from "./auth.service";
import { ForgotPasswordDto, LoginDto, ResetPasswordDto } from "./dto/login.dto";
import type { HydraRequestUser } from "./jwt.types";

const REFRESH_COOKIE = "hydra_refresh";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      dto.tenantSlug,
      dto.email,
      dto.password,
      req.ip,
    );
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post("refresh")
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = req.cookies?.[REFRESH_COOKIE];
    if (!rawToken) throw new UnauthorizedException("Sessão não encontrada.");

    const result = await this.authService.refresh(rawToken, req.ip);
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post("logout")
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() _user: HydraRequestUser,
  ) {
    const rawToken = req.cookies?.[REFRESH_COOKIE];
    if (rawToken) await this.authService.logout(rawToken);
    res.clearCookie(REFRESH_COOKIE);
    return { success: true };
  }

  @Public()
  @Post("forgot-password")
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.requestPasswordReset(dto.tenantSlug, dto.email);
    return { success: true };
  }

  @Public()
  @Post("reset-password")
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { success: true };
  }
}

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: expiresAt,
    path: "/api/auth",
  });
}
