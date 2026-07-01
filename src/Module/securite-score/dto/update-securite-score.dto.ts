import { PartialType } from '@nestjs/mapped-types';
import { CreateSecuriteScoreDto } from './create-securite-score.dto';

export class UpdateSecuriteScoreDto extends PartialType(CreateSecuriteScoreDto) {}
