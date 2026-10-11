import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "hydra-demo" },
    update: {},
    create: {
      name: "Hydra Demo",
      slug: "hydra-demo",
    },
  });

  const company = await prisma.company.upsert({
    where: { id: `${tenant.id}-demo-company` },
    update: {},
    create: {
      id: `${tenant.id}-demo-company`,
      tenantId: tenant.id,
      name: "Empresa Demonstração",
    },
  }).catch(async () => {
    const existing = await prisma.company.findFirst({ where: { tenantId: tenant.id } });
    if (existing) return existing;
    return prisma.company.create({
      data: { tenantId: tenant.id, name: "Empresa Demonstração" },
    });
  });

  const passwordHash = await argon2.hash(process.env.SEED_ADMIN_PASSWORD ?? "hydra123");

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@hydra.local" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@hydra.local",
      name: "Administrador Hydra",
      passwordHash,
    },
  });

  // upsert com scopeId nulo não funciona em chave composta (limitação do Prisma
  // com unique constraints envolvendo colunas anuláveis) — checa e cria manualmente.
  const existingAssignment = await prisma.roleAssignment.findFirst({
    where: { userId: admin.id, tenantId: tenant.id, role: "SUPER_ADMIN", scopeType: "TENANT" },
  });
  if (!existingAssignment) {
    await prisma.roleAssignment.create({
      data: {
        tenantId: tenant.id,
        userId: admin.id,
        role: "SUPER_ADMIN",
        scopeType: "TENANT",
      },
    });
  }

  console.log("Seed concluído:");
  console.log(`  tenant: ${tenant.slug} (${tenant.id})`);
  console.log(`  company: ${company.name}`);
  console.log(`  admin login: admin@hydra.local / ${process.env.SEED_ADMIN_PASSWORD ?? "hydra123"}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
