import { Controller, Get, Post, Put, Delete, Body, Param, Query, Patch, UseGuards, HttpCode, HttpStatus, UseInterceptors } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { CacheInterceptor } from '../../common/interceptors/cache.interceptor';

@Controller('shipments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post()
  @RequirePermission('envios', 'crear')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createShipmentDto: CreateShipmentDto, @CurrentUser() user: CurrentUserData) {
    return this.shipmentsService.create(createShipmentDto, user);
  }

  @Get()
  @RequirePermission('envios', 'leer')
  @UseInterceptors(CacheInterceptor)
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('estado') estado?: string,
    @Query('cliente_id') cliente_id?: string,
  ) {
    return this.shipmentsService.findAll(
      user,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      estado,
      cliente_id,
    );
  }

  @Get(':id')
  @RequirePermission('envios', 'leer')
  @UseInterceptors(CacheInterceptor)
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.shipmentsService.findOne(id, user);
  }

  @Put(':id')
  @RequirePermission('envios', 'actualizar')
  async update(
    @Param('id') id: string,
    @Body() updateShipmentDto: UpdateShipmentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.shipmentsService.update(id, updateShipmentDto, user);
  }

  @Patch(':id/status')
  @RequirePermission('envios', 'actualizar')
  async updateStatus(
    @Param('id') id: string,
    @Body('estado') estado: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.shipmentsService.updateStatus(id, estado, user);
  }

  @Delete(':id')
  @RequirePermission('envios', 'eliminar')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.shipmentsService.remove(id, user);
  }
}
