import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, UseInterceptors } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { CacheInterceptor } from '../../common/interceptors/cache.interceptor';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermission('roles', 'crear')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createRoleDto: CreateRoleDto, @CurrentUser() user: CurrentUserData) {
    return this.rolesService.create(createRoleDto, user);
  }

  @Get()
  @RequirePermission('roles', 'leer')
  @UseInterceptors(CacheInterceptor)
  async findAll(@CurrentUser() user: CurrentUserData) {
    return this.rolesService.findAll(user);
  }

  @Get(':id')
  @RequirePermission('roles', 'leer')
  @UseInterceptors(CacheInterceptor)
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.rolesService.findOne(id, user);
  }

  @Put(':id')
  @RequirePermission('roles', 'actualizar')
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.rolesService.update(id, updateRoleDto, user);
  }

  @Delete(':id')
  @RequirePermission('roles', 'eliminar')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.rolesService.remove(id, user);
  }

  @Post('assign/:userId/:roleId')
  @RequirePermission('roles', 'asignar')
  @HttpCode(HttpStatus.OK)
  async assignRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.rolesService.assignRoleToUser(userId, roleId, user);
  }
}
