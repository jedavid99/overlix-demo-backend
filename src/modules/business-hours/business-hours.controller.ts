import { Controller, Get, Put, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { BusinessHoursService } from './business-hours.service';
import { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { CacheInterceptor } from '../../common/interceptors/cache.interceptor';

@Controller('business-hours')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BusinessHoursController {
  constructor(private readonly businessHoursService: BusinessHoursService) {}

  @Get()
  @RequirePermission('horarios', 'leer')
  @UseInterceptors(CacheInterceptor)
  async findAll(@CurrentUser() user: CurrentUserData) {
    return this.businessHoursService.findAll(user);
  }

  @Get(':dia')
  @RequirePermission('horarios', 'leer')
  @UseInterceptors(CacheInterceptor)
  async findOne(@Param('dia') dia: string, @CurrentUser() user: CurrentUserData) {
    return this.businessHoursService.findOne(dia, user);
  }

  @Get('slots/:fecha')
  @RequirePermission('horarios', 'leer')
  async getAvailableSlots(@Param('fecha') fecha: string, @CurrentUser() user: CurrentUserData) {
    return this.businessHoursService.getAvailableSlots(user, fecha);
  }

  @Put(':dia')
  @RequirePermission('horarios', 'actualizar')
  async update(
    @Param('dia') dia: string,
    @Body() updateBusinessHoursDto: UpdateBusinessHoursDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.businessHoursService.update(dia, updateBusinessHoursDto, user);
  }
}
