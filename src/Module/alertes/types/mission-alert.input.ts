import { InputType, Field, Float, Int } from '@nestjs/graphql';
import { IsString, IsNumber, IsInt, Min, Max, IsOptional, IsBoolean } from 'class-validator';

@InputType()
export class MissionAlertInput {
  // ── Champs communs ──────────────────────────────────────────
  @Field(() => Int)
  @IsInt()
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

  // ── Type GEOGRAPHIQUE ───────────────────────────────────────
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  villeNom?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  // ── Type TRAJET ─────────────────────────────────────────────
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  villeDepartNom?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  latitudeDepart?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  longitudeDepart?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  villeArriveeNom?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  latitudeArrivee?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  longitudeArrivee?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  dateDepart?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  dateDepartMax?: string;
}