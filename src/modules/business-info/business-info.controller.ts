import { Controller, Get, Put, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { BusinessInfoService } from './business-info.service';
import { UpdateBusinessInfoDto } from './dto/update-business-info.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { CacheInterceptor } from '../../common/interceptors/cache.interceptor';

@Controller('business-info')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BusinessInfoController {
  constructor(private readonly businessInfoService: BusinessInfoService) {}

  @Get()
  @RequirePermission('negocio', 'leer')
  @UseInterceptors(CacheInterceptor)
  async findOne(@CurrentUser() user: CurrentUserData) {
    return this.businessInfoService.findOne(user);
  }

  @Put()
  @RequirePermission('negocio', 'actualizar')
  async update(@Body() updateBusinessInfoDto: UpdateBusinessInfoDto, @CurrentUser() user: CurrentUserData) {
    return this.businessInfoService.update(updateBusinessInfoDto, user);
  }

  @Put('logo')
  @RequirePermission('negocio', 'actualizar')
  async updateLogo(@Body('logo_url') logoUrl: string, @CurrentUser() user: CurrentUserData) {
    return this.businessInfoService.updateLogo(logoUrl, user);
  }
}
