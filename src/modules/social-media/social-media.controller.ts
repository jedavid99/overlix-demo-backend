import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, UseInterceptors } from '@nestjs/common';
import { SocialMediaService } from './social-media.service';
import { CreateSocialMediaDto } from './dto/create-social-media.dto';
import { UpdateSocialMediaDto } from './dto/update-social-media.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { CacheInterceptor } from '../../common/interceptors/cache.interceptor';

@Controller('social-media')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SocialMediaController {
  constructor(private readonly socialMediaService: SocialMediaService) {}

  @Post()
  @RequirePermission('redes_sociales', 'crear')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createSocialMediaDto: CreateSocialMediaDto, @CurrentUser() user: CurrentUserData) {
    return this.socialMediaService.create(createSocialMediaDto, user);
  }

  @Get()
  @RequirePermission('redes_sociales', 'leer')
  @UseInterceptors(CacheInterceptor)
  async findAll(@CurrentUser() user: CurrentUserData, @Query('activo') activo?: string) {
    return this.socialMediaService.findAll(user, activo === 'true');
  }

  @Get(':id')
  @RequirePermission('redes_sociales', 'leer')
  @UseInterceptors(CacheInterceptor)
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.socialMediaService.findOne(id, user);
  }

  @Put(':id')
  @RequirePermission('redes_sociales', 'actualizar')
  async update(
    @Param('id') id: string,
    @Body() updateSocialMediaDto: UpdateSocialMediaDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.socialMediaService.update(id, updateSocialMediaDto, user);
  }

  @Delete(':id')
  @RequirePermission('redes_sociales', 'eliminar')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.socialMediaService.remove(id, user);
  }
}
