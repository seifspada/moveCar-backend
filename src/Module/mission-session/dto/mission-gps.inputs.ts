import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

// ========================================
// 📍 Enregistrer position GPS
// ========================================

@InputType()
export class RecordGPSLocationInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @Field(() => Float)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @Field(() => Float)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  altitude?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  bearing?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  speed?: number;
}

// ========================================
// 🚨 Signaler incident manuel
// ========================================

@InputType()
export class ReportIncidentInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  typeIncident: string;  // IncidentType comme string

  @Field()
  @IsString()
  @IsNotEmpty()
  description: string;

  @Field(() => Float)
  @IsNumber()
  latitude: number;

  @Field(() => Float)
  @IsNumber()
  longitude: number;

  // Photo optionnelle de l'incident
  @Field(() => String, { nullable: true })
  @IsOptional()
  photoIncident?: string;  // base64
}

// ========================================
// ✏️ Finaliser mission avec signature
// ========================================

@InputType()
export class FinalizeMissionInput {
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

  // Signature électronique du client
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  signatureClient?: string;  // SVG en base64

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  nomClientSignature?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  commentaireFin?: string;

  // Photos finales (optionnel si déjà uploadées)
  @Field(() => [String], { nullable: true })
  @IsOptional()
  photosPost?: string[];
}