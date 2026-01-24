// src/auth/auth.resolver.ts
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards, NotFoundException } from '@nestjs/common';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { GqlCurrentUser } from './decorators/gql-current-user.decorator';
import { UserType } from './dto/user.type';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

@Resolver(() => UserType)
export class AuthResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService, // Ajout du service
  ) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => UserType, { name: 'currentUser' })
  async getCurrentUser(@GqlCurrentUser() user: any): Promise<UserType> {
    const userData = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        photo: true,
      },
    });

    if (!userData) {
      throw new NotFoundException('User not found');
    }

    return userData;
  }

 

 // src/auth/auth.resolver.ts

@Mutation(() => String)
async forgetPassword(@Args('email') email: string) {
  const result = await this.authService.forgetPassword(email);
  return result.message;
}

@Mutation(() => String)
async verifyResetCode(
  @Args('email') email: string,
  @Args('code') code: string,
) {
  const result = await this.authService.verifyResetCode(email, code);
  return result.message;
}

@Mutation(() => String)
async resetPassword(
  @Args('email') email: string,
  @Args('code') code: string,
  @Args('newPassword') newPassword: string,
) {
  const result = await this.authService.resetPassword(email, code, newPassword);
  return result.message;
}
}
