import { randomBytes, createHash } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import type { AccessTokenPayload, RoleAssignmentClaim } from "./jwt.types";

const REFRESH_TTL_DAYS = Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30);

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    tenantId: string;
    assignments: RoleAssignmentClaim[];
    /** null = acesso administrativo (todas as empresas do tenant). */
    company: { id: string; name: string } | null;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(tenantSlug: string, email: string, password: string, ip?: string): Promise<LoginResult> {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant || tenant.status !== "ACTIVE") {
      throw new UnauthorizedException("Empresa não encontrada ou inativa.");
    }

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      include: { roleAssignments: true },
    });
    if (!user || user.status !== "ACTIVE" || user.deletedAt) {
      throw new UnauthorizedException("Usuário ou senha inválidos.");
    }

    const passwordOk = await argon2.verify(user.passwordHash, password);
    if (!passwordOk) {
      throw new UnauthorizedException("Usuário ou senha inválidos.");
    }

    const assignments: RoleAssignmentClaim[] = user.roleAssignments.map((a) => ({
      role: a.role,
      scopeType: a.scopeType,
      scopeId: a.scopeId,
    }));

    const accessToken = await this.signAccessToken({
      sub: user.id,
      tenantId: tenant.id,
      email: user.email,
      assignments,
    });
    const { token: refreshToken, expiresAt } = await this.issueRefreshToken(user.id, ip);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      refreshExpiresAt: expiresAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: tenant.id,
        assignments,
        company: await this.resolvePrimaryCompany(tenant.id, assignments),
      },
    };
  }

  async refresh(rawToken: string, ip?: string): Promise<LoginResult> {
    const tokenHash = hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { roleAssignments: true } } },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Sessão expirada — faça login novamente.");
    }

    // rotação: revoga o antigo, emite um novo
    const { token: newRefreshToken, expiresAt } = await this.issueRefreshToken(
      stored.userId,
      ip,
    );
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedBy: newRefreshToken.slice(0, 12) },
    });

    const user = stored.user;
    const assignments: RoleAssignmentClaim[] = user.roleAssignments.map((a) => ({
      role: a.role,
      scopeType: a.scopeType,
      scopeId: a.scopeId,
    }));
    const accessToken = await this.signAccessToken({
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      assignments,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      refreshExpiresAt: expiresAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: user.tenantId,
        assignments,
        company: await this.resolvePrimaryCompany(user.tenantId, assignments),
      },
    };
  }

  /**
   * Empresa "ativa" do usuário para exibição na UI — não é usada para
   * controle de acesso (isso continua vindo de `assignments`, resolvido no
   * backend a cada request). Um vínculo TENANT significa acesso a todas as
   * empresas (perfil administrador); o primeiro vínculo COMPANY encontrado
   * define a empresa exibida para os demais perfis.
   */
  private async resolvePrimaryCompany(
    tenantId: string,
    assignments: RoleAssignmentClaim[],
  ): Promise<{ id: string; name: string } | null> {
    if (assignments.some((a) => a.scopeType === "TENANT")) return null;
    const companyId = assignments.find((a) => a.scopeType === "COMPANY" && a.scopeId)?.scopeId;
    if (!companyId) return null;
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true, name: true },
    });
    return company ?? null;
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await this.prisma.refreshToken
      .updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
  }

  /**
   * Sempre retorna sem erro, exista ou não o tenant/e-mail — evita que a
   * resposta revele quais e-mails têm conta (enumeração de usuários).
   * Sem provedor de e-mail configurado neste MVP: o link fica no log do
   * servidor (visível nos logs da função Vercel), pronto para plugar um
   * serviço real de e-mail depois.
   */
  async requestPasswordReset(tenantSlug: string, email: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant || tenant.status !== "ACTIVE") return;

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });
    if (!user || user.status !== "ACTIVE" || user.deletedAt) return;

    const rawToken = randomBytes(32).toString("hex");
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5174";
    console.log(`[Hydra] Link de redefinição de senha para ${email}: ${webOrigin}/redefinir-senha?token=${rawToken}`);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const stored = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Link de redefinição inválido ou expirado.");
    }

    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
      // troca de senha encerra todas as sessões ativas do usuário
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  private signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_TTL ?? "15m",
    });
  }

  private async issueRefreshToken(userId: string, ip?: string) {
    const token = randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt,
        createdByIp: ip,
      },
    });
    return { token, expiresAt };
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
