import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

// Impostazioni comuni all'avvio e alle prove (supertest): un solo posto.
export function configura(app: NestExpressApplication) {
  app.setGlobalPrefix('api');
  app.set('trust proxy', 1); // dietro Caddy (§3.4)
  app.use(helmet());
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET non definita in .env');
  // Sessioni sul server, tabella sessioni (§3.3): nel cookie solo l'identificativo firmato
  const Store = connectPgSimple(session);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const chiudi = app.close.bind(app);
  app.close = async () => { await chiudi(); await pool.end(); }; // il pool delle sessioni è fuori da Nest
  app.use(
    session({
      store: new Store({ pool, tableName: 'sessioni' }),
      name: 'decobrands.sid',
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false, // nessuna sessione per chi non è entrato
      rolling: true,
      cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 3600 * 1000 },
    }),
  );
  // CSRF: chi ha una sessione manda il token avuto da /api/accesso/io in x-csrf-token su ogni
  // richiesta che modifica. Senza sessione non c'è niente da rubare: decide il guard (401).
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || !req.session.utente_id) return next();
    if (req.session.csrf && req.get('x-csrf-token') === req.session.csrf) return next();
    res.status(403).json({ statusCode: 403, message: 'Token di sicurezza mancante o scaduto: ricarica la pagina' });
  });
  // whitelist + forbidNonWhitelisted: il server accetta solo i campi dichiarati nei DTO (V12, D-28)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  return app;
}

async function avvia() {
  const app = configura(await NestFactory.create<NestExpressApplication>(AppModule));
  const porta = Number(process.env.PORT ?? 8002);
  await app.listen(porta, '127.0.0.1'); // solo locale: dall'esterno si passa da Caddy
  console.log(`Decobrands API su http://127.0.0.1:${porta}/api`);
}

if (require.main === module) void avvia();
