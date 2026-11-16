import { Global, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// Sessione in UTC (D-181 §19): l'adattatore @prisma/adapter-pg scrive le Date senza fuso e rilegge
// i timestamptz senza fuso; entrambi suppongono che la sessione sia UTC. Con la sessione del server
// (Europe/Berlin) ogni ora scritta da Node perde un'ora e ogni ora letta ne guadagna una (i campi
// `ts` del database risultavano nel futuro). Le date di lavoro restano in ora italiana: il codice le
// calcola sempre con `Europe/Rome` (giornoRoma, AT TIME ZONE 'Europe/Rome').
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL non definita in .env');
    super({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, options: '-c TimeZone=UTC' }) });
  }

  onModuleDestroy() {
    return this.$disconnect();
  }
}

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
