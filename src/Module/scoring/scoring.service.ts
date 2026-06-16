import { Injectable } from '@nestjs/common';
import { CreateScoringDto } from './dto/create-scoring.dto';
import { UpdateScoringDto } from './dto/update-scoring.dto';

@Injectable()
export class ScoringService {
  create(createScoringDto: CreateScoringDto) {
    return 'This action adds a new scoring';
  }

  findAll() {
    return `This action returns all scoring`;
  }

  findOne(id: number) {
    return `This action returns a #${id} scoring`;
  }

  update(id: number, updateScoringDto: UpdateScoringDto) {
    return `This action updates a #${id} scoring`;
  }

  remove(id: number) {
    return `This action removes a #${id} scoring`;
  }
}
