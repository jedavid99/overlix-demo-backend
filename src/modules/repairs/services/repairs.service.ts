import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateRepairDto, RepairStatus, RepairPriority } from '../dto/create-repair.dto';
import { CurrentUserData } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class RepairsService {
  private readonly logger = new Logger(RepairsService.name);
  constructor(
    @Inject('DATABASE_POOL') private pool: Pool,
  ) {}

  async create(createRepairDto: CreateRepairDto, user: CurrentUserData) {
    const client = await this.pool.connect();

    try {
      // Validate client exists and belongs to company
      const clientCheck = await client.query(
        'SELECT id, nombre_completo FROM clients WHERE id = $1 AND empresa_id = $2',
        [createRepairDto.cliente_id, user.empresaId],
      );

      if (clientCheck.rows.length === 0) {
        throw new NotFoundException('Cliente no encontrado');
      }

      // Validate technician if provided
      if (createRepairDto.tecnico_asignado_id) {
        const techCheck = await client.query(
          'SELECT id, nombre_completo FROM users WHERE id = $1 AND empresa_id = $2 AND estado = $3',
          [createRepairDto.tecnico_asignado_id, user.empresaId, 'activo'],
        );

        if (techCheck.rows.length === 0) {
          throw new NotFoundException('Técnico no encontrado o no está activo');
        }
      }

      // Generate repair number
      const repairNumberResult = await client.query(
        'SELECT generate_repair_number($1) as numero_reparacion',
        [user.empresaId],
      );

      const numeroReparacion = repairNumberResult.rows[0].numero_reparacion;

      // Create repair
      const result = await client.query(
        `INSERT INTO repairs 
         (empresa_id, numero_reparacion, cliente_id, dispositivo, categoria_dispositivo, marca, modelo, numero_serie, 
          problema_reportado, condicion_estetica, accesorios_incluidos, fecha_ingreso, hora_ingreso, estado, prioridad, 
          tecnico_asignado_id, fecha_estimada_entrega, tiempo_estimado_minutos, total_reparacion, notas, pagado, metodo_pago_id,
          tipo_seguridad, pin_acceso, patron_puntos, secuencia_patron, chequeo_hardware,
          costo_piezas, costo_mano_obra, garantia_meses, usuario_id_creacion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, 0, 0, 3, $29)
         RETURNING *`,
        [
          user.empresaId,
          numeroReparacion,
          createRepairDto.cliente_id,
          createRepairDto.dispositivo,
          createRepairDto.categoria_dispositivo || null,
          createRepairDto.marca || null,
          createRepairDto.modelo || null,
          createRepairDto.numero_serie || null,
          createRepairDto.problema_reportado,
          createRepairDto.condicion_estetica || null,
          createRepairDto.accesorios_incluidos || null,
          createRepairDto.fecha_ingreso,
          new Date().toTimeString().split(' ')[0], // Current time
          RepairStatus.DIAGNOSTIC,
          createRepairDto.prioridad || RepairPriority.MEDIUM,
          createRepairDto.tecnico_asignado_id || null,
          createRepairDto.fecha_estimada_entrega || null,
          createRepairDto.tiempo_estimado_minutos || null,
          createRepairDto.total_reparacion || 0,
          createRepairDto.notas || null,
          createRepairDto.pagado !== undefined ? createRepairDto.pagado : false,
          createRepairDto.metodo_pago_id || null,
          createRepairDto.tipo_seguridad || null,
          createRepairDto.pin_acceso || null,
          createRepairDto.patron_puntos || null,
          createRepairDto.secuencia_patron || null,
          createRepairDto.chequeo_hardware || null,
          user.id,
        ],
      );

      const repair = result.rows[0];

      // Log audit
      await this.logAudit(user.id, user.empresaId, 'crear', 'reparaciones', 'repairs', repair.id, `Se creó reparación: ${numeroReparacion}`);

      return {
        success: true,
        data: repair,
      };
    } finally {
      client.release();
    }
  }

  async findAll(
    user: CurrentUserData,
    page: number = 1,
    limit: number = 20,
    estado?: string,
    cliente_id?: string,
    tecnico_id?: string,
    problema_reportado?: string,
    prioridad?: string,
    fecha_desde?: string,
    fecha_hasta?: string,
  ) {
    const client = await this.pool.connect();

    try {
      const offset = (page - 1) * limit;
      let whereClause = 'WHERE r.empresa_id = $1';
      const params: (string | number)[] = [user.empresaId];
      let paramCount = 1;

      if (estado) {
        paramCount++;
        whereClause += ` AND r.estado = $${paramCount}`;
        params.push(estado);
      }

      if (cliente_id) {
        paramCount++;
        whereClause += ` AND r.cliente_id = $${paramCount}`;
        params.push(cliente_id);
      }

      if (tecnico_id) {
        paramCount++;
        whereClause += ` AND r.tecnico_asignado_id = $${paramCount}`;
        params.push(tecnico_id);
      }

      if (problema_reportado) {
        paramCount++;
        whereClause += ` AND r.problema_reportado ILIKE $${paramCount}`;
        params.push(`%${problema_reportado}%`);
      }

      if (prioridad) {
        paramCount++;
        whereClause += ` AND r.prioridad = $${paramCount}`;
        params.push(prioridad);
      }

      if (fecha_desde) {
        paramCount++;
        whereClause += ` AND r.fecha_ingreso >= $${paramCount}`;
        params.push(fecha_desde);
      }

      if (fecha_hasta) {
        paramCount++;
        whereClause += ` AND r.fecha_ingreso <= $${paramCount}`;
        params.push(fecha_hasta);
      }

      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM repairs r ${whereClause}`,
        params,
      );

      const total = parseInt(countResult.rows[0].total);

      // Get repairs with client and technician names
      const result = await client.query(
        `SELECT r.*,
                c.nombre_completo as cliente_nombre, c.telefono as cliente_telefono, c.email as cliente_email, c.dni as cliente_dni,
                u.nombre_completo as tecnico_nombre
         FROM repairs r
         LEFT JOIN clients c ON r.cliente_id = c.id
         LEFT JOIN users u ON r.tecnico_asignado_id = u.id
         ${whereClause}
         ORDER BY r.fecha_ingreso DESC, r.prioridad DESC
         LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset],
      );

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          reparaciones: result.rows,
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
        `SELECT r.*, 
                c.nombre_completo as cliente_nombre, c.telefono as cliente_telefono, c.email as cliente_email,
                u.nombre_completo as tecnico_nombre
         FROM repairs r
         LEFT JOIN clients c ON r.cliente_id = c.id
         LEFT JOIN users u ON r.tecnico_asignado_id = u.id
         WHERE r.id = $1 AND r.empresa_id = $2`,
        [id, user.empresaId],
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('Reparación no encontrada');
      }

      return {
        success: true,
        data: result.rows[0],
      };
    } finally {
      client.release();
    }
  }

  async update(id: string, updateData: Record<string, unknown>, user: CurrentUserData) {
    const client = await this.pool.connect();

    try {
      // Check if repair exists
      const existingRepair = await client.query(
        'SELECT * FROM repairs WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId],
      );

      if (existingRepair.rows.length === 0) {
        throw new NotFoundException('Reparación no encontrada');
      }

      const repair = existingRepair.rows[0];

      // Validate state transitions
      if (updateData.estado && updateData.estado !== repair.estado) {
        const estado = updateData.estado as string;
        const validTransitions: Record<string, string[]> = {
          [RepairStatus.DIAGNOSTIC]: [RepairStatus.IN_PROGRESS, RepairStatus.CANCELLED],
          [RepairStatus.IN_PROGRESS]: [RepairStatus.WAITING_PARTS, RepairStatus.TESTING, RepairStatus.COMPLETED, RepairStatus.CANCELLED],
          [RepairStatus.WAITING_PARTS]: [RepairStatus.IN_PROGRESS, RepairStatus.CANCELLED],
          [RepairStatus.TESTING]: [RepairStatus.IN_PROGRESS, RepairStatus.COMPLETED, RepairStatus.CANCELLED],
          [RepairStatus.COMPLETED]: [], // Terminal state
          [RepairStatus.CANCELLED]: [], // Terminal state
        };

        const allowedTransitions = validTransitions[repair.estado] || [];
        if (!allowedTransitions.includes(estado)) {
          throw new BadRequestException(
            `Transición de estado inválida: ${repair.estado} -> ${estado}`,
          );
        }
      }

      // Validate technician if provided
      if (updateData.tecnico_asignado_id) {
        const techCheck = await client.query(
          'SELECT id FROM users WHERE id = $1 AND empresa_id = $2 AND estado = $3',
          [updateData.tecnico_asignado_id, user.empresaId, 'activo'],
        );

        if (techCheck.rows.length === 0) {
          throw new NotFoundException('Técnico no encontrado o no está activo');
        }
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: (string | number | boolean | any[] | Record<string, any> | null)[] = [];
      let paramCount = 0;

      const allowedFields = [
        'estado', 'diagnosis', 'reparacion_realizada', 'tecnico_asignado_id',
        'fecha_estimada_entrega', 'costo_piezas', 'costo_mano_obra', 'notas',
        'categoria_dispositivo', 'marca', 'modelo', 'numero_serie',
        'condicion_estetica', 'accesorios_incluidos', 'tiempo_estimado_minutos',
        'total_reparacion', 'pagado', 'metodo_pago_id',
        'tipo_seguridad', 'pin_acceso', 'patron_puntos', 'secuencia_patron',
        'chequeo_hardware',
      ];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          paramCount++;
          updates.push(`${field} = $${paramCount + 2}`);
          values.push(updateData[field] as any);
        }
      }

      // Update total_reparacion if costs changed
      if (updateData.costo_piezas !== undefined || updateData.costo_mano_obra !== undefined) {
        const costoPiezas = updateData.costo_piezas !== undefined ? updateData.costo_piezas : repair.costo_piezas;
        const costoManoObra = updateData.costo_mano_obra !== undefined ? updateData.costo_mano_obra : repair.costo_mano_obra;
        paramCount++;
        updates.push(`total_reparacion = $${paramCount + 2}`);
        values.push(costoPiezas + costoManoObra);
      }

      // Update warranty expiration if completed
      if (updateData.estado === RepairStatus.COMPLETED) {
        paramCount++;
        updates.push(`fecha_entrega_real = $${paramCount + 2}`);
        values.push(new Date().toISOString().split('T')[0]);

        const warrantyMonths = repair.garantia_meses || 3;
        const warrantyExpiry = new Date();
        warrantyExpiry.setMonth(warrantyExpiry.getMonth() + warrantyMonths);
        paramCount++;
        updates.push(`fecha_vencimiento_garantia = $${paramCount + 2}`);
        values.push(warrantyExpiry.toISOString().split('T')[0]);
      }

      if (updates.length === 0) {
        throw new BadRequestException('No se proporcionaron campos para actualizar');
      }

      updates.push('fecha_actualizacion = CURRENT_TIMESTAMP');

      const query = `
        UPDATE repairs
        SET ${updates.join(', ')}
        WHERE id = $1 AND empresa_id = $2
        RETURNING *
      `;

      const result = await client.query(query, [id, user.empresaId, ...values]);

      // Log audit
      await this.logAudit(user.id, user.empresaId, 'actualizar', 'reparaciones', 'repairs', id, `Se actualizó reparación: ${repair.numero_reparacion}`);

      return {
        success: true,
        message: 'Reparación actualizada',
        data: result.rows[0],
      };
    } finally {
      client.release();
    }
  }

  async completeRepair(id: string, completeData: Record<string, unknown>, user: CurrentUserData) {
    const client = await this.pool.connect();

    try {
      // Check if repair exists
      const existingRepair = await client.query(
        'SELECT * FROM repairs WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId],
      );

      if (existingRepair.rows.length === 0) {
        throw new NotFoundException('Reparación no encontrada');
      }

      const repair = existingRepair.rows[0];

      if (repair.estado === RepairStatus.COMPLETED) {
        throw new BadRequestException('La reparación ya está completada');
      }

      // Calculate total if not provided
      const costoPiezas = completeData.costo_piezas !== undefined ? completeData.costo_piezas : repair.costo_piezas;
      const costoManoObra = completeData.costo_mano_obra !== undefined ? completeData.costo_mano_obra : repair.costo_mano_obra;
      const total = costoPiezas + costoManoObra;

      // Update repair as completed
      const warrantyMonths = repair.garantia_meses || 3;
      const warrantyExpiry = new Date();
      warrantyExpiry.setMonth(warrantyExpiry.getMonth() + warrantyMonths);

      const result = await client.query(
        `UPDATE repairs
         SET estado = $1, reparacion_realizada = $2, costo_piezas = $3, costo_mano_obra = $4, total_reparacion = $5,
             fecha_entrega_real = $6, fecha_vencimiento_garantia = $7, fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE id = $8 AND empresa_id = $9
         RETURNING id, numero_reparacion, estado`,
        [
          RepairStatus.COMPLETED,
          completeData.reparacion_realizada || '',
          costoPiezas,
          costoManoObra,
          total,
          completeData.fecha_entrega || new Date().toISOString().split('T')[0],
          warrantyExpiry.toISOString().split('T')[0],
          id,
          user.empresaId,
        ],
      );

      // Log audit
      await this.logAudit(user.id, user.empresaId, 'actualizar', 'reparaciones', 'repairs', id, `Se completó reparación: ${repair.numero_reparacion}`);

      return {
        success: true,
        message: 'Reparación completada',
        data: result.rows[0],
      };
    } finally {
      client.release();
    }
  }

  async updateStatus(id: string, estado: string, user: CurrentUserData) {
    const client = await this.pool.connect();

    try {
      // Check if repair exists
      const existingRepair = await client.query(
        'SELECT * FROM repairs WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId],
      );

      if (existingRepair.rows.length === 0) {
        throw new NotFoundException('Reparación no encontrada');
      }

      const repair = existingRepair.rows[0];

      // Validate state transitions if changing to a different state
      if (estado !== repair.estado) {
        const validTransitions: Record<string, string[]> = {
          [RepairStatus.DIAGNOSTIC]: [RepairStatus.IN_PROGRESS, RepairStatus.CANCELLED],
          [RepairStatus.IN_PROGRESS]: [RepairStatus.WAITING_PARTS, RepairStatus.TESTING, RepairStatus.COMPLETED, RepairStatus.CANCELLED],
          [RepairStatus.WAITING_PARTS]: [RepairStatus.IN_PROGRESS, RepairStatus.CANCELLED],
          [RepairStatus.TESTING]: [RepairStatus.IN_PROGRESS, RepairStatus.COMPLETED, RepairStatus.CANCELLED],
          [RepairStatus.COMPLETED]: [], // Terminal state
          [RepairStatus.CANCELLED]: [], // Terminal state
        };

        const allowedTransitions = validTransitions[repair.estado] || [];
        if (!allowedTransitions.includes(estado)) {
          throw new BadRequestException(
            `Transición de estado inválida: ${repair.estado} -> ${estado}`,
          );
        }
      }

      // Update status
      const result = await client.query(
        'UPDATE repairs SET estado = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $2 AND empresa_id = $3 RETURNING *',
        [estado, id, user.empresaId],
      );

      // Log audit
      await this.logAudit(user.id, user.empresaId, 'actualizar', 'reparaciones', 'repairs', id, `Se cambió estado de reparación: ${repair.numero_reparacion} de ${repair.estado} a ${estado}`);

      return {
        success: true,
        message: 'Estado actualizado',
        data: result.rows[0],
      };
    } finally {
      client.release();
    }
  }

  async remove(id: string, user: CurrentUserData) {
    const client = await this.pool.connect();

    try {
      // Check if repair exists
      const existingRepair = await client.query(
        'SELECT * FROM repairs WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId],
      );

      if (existingRepair.rows.length === 0) {
        throw new NotFoundException('Reparación no encontrada');
      }

      const repair = existingRepair.rows[0];

      if (repair.estado === RepairStatus.COMPLETED) {
        throw new BadRequestException('No se puede eliminar una reparación completada');
      }

      // Soft delete - change status to cancelled
      await client.query(
        'UPDATE repairs SET estado = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $2 AND empresa_id = $3',
        [RepairStatus.CANCELLED, id, user.empresaId],
      );

      // Log audit
      await this.logAudit(user.id, user.empresaId, 'eliminar', 'reparaciones', 'repairs', id, `Se canceló reparación: ${repair.numero_reparacion}`);

      return {
        success: true,
        message: 'Reparación cancelada',
      };
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
