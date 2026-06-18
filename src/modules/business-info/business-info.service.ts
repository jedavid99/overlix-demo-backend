import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { UpdateBusinessInfoDto } from './dto/update-business-info.dto';
import { BusinessInfo } from './entities/business-info.entity';
import { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Injectable()
export class BusinessInfoService {
  constructor(@Inject('DATABASE_POOL') private db: Pool) {}

  async findOne(user: CurrentUserData): Promise<BusinessInfo> {
    const result = await this.db.query(
      'SELECT * FROM business_info WHERE empresa_id = $1',
      [user.empresaId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Información de negocio no encontrada');
    }

    return result.rows[0];
  }

  async update(updateBusinessInfoDto: UpdateBusinessInfoDto, user: CurrentUserData): Promise<BusinessInfo> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if business info exists for this company
      const existingInfo = await client.query(
        'SELECT id FROM business_info WHERE empresa_id = $1',
        [user.empresaId]
      );

      if (existingInfo.rows.length === 0) {
        // Create new business info
        const result = await client.query(
          `INSERT INTO business_info 
           (empresa_id, nombre_negocio, propietario_nombre, telefono, email, 
            direccion, ciudad, provincia, codigo_postal, sitio_web, logo_url, 
            descripcion, horarios)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING *`,
          [
            user.empresaId,
            updateBusinessInfoDto.nombre_negocio || 'Mi Negocio',
            updateBusinessInfoDto.propietario_nombre || null,
            updateBusinessInfoDto.telefono || '',
            updateBusinessInfoDto.email || '',
            updateBusinessInfoDto.direccion || null,
            updateBusinessInfoDto.ciudad || null,
            updateBusinessInfoDto.provincia || null,
            updateBusinessInfoDto.codigo_postal || null,
            updateBusinessInfoDto.sitio_web || null,
            updateBusinessInfoDto.logo_url || null,
            updateBusinessInfoDto.descripcion || null,
            updateBusinessInfoDto.horarios || {},
          ]
        );

        const businessInfo = result.rows[0];

        // Log audit
        await this.logAudit(
          client,
          user.id,
          user.empresaId,
          'crear',
          'negocio',
          'business_info',
          businessInfo.id,
          `Información de negocio creada`
        );

        await client.query('COMMIT');

        return businessInfo;
      }

      // Update existing business info
      const allowedFields = [
        'nombre_negocio', 'propietario_nombre', 'telefono', 'email',
        'direccion', 'ciudad', 'provincia', 'codigo_postal', 'sitio_web',
        'logo_url', 'descripcion', 'horarios'
      ];
      
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      for (const field of allowedFields) {
        if ((updateBusinessInfoDto as any)[field] !== undefined) {
          paramCount++;
          updates.push(`${field} = $${paramCount + 2}`);
          values.push((updateBusinessInfoDto as any)[field]);
        }
      }

      if (updates.length === 0) {
        throw new BadRequestException('No se proporcionaron campos para actualizar');
      }

      values.push(user.empresaId);

      const updateQuery = `
        UPDATE business_info
        SET ${updates.join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE empresa_id = $${paramCount + 3}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      const businessInfo = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'actualizar',
        'negocio',
        'business_info',
        businessInfo.id,
        `Información de negocio actualizada`
      );

      await client.query('COMMIT');

      return businessInfo;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateLogo(logoUrl: string, user: CurrentUserData): Promise<BusinessInfo> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE business_info
         SET logo_url = $1, fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE empresa_id = $2
         RETURNING *`,
        [logoUrl, user.empresaId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('Información de negocio no encontrada');
      }

      const businessInfo = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'actualizar',
        'negocio',
        'business_info',
        businessInfo.id,
        `Logo actualizado`
      );

      await client.query('COMMIT');

      return businessInfo;
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
