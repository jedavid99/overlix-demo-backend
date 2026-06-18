import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { Shipment } from './entities/shipment.entity';
import { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ShipmentsService {
  constructor(@Inject('DATABASE_POOL') private db: Pool) {}

  async create(createShipmentDto: CreateShipmentDto, user: CurrentUserData): Promise<Shipment> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Verify client belongs to company if provided
      if (createShipmentDto.cliente_id) {
        const clientCheck = await client.query(
          'SELECT id, nombre_completo FROM clients WHERE id = $1 AND empresa_id = $2',
          [createShipmentDto.cliente_id, user.empresaId]
        );
        if (clientCheck.rows.length === 0) {
          throw new NotFoundException('Cliente no encontrado');
        }
      }

      // Verify sale belongs to company if provided
      if (createShipmentDto.venta_id) {
        const saleCheck = await client.query(
          'SELECT id FROM sales WHERE id = $1 AND empresa_id = $2',
          [createShipmentDto.venta_id, user.empresaId]
        );
        if (saleCheck.rows.length === 0) {
          throw new NotFoundException('Venta no encontrada');
        }
      }

      // Generate shipment number
      const numeroResult = await client.query(
        'SELECT generate_shipment_number($1) as numero',
        [user.empresaId]
      );
      const numeroEnvio = numeroResult.rows[0].numero;

      const result = await client.query(
        `INSERT INTO shipments 
         (empresa_id, numero_envio, venta_id, cliente_id, direccion_envio, ciudad, 
          provincia, codigo_postal, pais, transportista, numero_seguimiento, 
          fecha_envio, fecha_estimada_entrega, estado, notas)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
          user.empresaId,
          numeroEnvio,
          createShipmentDto.venta_id || null,
          createShipmentDto.cliente_id || null,
          createShipmentDto.direccion_envio,
          createShipmentDto.ciudad,
          createShipmentDto.provincia,
          createShipmentDto.codigo_postal,
          createShipmentDto.pais,
          createShipmentDto.transportista,
          createShipmentDto.numero_seguimiento || null,
          createShipmentDto.fecha_envio,
          createShipmentDto.fecha_estimada_entrega || null,
          createShipmentDto.estado || 'pendiente',
          createShipmentDto.notas || null,
        ]
      );

      const shipment = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'crear',
        'envios',
        'shipments',
        shipment.id,
        `Envío creado: ${shipment.numero_envio} - ${shipment.transportista}`
      );

      await client.query('COMMIT');

      await this.loadRelatedData(shipment);

      return shipment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findAll(
    user: CurrentUserData,
    page: number = 1,
    limit: number = 20,
    estado?: string,
    cliente_id?: string
  ): Promise<{ shipments: Shipment[]; total: number; page: number; limit: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT s.*, c.nombre_completo as cliente_nombre
      FROM shipments s
      LEFT JOIN clients c ON s.cliente_id = c.id
      WHERE s.empresa_id = $1
    `;
    
    const params: any[] = [user.empresaId];
    let paramCount = 1;

    if (estado) {
      paramCount++;
      query += ` AND s.estado = $${paramCount}`;
      params.push(estado);
    }

    if (cliente_id) {
      paramCount++;
      query += ` AND s.cliente_id = $${paramCount}`;
      params.push(cliente_id);
    }

    // Get total count
    const countQuery = query.replace('SELECT s.*, c.nombre_completo as cliente_nombre', 'SELECT COUNT(*)');
    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    paramCount++;
    query += ` ORDER BY s.fecha_creacion DESC LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await this.db.query(query, params);
    
    return {
      shipments: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user: CurrentUserData): Promise<Shipment> {
    const result = await this.db.query(
      `SELECT s.*, c.nombre_completo as cliente_nombre
       FROM shipments s
       LEFT JOIN clients c ON s.cliente_id = c.id
       WHERE s.id = $1 AND s.empresa_id = $2`,
      [id, user.empresaId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Envío no encontrado');
    }

    return result.rows[0];
  }

  async update(id: string, updateShipmentDto: UpdateShipmentDto, user: CurrentUserData): Promise<Shipment> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if shipment exists and belongs to company
      const existingShipment = await client.query(
        'SELECT * FROM shipments WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId]
      );

      if (existingShipment.rows.length === 0) {
        throw new NotFoundException('Envío no encontrado');
      }

      // Build dynamic update query
      const allowedFields = [
        'venta_id', 'cliente_id', 'direccion_envio', 'ciudad', 'provincia',
        'codigo_postal', 'pais', 'transportista', 'numero_seguimiento',
        'fecha_envio', 'fecha_estimada_entrega', 'fecha_entrega', 'estado', 'notas'
      ];
      
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      for (const field of allowedFields) {
        if ((updateShipmentDto as any)[field] !== undefined) {
          paramCount++;
          updates.push(`${field} = $${paramCount + 2}`);
          values.push((updateShipmentDto as any)[field]);
        }
      }

      if (updates.length === 0) {
        throw new BadRequestException('No se proporcionaron campos para actualizar');
      }

      values.push(id, user.empresaId);

      const updateQuery = `
        UPDATE shipments
        SET ${updates.join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = $${paramCount + 3} AND empresa_id = $${paramCount + 4}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      const shipment = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'actualizar',
        'envios',
        'shipments',
        shipment.id,
        `Envío actualizado: ${shipment.numero_envio} - Estado: ${shipment.estado}`
      );

      await client.query('COMMIT');

      await this.loadRelatedData(shipment);

      return shipment;
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

      // Check if shipment exists and belongs to company
      const existingShipment = await client.query(
        'SELECT numero_envio, transportista FROM shipments WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId]
      );

      if (existingShipment.rows.length === 0) {
        throw new NotFoundException('Envío no encontrado');
      }

      await client.query(
        'DELETE FROM shipments WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId]
      );

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'eliminar',
        'envios',
        'shipments',
        id,
        `Envío eliminado: ${existingShipment.rows[0].numero_envio} - ${existingShipment.rows[0].transportista}`
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateStatus(id: string, estado: string, user: CurrentUserData): Promise<Shipment> {
    return this.update(id, { estado } as UpdateShipmentDto, user);
  }

  private async loadRelatedData(shipment: Shipment): Promise<void> {
    if (shipment.cliente_id) {
      const clientResult = await this.db.query(
        'SELECT nombre_completo FROM clients WHERE id = $1',
        [shipment.cliente_id]
      );
      if (clientResult.rows.length > 0) {
        shipment.cliente_nombre = clientResult.rows[0].nombre_completo;
      }
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
