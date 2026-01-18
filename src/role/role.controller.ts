import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('Roles')
@ApiBearerAuth('Bearer')
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les rôles' })
  @ApiResponse({ status: 200, description: 'Liste des rôles' })
  async findAll() {
    return this.roleService.findAll(); // ← Changé de getAllRoles à findAll
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un rôle par ID' })
  @ApiResponse({ status: 200, description: 'Rôle trouvé' })
  @ApiResponse({ status: 404, description: 'Rôle non trouvé' })
  async findOne(@Param('id') id: string) {
    return this.roleService.findOne(+id); // ← Changé de getRoleById à findOne
  }

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau rôle' })
  @ApiResponse({ status: 201, description: 'Rôle créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async create(@Body() createRoleDto: CreateRoleDto) { // ← Utiliser DTO au lieu de name
    return this.roleService.create(createRoleDto); // ← Changé de createRole à create
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un rôle' })
  @ApiResponse({ status: 200, description: 'Rôle mis à jour' })
  @ApiResponse({ status: 404, description: 'Rôle non trouvé' })
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) { // ← Utiliser DTO
    return this.roleService.update(+id, updateRoleDto); // ← Changé de updateRole à update
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un rôle' })
  @ApiResponse({ status: 200, description: 'Rôle supprimé' })
  @ApiResponse({ status: 404, description: 'Rôle non trouvé' })
  async remove(@Param('id') id: string) {
    return this.roleService.remove(+id); // ← Changé de deleteRole à remove
  }
}
