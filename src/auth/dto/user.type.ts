import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('User')
export class UserType {
  @Field(() => Int)  // ← Changer de ID à Int
  id: number;        // ← Changer de string à number

  @Field()
  email: string;

  @Field({ nullable: true })
  photo?: string;
}
