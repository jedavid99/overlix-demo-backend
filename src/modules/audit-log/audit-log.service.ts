import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { AuditLog } from './entities/audit-log.entity';
import { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AuditLogService {
  constructor(@Inject('DATABASE_POOL') private db: Pool) {}

  async findAll(
    user: CurrentUserData,
    page: number = 1,
    limit: number = 20,
    modulo?: string,
    accion?: string,
    fecha_desde?: string,
    fecha_hasta?: string
  ): Promise<{ logs: AuditLog[]; total: number; page: number; limit: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT a.*, u.nombre_completo as usuario_nombre
      FROM audit_log a
      LEFT JOIN users u ON a.usuario_id = u.id
      WHERE a.empresa_id = $1
    `;
    
    const params: any[] = [user.empresaId];
    let paramCount = 1;

    if (modulo) {
      paramCount++;
      query += ` AND a.modulo = $${paramCount}`;
      params.push(modulo);
    }

    if (accion) {
      paramCount++;
      query += ` AND a.tipo_accion = $${paramCount}`;
      params.push(accion);
    }

    if (fecha_desde) {
      paramCount++;
      query += ` AND a.fecha_creacion >= $${paramCount}`;
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      paramCount++;
      query += ` AND a.fecha_creacion <= $${paramCount}`;
      params.push(fecha_hasta);
    }

    // Get total count
    const countQuery = query.replace('SELECT a.*, u.nombre_completo as usuario_nombre', 'SELECT COUNT(*)');
    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    paramCount++;
    query += ` ORDER BY a.fecha_creacion DESC LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await this.db.query(query, params);
    
    return {
      logs: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user: CurrentUserData): Promise<AuditLog> {
    const result = await this.db.query(
      `SELECT a.*, u.nombre_completo as usuario_nombre
       FROM audit_log a
       LEFT JOIN users u ON a.usuario_id = u.id
       WHERE a.id = $1 AND a.empresa_id = $2`,
      [id, user.empresaId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Log de auditoría no encontrado');
    }

    return result.rows[0];
  }
}
