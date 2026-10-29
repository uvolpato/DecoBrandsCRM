import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ErroriFilter } from './errori.filter';

// Impostazioni comuni all'avvio e alle prove (supertest): un solo posto.
export function configura(app: NestExpressApplication) {
  app.setGlobalPrefix('api');
  app.set('trust proxy', 1); // dietro Caddy (§3.4)
  app.use(helmet());
  // whitelist + forbidNonWhitelisted: il server accetta solo i campi dichiarati nei DTO (V12, D-28)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new ErroriFilter());
  return app;
}

async function avvia() {
  const app = configura(await NestFactory.create<NestExpressApplication>(AppModule));
  const porta = Number(process.env.PORT ?? 8002);
  await app.listen(porta, '127.0.0.1'); // solo locale: dall'esterno si passa da Caddy
  console.log(`Decobrands API su http://127.0.0.1:${porta}/api`);
}

if (require.main === module) void avvia();
