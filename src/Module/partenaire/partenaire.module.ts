import { Module } from '@nestjs/common';
import { PartenaireService } from './partenaire.service';
import { PartenaireController } from './partenaire.controller';
import { PartenaireResolver } from './partenaire.resolver';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [PartenaireController],
  providers: [PartenaireService, PartenaireResolver, PrismaService],
  exports: [PartenaireService],
})
export class PartenaireModule {}
