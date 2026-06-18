import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('expenses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @RequirePermission('gastos', 'crear')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createExpenseDto: CreateExpenseDto, @CurrentUser() user: CurrentUserData) {
    return this.expensesService.create(createExpenseDto, user);
  }

  @Get()
  @RequirePermission('gastos', 'leer')
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoria_id') categoria_id?: string,
    @Query('estado') estado?: string,
    @Query('fecha_desde') fecha_desde?: string,
    @Query('fecha_hasta') fecha_hasta?: string,
    @Query('metodo_pago') metodo_pago?: string,
  ) {
    return this.expensesService.findAll(
      user,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      categoria_id,
      estado,
      fecha_desde,
      fecha_hasta,
      metodo_pago,
    );
  }

  @Get('categories')
  @RequirePermission('gastos', 'leer')
  async getCategories(@CurrentUser() user: CurrentUserData) {
    return this.expensesService.getCategories(user);
  }

  @Get('report')
  @RequirePermission('gastos', 'leer')
  async getReport(@CurrentUser() user: CurrentUserData, @Query('mes') mes: string) {
    return this.expensesService.getReport(user, mes);
  }

  @Get(':id')
  @RequirePermission('gastos', 'leer')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.expensesService.findOne(id, user);
  }

  @Put(':id')
  @RequirePermission('gastos', 'actualizar')
  async update(
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.expensesService.update(id, updateExpenseDto, user);
  }

  @Delete(':id')
  @RequirePermission('gastos', 'eliminar')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.expensesService.remove(id, user);
  }
}
