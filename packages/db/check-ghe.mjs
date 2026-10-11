import { PrismaClient } from "@hydra/db";

const prisma = new PrismaClient();
const total = await prisma.ghe.count();
const nullPgr = await prisma.ghe.count({ where: { pgrId: null } });
console.log(`total=${total} pgrId_null=${nullPgr}`);
await prisma.$disconnect();
