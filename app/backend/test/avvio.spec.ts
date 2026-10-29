// Prova dello scheletro (passo 1.2): salute, Helmet, DTO, errori generici.
import 'dotenv/config';
import { Body, Controller, Get, Module, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { IsString } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Pubblica } from '../src/accesso';
import { configura } from '../src/main';
import { PrismaService } from '../src/prisma.service';

class Prova {
  @IsString() nome!: string;
}

@Controller('prova')
class ProvaController {
  @Post() @Pubblica() eco(@Body() b: Prova) {
    return b;
  }
  @Get('rotto') @Pubblica() rotto() {
    throw new Error('password=segreta nel messaggio interno');
  }
}

@Module({ imports: [AppModule], controllers: [ProvaController] })
class ProvaModule {}

let app: NestExpressApplication;
beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [ProvaModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
});
afterAll(() => app.close());

it('salute risponde e tocca il database', async () => {
  const r = await request(app.getHttpServer()).get('/api/salute').expect(200);
  expect(r.body).toEqual({ ok: true });
  expect(r.headers['x-content-type-options']).toBe('nosniff'); // Helmet
});

it('un campo non dichiarato nel DTO è rifiutato', async () => {
  await request(app.getHttpServer()).post('/api/prova').send({ nome: 'a', importo: 100 }).expect(400);
  const r = await request(app.getHttpServer()).post('/api/prova').send({ nome: 'a' }).expect(201);
  expect(r.body).toEqual({ nome: 'a' });
});

it("l'errore interno non esce verso il browser", async () => {
  const r = await request(app.getHttpServer()).get('/api/prova/rotto').expect(500);
  expect(r.body.message).toBe('Errore interno');
  expect(JSON.stringify(r.body)).not.toContain('segreta');
  expect(r.body.codice).toMatch(/^[0-9a-f-]{36}$/);
  // il codice ritrova l'evento errore.error nel registro (§15.2.7); poi lo si toglie con la pulizia (§15.7)
  const db = app.get(PrismaService);
  const ev = await db.registro.findFirstOrThrow({ where: { operazione_id: r.body.codice } });
  expect(ev).toMatchObject({ codice: 'errore.error', esito: 'errore', ip: null });
  expect(ev.dettaglio).toMatchObject({ rotta: '/api/prova/rotto', http_status: 500, errore: { classe: 'Error' } });
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.delete({ where: { id: ev.id } }),
  ]);
});

it('rotta sconosciuta: 404', () => request(app.getHttpServer()).get('/api/niente').expect(404));
