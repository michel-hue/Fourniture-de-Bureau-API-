import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const isProduction = process.env.NODE_ENV === 'production';

  // --- Origines CORS ---
  // CORS_ORIGIN : liste séparée par des virgules (ex: https://www.workstore.ci,https://app.workstore.ci)
  // Fallbacks : prod → https://www.workstore.ci, dev → http://localhost:5173
  const corsOriginEnv = configService
    .get<string>('CORS_ORIGIN')
    ?.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const corsOrigins =
    corsOriginEnv && corsOriginEnv.length > 0
      ? corsOriginEnv
      : isProduction
        ? ['https://www.workstore.ci']
        : ['http://localhost:5173'];

  // --- Sécurité : forcer HTTPS en production ---
  if (isProduction) {
    // Redirection HTTP -> HTTPS
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        next();
        return;
      }
      res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    });

    // HSTS : force le navigateur à utiliser HTTPS pendant 1 an
    app.use((_req: Request, res: Response, next: NextFunction) => {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
      next();
    });
  }

  // Helmet : headers de sécurité complets (CSP, nosniff, X-Frame-Options, etc.)
  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://fonts.googleapis.com',
              ],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
              scriptSrc: ["'self'"],
              connectSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS pour le frontend (Vite en dev, domaine WorkStore en production)
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Limite de taille des requêtes (anti DoS)
  app.useBodyParser('json', { limit: '100kb' });

  // Préfixe global API
  app.setGlobalPrefix('api');

  // Validation globale des DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger : uniquement hors production
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('WorkStore API')
      .setDescription('API e-commerce de fournitures de bureau — Côte d’Ivoire')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('docs', app, document);
  }

  const port = Number(process.env.PORT) || 3000;

  await app.listen(port);

  const apiUrl = `http://localhost:${port}/api`;
  const docsUrl = `http://localhost:${port}/docs`;

  console.log('');
  console.log('🚀 Application démarrée');
  console.log(`📌 API      : ${apiUrl}`);
  console.log(`📚 Swagger  : ${docsUrl}`);
}

void bootstrap();
