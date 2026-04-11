
import {
  Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@ApiTags('Admins')
@Controller('admins')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ✅ Route 1 : Créer un admin
  @Post()
  @ApiOperation({ summary: 'Créer un nouvel admin' })
  @ApiResponse({ status: 201, description: 'Admin créé avec succès' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }

  // ✅ Route 2 : Liste des admins
  @Get()
  @ApiOperation({ summary: 'Récupérer tous les admins' })
  @ApiResponse({ status: 200, description: 'Liste des admins' })
  findAll() {
    return this.adminService.findAll();
  }

  // ✅ Route 3 : Un seul admin
  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un admin par ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Admin trouvé' })
  @ApiResponse({ status: 404, description: 'Admin introuvable' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findOne(id);
  }

  // ✅ Route 4 : Modifier un admin
  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un admin' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Admin mis à jour' })
  @ApiResponse({ status: 404, description: 'Admin introuvable' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateAdminDto: UpdateAdminDto) {
    return this.adminService.update(id, updateAdminDto);
  }

  // ✅ Route 5 : Supprimer un admin
  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un admin' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Admin supprimé' })
  @ApiResponse({ status: 404, description: 'Admin introuvable' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.remove(id);
  }
}