// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { AuthController } from './auth.controller'; // ← AJOUTER CET IMPORT
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from 'src/Module/email/email.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController], // ← AJOUTER CETTE LIGNE
  providers: [AuthService, AuthResolver],
  exports: [AuthService],
})
export class AuthModule {}