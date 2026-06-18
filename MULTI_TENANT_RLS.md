# Estrategia Multi-Tenant y Políticas RLS - TechRepair Pro

## Arquitectura Multi-Tenant

TechRepair Pro utiliza una arquitectura **multi-tenant a nivel de base de datos** con aislamiento completo de datos por empresa (`empresa_id`).

### Diseño del Aislamiento

**1. Aislamiento a Nivel de Tabla**
- Cada tabla multi-tenant tiene una columna `empresa_id` (UUID)
- Esta columna es una **foreign key** que referencia a la tabla `companies`
- Todas las consultas deben filtrar por `empresa_id`

**2. Validación en el Backend**
- El `empresa_id` se extrae del token JWT del usuario autenticado
- Cada servicio valida que el usuario solo acceda a datos de su empresa
- Los guards y decoradores aseguran que el `empresa_id` esté presente en cada request

**3. Aislamiento en la Base de Datos (RLS)**
- Row Level Security (RLS) de PostgreSQL como **última línea de defensa**
- Políticas RLS en cada tabla para garantizar el aislamiento a nivel de BD
- Incluso si el backend falla, la BD rechaza accesos cruzados

---

## Row Level Security (RLS) en Supabase

### Funciones Auxiliares RLS

```sql
-- Función para obtener el empresa_id del usuario actual
CREATE OR REPLACE FUNCTION get_current_empresa_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT empresa_id FROM users 
        WHERE id = auth.uid()::TEXT::UUID
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar acceso a empresa
CREATE OR REPLACE FUNCTION check_company_access(p_empresa_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN p_empresa_id = (
        SELECT empresa_id FROM users 
        WHERE id = auth.uid()::TEXT::UUID
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Patrón de Políticas RLS

Cada tabla multi-tenant tiene el siguiente patrón de políticas:

```sql
-- Habilitar RLS
ALTER TABLE nombre_tabla ENABLE ROW LEVEL SECURITY;

-- Política de SELECT: Solo ver datos de la propia empresa
CREATE POLICY "Users can view data from their company" ON nombre_tabla
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

-- Política de INSERT: Solo insertar datos para la propia empresa
CREATE POLICY "Users can create data for their company" ON nombre_tabla
    FOR INSERT
    WITH CHECK (empresa_id = get_current_empresa_id());

-- Política de UPDATE: Solo actualizar datos de la propia empresa
CREATE POLICY "Users can update data from their company" ON nombre_tabla
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

-- Política de DELETE: Solo eliminar datos de la propia empresa
CREATE POLICY "Users can delete data from their company" ON nombre_tabla
    FOR DELETE
    USING (empresa_id = get_current_empresa_id());
```

### Políticas Especiales

**1. Tablas con Relaciones (ej: sale_items)**
```sql
-- Para tablas hijas, verificar a través de la relación padre
CREATE POLICY "Users can view sale items from their company" ON sale_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sales 
            WHERE sales.id = sale_items.venta_id 
            AND sales.empresa_id = get_current_empresa_id()
        )
    );
```

**2. Tablas Globales (ej: roles)**
```sql
-- Roles globales (empresa_id IS NULL) son visibles para todos
CREATE POLICY "Users can view roles from their company" ON roles
    FOR SELECT
    USING (empresa_id = get_current_empresa_id() OR empresa_id IS NULL);
```

**3. Auditoría (solo sistema puede insertar)**
```sql
CREATE POLICY "System can create audit logs" ON audit_log
    FOR INSERT
    WITH CHECK (true);
```

---

## Integración con Supabase Auth

### Flujo de Autenticación

1. **Registro de Empresa**
   - El backend crea la empresa en la tabla `companies`
   - Crea el usuario en la tabla `users` con `empresa_id`
   - Opcional: Crea usuario en Supabase Auth (`auth.users`)

2. **Login**
   - Usuario se autentica con email/contraseña
   - Backend valida credenciales contra tabla `users`
   - Genera JWT con `empresa_id`, `rol`, `permisos`
   - JWT se usa en todas las requests subsiguientes

3. **Middleware de Autenticación**
   - `JwtAuthGuard` valida el token
   - Extrae `empresa_id` del payload
   - Lo inyecta en el request como `req.user`

### Referencia a Supabase Auth

La tabla `users` tiene una columna `auth_user_id` que referencia a `auth.users.id` de Supabase Auth:

```sql
ALTER TABLE users ADD COLUMN auth_user_id UUID REFERENCES auth.users(id);
```

Esto permite:
- Usar Supabase Auth para gestión de sesiones
- Sincronizar usuarios entre ambos sistemas
- Beneficiarse de features de Supabase (email verification, password reset)

---

## Implementación en el Backend

### 1. Decorador @CurrentUser

```typescript
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserData | undefined, ctx: ExecutionContext): CurrentUserData | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserData;
    return data ? user[data] : user;
  },
);
```

**Uso en controladores:**
```typescript
@Get()
async findAll(@CurrentUser() user: CurrentUserData) {
  // user.empresaId está disponible
  return this.clientsService.findAll(user);
}
```

### 2. Inyección de empresa_id en Servicios

```typescript
async findAll(user: CurrentUserData) {
  const result = await this.pool.query(
    'SELECT * FROM clients WHERE empresa_id = $1',
    [user.empresaId] // Siempre filtrar por empresa_id
  );
  return result.rows;
}
```

### 3. Validación de empresa_id en Creación

```typescript
async create(createDto: CreateDto, user: CurrentUserData) {
  const result = await this.pool.query(
    'INSERT INTO clients (empresa_id, nombre, ...) VALUES ($1, $2, ...)',
    [user.empresaId, createDto.nombre, ...] // Forzar empresa_id del usuario
  );
  return result.rows[0];
}
```

---

## Seguridad en Capas

### Capa 1: Backend (NestJS)
- Guards de autenticación (`JwtAuthGuard`)
- Guards de autorización (`PermissionsGuard`)
- Validación de `empresa_id` en cada servicio
- DTOs con validaciones

### Capa 2: Base de Datos (PostgreSQL RLS)
- Políticas RLS en cada tabla
- Funciones auxiliares con `SECURITY DEFINER`
- Foreign keys con `ON DELETE CASCADE`
- Índices en `empresa_id` para rendimiento

### Capa 3: Supabase (Infraestructura)
- Autenticación robusta
- Encriptación en reposo
- HTTPS obligatorio
- Rate limiting

---

## Índices Críticos para RLS

```sql
-- Índices en empresa_id para todas las tablas multi-tenant
CREATE INDEX idx_clients_empresa_id ON clients(empresa_id);
CREATE INDEX idx_sales_empresa_id ON sales(empresa_id);
CREATE INDEX idx_repairs_empresa_id ON repairs(empresa_id);
CREATE INDEX idx_products_empresa_id ON products(empresa_id);
-- ... etc para todas las tablas
```

**Por qué son importantes:**
- RLS filtra por `empresa_id` en cada query
- Sin índices, las consultas serían lentas
- Con índices, PostgreSQL usa el índice para filtrar rápidamente

---

## Monitoreo y Auditoría

### Log de Auditoría

Todas las operaciones CRUD se registran en `audit_log`:

```sql
INSERT INTO audit_log (usuario_id, empresa_id, tipo_accion, modulo, tabla, registro_id, descripcion)
VALUES ($1, $2, $3, $4, $5, $6, $7);
```

**Información registrada:**
- Quién (`usuario_id`)
- Qué empresa (`empresa_id`)
- Qué acción (`tipo_accion`: crear, leer, actualizar, eliminar)
- En qué módulo (`modulo`)
- En qué tabla (`tabla`)
- ID del registro afectado (`registro_id`)
- Descripción (`descripcion`)
- Cuándo (`fecha_creacion`)
- Desde dónde (`direccion_ip`, `user_agent`)

### Detección de Accesos No Autorizados

Si RLS bloquea una operación:
- PostgreSQL retorna error
- El backend loguea el error
- Se puede configurar alerta para accesos sospechosos

---

## Testing del Multi-Tenancy

### Tests de Integración

```typescript
describe('Multi-Tenancy', () => {
  it('should not allow user to access other company data', async () => {
    // Usuario de empresa A intenta acceder a datos de empresa B
    const response = await request(app.getHttpServer())
      .get('/clients/other-company-client-id')
      .set('Authorization', `Bearer ${tokenCompanyA}`)
      .expect(404); // Not Found (RLS bloquea el acceso)
  });

  it('should only return data from user company', async () => {
    const response = await request(app.getHttpServer())
      .get('/clients')
      .set('Authorization', `Bearer ${tokenCompanyA}`)
      .expect(200);

    expect(response.body.data.clientes.every(c => c.empresa_id === companyAId)).toBe(true);
  });
});
```

---

## Best Practices

### ✅ DO
- Siempre filtrar por `empresa_id` en el backend
- Usar RLS como última línea de defensa
- Crear índices en `empresa_id`
- Loguear todas las operaciones en `audit_log`
- Validar `empresa_id` en cada operación de escritura
- Usar transacciones para operaciones complejas

### ❌ DON'T
- Nunca confiar solo en el backend sin RLS
- No omitir `empresa_id` en queries
- No usar queries sin WHERE clause en tablas multi-tenant
- No permitir que el frontend envíe `empresa_id`
- No hardcode `empresa_id` en el código
- No usar `SELECT *` sin filtrar por empresa

---

## Resumen

La estrategia multi-tenant de TechRepair Pro combina:

1. **Aislamiento en el Backend**: Validación de `empresa_id` en cada servicio
2. **Aislamiento en la BD**: RLS como última línea de defensa
3. **Autenticación Robusta**: JWT con Supabase Auth
4. **Auditoría Completa**: Registro de todas las operaciones
5. **Índices Optimizados**: Rendimiento con filtros por empresa

Esta arquitectura garantiza que cada empresa tenga sus datos completamente aislados, incluso si hay vulnerabilidades en una capa, las otras capas protegen los datos.
