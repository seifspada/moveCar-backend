import { Test, TestingModule } from '@nestjs/testing';
import { DemandeAdherentController } from './demande-adherent.controller';
import { DemandeAdherentService } from './demande-adherent.service';

describe('DemandeAdherentController', () => {
  let controller: DemandeAdherentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemandeAdherentController],
      providers: [DemandeAdherentService],
    }).compile();

    controller = module.get<DemandeAdherentController>(DemandeAdherentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
