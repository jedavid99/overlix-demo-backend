import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';
import { CurrentUserData } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class ClientsService {
  constructor(
    @Inject('DATABASE_POOL') private pool: Pool,
  ) {}

  async create(createClientDto: CreateClientDto, user: CurrentUserData) {
    const client = await this.pool.connect();

    try {
      // Check if DNI already exists in the same company
      if (createClientDto.dni) {
        const existingClient = await client.query(
          'SELECT id FROM clients WHERE dni = $1 AND empresa_id = $2',
          [createClientDto.dni, user.empresaId],
        );

        if (existingClient.rows.length > 0) {
          throw new ConflictException('Ya existe un cliente con ese DNI en la empresa');
        }
      }

      // Check if email already exists in the same company
      if (createClientDto.email) {
        const existingEmail = await client.query(
          'SELECT id FROM clients WHERE email = $1 AND empresa_id = $2',
          [createClientDto.email, user.empresaId],
        );

        if (existingEmail.rows.length > 0) {
          throw new ConflictException('Ya existe un cliente con ese email en la empresa');
        }
      }

      const result = await client.query(
        `INSERT INTO clients 
         (empresa_id, nombre_completo, email, telefono, telefono_secundario, dni, direccion, ciudad, provincia, codigo_postal, tipo_cliente, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, nombre_completo, email, telefono, estado, fecha_registro`,
        [
          user.empresaId,
          createClientDto.nombre_completo,
          createClientDto.email || null,
          createClientDto.telefono,
          createClientDto.telefono_secundario || null,
          createClientDto.dni || null,
          createClientDto.direccion || null,
          createClientDto.ciudad || null,
          createClientDto.provincia || null,
          createClientDto.codigo_postal || null,
          createClientDto.tipo_cliente || 'particular',
          createClientDto.notes || null,
        ],
      );

      const clientData = result.rows[0];

      // Log audit
      await this.logAudit(client, user.id, user.empresaId, 'crear', 'clientes', 'clients', clientData.id, `Se creó cliente: ${createClientDto.nombre_completo}`);

      return {
        success: true,
        data: clientData,
      };
    } finally {
      client.release();
    }
  }

  async findAll(user: CurrentUserData, page: number = 1, limit: number = 20, search?: string, estado?: string) {
    const client = await this.pool.connect();

    try {
      const offset = (page - 1) * limit;
      let whereClause = 'WHERE empresa_id = $1';
      const params: any[] = [user.empresaId];
      let paramCount = 1;

      if (search) {
        paramCount++;
        whereClause += ` AND (nombre_completo ILIKE $${paramCount} OR email ILIKE $${paramCount} OR telefono ILIKE $${paramCount} OR dni ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      if (estado) {
        paramCount++;
        whereClause += ` AND estado = $${paramCount}`;
        params.push(estado);
      }

      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM clients ${whereClause}`,
        params,
      );

      const total = parseInt(countResult.rows[0].total);

      // Get clients
      const result = await client.query(
        `SELECT id, nombre_completo, email, telefono, dni, tipo_cliente, estado, fecha_registro, deuda_actual, credito_disponible
         FROM clients ${whereClause}
         ORDER BY fecha_registro DESC
         LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset],
      );

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          clientes: result.rows,
          total,
          pagina: page,
          total_paginas: totalPages,
        },
      };
    } finally {
      client.release();
    }
  }

  async findOne(id: string, user: CurrentUserData) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `SELECT * FROM clients WHERE id = $1 AND empresa_id = $2`,
        [id, user.empresaId],
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('Cliente no encontrado');
      }

      return {
        success: true,
        data: result.rows[0],
      };
    } finally {
      client.release();
    }
  }

  async update(id: string, updateClientDto: UpdateClientDto, user: CurrentUserData) {
    const client = await this.pool.connect();

    try {
      // Check if client exists
      const existingClient = await client.query(
        'SELECT * FROM clients WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId],
      );

      if (existingClient.rows.length === 0) {
        throw new NotFoundException('Cliente no encontrado');
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      const allowedFields = ['email', 'telefono', 'telefono_secundario', 'dni', 'direccion', 'ciudad', 'provincia', 'codigo_postal', 'tipo_cliente', 'notes', 'deuda_actual', 'credito_disponible'];

      for (const field of allowedFields) {
        if ((updateClientDto as any)[field] !== undefined) {
          paramCount++;
          updates.push(`${field} = $${paramCount + 2}`);
          values.push((updateClientDto as any)[field]);
        }
      }

      if (updates.length === 0) {
        throw new BadRequestException('No se proporcionaron campos para actualizar');
      }

      updates.push('fecha_actualizacion = CURRENT_TIMESTAMP');

      const query = `
        UPDATE clients
        SET ${updates.join(', ')}
        WHERE id = $1 AND empresa_id = $2
        RETURNING id, nombre_completo, email, telefono, estado
      `;

      const result = await client.query(query, [id, user.empresaId, ...values]);

      // Log audit
      await this.logAudit(client, user.id, user.empresaId, 'actualizar', 'clientes', 'clients', id, `Se actualizó cliente: ${existingClient.rows[0].nombre_completo}`);

      return {
        success: true,
        message: 'Cliente actualizado',
        data: result.rows[0],
      };
    } finally {
      client.release();
    }
  }

  async remove(id: string, user: CurrentUserData) {
    const client = await this.pool.connect();

    try {
      // Check if client exists
      const existingClient = await client.query(
        'SELECT * FROM clients WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId],
      );

      if (existingClient.rows.length === 0) {
        throw new NotFoundException('Cliente no encontrado');
      }

      // Check if client has sales or repairs
      const salesCheck = await client.query(
        'SELECT id FROM sales WHERE cliente_id = $1',
        [id],
      );

      const repairsCheck = await client.query(
        'SELECT id FROM repairs WHERE cliente_id = $1',
        [id],
      );

      if (salesCheck.rows.length > 0 || repairsCheck.rows.length > 0) {
        throw new BadRequestException('No se puede eliminar el cliente porque tiene ventas o reparaciones asociadas');
      }

      // Soft delete - change status to inactivo
      await client.query(
        'UPDATE clients SET estado = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $2 AND empresa_id = $3',
        ['inactivo', id, user.empresaId],
      );

      // Log audit
      await this.logAudit(client, user.id, user.empresaId, 'eliminar', 'clientes', 'clients', id, `Se eliminó cliente: ${existingClient.rows[0].nombre_completo}`);

      return {
        success: true,
        message: 'Cliente eliminado',
      };
    } finally {
      client.release();
    }
  }

  async getPurchaseHistory(clientId: string, user: CurrentUserData) {
    const client = await this.pool.connect();

    try {
      // Check if client exists and belongs to company
      const clientCheck = await client.query(
        'SELECT id FROM clients WHERE id = $1 AND empresa_id = $2',
        [clientId, user.empresaId],
      );

      if (clientCheck.rows.length === 0) {
        throw new NotFoundException('Cliente no encontrado');
      }

      const result = await client.query(
        `SELECT s.id, s.numero_venta, s.fecha_venta, s.total, s.estado, s.canal_venta
         FROM sales s
         WHERE s.cliente_id = $1 AND s.empresa_id = $2
         ORDER BY s.fecha_venta DESC
         LIMIT 50`,
        [clientId, user.empresaId],
      );

      return {
        success: true,
        data: {
          compras: result.rows,
        },
      };
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
    description: string,
  ) {
    try {
      await client.query(
        `INSERT INTO audit_log (usuario_id, empresa_id, tipo_accion, modulo, tabla, registro_id, descripcion, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'exitosa')`,
        [userId, empresaId, action, module, table, recordId, description],
      );
    } catch (error) {
      console.error('Error logging audit:', error);
    }
  }
}
