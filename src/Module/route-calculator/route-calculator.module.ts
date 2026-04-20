import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RouteCalculatorService } from './route-calculator.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
  ],
  providers: [RouteCalculatorService],
  exports:   [RouteCalculatorService],
})
export class RouteCalculatorModule {}