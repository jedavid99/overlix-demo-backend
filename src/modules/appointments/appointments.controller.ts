import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('appointments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @RequirePermission('citas', 'crear')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAppointmentDto: CreateAppointmentDto, @CurrentUser() user: CurrentUserData) {
    return this.appointmentsService.create(createAppointmentDto, user);
  }

  @Get()
  @RequirePermission('citas', 'leer')
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('estado') estado?: string,
    @Query('cliente_id') cliente_id?: string,
    @Query('tecnico_id') tecnico_id?: string,
    @Query('fecha_desde') fecha_desde?: string,
    @Query('fecha_hasta') fecha_hasta?: string,
  ) {
    return this.appointmentsService.findAll(
      user,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      estado,
      cliente_id,
      tecnico_id,
      fecha_desde,
      fecha_hasta,
    );
  }

  @Get('calendar')
  @RequirePermission('citas', 'leer')
  async getCalendar(@CurrentUser() user: CurrentUserData, @Query('fecha') fecha: string) {
    return this.appointmentsService.getCalendar(user, fecha);
  }

  @Get('tecnicos/:tecnicoId')
  @RequirePermission('citas', 'leer')
  async getByTechnician(@Param('tecnicoId') tecnicoId: string, @CurrentUser() user: CurrentUserData) {
    return this.appointmentsService.getByTechnician(user, tecnicoId);
  }

  @Get(':id')
  @RequirePermission('citas', 'leer')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.appointmentsService.findOne(id, user);
  }

  @Put(':id')
  @RequirePermission('citas', 'actualizar')
  async update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.appointmentsService.update(id, updateAppointmentDto, user);
  }

  @Delete(':id')
  @RequirePermission('citas', 'eliminar')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.appointmentsService.remove(id, user);
  }
}
