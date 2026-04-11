import { Test, TestingModule } from '@nestjs/testing';
import { DocumentProcessingService } from './document-processing.service';

describe('DocumentProcessingService', () => {
  let service: DocumentProcessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentProcessingService],
    }).compile();

    service = module.get<DocumentProcessingService>(DocumentProcessingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
