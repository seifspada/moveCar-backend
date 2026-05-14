import { ObjectType, Field, ID } from '@nestjs/graphql';
import { AlerteGeographique } from './alerte-geographique.type';

@ObjectType()
export class NotificationAlerte {
  @Field(() => ID)
  id: string;

  @Field()
  alerteId: string;

  @Field()
  missionId: string;

  @Field()
  emailEnvoye: boolean;

  @Field()
  pushEnvoye: boolean;

  @Field({ nullable: true })
  dateEnvoi?: Date;

  @Field()
  dateCreation: Date;

  @Field(() => AlerteGeographique, { nullable: true })
  alerte?: AlerteGeographique;
}