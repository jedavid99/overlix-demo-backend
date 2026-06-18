import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Expense } from './entities/expense.entity';
import { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);
  constructor(@Inject('DATABASE_POOL') private db: Pool) {}

  async create(createExpenseDto: CreateExpenseDto, user: CurrentUserData): Promise<Expense> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Verify category belongs to company if provided
      if (createExpenseDto.categoria_gasto_id) {
        const categoryCheck = await client.query(
          'SELECT id FROM expense_categories WHERE id = $1 AND empresa_id = $2',
          [createExpenseDto.categoria_gasto_id, user.empresaId]
        );
        if (categoryCheck.rows.length === 0) {
          throw new NotFoundException('Categoría de gasto no encontrada');
        }
      }

      // Verify payment method belongs to company if provided
      if (createExpenseDto.metodo_pago_id) {
        const paymentCheck = await client.query(
          'SELECT id FROM payment_methods WHERE id = $1 AND empresa_id = $2',
          [createExpenseDto.metodo_pago_id, user.empresaId]
        );
        if (paymentCheck.rows.length === 0) {
          throw new NotFoundException('Método de pago no encontrado');
        }
      }

      // Generate expense number
      const numeroResult = await client.query(
        'SELECT generate_expense_number($1) as numero',
        [user.empresaId]
      );
      const numeroGasto = numeroResult.rows[0].numero;

      const result = await client.query(
        `INSERT INTO expenses 
         (empresa_id, numero_gasto, categoria_gasto_id, descripcion, monto, metodo_pago_id, 
          fecha_gasto, fecha_pago, comprobante_numero, proveedor, proveedor_id, estado, 
          usuario_id_creacion, notas)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          user.empresaId,
          numeroGasto,
          createExpenseDto.categoria_gasto_id || null,
          createExpenseDto.descripcion,
          createExpenseDto.monto,
          createExpenseDto.metodo_pago_id || null,
          createExpenseDto.fecha_gasto,
          createExpenseDto.fecha_pago || null,
          createExpenseDto.comprobante_numero || null,
          createExpenseDto.proveedor || null,
          createExpenseDto.proveedor_id || null,
          createExpenseDto.estado || 'registrado',
          user.id,
          createExpenseDto.notas || null,
        ]
      );

      const expense = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'crear',
        'gastos',
        'expenses',
        expense.id,
        `Gasto creado: ${expense.numero_gasto} - ${expense.descripcion}`
      );

      await client.query('COMMIT');

      // Get related data
      await this.loadRelatedData(expense);

      return expense;
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
    categoria_id?: string,
    estado?: string,
    fecha_desde?: string,
    fecha_hasta?: string,
    metodo_pago?: string
  ): Promise<{ expenses: Expense[]; total: number; page: number; limit: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT e.*, ec.nombre as categoria_nombre, pm.nombre as metodo_pago_nombre, 
             u.nombre_completo as usuario_nombre
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.categoria_gasto_id = ec.id
      LEFT JOIN payment_methods pm ON e.metodo_pago_id = pm.id
      LEFT JOIN users u ON e.usuario_id_creacion = u.id
      WHERE e.empresa_id = $1
    `;
    
    const params: (string | number)[] = [user.empresaId];
    let paramCount = 1;

    if (categoria_id) {
      paramCount++;
      query += ` AND e.categoria_gasto_id = $${paramCount}`;
      params.push(categoria_id);
    }

    if (estado) {
      paramCount++;
      query += ` AND e.estado = $${paramCount}`;
      params.push(estado);
    }

    if (fecha_desde) {
      paramCount++;
      query += ` AND e.fecha_gasto >= $${paramCount}`;
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      paramCount++;
      query += ` AND e.fecha_gasto <= $${paramCount}`;
      params.push(fecha_hasta);
    }

    if (metodo_pago) {
      paramCount++;
      query += ` AND e.metodo_pago_id = $${paramCount}`;
      params.push(metodo_pago);
    }

    // Get total count
    const countQuery = query.replace(
      'SELECT e.*, ec.nombre as categoria_nombre, pm.nombre as metodo_pago_nombre, u.nombre_completo as usuario_nombre',
      'SELECT COUNT(*)'
    );
    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    paramCount++;
    query += ` ORDER BY e.fecha_gasto DESC, e.fecha_creacion DESC LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await this.db.query(query, params);
    
    return {
      expenses: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user: CurrentUserData): Promise<Expense> {
    const result = await this.db.query(
      `SELECT e.*, ec.nombre as categoria_nombre, pm.nombre as metodo_pago_nombre, 
              u.nombre_completo as usuario_nombre
       FROM expenses e
       LEFT JOIN expense_categories ec ON e.categoria_gasto_id = ec.id
       LEFT JOIN payment_methods pm ON e.metodo_pago_id = pm.id
       LEFT JOIN users u ON e.usuario_id_creacion = u.id
       WHERE e.id = $1 AND e.empresa_id = $2`,
      [id, user.empresaId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Gasto no encontrado');
    }

    return result.rows[0];
  }

  async update(id: string, updateExpenseDto: UpdateExpenseDto, user: CurrentUserData): Promise<Expense> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if expense exists and belongs to company
      const existingExpense = await client.query(
        'SELECT * FROM expenses WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId]
      );

      if (existingExpense.rows.length === 0) {
        throw new NotFoundException('Gasto no encontrado');
      }

      // Verify category belongs to company if provided
      if (updateExpenseDto.categoria_gasto_id) {
        const categoryCheck = await client.query(
          'SELECT id FROM expense_categories WHERE id = $1 AND empresa_id = $2',
          [updateExpenseDto.categoria_gasto_id, user.empresaId]
        );
        if (categoryCheck.rows.length === 0) {
          throw new NotFoundException('Categoría de gasto no encontrada');
        }
      }

      // Verify payment method belongs to company if provided
      if (updateExpenseDto.metodo_pago_id) {
        const paymentCheck = await client.query(
          'SELECT id FROM payment_methods WHERE id = $1 AND empresa_id = $2',
          [updateExpenseDto.metodo_pago_id, user.empresaId]
        );
        if (paymentCheck.rows.length === 0) {
          throw new NotFoundException('Método de pago no encontrado');
        }
      }

      // Build dynamic update query
      const allowedFields = [
        'categoria_gasto_id', 'descripcion', 'monto', 'metodo_pago_id',
        'fecha_gasto', 'fecha_pago', 'comprobante_numero', 'proveedor',
        'proveedor_id', 'estado', 'notas'
      ];
      
      const updates: string[] = [];
      const values: (string | number)[] = [];
      let paramCount = 0;

      for (const field of allowedFields) {
        if ((updateExpenseDto as any)[field] !== undefined) {
          paramCount++;
          updates.push(`${field} = $${paramCount + 2}`);
          values.push((updateExpenseDto as any)[field]);
        }
      }

      if (updates.length === 0) {
        throw new BadRequestException('No se proporcionaron campos para actualizar');
      }

      values.push(id, user.empresaId);

      const updateQuery = `
        UPDATE expenses
        SET ${updates.join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = $${paramCount + 3} AND empresa_id = $${paramCount + 4}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      const expense = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'actualizar',
        'gastos',
        'expenses',
        expense.id,
        `Gasto actualizado: ${expense.numero_gasto}`
      );

      await client.query('COMMIT');

      await this.loadRelatedData(expense);

      return expense;
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

      // Check if expense exists and belongs to company
      const existingExpense = await client.query(
        'SELECT numero_gasto, descripcion FROM expenses WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId]
      );

      if (existingExpense.rows.length === 0) {
        throw new NotFoundException('Gasto no encontrado');
      }

      await client.query(
        'DELETE FROM expenses WHERE id = $1 AND empresa_id = $2',
        [id, user.empresaId]
      );

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'eliminar',
        'gastos',
        'expenses',
        id,
        `Gasto eliminado: ${existingExpense.rows[0].numero_gasto} - ${existingExpense.rows[0].descripcion}`
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getCategories(user: CurrentUserData): Promise<any[]> {
    const result = await this.db.query(
      `SELECT ec.*, COUNT(e.id) as total_gastos, COALESCE(SUM(e.monto), 0) as total_monto
       FROM expense_categories ec
       LEFT JOIN expenses e ON ec.id = e.categoria_gasto_id
       WHERE ec.empresa_id = $1
       GROUP BY ec.id
       ORDER BY ec.nombre`,
      [user.empresaId]
    );

    return result.rows;
  }

  async getReport(user: CurrentUserData, mes: string): Promise<any> {
    const result = await this.db.query(
      `SELECT ec.nombre as categoria, COUNT(e.id) as cantidad, COALESCE(SUM(e.monto), 0) as total
       FROM expense_categories ec
       LEFT JOIN expenses e ON ec.id = e.categoria_gasto_id 
         AND e.empresa_id = $1 
         AND TO_CHAR(e.fecha_gasto, 'YYYY-MM') = $2
       WHERE ec.empresa_id = $1
       GROUP BY ec.id, ec.nombre
       ORDER BY total DESC`,
      [user.empresaId, mes]
    );

    const totalGeneral = await this.db.query(
      `SELECT COALESCE(SUM(monto), 0) as total
       FROM expenses
       WHERE empresa_id = $1 AND TO_CHAR(fecha_gasto, 'YYYY-MM') = $2`,
      [user.empresaId, mes]
    );

    return {
      por_categoria: result.rows,
      total_general: parseFloat(totalGeneral.rows[0].total),
      mes,
    };
  }

  private async loadRelatedData(expense: Expense): Promise<void> {
    const promises: Promise<void>[] = [];

    if (expense.categoria_gasto_id) {
      promises.push(
        (async () => {
          const categoryResult = await this.db.query(
            'SELECT nombre FROM expense_categories WHERE id = $1',
            [expense.categoria_gasto_id]
          );
          if (categoryResult.rows.length > 0) {
            expense.categoria_nombre = categoryResult.rows[0].nombre;
          }
        })(),
      );
    }

    if (expense.metodo_pago_id) {
      promises.push(
        (async () => {
          const paymentResult = await this.db.query(
            'SELECT nombre FROM payment_methods WHERE id = $1',
            [expense.metodo_pago_id]
          );
          if (paymentResult.rows.length > 0) {
            expense.metodo_pago_nombre = paymentResult.rows[0].nombre;
          }
        })(),
      );
    }

    if (expense.usuario_id_creacion) {
      promises.push(
        (async () => {
          const userResult = await this.db.query(
            'SELECT nombre_completo FROM users WHERE id = $1',
            [expense.usuario_id_creacion]
          );
          if (userResult.rows.length > 0) {
            expense.usuario_nombre = userResult.rows[0].nombre_completo;
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
