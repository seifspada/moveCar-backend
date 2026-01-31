import { Module } from '@nestjs/common';
import { PartenaireService } from './partenaire.service';
import { PartenaireController } from './partenaire.controller';

@Module({
  controllers: [PartenaireController],
  providers: [PartenaireService],
})
export class PartenaireModule {}
