import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateSaleDto } from '../dto/create-sale.dto';
import { UpdateSaleDto } from '../dto/update-sale.dto';
import { CurrentUserData } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);
  constructor(
    @Inject('DATABASE_POOL') private pool: Pool,
  ) {}

  async create(createSaleDto: CreateSaleDto, user: CurrentUserData) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Validate client exists and belongs to company
      const clientCheck = await client.query(
        'SELECT id, nombre_completo FROM clients WHERE id = $1 AND empresa_id = $2',
        [createSaleDto.cliente_id, user.empresaId],
      );

      if (clientCheck.rows.length === 0) {
        throw new NotFoundException('Cliente no encontrado');
      }

      // Validate payment method exists and belongs to company
      const paymentMethodCheck = await client.query(
        'SELECT id, nombre FROM payment_methods WHERE id = $1 AND empresa_id = $2 AND habilitado = true',
        [createSaleDto.metodo_pago_id, user.empresaId],
      );

      if (paymentMethodCheck.rows.length === 0) {
        throw new NotFoundException('Método de pago no encontrado o no habilitado');
      }

      // Validate shipping method if provided
      if (createSaleDto.metodo_entrega_id) {
        const shippingMethodCheck = await client.query(
          'SELECT id FROM shipping_methods WHERE id = $1 AND empresa_id = $2 AND habilitado = true',
          [createSaleDto.metodo_entrega_id, user.empresaId],
        );

        if (shippingMethodCheck.rows.length === 0) {
          throw new NotFoundException('Método de envío no encontrado o no habilitado');
        }
      }

      // Validate products and check stock
      for (const item of createSaleDto.items) {
        const productCheck = await client.query(
          'SELECT id, nombre, cantidad_stock, activo_en_ventas FROM products WHERE id = $1 AND empresa_id = $2',
          [item.producto_id, user.empresaId],
        );

        if (productCheck.rows.length === 0) {
          throw new NotFoundException(`Producto con ID ${item.producto_id} no encontrado`);
        }

        const product = productCheck.rows[0];

        if (!product.activo_en_ventas) {
          throw new BadRequestException(`El producto ${product.nombre} no está disponible para ventas`);
        }

        if (product.cantidad_stock < item.cantidad) {
          throw new ConflictException(
            `Stock insuficiente para ${product.nombre}. Disponible: ${product.cantidad_stock}, Solicitado: ${item.cantidad}`,
          );
        }
      }

      // Generate sale number
      const saleNumberResult = await client.query(
        'SELECT generate_sale_number($1) as numero_venta',
        [user.empresaId],
      );

      const numeroVenta = saleNumberResult.rows[0].numero_venta;

      // Create sale
      const saleResult = await client.query(
        `INSERT INTO sales 
         (empresa_id, numero_venta, cliente_id, fecha_venta, hora_venta, subtotal, impuestos, descuento, total, estado, metodo_pago_id, metodo_entrega_id, direccion_entrega, vendedor_id, canal_venta, referencia_externa, usuario_id_creacion, notas)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING id, numero_venta, total, estado`,
        [
          user.empresaId,
          numeroVenta,
          createSaleDto.cliente_id,
          createSaleDto.fecha_venta,
          new Date().toTimeString().split(' ')[0], // Current time
          createSaleDto.subtotal,
          createSaleDto.impuestos || 0,
          createSaleDto.descuento || 0,
          createSaleDto.total,
          'completed',
          createSaleDto.metodo_pago_id,
          createSaleDto.metodo_entrega_id || null,
          createSaleDto.direccion_entrega || null,
          user.id,
          createSaleDto.canal_venta || 'local',
          createSaleDto.referencia_externa || null,
          user.id,
          createSaleDto.notas || null,
        ],
      );

      const sale = saleResult.rows[0];

      // Create sale items and update stock in parallel
      await Promise.all(
        createSaleDto.items.map(async (item) => {
          const subtotal = item.cantidad * item.precio_unitario - (item.descuento_linea || 0);

          // Create sale item
          await client.query(
            `INSERT INTO sale_items (venta_id, producto_id, cantidad, precio_unitario, subtotal, descuento_linea)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [sale.id, item.producto_id, item.cantidad, item.precio_unitario, subtotal, item.descuento_linea || 0],
          );

          // Update product stock
          await client.query(
            'UPDATE products SET cantidad_stock = cantidad_stock - $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $2',
            [item.cantidad, item.producto_id],
          );
        }),
      );

      await client.query('COMMIT');

      // Log audit (outside transaction)
      await this.logAudit(user.id, user.empresaId, 'crear', 'ventas', 'sales', sale.id, `Se creó venta: ${numeroVenta}`);

      return {
        success: true,
        data: {
          id: sale.id,
          numero_venta: sale.numero_venta,
          total: sale.total,
          estado: sale.estado,
        },
      };
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
    cliente_id?: string,
    estado?: string,
    fecha_desde?: string,
    fecha_hasta?: string,
    metodo_pago?: string,
    canal?: string,
  ) {
    const client = await this.pool.connect();

    try {
      const offset = (page - 1) * limit;
      let whereClause = 'WHERE s.empresa_id = $1';
      const params: (string | number)[] = [user.empresaId];
      let paramCount = 1;

      if (cliente_id) {
        paramCount++;
        whereClause += ` AND s.cliente_id = $${paramCount}`;
        params.push(cliente_id);
      }

      if (estado) {
        paramCount++;
        whereClause += ` AND s.estado = $${paramCount}`;
        params.push(estado);
      }

      if (fecha_desde) {
        paramCount++;
        whereClause += ` AND s.fecha_venta >= $${paramCount}`;
        params.push(fecha_desde);
      }

      if (fecha_hasta) {
        paramCount++;
        whereClause += ` AND s.fecha_venta <= $${paramCount}`;
        params.push(fecha_hasta);
      }

      if (metodo_pago) {
        paramCount++;
        whereClause += ` AND s.metodo_pago_id = $${paramCount}`;
        params.push(metodo_pago);
      }

      if (canal) {
        paramCount++;
        whereClause += ` AND s.canal_venta = $${paramCount}`;
        params.push(canal);
      }

      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM sales s ${whereClause}`,
        params,
      );

      const total = parseInt(countResult.rows[0].total);

      // Get sales with client name
      const result = await client.query(
        `SELECT s.id, s.numero_venta, s.fecha_venta, s.total, s.estado, s.canal_venta,
                c.nombre_completo as cliente_nombre
         FROM sales s
         LEFT JOIN clients c ON s.cliente_id = c.id
         ${whereClause}
         ORDER BY s.fecha_venta DESC, s.hora_venta DESC
         LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset],
      );

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          ventas: result.rows,
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
      // Get sale
      const saleResult = await client.query(
        `SELECT s.*, c.nombre_completo as cliente_nombre, c.email as cliente_email, c.telefono as cliente_telefono
         FROM sales s
         LEFT JOIN clients c ON s.cliente_id = c.id
         WHERE s.id = $1 AND s.empresa_id = $2`,
        [id, user.empresaId],
      );

      if (saleResult.rows.length === 0) {
        throw new NotFoundException('Venta no encontrada');
      }

      const sale = saleResult.rows[0];

      // Get sale items
      const itemsResult = await client.query(
        `SELECT si.*, p.nombre as producto_nombre, p.codigo_producto
         FROM sale_items si
         LEFT JOIN products p ON si.producto_id = p.id
         WHERE si.venta_id = $1`,
        [id],
      );

      sale.items = itemsResult.rows;

      return {
        success: true,
        data: sale,
      };
    } finally {
      client.release();
    }
  }

  async update(id: string, updateData: UpdateSaleDto, user: CurrentUserData) {
    const client = await this.pool.connect();

    try {
      // Check if sale exists
      const existingSale = await client.query(
        'SELECT * FROM sales WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId],
      );

      if (existingSale.rows.length === 0) {
        throw new NotFoundException('Venta no encontrada');
      }

      const sale = existingSale.rows[0];

      // Build dynamic update query
      const updates: string[] = [];
      const values: (string | number)[] = [];
      let paramCount = 0;

      const allowedFields = ['estado', 'direccion_entrega', 'notas'];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          paramCount++;
          updates.push(`${field} = $${paramCount + 2}`);
          values.push(updateData[field]);
        }
      }

      if (updates.length === 0) {
        throw new BadRequestException('No se proporcionaron campos para actualizar');
      }

      updates.push('fecha_actualizacion = CURRENT_TIMESTAMP');

      const query = `
        UPDATE sales
        SET ${updates.join(', ')}
        WHERE id = $1 AND empresa_id = $2
        RETURNING id, numero_venta, estado
      `;

      const result = await client.query(query, [id, user.empresaId, ...values]);

      // Log audit
      await this.logAudit(user.id, user.empresaId, 'actualizar', 'ventas', 'sales', id, `Se actualizó venta: ${sale.numero_venta}`);

      return {
        success: true,
        message: 'Venta actualizada',
        data: result.rows[0],
      };
    } finally {
      client.release();
    }
  }

  async remove(id: string, user: CurrentUserData) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if sale exists
      const existingSale = await client.query(
        'SELECT * FROM sales WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId],
      );

      if (existingSale.rows.length === 0) {
        throw new NotFoundException('Venta no encontrada');
      }

      const sale = existingSale.rows[0];

      if (sale.estado === 'cancelled') {
        throw new BadRequestException('La venta ya está cancelada');
      }

      // Get sale items to restore stock
      const itemsResult = await client.query(
        'SELECT producto_id, cantidad FROM sale_items WHERE venta_id = $1',
        [id],
      );

      // Restore stock for all items in a single query
      await client.query(
        `UPDATE products p
         SET cantidad_stock = p.cantidad_stock + si.cantidad, fecha_actualizacion = CURRENT_TIMESTAMP
         FROM (SELECT producto_id, cantidad FROM sale_items WHERE venta_id = $1) si
         WHERE p.id = si.producto_id`,
        [id],
      );

      // Cancel sale (soft delete)
      await client.query(
        'UPDATE sales SET estado = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $2 AND empresa_id = $3',
        ['cancelled', id, user.empresaId],
      );

      await client.query('COMMIT');

      // Log audit
      await this.logAudit(user.id, user.empresaId, 'eliminar', 'ventas', 'sales', id, `Se canceló venta: ${sale.numero_venta}`);

      return {
        success: true,
        message: 'Venta cancelada y stock restaurado',
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async logAudit(
    userId: string,
    empresaId: string,
    action: string,
    module: string,
    table: string,
    recordId: string,
    description: string,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO audit_log (usuario_id, empresa_id, tipo_accion, modulo, tabla, registro_id, descripcion, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'exitosa')`,
        [userId, empresaId, action, module, table, recordId, description],
      );
    } catch (error) {
      this.logger.error('Error logging audit:', error);
    } finally {
      client.release();
    }
  }
}
