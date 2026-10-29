import { Controller, Get, Module } from '@nestjs/common';
import { PrismaModule, PrismaService } from './prisma.service';

@Controller('salute')
class SaluteController {
  constructor(private readonly db: PrismaService) {}

  // Per Caddy e per l'avvio: risponde senza sessione e non dice altro che "su" (§3.4).
  @Get()
  async salute() {
    await this.db.$queryRaw`SELECT 1`;
    return { ok: true };
  }
}

@Module({ imports: [PrismaModule], controllers: [SaluteController] })
export class AppModule {}
