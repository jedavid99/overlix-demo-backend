import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequirePermission('auditoria', 'leer')
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('modulo') modulo?: string,
    @Query('accion') accion?: string,
    @Query('fecha_desde') fecha_desde?: string,
    @Query('fecha_hasta') fecha_hasta?: string,
  ) {
    return this.auditLogService.findAll(
      user,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      modulo,
      accion,
      fecha_desde,
      fecha_hasta,
    );
  }

  @Get(':id')
  @RequirePermission('auditoria', 'leer')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.auditLogService.findOne(id, user);
  }
}
