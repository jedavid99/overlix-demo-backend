import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { VerifyCompanyDto } from '../dto/verify-company.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser, CurrentUserData } from '../../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('verify-company')
  @HttpCode(HttpStatus.OK)
  async verifyCompany(@Body() verifyCompanyDto: VerifyCompanyDto) {
    return this.authService.verifyCompany(verifyCompanyDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: CurrentUserData) {
    return this.authService.logout(user.id, user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('usuarios', 'leer')
  @Get('users')
  async getUsers(@CurrentUser() user: CurrentUserData) {
    return this.authService.getUsers(user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('usuarios', 'leer')
  @Get('users/:id')
  async getUserById(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.authService.getUserById(id, user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('usuarios', 'crear')
  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() createUserDto: CreateUserDto, @CurrentUser() user: CurrentUserData) {
    return this.authService.createUser(createUserDto, user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('usuarios', 'actualizar')
  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @CurrentUser() user: CurrentUserData) {
    return this.authService.updateUser(id, updateUserDto, user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('usuarios', 'eliminar')
  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.authService.deleteUser(id, user);
  }
}
