import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ClientsService } from '../services/clients.service';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserData } from '../../../common/decorators/current-user.decorator';

@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @RequirePermission('clientes', 'crear')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createClientDto: CreateClientDto, @CurrentUser() user: CurrentUserData) {
    return this.clientsService.create(createClientDto, user);
  }

  @Get()
  @RequirePermission('clientes', 'leer')
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('estado') estado?: string,
  ) {
    return this.clientsService.findAll(
      user,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      estado,
    );
  }

  @Get(':id')
  @RequirePermission('clientes', 'leer')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.clientsService.findOne(id, user);
  }

  @Put(':id')
  @RequirePermission('clientes', 'actualizar')
  async update(
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.clientsService.update(id, updateClientDto, user);
  }

  @Delete(':id')
  @RequirePermission('clientes', 'eliminar')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.clientsService.remove(id, user);
  }

  @Get(':id/compras')
  @RequirePermission('clientes', 'leer')
  async getPurchaseHistory(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.clientsService.getPurchaseHistory(id, user);
  }
}
