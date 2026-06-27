import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { RepairsService } from '../services/repairs.service';
import { CreateRepairDto } from '../dto/create-repair.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserData } from '../../../common/decorators/current-user.decorator';

@Controller('repairs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RepairsController {
  constructor(private readonly repairsService: RepairsService) {}

  @Post()
  @RequirePermission('reparaciones', 'crear')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createRepairDto: CreateRepairDto, @CurrentUser() user: CurrentUserData) {
    return this.repairsService.create(createRepairDto, user);
  }

  @Get()
  @RequirePermission('reparaciones', 'leer')
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('estado') estado?: string,
    @Query('cliente_id') cliente_id?: string,
    @Query('tecnico_id') tecnico_id?: string,
    @Query('prioridad') prioridad?: string,
    @Query('fecha_desde') fecha_desde?: string,
    @Query('fecha_hasta') fecha_hasta?: string,
  ) {
    return this.repairsService.findAll(
      user,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      estado,
      cliente_id,
      tecnico_id,
      prioridad,
      fecha_desde,
      fecha_hasta,
    );
  }

  @Get(':id')
  @RequirePermission('reparaciones', 'leer')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.repairsService.findOne(id, user);
  }

  @Put(':id')
  @RequirePermission('reparaciones', 'actualizar')
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.repairsService.update(id, updateData, user);
  }

  @Put(':id/estado')
  @RequirePermission('reparaciones', 'actualizar')
  async updateStatus(
    @Param('id') id: string,
    @Body('estado') estado: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.repairsService.updateStatus(id, estado, user);
  }

  @Put(':id/completar')
  @RequirePermission('reparaciones', 'actualizar')
  async completeRepair(
    @Param('id') id: string,
    @Body() completeData: any,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.repairsService.completeRepair(id, completeData, user);
  }

  @Delete(':id')
  @RequirePermission('reparaciones', 'eliminar')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.repairsService.remove(id, user);
  }
}
