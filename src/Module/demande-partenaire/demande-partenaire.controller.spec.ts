import { Test, TestingModule } from '@nestjs/testing';
import { DemandePartenaireController } from './demande-partenaire.controller';
import { DemandePartenaireService } from './demande-partenaire.service';

describe('DemandePartenaireController', () => {
  let controller: DemandePartenaireController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemandePartenaireController],
      providers: [DemandePartenaireService],
    }).compile();

    controller = module.get<DemandePartenaireController>(DemandePartenaireController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
