import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateSocialMediaDto } from './dto/create-social-media.dto';
import { UpdateSocialMediaDto } from './dto/update-social-media.dto';
import { SocialMedia } from './entities/social-media.entity';
import { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Injectable()
export class SocialMediaService {
  constructor(@Inject('DATABASE_POOL') private db: Pool) {}

  async create(createSocialMediaDto: CreateSocialMediaDto, user: CurrentUserData): Promise<SocialMedia> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if platform already exists for this company
      const existingPlatform = await client.query(
        'SELECT id FROM social_media WHERE plataforma = $1 AND empresa_id = $2',
        [createSocialMediaDto.plataforma, user.empresaId]
      );
      if (existingPlatform.rows.length > 0) {
        throw new ConflictException('La plataforma ya está registrada para tu empresa');
      }

      const result = await client.query(
        `INSERT INTO social_media (empresa_id, plataforma, url, usuario, activo)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          user.empresaId,
          createSocialMediaDto.plataforma,
          createSocialMediaDto.url,
          createSocialMediaDto.usuario || null,
          createSocialMediaDto.activo !== undefined ? createSocialMediaDto.activo : true,
        ]
      );

      const socialMedia = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'crear',
        'redes_sociales',
        'social_media',
        socialMedia.id,
        `Red social creada: ${socialMedia.plataforma}`
      );

      await client.query('COMMIT');

      return socialMedia;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findAll(user: CurrentUserData, activoOnly: boolean = false): Promise<SocialMedia[]> {
    let query = 'SELECT * FROM social_media WHERE empresa_id = $1';
    const params: any[] = [user.empresaId];

    if (activoOnly) {
      query += ' AND activo = true';
    }

    query += ' ORDER BY plataforma ASC';

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async findOne(id: string, user: CurrentUserData): Promise<SocialMedia> {
    const result = await this.db.query(
      'SELECT * FROM social_media WHERE id = $1 AND empresa_id = $2',
      [id, user.empresaId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Red social no encontrada');
    }

    return result.rows[0];
  }

  async update(id: string, updateSocialMediaDto: UpdateSocialMediaDto, user: CurrentUserData): Promise<SocialMedia> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if social media exists and belongs to company
      const existingSocialMedia = await client.query(
        'SELECT * FROM social_media WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId]
      );

      if (existingSocialMedia.rows.length === 0) {
        throw new NotFoundException('Red social no encontrada');
      }

      // Build dynamic update query
      const allowedFields = ['plataforma', 'url', 'usuario', 'activo'];
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      for (const field of allowedFields) {
        if ((updateSocialMediaDto as any)[field] !== undefined) {
          paramCount++;
          updates.push(`${field} = $${paramCount + 2}`);
          values.push((updateSocialMediaDto as any)[field]);
        }
      }

      if (updates.length === 0) {
        throw new BadRequestException('No se proporcionaron campos para actualizar');
      }

      values.push(id, user.empresaId);

      const updateQuery = `
        UPDATE social_media
        SET ${updates.join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = $${paramCount + 3} AND empresa_id = $${paramCount + 4}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      const socialMedia = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'actualizar',
        'redes_sociales',
        'social_media',
        socialMedia.id,
        `Red social actualizada: ${socialMedia.plataforma}`
      );

      await client.query('COMMIT');

      return socialMedia;
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

      // Check if social media exists and belongs to company
      const existingSocialMedia = await client.query(
        'SELECT plataforma FROM social_media WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId]
      );

      if (existingSocialMedia.rows.length === 0) {
        throw new NotFoundException('Red social no encontrada');
      }

      await client.query(
        'DELETE FROM social_media WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId]
      );

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'eliminar',
        'redes_sociales',
        'social_media',
        id,
        `Red social eliminada: ${existingSocialMedia.rows[0].plataforma}`
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
