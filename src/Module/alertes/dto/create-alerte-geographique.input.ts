import { InputType, Field, Float, Int } from '@nestjs/graphql';
import { IsString, IsNumber, IsInt, Min, Max, IsOptional, IsBoolean } from 'class-validator';

@InputType()
export class CreateAlerteGeographiqueInput {
  @Field()
  @IsString()
  villeNom: string;

  @Field(() => Float)
  @IsNumber()
  latitude: number;

  @Field(() => Float)
  @IsNumber()
  longitude: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(500)
  rayon: number;

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

  @Field({ nullable: true })    // ✅ ajout
  @IsOptional()
  @IsString()
  dateDepart?: string;

  @Field({ nullable: true })    // ✅ ajout
  @IsOptional()
  @IsString()
  dateDepartMax?: string;
}

