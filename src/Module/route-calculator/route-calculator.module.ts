import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RouteCalculatorService } from './route-calculator.service';
import { RouteCalculatorController } from './route-calculator.controller';

@Module({
  imports: [HttpModule],
  controllers: [RouteCalculatorController],
  providers: [RouteCalculatorService],
  exports: [RouteCalculatorService],
})
export class RouteCalculatorModule {}
