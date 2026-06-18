import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { SalesService } from '../services/sales.service';
import { CreateSaleDto } from '../dto/create-sale.dto';
import { UpdateSaleDto } from '../dto/update-sale.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserData } from '../../../common/decorators/current-user.decorator';

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @RequirePermission('ventas', 'crear')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createSaleDto: CreateSaleDto, @CurrentUser() user: CurrentUserData) {
    return this.salesService.create(createSaleDto, user);
  }

  @Get()
  @RequirePermission('ventas', 'leer')
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('cliente_id') cliente_id?: string,
    @Query('estado') estado?: string,
    @Query('fecha_desde') fecha_desde?: string,
    @Query('fecha_hasta') fecha_hasta?: string,
    @Query('metodo_pago') metodo_pago?: string,
    @Query('canal') canal?: string,
  ) {
    return this.salesService.findAll(
      user,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      cliente_id,
      estado,
      fecha_desde,
      fecha_hasta,
      metodo_pago,
      canal,
    );
  }

  @Get(':id')
  @RequirePermission('ventas', 'leer')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.salesService.findOne(id, user);
  }

  @Put(':id')
  @RequirePermission('ventas', 'actualizar')
  async update(
    @Param('id') id: string,
    @Body() updateData: UpdateSaleDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.salesService.update(id, updateData, user);
  }

  @Delete(':id')
  @RequirePermission('ventas', 'eliminar')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.salesService.remove(id, user);
  }
}
