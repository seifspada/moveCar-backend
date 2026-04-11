import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminResolver } from './admin.resolver';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [AdminService,AdminResolver],
  exports: [AdminService],
})
export class AdminModule {}