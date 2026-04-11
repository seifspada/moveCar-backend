import { Field, Int, ObjectType } from "@nestjs/graphql";
import { MissionCardType } from "./mission-minimal.type";

// Type pour la réponse paginée
@ObjectType()
export class MissionsPaginatedResponse {
  @Field(() => [MissionCardType])
  missions: MissionCardType[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  pageSize: number;

  @Field(() => Int)
  totalPages: number;
}