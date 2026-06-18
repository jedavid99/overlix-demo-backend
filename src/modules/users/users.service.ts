import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Injectable()
export class UsersService {
  constructor(@Inject('DATABASE_POOL') private db: Pool) {}

  async create(createUserDto: CreateUserDto, user: CurrentUserData): Promise<User> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if email already exists for this company
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 AND company_id = $2',
        [createUserDto.email, createUserDto.company_id]
      );
      if (existingUser.rows.length > 0) {
        throw new ConflictException('El email ya está registrado en esta empresa');
      }

      const result = await client.query(
        `INSERT INTO users (company_id, email, full_name, role_id, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          createUserDto.company_id,
          createUserDto.email,
          createUserDto.full_name,
          createUserDto.role_id || null,
          createUserDto.status || 'active',
        ]
      );

      const newUser = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'crear',
        'users',
        'users',
        newUser.id,
        `Usuario creado: ${newUser.email}`
      );

      await client.query('COMMIT');

      return newUser;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findAll(user: CurrentUserData): Promise<User[]> {
    const result = await this.db.query(
      'SELECT * FROM users WHERE company_id = $1 ORDER BY created_at DESC',
      [user.empresaId]
    );

    return result.rows;
  }

  async findOne(id: string, user: CurrentUserData): Promise<User> {
    const result = await this.db.query(
      'SELECT * FROM users WHERE id = $1 AND company_id = $2',
      [id, user.empresaId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return result.rows[0];
  }

  async update(id: string, updateUserDto: UpdateUserDto, user: CurrentUserData): Promise<User> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if user exists and belongs to company
      const existingUser = await client.query(
        'SELECT * FROM users WHERE id = $1 AND company_id = $2',
        [id, user.empresaId]
      );

      if (existingUser.rows.length === 0) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // If updating email, check for duplicates
      if (updateUserDto.email && updateUserDto.email !== existingUser.rows[0].email) {
        const emailCheck = await client.query(
          'SELECT id FROM users WHERE email = $1 AND company_id = $2 AND id != $3',
          [updateUserDto.email, user.empresaId, id]
        );
        if (emailCheck.rows.length > 0) {
          throw new ConflictException('El email ya está registrado en esta empresa');
        }
      }

      // Build dynamic update query
      const allowedFields = ['email', 'full_name', 'role_id', 'status'];
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      for (const field of allowedFields) {
        if ((updateUserDto as any)[field] !== undefined) {
          paramCount++;
          updates.push(`${field} = $${paramCount + 2}`);
          values.push((updateUserDto as any)[field]);
        }
      }

      if (updates.length === 0) {
        throw new BadRequestException('No se proporcionaron campos para actualizar');
      }

      values.push(id, user.empresaId);

      const updateQuery = `
        UPDATE users
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount + 3} AND company_id = $${paramCount + 4}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      const updatedUser = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'actualizar',
        'users',
        'users',
        updatedUser.id,
        `Usuario actualizado: ${updatedUser.email}`
      );

      await client.query('COMMIT');

      return updatedUser;
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

      // Check if user exists and belongs to company
      const existingUser = await client.query(
        'SELECT email FROM users WHERE id = $1 AND company_id = $2',
        [id, user.empresaId]
      );

      if (existingUser.rows.length === 0) {
        throw new NotFoundException('Usuario no encontrado');
      }

      await client.query(
        'DELETE FROM users WHERE id = $1 AND company_id = $2',
        [id, user.empresaId]
      );

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'eliminar',
        'users',
        'users',
        id,
        `Usuario eliminado: ${existingUser.rows[0].email}`
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
