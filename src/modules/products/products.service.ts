import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { Product } from './entities/product.entity';
import { CurrentUserData } from '../../common/decorators/current-user.decorator';
import { Request } from 'express';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  constructor(@Inject('DATABASE_POOL') private db: Pool) {}

  async create(createProductDto: CreateProductDto, user: CurrentUserData): Promise<Product> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Verify category belongs to company if provided
      if (createProductDto.categoria_id) {
        const categoryCheck = await client.query(
          'SELECT id FROM product_categories WHERE id = $1 AND empresa_id = $2',
          [createProductDto.categoria_id, user.empresaId]
        );
        if (categoryCheck.rows.length === 0) {
          throw new NotFoundException('Categoría no encontrada');
        }
      }

      // Check if codigo_producto already exists for this company
      if (createProductDto.codigo_producto) {
        const existingCode = await client.query(
          'SELECT id FROM products WHERE codigo_producto = $1 AND empresa_id = $2',
          [createProductDto.codigo_producto, user.empresaId]
        );
        if (existingCode.rows.length > 0) {
          throw new ConflictException('El código de producto ya existe');
        }
      }

      // Check if SKU already exists globally
      if (createProductDto.sku) {
        const existingSku = await client.query(
          'SELECT id FROM products WHERE sku = $1',
          [createProductDto.sku]
        );
        if (existingSku.rows.length > 0) {
          throw new ConflictException('El SKU ya existe');
        }
      }

      const result = await client.query(
        `INSERT INTO products 
         (empresa_id, codigo_producto, nombre, descripcion, categoria_id, precio_costo, precio_venta, 
          precio_mayorista, cantidad_stock, cantidad_minima, marca, modelo, compatibilidad, imagen_url, 
          sku, tipo_producto, estado, activo_en_ventas, activo_en_reparaciones)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         RETURNING *`,
        [
          user.empresaId,
          createProductDto.codigo_producto || null,
          createProductDto.nombre,
          createProductDto.descripcion || null,
          createProductDto.categoria_id || null,
          createProductDto.precio_costo,
          createProductDto.precio_venta,
          createProductDto.precio_mayorista || null,
          createProductDto.cantidad_stock || 0,
          createProductDto.cantidad_minima || 5,
          createProductDto.marca || null,
          createProductDto.modelo || null,
          createProductDto.compatibilidad || null,
          createProductDto.imagen_url || null,
          createProductDto.sku || null,
          createProductDto.tipo_producto,
          createProductDto.estado || 'activo',
          createProductDto.activo_en_ventas !== undefined ? createProductDto.activo_en_ventas : true,
          createProductDto.activo_en_reparaciones !== undefined ? createProductDto.activo_en_reparaciones : true,
        ]
      );

      const product = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'crear',
        'productos',
        'products',
        product.id,
        `Producto creado: ${product.nombre}`
      );

      await client.query('COMMIT');

      // Get category name if exists (in parallel with commit)
      if (product.categoria_id) {
        const categoryResult = await this.db.query(
          'SELECT nombre FROM product_categories WHERE id = $1',
          [product.categoria_id]
        );
        if (categoryResult.rows.length > 0) {
          product.categoria_nombre = categoryResult.rows[0].nombre;
        }
      }

      return product;
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
    search?: string,
    categoria_id?: string,
    estado?: string,
    tipo_producto?: string
  ): Promise<{ products: Product[]; total: number; page: number; limit: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT p.*, pc.nombre as categoria_nombre
      FROM products p
      LEFT JOIN product_categories pc ON p.categoria_id = pc.id
      WHERE p.empresa_id = $1
    `;
    
    const params: (string | number)[] = [user.empresaId];
    let paramCount = 1;

    if (search) {
      paramCount++;
      query += ` AND (p.nombre ILIKE $${paramCount} OR p.descripcion ILIKE $${paramCount} OR p.codigo_producto ILIKE $${paramCount} OR p.sku ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (categoria_id) {
      paramCount++;
      query += ` AND p.categoria_id = $${paramCount}`;
      params.push(categoria_id);
    }

    if (estado) {
      paramCount++;
      query += ` AND p.estado = $${paramCount}`;
      params.push(estado);
    }

    if (tipo_producto) {
      paramCount++;
      query += ` AND p.tipo_producto = $${paramCount}`;
      params.push(tipo_producto);
    }

    // Get total count
    const countQuery = query.replace('SELECT p.*, pc.nombre as categoria_nombre', 'SELECT COUNT(*)');
    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    paramCount++;
    query += ` ORDER BY p.fecha_creacion DESC LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await this.db.query(query, params);
    
    return {
      products: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user: CurrentUserData, req?: Request): Promise<Product> {
    const supabase = (req as any)?.supabase;
    
    if (!supabase) {
      throw new UnauthorizedException('No Supabase client found in request');
    }

    const result = await this.db.query(
      `SELECT p.*, pc.nombre as categoria_nombre
       FROM products p
       LEFT JOIN product_categories pc ON p.categoria_id = pc.id
       WHERE p.id = $1 AND p.empresa_id = $2`,
      [id, user.empresaId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Producto no encontrado');
    }

    return result.rows[0];
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: CurrentUserData): Promise<Product> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if product exists and belongs to company
      const existingProduct = await client.query(
        'SELECT * FROM products WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId]
      );

      if (existingProduct.rows.length === 0) {
        throw new NotFoundException('Producto no encontrado');
      }

      // Verify category belongs to company if provided
      if (updateProductDto.categoria_id) {
        const categoryCheck = await client.query(
          'SELECT id FROM product_categories WHERE id = $1 AND empresa_id = $2',
          [updateProductDto.categoria_id, user.empresaId]
        );
        if (categoryCheck.rows.length === 0) {
          throw new NotFoundException('Categoría no encontrada');
        }
      }

      // Build dynamic update query
      const allowedFields = [
        'nombre', 'descripcion', 'categoria_id', 'precio_costo', 'precio_venta',
        'precio_mayorista', 'cantidad_minima', 'marca', 'modelo', 'compatibilidad',
        'imagen_url', 'estado', 'activo_en_ventas', 'activo_en_reparaciones'
      ];
      
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      for (const field of allowedFields) {
        if ((updateProductDto as any)[field] !== undefined) {
          paramCount++;
          updates.push(`${field} = $${paramCount + 2}`);
          values.push((updateProductDto as any)[field]);
        }
      }

      if (updates.length === 0) {
        throw new BadRequestException('No se proporcionaron campos para actualizar');
      }

      values.push(id, user.empresaId);

      const updateQuery = `
        UPDATE products
        SET ${updates.join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = $${paramCount + 3} AND empresa_id = $${paramCount + 4}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      const product = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'actualizar',
        'productos',
        'products',
        product.id,
        `Producto actualizado: ${product.nombre}`
      );

      await client.query('COMMIT');

      // Get category name if exists (in parallel with commit)
      if (product.categoria_id) {
        const categoryResult = await this.db.query(
          'SELECT nombre FROM product_categories WHERE id = $1',
          [product.categoria_id]
        );
        if (categoryResult.rows.length > 0) {
          product.categoria_nombre = categoryResult.rows[0].nombre;
        }
      }

      return product;
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

      // Check if product exists and belongs to company
      const existingProduct = await client.query(
        'SELECT nombre FROM products WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId]
      );

      if (existingProduct.rows.length === 0) {
        throw new NotFoundException('Producto no encontrado');
      }

      // Check if product is used in sales or repairs
      const usedInSales = await client.query(
        'SELECT id FROM sale_items WHERE producto_id = $1 LIMIT 1',
        [id]
      );

      if (usedInSales.rows.length > 0) {
        throw new BadRequestException('No se puede eliminar el producto porque está asociado a ventas');
      }

      const usedInRepairs = await client.query(
        'SELECT id FROM warranty_claims WHERE producto_id = $1 LIMIT 1',
        [id]
      );

      if (usedInRepairs.rows.length > 0) {
        throw new BadRequestException('No se puede eliminar el producto porque está asociado a garantías');
      }

      await client.query(
        'DELETE FROM products WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId]
      );

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'eliminar',
        'productos',
        'products',
        id,
        `Producto eliminado: ${existingProduct.rows[0].nombre}`
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async adjustStock(id: string, adjustStockDto: AdjustStockDto, user: CurrentUserData): Promise<Product> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if product exists and belongs to company
      const existingProduct = await client.query(
        'SELECT * FROM products WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId]
      );

      if (existingProduct.rows.length === 0) {
        throw new NotFoundException('Producto no encontrado');
      }

      const currentStock = existingProduct.rows[0].cantidad_stock;
      const newStock = currentStock + adjustStockDto.cantidad;

      if (newStock < 0) {
        throw new BadRequestException('El stock no puede ser negativo');
      }

      const result = await client.query(
        `UPDATE products 
         SET cantidad_stock = $1, fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE id = $2 AND empresa_id = $3
         RETURNING *`,
        [newStock, id, user.empresaId]
      );

      const product = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'actualizar',
        'productos',
        'products',
        product.id,
        `Stock ajustado: ${currentStock} -> ${newStock} (${adjustStockDto.cantidad > 0 ? '+' : ''}${adjustStockDto.cantidad}). Motivo: ${adjustStockDto.motivo || 'Sin motivo'}`
      );

      await client.query('COMMIT');

      // Get category name if exists (in parallel with commit)
      if (product.categoria_id) {
        const categoryResult = await this.db.query(
          'SELECT nombre FROM product_categories WHERE id = $1',
          [product.categoria_id]
        );
        if (categoryResult.rows.length > 0) {
          product.categoria_nombre = categoryResult.rows[0].nombre;
        }
      }

      return product;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getLowStockAlerts(user: CurrentUserData): Promise<Product[]> {
    const result = await this.db.query(
      `SELECT p.*, pc.nombre as categoria_nombre
       FROM products p
       LEFT JOIN product_categories pc ON p.categoria_id = pc.id
       WHERE p.empresa_id = $1 AND p.cantidad_stock <= p.cantidad_minima AND p.estado = 'activo'
       ORDER BY p.cantidad_stock ASC`,
      [user.empresaId]
    );

    return result.rows;
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
      // Log errors but don't fail the main operation
      this.logger.error('Error al crear log de auditoría:', error);
    }
  }
}
