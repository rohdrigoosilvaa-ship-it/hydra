import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Padrão do Express é 100kb — planilhas grandes (ex.: confirmação de
  // importação do inventário de riscos, com muitas linhas) estouram isso
  // e viram "request entity too large" sem essa configuração.
  app.use(json({ limit: "20mb" }));
  app.use(urlencoded({ extended: true, limit: "20mb" }));

  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix("api");

  const port = process.env.PORT ? Number(process.env.PORT) : 3333;
  await app.listen(port);
  console.log(`Hydra API rodando em http://localhost:${port}/api`);
}

bootstrap();
