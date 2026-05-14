import { InputType, Field, Float, Int } from '@nestjs/graphql';
import { IsString, IsNumber, IsInt, Min, Max, IsOptional, IsBoolean } from 'class-validator';

@InputType()
export class CreateAlerteTrajetInput {
  @Field()
  @IsString()
  villeDepartNom: string;

  @Field(() => Float)
  @IsNumber()
  latitudeDepart: number;

  @Field(() => Float)
  @IsNumber()
  longitudeDepart: number;

  @Field()
  @IsString()
  villeArriveeNom: string;

  @Field(() => Float)
  @IsNumber()
  latitudeArrivee: number;

  @Field(() => Float)
  @IsNumber()
  longitudeArrivee: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(500)
  rayon: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  dateDepart?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  dateDepartMax?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  emailActif?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  pushActif?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  fcmToken?: string;
}