import "reflect-metadata";
import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
// Importa do build já compilado (dist), gerado pelo `nest build` durante o buildCommand da Vercel.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AppModule } = require("../dist/app.module");

const server = express();
let bootstrapped: Promise<void> | null = null;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ["error", "warn"],
  });

  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix("api");

  await app.init();
}

export default async function handler(req: Request, res: Response) {
  if (!bootstrapped) bootstrapped = bootstrap();
  await bootstrapped;
  server(req, res);
}
