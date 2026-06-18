import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { Appointment } from './entities/appointment.entity';
import { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);
  constructor(@Inject('DATABASE_POOL') private db: Pool) {}

  async create(createAppointmentDto: CreateAppointmentDto, user: CurrentUserData): Promise<Appointment> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Verify client belongs to company
      const clientCheck = await client.query(
        'SELECT id, nombre_completo FROM clients WHERE id = $1 AND empresa_id = $2',
        [createAppointmentDto.cliente_id, user.empresaId]
      );
      if (clientCheck.rows.length === 0) {
        throw new NotFoundException('Cliente no encontrado');
      }

      // Verify technician belongs to company if provided
      if (createAppointmentDto.tecnico_id) {
        const techCheck = await client.query(
          'SELECT id, nombre_completo FROM users WHERE id = $1 AND empresa_id = $2',
          [createAppointmentDto.tecnico_id, user.empresaId]
        );
        if (techCheck.rows.length === 0) {
          throw new NotFoundException('Técnico no encontrado');
        }
      }

      // Verify repair belongs to company if provided
      if (createAppointmentDto.reparacion_id) {
        const repairCheck = await client.query(
          'SELECT id FROM repairs WHERE id = $1 AND empresa_id = $2',
          [createAppointmentDto.reparacion_id, user.empresaId]
        );
        if (repairCheck.rows.length === 0) {
          throw new NotFoundException('Reparación no encontrada');
        }
      }

      // Verify sale belongs to company if provided
      if (createAppointmentDto.venta_id) {
        const saleCheck = await client.query(
          'SELECT id FROM sales WHERE id = $1 AND empresa_id = $2',
          [createAppointmentDto.venta_id, user.empresaId]
        );
        if (saleCheck.rows.length === 0) {
          throw new NotFoundException('Venta no encontrada');
        }
      }

      // Generate appointment number
      const numeroResult = await client.query(
        'SELECT generate_appointment_number($1) as numero',
        [user.empresaId]
      );
      const numeroCita = numeroResult.rows[0].numero;

      const result = await client.query(
        `INSERT INTO appointments 
         (empresa_id, numero_cita, cliente_id, tecnico_id, tipo_cita, fecha_cita, hora_cita, 
          duracion_minutos, descripcion, reparacion_id, venta_id, estado, notas)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          user.empresaId,
          numeroCita,
          createAppointmentDto.cliente_id,
          createAppointmentDto.tecnico_id || null,
          createAppointmentDto.tipo_cita,
          createAppointmentDto.fecha_cita,
          createAppointmentDto.hora_cita,
          createAppointmentDto.duracion_minutos || 30,
          createAppointmentDto.descripcion || null,
          createAppointmentDto.reparacion_id || null,
          createAppointmentDto.venta_id || null,
          createAppointmentDto.estado || 'programada',
          createAppointmentDto.notas || null,
        ]
      );

      const appointment = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'crear',
        'citas',
        'appointments',
        appointment.id,
        `Cita creada: ${appointment.numero_cita} - ${appointment.tipo_cita}`
      );

      await client.query('COMMIT');

      // Load related data
      await this.loadRelatedData(appointment);

      return appointment;
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
    cliente_id?: string,
    tecnico_id?: string,
    fecha_desde?: string,
    fecha_hasta?: string
  ): Promise<{ appointments: Appointment[]; total: number; page: number; limit: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT a.*, c.nombre_completo as cliente_nombre, u.nombre_completo as tecnico_nombre
      FROM appointments a
      LEFT JOIN clients c ON a.cliente_id = c.id
      LEFT JOIN users u ON a.tecnico_id = u.id
      WHERE a.empresa_id = $1
    `;
    
    const params: (string | number)[] = [user.empresaId];
    let paramCount = 1;

    if (estado) {
      paramCount++;
      query += ` AND a.estado = $${paramCount}`;
      params.push(estado);
    }

    if (cliente_id) {
      paramCount++;
      query += ` AND a.cliente_id = $${paramCount}`;
      params.push(cliente_id);
    }

    if (tecnico_id) {
      paramCount++;
      query += ` AND a.tecnico_id = $${paramCount}`;
      params.push(tecnico_id);
    }

    if (fecha_desde) {
      paramCount++;
      query += ` AND a.fecha_cita >= $${paramCount}`;
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      paramCount++;
      query += ` AND a.fecha_cita <= $${paramCount}`;
      params.push(fecha_hasta);
    }

    // Get total count
    const countQuery = query.replace('SELECT a.*, c.nombre_completo as cliente_nombre, u.nombre_completo as tecnico_nombre', 'SELECT COUNT(*)');
    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    paramCount++;
    query += ` ORDER BY a.fecha_cita ASC, a.hora_cita ASC LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await this.db.query(query, params);
    
    return {
      appointments: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCalendar(user: CurrentUserData, fecha: string): Promise<Appointment[]> {
    const result = await this.db.query(
      `SELECT a.*, c.nombre_completo as cliente_nombre, u.nombre_completo as tecnico_nombre
       FROM appointments a
       LEFT JOIN clients c ON a.cliente_id = c.id
       LEFT JOIN users u ON a.tecnico_id = u.id
       WHERE a.empresa_id = $1 AND a.fecha_cita = $2 AND a.estado NOT IN ('cancelada', 'completada')
       ORDER BY a.hora_cita ASC`,
      [user.empresaId, fecha]
    );

    return result.rows;
  }

  async getByTechnician(user: CurrentUserData, tecnicoId: string): Promise<Appointment[]> {
    const result = await this.db.query(
      `SELECT a.*, c.nombre_completo as cliente_nombre, u.nombre_completo as tecnico_nombre
       FROM appointments a
       LEFT JOIN clients c ON a.cliente_id = c.id
       LEFT JOIN users u ON a.tecnico_id = u.id
       WHERE a.empresa_id = $1 AND a.tecnico_id = $2 AND a.fecha_cita >= CURRENT_DATE
       ORDER BY a.fecha_cita ASC, a.hora_cita ASC`,
      [user.empresaId, tecnicoId]
    );

    return result.rows;
  }

  async findOne(id: string, user: CurrentUserData): Promise<Appointment> {
    const result = await this.db.query(
      `SELECT a.*, c.nombre_completo as cliente_nombre, u.nombre_completo as tecnico_nombre
       FROM appointments a
       LEFT JOIN clients c ON a.cliente_id = c.id
       LEFT JOIN users u ON a.tecnico_id = u.id
       WHERE a.id = $1 AND a.empresa_id = $2`,
      [id, user.empresaId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Cita no encontrada');
    }

    return result.rows[0];
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto, user: CurrentUserData): Promise<Appointment> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if appointment exists and belongs to company
      const existingAppointment = await client.query(
        'SELECT * FROM appointments WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId]
      );

      if (existingAppointment.rows.length === 0) {
        throw new NotFoundException('Cita no encontrada');
      }

      // Verify technician belongs to company if provided
      if (updateAppointmentDto.tecnico_id) {
        const techCheck = await client.query(
          'SELECT id FROM users WHERE id = $1 AND empresa_id = $2',
          [updateAppointmentDto.tecnico_id, user.empresaId]
        );
        if (techCheck.rows.length === 0) {
          throw new NotFoundException('Técnico no encontrado');
        }
      }

      // Build dynamic update query
      const allowedFields = [
        'cliente_id', 'tecnico_id', 'tipo_cita', 'fecha_cita', 'hora_cita',
        'duracion_minutos', 'descripcion', 'reparacion_id', 'venta_id',
        'estado', 'notas'
      ];
      
      const updates: string[] = [];
      const values: (string | number)[] = [];
      let paramCount = 0;

      for (const field of allowedFields) {
        if ((updateAppointmentDto as any)[field] !== undefined) {
          paramCount++;
          updates.push(`${field} = $${paramCount + 2}`);
          values.push((updateAppointmentDto as any)[field]);
        }
      }

      if (updates.length === 0) {
        throw new BadRequestException('No se proporcionaron campos para actualizar');
      }

      values.push(id, user.empresaId);

      const updateQuery = `
        UPDATE appointments
        SET ${updates.join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = $${paramCount + 3} AND empresa_id = $${paramCount + 4}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      const appointment = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'actualizar',
        'citas',
        'appointments',
        appointment.id,
        `Cita actualizada: ${appointment.numero_cita}`
      );

      await client.query('COMMIT');

      await this.loadRelatedData(appointment);

      return appointment;
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

      // Check if appointment exists and belongs to company
      const existingAppointment = await client.query(
        'SELECT numero_cita, tipo_cita FROM appointments WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId]
      );

      if (existingAppointment.rows.length === 0) {
        throw new NotFoundException('Cita no encontrada');
      }

      await client.query(
        'DELETE FROM appointments WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId]
      );

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'eliminar',
        'citas',
        'appointments',
        id,
        `Cita eliminada: ${existingAppointment.rows[0].numero_cita} - ${existingAppointment.rows[0].tipo_cita}`
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async loadRelatedData(appointment: Appointment): Promise<void> {
    const promises: Promise<void>[] = [];

    if (appointment.cliente_id) {
      promises.push(
        (async () => {
          const clientResult = await this.db.query(
            'SELECT nombre_completo FROM clients WHERE id = $1',
            [appointment.cliente_id]
          );
          if (clientResult.rows.length > 0) {
            appointment.cliente_nombre = clientResult.rows[0].nombre_completo;
          }
        })(),
      );
    }

    if (appointment.tecnico_id) {
      promises.push(
        (async () => {
          const techResult = await this.db.query(
            'SELECT nombre_completo FROM users WHERE id = $1',
            [appointment.tecnico_id]
          );
          if (techResult.rows.length > 0) {
            appointment.tecnico_nombre = techResult.rows[0].nombre_completo;
          }
        })(),
      );
    }

    await Promise.all(promises);
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
      this.logger.error('Error al crear log de auditoría:', error);
    }
  }
}
