import { PartialType } from '@nestjs/mapped-types';
import { CreateScoresMlDto } from './create-scores-ml.dto';

export class UpdateScoresMlDto extends PartialType(CreateScoresMlDto) {}
