import { Resolver, Query } from '@nestjs/graphql';
import { UseGuards, NotFoundException } from '@nestjs/common';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { GqlCurrentUser } from './decorators/gql-current-user.decorator';
import { UserType } from './dto/user.type';
import { PrismaService } from '../prisma/prisma.service';

@Resolver(() => UserType)
export class AuthResolver {
  constructor(private readonly prisma: PrismaService) {}

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
}
