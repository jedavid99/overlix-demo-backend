import { Controller, Get, Post, Put, Delete, Body, Param, Query, Patch, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { Request } from 'express';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermission('productos', 'crear')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createProductDto: CreateProductDto, @CurrentUser() user: CurrentUserData) {
    return this.productsService.create(createProductDto, user);
  }

  @Get()
  @RequirePermission('productos', 'leer')
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('categoria_id') categoria_id?: string,
    @Query('estado') estado?: string,
    @Query('tipo_producto') tipo_producto?: string,
  ) {
    return this.productsService.findAll(
      user,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      categoria_id,
      estado,
      tipo_producto,
    );
  }

  @Get('alertas/bajo-stock')
  @RequirePermission('productos', 'leer')
  async getLowStockAlerts(@CurrentUser() user: CurrentUserData) {
    return this.productsService.getLowStockAlerts(user);
  }

  @Get(':id')
  @RequirePermission('productos', 'leer')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData, @Req() req: Request) {
    return this.productsService.findOne(id, user, req);
  }

  @Put(':id')
  @RequirePermission('productos', 'actualizar')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.productsService.update(id, updateProductDto, user);
  }

  @Patch(':id/stock')
  @RequirePermission('productos', 'actualizar')
  async adjustStock(
    @Param('id') id: string,
    @Body() adjustStockDto: AdjustStockDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.productsService.adjustStock(id, adjustStockDto, user);
  }

  @Delete(':id')
  @RequirePermission('productos', 'eliminar')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.productsService.remove(id, user);
  }
}
