import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { HttpModule } from '@nestjs/axios';  // ✅ Importer
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';
import { RouteCalculatorModule } from '../route-calculator/route-calculator.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    RouteCalculatorModule,
    HttpModule,  // ✅ Ajouter HttpModule
    MulterModule.register({
      dest: './uploads/documents',
    }),
  ],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}
