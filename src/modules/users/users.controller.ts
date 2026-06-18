import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermission('users', 'crear')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: CurrentUserData) {
    return this.usersService.create(createUserDto, user);
  }

  @Get()
  @RequirePermission('users', 'leer')
  async findAll(@CurrentUser() user: CurrentUserData) {
    return this.usersService.findAll(user);
  }

  @Get(':id')
  @RequirePermission('users', 'leer')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.usersService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermission('users', 'actualizar')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.usersService.update(id, updateUserDto, user);
  }

  @Delete(':id')
  @RequirePermission('users', 'eliminar')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.usersService.remove(id, user);
  }
}
