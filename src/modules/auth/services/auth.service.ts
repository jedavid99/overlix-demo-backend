import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { VerifyCompanyDto } from '../dto/verify-company.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CurrentUserData } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    @Inject('DATABASE_POOL') private pool: Pool,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if email already exists in any company
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [registerDto.email],
      );

      if (existingUser.rows.length > 0) {
        throw new ConflictException('El email ya está registrado en otra empresa');
      }

      // Check if company name already exists
      const existingCompany = await client.query(
        'SELECT id FROM companies WHERE nombre_empresa = $1',
        [registerDto.nombre_empresa],
      );

      if (existingCompany.rows.length > 0) {
        throw new ConflictException('El nombre de empresa ya está registrado');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(registerDto.contraseña, 10);

      // Create company
      const companyResult = await client.query(
        `INSERT INTO companies 
         (nombre_empresa, razon_social, cuit, email, telefono, direccion, ciudad, provincia, codigo_postal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, codigo_empresa`,
        [
          registerDto.nombre_empresa,
          registerDto.razon_social,
          registerDto.cuit || null,
          registerDto.email,
          registerDto.telefono,
          registerDto.direccion || null,
          registerDto.ciudad || null,
          registerDto.provincia || null,
          registerDto.codigo_postal || null,
        ],
      );

      const company = companyResult.rows[0];

      // Get admin role
      const roleResult = await client.query(
        "SELECT id FROM roles WHERE nombre = 'admin' AND empresa_id IS NULL",
      );

      if (roleResult.rows.length === 0) {
        throw new BadRequestException('Rol de administrador no encontrado');
      }

      const roleId = roleResult.rows[0].id;

      // Create user
      const userResult = await client.query(
        `INSERT INTO users 
         (empresa_id, email, contraseña, nombre_completo, rol_id, estado)
         VALUES ($1, $2, $3, $4, $5, 'activo')
         RETURNING id, nombre_completo, email, estado`,
        [
          company.id,
          registerDto.email,
          hashedPassword,
          registerDto.nombre_completo,
          roleId,
        ],
      );

      const user = userResult.rows[0];

      // Create business info
      await client.query(
        `INSERT INTO business_info 
         (empresa_id, nombre_negocio, telefono, email, direccion, ciudad, provincia, codigo_postal, horarios)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          company.id,
          registerDto.nombre_empresa,
          registerDto.telefono,
          registerDto.email,
          registerDto.direccion,
          registerDto.ciudad,
          registerDto.provincia,
          registerDto.codigo_postal,
          JSON.stringify({
            lunes: { abierto: true, hora_apertura: '09:00', hora_cierre: '18:00' },
            martes: { abierto: true, hora_apertura: '09:00', hora_cierre: '18:00' },
            miercoles: { abierto: true, hora_apertura: '09:00', hora_cierre: '18:00' },
            jueves: { abierto: true, hora_apertura: '09:00', hora_cierre: '18:00' },
            viernes: { abierto: true, hora_apertura: '09:00', hora_cierre: '18:00' },
            sabado: { abierto: false },
            domingo: { abierto: false },
          }),
        ],
      );

      // Create default payment methods
      await client.query(
        `INSERT INTO payment_methods (empresa_id, nombre, tipo, habilitado, icono, color) VALUES
         ($1, 'Efectivo', 'cash', true, '💵', '#22c55e'),
         ($1, 'Tarjeta de Crédito', 'card', true, '💳', '#3b82f6'),
         ($1, 'Tarjeta de Débito', 'card', true, '💳', '#64748b'),
         ($1, 'Transferencia Bancaria', 'transfer', true, '🏦', '#8b5cf6')`,
        [company.id],
      );

      // Create default shipping methods
      await client.query(
        `INSERT INTO shipping_methods (empresa_id, nombre, tipo, habilitado, icono, color, precio_base) VALUES
         ($1, 'Retiro en Tienda', 'pickup', true, '🏪', '#22c55e', 0),
         ($1, 'Entrega a Domicilio', 'delivery', true, '🚚', '#f59e0b', 150)`,
        [company.id],
      );

      // Create default product categories
      await client.query(
        `INSERT INTO product_categories (empresa_id, nombre, descripcion, icono, color) VALUES
         ($1, 'Módulos/Pantallas', 'Pantallas LCD, OLED para smartphones', '📱', '#3b82f6'),
         ($1, 'Baterías', 'Baterías para smartphones y laptops', '🔋', '#22c55e'),
         ($1, 'Accesorios', 'Cargadores, cables, fundas', '🔌', '#f59e0b'),
         ($1, 'Repuestos', 'Componentes internos', '⚙️', '#64748b'),
         ($1, 'Servicios', 'Servicios de reparación', '🔧', '#8b5cf6')`,
        [company.id],
      );

      // Create default expense categories
      await client.query(
        `INSERT INTO expense_categories (empresa_id, nombre, descripcion) VALUES
         ($1, 'Alquiler', 'Pago de alquiler del local'),
         ($1, 'Servicios', 'Luz, agua, internet, teléfono'),
         ($1, 'Salarios', 'Pagos de salarios y honorarios'),
         ($1, 'Suministros', 'Compras de suministros y materiales'),
         ($1, 'Mantenimiento', 'Mantenimiento de equipos e instalaciones'),
         ($1, 'Marketing', 'Publicidad y marketing'),
         ($1, 'Transporte', 'Gastos de transporte y envíos'),
         ($1, 'Otros', 'Otros gastos no categorizados')`,
        [company.id],
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Empresa registrada exitosamente',
        data: {
          empresa_id: company.id,
          usuario_id: user.id,
          codigo_empresa: company.codigo_empresa,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async login(loginDto: LoginDto) {
    const client = await this.pool.connect();

    try {
      // Verify company code
      const companyResult = await client.query(
        'SELECT id, estado FROM companies WHERE codigo_empresa = $1',
        [loginDto.codigo_empresa],
      );

      if (companyResult.rows.length === 0) {
        throw new UnauthorizedException('Código de empresa inválido');
      }

      const company = companyResult.rows[0];

      if (company.estado !== 'activa') {
        throw new UnauthorizedException('La empresa no está activa');
      }

      // Find user by email and company
      const userResult = await client.query(
        `SELECT u.id, u.email, u.contraseña, u.nombre_completo, u.estado, u.empresa_id, 
                r.nombre as rol_nombre, r.permisos, c.nombre_empresa
         FROM users u
         JOIN roles r ON u.rol_id = r.id
         JOIN companies c ON u.empresa_id = c.id
         WHERE u.email = $1 AND u.empresa_id = $2`,
        [loginDto.email, company.id],
      );

      if (userResult.rows.length === 0) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      const user = userResult.rows[0];

      if (user.estado !== 'activo') {
        throw new UnauthorizedException('Usuario inactivo o suspendido');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(loginDto.contraseña, user.contraseña);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      // Update last access
      await client.query(
        'UPDATE users SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id],
      );

      // Generate JWT tokens
      const payload = {
        sub: user.id,
        email: user.email,
        empresaId: user.empresa_id,
        rol: user.rol_nombre,
        permisos: user.permisos,
      };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '24h',
      });

      const refreshToken = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d',
      });

      // Log audit
      await this.logAudit(client, user.id, user.empresa_id, 'login', 'auth', 'users', user.id, 'Inicio de sesión');

      return {
        success: true,
        data: {
          token: accessToken,
          refreshToken,
          usuario: {
            id: user.id,
            nombre_completo: user.nombre_completo,
            email: user.email,
            rol: user.rol_nombre,
            empresa_id: user.empresa_id,
            empresa_nombre: user.nombre_empresa,
            permisos: user.permisos,
          },
        },
      };
    } finally {
      client.release();
    }
  }

  async verifyCompany(verifyCompanyDto: VerifyCompanyDto) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        'SELECT id, nombre_empresa, estado FROM companies WHERE codigo_empresa = $1',
        [verifyCompanyDto.codigo_empresa],
      );

      if (result.rows.length === 0) {
        return {
          success: true,
          valid: false,
          message: 'Código de empresa inválido',
        };
      }

      const company = result.rows[0];

      if (company.estado !== 'activa') {
        return {
          success: true,
          valid: false,
          message: 'La empresa no está activa',
        };
      }

      return {
        success: true,
        valid: true,
        data: {
          empresa_id: company.id,
          empresa_nombre: company.nombre_empresa,
        },
      };
    } finally {
      client.release();
    }
  }

  async getProfile(userId: string) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `SELECT u.id, u.email, u.nombre_completo, u.telefono, u.dni, u.estado, 
                u.empresa_id, u.ultimo_acceso, u.fecha_creacion,
                r.nombre as rol, r.permisos,
                c.nombre_empresa, c.codigo_empresa
         FROM users u
         JOIN roles r ON u.rol_id = r.id
         JOIN companies c ON u.empresa_id = c.id
         WHERE u.id = $1`,
        [userId],
      );

      if (result.rows.length === 0) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      const user = result.rows[0];

      return {
        success: true,
        data: {
          id: user.id,
          nombre_completo: user.nombre_completo,
          email: user.email,
          telefono: user.telefono,
          dni: user.dni,
          estado: user.estado,
          empresa_id: user.empresa_id,
          empresa_nombre: user.nombre_empresa,
          codigo_empresa: user.codigo_empresa,
          rol: user.rol,
          permisos: user.permisos,
          ultimo_acceso: user.ultimo_acceso,
          fecha_creacion: user.fecha_creacion,
        },
      };
    } finally {
      client.release();
    }
  }

  async getUsers(user: CurrentUserData) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT u.id, u.email, u.nombre_completo, u.telefono, u.dni, u.estado,
                u.fecha_creacion, u.ultimo_acceso, r.nombre as rol_nombre, r.descripcion as rol_descripcion
         FROM users u
         LEFT JOIN roles r ON u.rol_id = r.id
         WHERE u.empresa_id = $1
         ORDER BY u.fecha_creacion DESC`,
        [user.empresaId],
      );

      return {
        success: true,
        users: result.rows,
        total: result.rows.length,
      };
    } finally {
      client.release();
    }
  }

  async getUserById(userId: string, user: CurrentUserData) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT u.id, u.email, u.nombre_completo, u.telefono, u.dni, u.estado,
                u.fecha_creacion, u.ultimo_acceso, u.empresa_id, r.nombre as rol_nombre,
                r.descripcion as rol_descripcion, r.permisos as rol_permisos
         FROM users u
         LEFT JOIN roles r ON u.rol_id = r.id
         WHERE u.id = $1 AND u.empresa_id = $2`,
        [userId, user.empresaId],
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('Usuario no encontrado');
      }

      return {
        success: true,
        user: result.rows[0],
      };
    } finally {
      client.release();
    }
  }

  async createUser(createUserDto: CreateUserDto, user: CurrentUserData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check if email already exists in the same company
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 AND empresa_id = $2',
        [createUserDto.email, user.empresaId],
      );

      if (existingUser.rows.length > 0) {
        throw new ConflictException('El email ya está registrado en esta empresa');
      }

      // Check if role exists and belongs to company or is global
      const roleCheck = await client.query(
        'SELECT id FROM roles WHERE id = $1 AND (empresa_id = $2 OR empresa_id IS NULL)',
        [createUserDto.rol_id, user.empresaId],
      );

      if (roleCheck.rows.length === 0) {
        throw new BadRequestException('Rol no válido');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(createUserDto.contraseña, 10);

      // Create user
      const result = await client.query(
        `INSERT INTO users (empresa_id, email, contraseña, nombre_completo, telefono, dni, estado, rol_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, email, nombre_completo, telefono, dni, estado, fecha_creacion`,
        [
          user.empresaId,
          createUserDto.email,
          hashedPassword,
          createUserDto.nombre_completo,
          createUserDto.telefono || null,
          createUserDto.dni || null,
          createUserDto.estado || 'activo',
          createUserDto.rol_id,
        ],
      );

      const newUser = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'crear',
        'usuarios',
        'users',
        newUser.id,
        `Usuario creado: ${createUserDto.email}`,
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Usuario creado exitosamente',
        user: {
          id: newUser.id,
          email: newUser.email,
          nombre_completo: newUser.nombre_completo,
          telefono: newUser.telefono,
          dni: newUser.dni,
          estado: newUser.estado,
          fecha_creacion: newUser.fecha_creacion,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateUser(userId: string, updateUserDto: UpdateUserDto, user: CurrentUserData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check if user exists and belongs to company
      const userCheck = await client.query(
        'SELECT id, email, contraseña, nombre_completo, telefono, dni, estado FROM users WHERE id = $1 AND empresa_id = $2',
        [userId, user.empresaId],
      );

      if (userCheck.rows.length === 0) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const existingUser = userCheck.rows[0];

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
        // Check if new email already exists
        const emailCheck = await client.query(
          'SELECT id FROM users WHERE email = $1 AND empresa_id = $2 AND id != $3',
          [updateUserDto.email, user.empresaId, userId],
        );

        if (emailCheck.rows.length > 0) {
          throw new ConflictException('El email ya está registrado en esta empresa');
        }

        paramCount++;
        updates.push(`email = $${paramCount + 1}`);
        values.push(updateUserDto.email);
      }

      if (updateUserDto.nombre_completo) {
        paramCount++;
        updates.push(`nombre_completo = $${paramCount + 1}`);
        values.push(updateUserDto.nombre_completo);
      }

      if (updateUserDto.telefono !== undefined) {
        paramCount++;
        updates.push(`telefono = $${paramCount + 1}`);
        values.push(updateUserDto.telefono || null);
      }

      if (updateUserDto.dni !== undefined) {
        paramCount++;
        updates.push(`dni = $${paramCount + 1}`);
        values.push(updateUserDto.dni || null);
      }

      if (updateUserDto.estado) {
        paramCount++;
        updates.push(`estado = $${paramCount + 1}`);
        values.push(updateUserDto.estado);
      }

      if (updateUserDto.contraseña) {
        const hashedPassword = await bcrypt.hash(updateUserDto.contraseña, 10);
        paramCount++;
        updates.push(`contraseña = $${paramCount + 1}`);
        values.push(hashedPassword);
      }

      if (updates.length === 0) {
        throw new BadRequestException('No se proporcionaron campos para actualizar');
      }

      // Add updated_at timestamp
      paramCount++;
      updates.push(`fecha_actualizacion = CURRENT_TIMESTAMP`);

      // Add WHERE parameters
      values.push(userId, user.empresaId);

      const updateQuery = `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $${paramCount + 2} AND empresa_id = $${paramCount + 3}
        RETURNING id, email, nombre_completo, telefono, dni, estado, fecha_actualizacion
      `;

      const result = await client.query(updateQuery, values);
      const updatedUser = result.rows[0];

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'actualizar',
        'usuarios',
        'users',
        userId,
        `Usuario actualizado: ${updatedUser.email}`,
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Usuario actualizado exitosamente',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          nombre_completo: updatedUser.nombre_completo,
          telefono: updatedUser.telefono,
          dni: updatedUser.dni,
          estado: updatedUser.estado,
          fecha_actualizacion: updatedUser.fecha_actualizacion,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async logout(userId: string, user: CurrentUserData) {
    const client = await this.pool.connect();
    try {
      // Log audit
      await this.logAudit(
        client,
        userId,
        user.empresaId,
        'logout',
        'auth',
        'users',
        userId,
        'Cierre de sesión',
      );

      return {
        success: true,
        message: 'Sesión cerrada correctamente',
      };
    } finally {
      client.release();
    }
  }

  async deleteUser(userId: string, user: CurrentUserData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check if user exists and belongs to company
      const userCheck = await client.query(
        'SELECT id, email FROM users WHERE id = $1 AND empresa_id = $2',
        [userId, user.empresaId],
      );

      if (userCheck.rows.length === 0) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Prevent deleting yourself
      if (userId === user.id) {
        throw new BadRequestException('No puedes eliminar tu propio usuario');
      }

      const deletedUser = userCheck.rows[0];

      // Delete user
      await client.query('DELETE FROM users WHERE id = $1 AND empresa_id = $2', [userId, user.empresaId]);

      // Log audit
      await this.logAudit(
        client,
        user.id,
        user.empresaId,
        'eliminar',
        'usuarios',
        'users',
        userId,
        `Usuario eliminado: ${deletedUser.email}`,
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Usuario eliminado exitosamente',
      };
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
    description: string,
  ) {
    try {
      await client.query(
        `INSERT INTO audit_log (usuario_id, empresa_id, tipo_accion, modulo, tabla, registro_id, descripcion, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'exitosa')`,
        [userId, empresaId, action, module, table, recordId, description],
      );
    } catch (error) {
      // Log error but don't throw to avoid breaking main operation
      console.error('Error logging audit:', error);
    }
  }
}
