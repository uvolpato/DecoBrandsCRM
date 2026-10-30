import { Controller, Get, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AccessoController, AccessoGuard, Pubblica } from './accesso';
import { ErroriFilter } from './errori.filter';
import { PrismaModule, PrismaService } from './prisma.service';
import { UtentiController } from './utenti';

@Controller('salute')
class SaluteController {
  constructor(private readonly db: PrismaService) {}

  // Per Caddy e per l'avvio: risponde senza sessione e non dice altro che "su" (§3.4).
  @Get()
  @Pubblica()
  async salute() {
    await this.db.$queryRaw`SELECT 1`;
    return { ok: true };
  }
}

/** Limite ai tentativi, solo dove c'è TentativiGuard (D-41): per persona e, più largo, per IP;
 *  ogni operazione (entra, dimenticata, …) ha i suoi contatori, così chi riempie una pagina non
 *  blocca le altre. Finestra in minuti; finita la finestra il contatore riparte da zero. */
export function limiti(env = process.env) {
  const n = (v: string | undefined, d: number) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : d);
  const ttl = n(env.TENTATIVI_MINUTI, 15) * 60_000;
  return [
    { name: 'persona', ttl, limit: n(env.TENTATIVI, 10) },
    { name: 'ip', ttl, limit: n(env.TENTATIVI_IP, 100), getTracker: (req: Record<string, unknown>) => String(req.ip) },
  ];
}

@Module({
  imports: [PrismaModule, ThrottlerModule.forRootAsync({ useFactory: () => limiti() })],
  controllers: [SaluteController, AccessoController, UtentiController],
  providers: [
    { provide: APP_FILTER, useClass: ErroriFilter }, // con Prisma iniettato: scrive nel registro
    { provide: APP_GUARD, useClass: AccessoGuard }, // su tutte le rotte: permesso dichiarato o negata
  ],
})
export class AppModule {}
