import { PartialType } from '@nestjs/mapped-types';
import { CreateScoringDto } from './create-scoring.dto';

export class UpdateScoringDto extends PartialType(CreateScoringDto) {}
