// src/Module/mission-session/dto/mission-session.inputs.ts

import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

// ─────────────────────────────────────────
// START
// ─────────────────────────────────────────

@InputType()
export class StartMissionSessionInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  reservationId: string;

  @Field(() => Boolean)
  @IsBoolean()
  consentAccepted: boolean;

  @Field(() => Float)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitudeDebut: number;

  @Field(() => Float)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitudeDebut: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  kilometrageDebut?: number;
}

// ─────────────────────────────────────────
// END
// ─────────────────────────────────────────

@InputType()
export class EndMissionSessionInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @Field(() => Float)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitudeFin: number;

  @Field(() => Float)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitudeFin: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  kilometrageFin?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  commentaireFin?: string;
}