import { Controller } from '@nestjs/common';
import { PartenaireService } from './partenaire.service';

@Controller('partenaire')
export class PartenaireController {
  constructor(private readonly partenaireService: PartenaireService) {}
}
