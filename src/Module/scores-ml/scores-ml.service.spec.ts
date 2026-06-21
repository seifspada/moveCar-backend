import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { ScoresMlService } from './scores-ml.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ScoresMlService', () => {
  let service: ScoresMlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        ScoresMlService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ScoresMlService>(ScoresMlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
