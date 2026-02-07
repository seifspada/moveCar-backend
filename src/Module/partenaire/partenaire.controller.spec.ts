import { Test, TestingModule } from '@nestjs/testing';
import { PartenaireService } from './partenaire.service';
import { PartenaireController } from './partenaire.controller';

describe('PartenaireController', () => {
  let controller: PartenaireController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartenaireController],
      providers: [PartenaireService],
    }).compile();

    controller = module.get<PartenaireController>(PartenaireController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
