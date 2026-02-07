import { Module } from '@nestjs/common';
import { PartenaireController } from './partenaire.controller';
import { PartenaireService } from './partenaire.service';


@Module({
  controllers: [PartenaireController],
  providers: [PartenaireService],
})
export class PartenaireModule {}
