import { Controller, Get, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AccessoController, AccessoGuard, Pubblica } from './accesso';
import { ErroriFilter } from './errori.filter';
import { PrismaModule, PrismaService } from './prisma.service';

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

@Module({
  imports: [PrismaModule],
  controllers: [SaluteController, AccessoController],
  providers: [
    { provide: APP_FILTER, useClass: ErroriFilter }, // con Prisma iniettato: scrive nel registro
    { provide: APP_GUARD, useClass: AccessoGuard }, // su tutte le rotte: permesso dichiarato o negata
  ],
})
export class AppModule {}
