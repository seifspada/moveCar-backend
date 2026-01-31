import { Test, TestingModule } from '@nestjs/testing';
import { AdherentController } from './adherent.controller';
import { AdherentService } from './adherent.service';

describe('AdherentController', () => {
  let controller: AdherentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdherentController],
      providers: [AdherentService],
    }).compile();

    controller = module.get<AdherentController>(AdherentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
