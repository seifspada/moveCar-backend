import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SecuriteScoreService } from './securite-score.service';
import { CreateSecuriteScoreDto } from './dto/create-securite-score.dto';
import { UpdateSecuriteScoreDto } from './dto/update-securite-score.dto';

@Controller('securite-score')
export class SecuriteScoreController {
  constructor(private readonly securiteScoreService: SecuriteScoreService) {}

  @Post()
  create(@Body() createSecuriteScoreDto: CreateSecuriteScoreDto) {
    return this.securiteScoreService.create(createSecuriteScoreDto);
  }

  @Get()
  findAll() {
    return this.securiteScoreService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.securiteScoreService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSecuriteScoreDto: UpdateSecuriteScoreDto) {
    return this.securiteScoreService.update(+id, updateSecuriteScoreDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.securiteScoreService.remove(+id);
  }
}
