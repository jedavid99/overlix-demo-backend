import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';
import { BusinessHour } from './entities/business-hour.entity';
import { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Injectable()
export class BusinessHoursService {
  constructor(@Inject('DATABASE_POOL') private db: Pool) {}

  async findAll(user: CurrentUserData): Promise<BusinessHour[]> {
    const result = await this.db.query(
      'SELECT * FROM business_hours WHERE empresa_id = $1 ORDER BY dia_semana ASC',
      [user.empresaId]
    );

    return result.rows;
  }

  async findOne(dia: string, user: CurrentUserData): Promise<BusinessHour> {
    const result = await this.db.query(
      'SELECT * FROM business_hours WHERE dia_semana = $1 AND empresa_id = $2',
      [dia, user.empresaId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Horario no encontrado para este día');
    }

    return result.rows[0];
  }

  async update(dia: string, updateBusinessHoursDto: UpdateBusinessHoursDto, user: CurrentUserData): Promise<BusinessHour> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if business hours exist for this day
      const existingHours = await client.query(
        'SELECT id FROM business_hours WHERE dia_semana = $1 AND empresa_id = $2',
        [dia, user.empresaId]
      );

      if (existingHours.rows.length === 0) {
        // Create new business hours for this day
        const result = await client.query(
          `INSERT INTO business_hours 
           (empresa_id, dia_semana, hora_apertura, hora_cierre, abierto, 
            descanso_inicio, descanso_fin, notas)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            user.empresaId,
            dia,
            updateBusinessHoursDto.hora_apertura || '09:00',
            updateBusinessHoursDto.hora_cierre || '18:00',
            updateBusinessHoursDto.abierto !== undefined ? updateBusinessHoursDto.abierto : true,
            updateBusinessHoursDto.descanso_inicio || null,
            updateBusinessHoursDto.descanso_fin || null,
            updateBusinessHoursDto.notas || null,
          ]
        );

        const businessHour = result.rows[0];

        // Log audit
        await this.logAudit(
          client,
          user.id,
          user.empresaId,
          'crear',
          'horarios',
          'business_hours',
          businessHour.id,
          `Horario creado para ${dia}`
        );

        await client.query('COMMIT');

        return businessHour;
      }

      // Update existing business hours
      const allowedFields = [
        'hora_apertura', 'hora_cierre', 'abierto', 'descanso_inicio', 
        'descanso_fin', 'notas'
      ];
      
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      for (const field of allowedFields) {
        if ((updateBusinessHoursDto as any)[field] !== undefined) {
          paramCount++;
          updates.push(`${field} = $${paramCount + 2}`);
          values.push((updateBusinessHoursDto as any)[field]);
        }
      }

      if (updates.length === 0) {
        throw new BadRequestException('No se proporcionaron campos para actualizar');
      }

      values.push(dia, user.empresaId);

      const updateQuery = `
        UPDATE business_hours
        SET ${updates.join(', ')}
        WHERE dia_semana = $${paramCount + 3} AND empresa_id = $${paramCount + 4}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      const businessHour = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'actualizar',
        'horarios',
        'business_hours',
        businessHour.id,
        `Horario actualizado para ${dia}`
      );

      await client.query('COMMIT');

      return businessHour;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getAvailableSlots(user: CurrentUserData, fecha: string): Promise<any[]> {
    const dayOfWeek = new Date(fecha).toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase();
    
    const result = await this.db.query(
      'SELECT * FROM business_hours WHERE dia_semana = $1 AND empresa_id = $2 AND abierto = true',
      [dayOfWeek, user.empresaId]
    );

    if (result.rows.length === 0) {
      return [];
    }

    const hours = result.rows[0];
    const slots: string[] = [];
    
    const [openHour, openMinute] = hours.hora_apertura.split(':').map(Number);
    const [closeHour, closeMinute] = hours.hora_cierre.split(':').map(Number);
    
    let currentHour = openHour;
    let currentMinute = openMinute;
    
    while (currentHour < closeHour || (currentHour === closeHour && currentMinute < closeMinute)) {
      const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      slots.push(timeStr);
      
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute = 0;
        currentHour++;
      }
    }

    return slots;
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
