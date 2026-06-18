import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Injectable()
export class RolesService {
  constructor(@Inject('DATABASE_POOL') private db: Pool) {}

  async create(createRoleDto: CreateRoleDto, user: CurrentUserData): Promise<Role> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if role name already exists for this company
      const existingRole = await client.query(
        'SELECT id FROM roles WHERE nombre = $1 AND empresa_id = $2',
        [createRoleDto.nombre, user.empresaId]
      );
      if (existingRole.rows.length > 0) {
        throw new ConflictException('El nombre del rol ya existe en tu empresa');
      }

      const result = await client.query(
        `INSERT INTO roles (empresa_id, nombre, descripcion, permisos)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          user.empresaId,
          createRoleDto.nombre,
          createRoleDto.descripcion || null,
          createRoleDto.permisos || {},
        ]
      );

      const role = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'crear',
        'roles',
        'roles',
        role.id,
        `Rol creado: ${role.nombre}`
      );

      await client.query('COMMIT');

      return role;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findAll(user: CurrentUserData): Promise<Role[]> {
    const result = await this.db.query(
      `SELECT * FROM roles 
       WHERE empresa_id = $1 OR empresa_id IS NULL
       ORDER BY empresa_id IS NULL DESC, nombre ASC`,
      [user.empresaId]
    );

    return result.rows;
  }

  async findOne(id: string, user: CurrentUserData): Promise<Role> {
    const result = await this.db.query(
      'SELECT * FROM roles WHERE id = $1 AND (empresa_id = $2 OR empresa_id IS NULL)',
      [id, user.empresaId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Rol no encontrado');
    }

    return result.rows[0];
  }

  async update(id: string, updateRoleDto: UpdateRoleDto, user: CurrentUserData): Promise<Role> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if role exists and belongs to company or is global
      const existingRole = await client.query(
        'SELECT * FROM roles WHERE id = $1 AND (empresa_id = $2 OR empresa_id IS NULL)',
        [id, user.empresaId]
      );

      if (existingRole.rows.length === 0) {
        throw new NotFoundException('Rol no encontrado');
      }

      // Cannot update global roles
      if (existingRole.rows[0].empresa_id === null) {
        throw new BadRequestException('No se pueden modificar roles globales');
      }

      // Build dynamic update query
      const allowedFields = ['nombre', 'descripcion', 'permisos'];
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      for (const field of allowedFields) {
        if ((updateRoleDto as any)[field] !== undefined) {
          paramCount++;
          updates.push(`${field} = $${paramCount + 2}`);
          values.push((updateRoleDto as any)[field]);
        }
      }

      if (updates.length === 0) {
        throw new BadRequestException('No se proporcionaron campos para actualizar');
      }

      values.push(id, user.empresaId);

      const updateQuery = `
        UPDATE roles
        SET ${updates.join(', ')}
        WHERE id = $${paramCount + 3} AND empresa_id = $${paramCount + 4}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      const role = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'actualizar',
        'roles',
        'roles',
        role.id,
        `Rol actualizado: ${role.nombre}`
      );

      await client.query('COMMIT');

      return role;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async remove(id: string, user: CurrentUserData): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if role exists and belongs to company
      const existingRole = await client.query(
        'SELECT nombre FROM roles WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId]
      );

      if (existingRole.rows.length === 0) {
        throw new NotFoundException('Rol no encontrado');
      }

      // Check if role is being used
      const usersWithRole = await client.query(
        'SELECT COUNT(*) as count FROM users WHERE rol_id = $1',
        [id]
      );

      if (parseInt(usersWithRole.rows[0].count) > 0) {
        throw new BadRequestException('No se puede eliminar el rol porque está asignado a usuarios');
      }

      await client.query(
        'DELETE FROM roles WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId]
      );

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'eliminar',
        'roles',
        'roles',
        id,
        `Rol eliminado: ${existingRole.rows[0].nombre}`
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async assignRoleToUser(userId: string, roleId: string, user: CurrentUserData): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if user belongs to company
      const userCheck = await client.query(
        'SELECT id FROM users WHERE id = $1 AND empresa_id = $2',
        [userId, user.empresaId]
      );
      if (userCheck.rows.length === 0) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Check if role exists and belongs to company or is global
      const roleCheck = await client.query(
        'SELECT nombre FROM roles WHERE id = $1 AND (empresa_id = $2 OR empresa_id IS NULL)',
        [roleId, user.empresaId]
      );
      if (roleCheck.rows.length === 0) {
        throw new NotFoundException('Rol no encontrado');
      }

      await client.query(
        'UPDATE users SET rol_id = $1 WHERE id = $2',
        [roleId, userId]
      );

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'actualizar',
        'roles',
        'users',
        userId,
        `Rol asignado: ${roleCheck.rows[0].nombre} al usuario ${userId}`
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async logAudit(
    client: any,
    userId: string,
    empresaId: string,
    action: string,
    module: string,
    table: string,
    recordId: string,
    description: string
  ): Promise<void> {
    try {
      await client.query(
        `INSERT INTO audit_log (usuario_id, empresa_id, accion, modulo, tabla, registro_id, descripcion, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'exitosa')`,
        [userId, empresaId, action, module, table, recordId, description]
      );
    } catch (error) {
      console.error('Error al crear log de auditoría:', error);
    }
  }
}
