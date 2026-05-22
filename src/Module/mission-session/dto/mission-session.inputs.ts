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
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EtapeSession, TypeMediaSession } from '../entities/mission-session-media.entity';

// ─────────────────────────────────────────
// MEDIA INPUT - Photo à uploader
// ─────────────────────────────────────────

@InputType()
export class MediaUploadInput {
  @Field(() => TypeMediaSession)
  @IsEnum(TypeMediaSession)
  typeMedia: TypeMediaSession;

  @Field()
  @IsString()
  @IsNotEmpty()
  base64Data: string; // Données base64 de l'image

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  typeContenu?: string; // mime type (image/jpeg, etc.)
}

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

  // ✅ PHOTOS OBLIGATOIRES avant le démarrage
  @Field(() => [MediaUploadInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaUploadInput)
  photosPre?: MediaUploadInput[];
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

  // ✅ PHOTOS FINALES obligatoires après livraison
  @Field(() => [MediaUploadInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaUploadInput)
  photosPost?: MediaUploadInput[];
}

// ─────────────────────────────────────────
// UPLOAD PHOTOS
// ─────────────────────────────────────────

@InputType()
export class UploadMissionPhotosInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @Field(() => EtapeSession)
  @IsEnum(EtapeSession)
  etape: EtapeSession;

  @Field(() => [MediaUploadInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MediaUploadInput)
  medias: MediaUploadInput[];
}
