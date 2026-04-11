import { Test, TestingModule } from '@nestjs/testing';
import { DocumentProcessingController } from './document-processing.controller';
import { DocumentProcessingService } from './document-processing.service';

describe('DocumentProcessingController', () => {
  let controller: DocumentProcessingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentProcessingController],
      providers: [DocumentProcessingService],
    }).compile();

    controller = module.get<DocumentProcessingController>(DocumentProcessingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
