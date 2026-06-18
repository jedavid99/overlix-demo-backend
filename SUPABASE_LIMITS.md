# Recomendaciones para Evitar Límites Gratuitos de Supabase

## Límites del Plan Gratuito de Supabase

**Database:**
- 500 MB de almacenamiento
- 5 GB de bandwidth (egress) por mes
- 500 MB de file storage
- 50,000 MAU (Monthly Active Users) en Auth
- 1 concurrent connection a la base de datos

**Redis (Redis Cloud Free):**
- 30 MB de almacenamiento
- 25 conexiones simultáneas
- 30,000 operaciones por día

---

## Estrategias para Optimizar el Uso

### 1. Optimización de Base de Datos

#### A. Limpieza Periódica de Logs de Auditoría

Los logs de auditoría pueden crecer rápidamente. Implementar limpieza automática:

```sql
-- Crear función para limpiar logs antiguos
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM audit_log 
    WHERE fecha_creacion < CURRENT_DATE - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para ejecutar limpieza semanal
-- (Ejecutar manualmente o usar pg_cron)
```

**Implementación en NestJS:**
```typescript
// src/jobs/cleanup/audit-cleanup.service.ts
@Injectable()
export class AuditCleanupService {
  @Cron('0 2 * * 0') // Cada domingo a las 2 AM
  async cleanupOldLogs() {
    await this.pool.query(
      'DELETE FROM audit_log WHERE fecha_creacion < CURRENT_DATE - INTERVAL \'90 days\''
    );
  }
}
```

#### B. Archivo de Datos Históricos

Para datos antiguos que no se usan frecuentemente:

```sql
-- Exportar datos antiguos a CSV
COPY (SELECT * FROM sales WHERE fecha_venta < '2025-01-01') 
TO '/tmp/sales_2024.csv' CSV HEADER;

-- Eliminar datos antiguos de la BD
DELETE FROM sales WHERE fecha_venta < '2025-01-01';
```

#### C. Soft Delete en Lugar de Hard Delete

Ya implementado en el diseño. Los registros marcados como `inactivo` o `cancelled` se pueden archivar después de un período.

#### D. Compresión de Datos en JSONB

Para campos JSONB grandes (como `permisos`, `compatibilidad`):

```sql
-- Usar JSONB en lugar de JSON (ya está implementado)
-- JSONB es más eficiente y permite compresión automática
```

---

### 2. Optimización de Bandwidth (Egress)

#### A. Paginación Estricta

Ya implementado en todos los endpoints. Limitar a 20-50 registros por página.

```typescript
// Ya implementado en todos los servicios
async findAll(page: number = 1, limit: number = 20) {
  const offset = (page - 1) * limit;
  // ... query con LIMIT y OFFSET
}
```

#### B. Selectores de Campos Específicos

No usar `SELECT *` innecesariamente:

```typescript
// ❌ MAL - Trae todos los campos
SELECT * FROM clients;

// ✅ BIEN - Solo campos necesarios
SELECT id, nombre_completo, email, telefono FROM clients;
```

#### C. Caché con Redis

Implementar caché para datos que no cambian frecuentemente:

```typescript
// Caché de configuración (1 hora TTL)
async getPaymentMethods(empresaId: string) {
  const cacheKey = `payment_methods:${empresaId}`;
  const cached = await this.redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const methods = await this.pool.query(
    'SELECT * FROM payment_methods WHERE empresa_id = $1',
    [empresaId]
  );
  
  await this.redis.setex(cacheKey, 3600, JSON.stringify(methods.rows));
  return methods.rows;
}
```

#### D. Compresión de Respuestas

Para endpoints que retornan muchos datos:

```typescript
import { CompressionMiddleware } from '@nestjs/common/compression';

// En main.ts
app.use(compression());
```

#### E. Evitar Datos Redundantes en Respuestas

No incluir relaciones completas si no son necesarias:

```typescript
// ❌ MAL - Trae toda la información del cliente
{
  "cliente": {
    "id": "...",
    "nombre": "...",
    "email": "...",
    "telefono": "...",
    "direccion": "...",
    // ... 20 campos más
  }
}

// ✅ BIEN - Solo información esencial
{
  "cliente_id": "...",
  "cliente_nombre": "...",
  "cliente_telefono": "..."
}
```

---

### 3. Optimización de Storage

#### A. No Almacenar Imágenes en Supabase Storage

Usar servicios externos para imágenes:

- **Cloudinary** (plan gratuito: 25 GB)
- **AWS S3** (plan gratuito: 5 GB)
- **Imgur** (ilimitado para uso personal)

**Implementación:**
```typescript
// Subir imagen a Cloudinary
async uploadImage(file: Express.Multer.File) {
  const result = await cloudinary.uploader.upload(file.path);
  return result.secure_url; // Solo guardar URL en BD
}

// En BD
logo_url: VARCHAR(255) -- Solo la URL, no el archivo
```

#### B. Almacenar URLs en Lugar de Archivos

Ya implementado en el diseño:
- `logo_url` en companies
- `imagen_url` en products
- `firma_entrega` en shipments

#### C. Validar Tamaño de Archivos Antes de Subir

```typescript
// En DTO o middleware
@MaxFileSize(5 * 1024 * 1024) // 5 MB máximo
file: Express.Multer.File;
```

---

### 4. Optimización de Conexiones

#### A. Connection Pooling

Ya implementado en el diseño:

```typescript
// En database.config.ts
const poolConfig = {
  max: 20, // Máximo 20 conexiones
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};
```

#### B. Liberar Conexiones Siempre

```typescript
// ✅ BIEN - Siempre liberar conexión
async findAll() {
  const client = await this.pool.connect();
  try {
    const result = await client.query('SELECT * FROM clients');
    return result.rows;
  } finally {
    client.release(); // Importante
  }
}
```

#### C. Usar Transacciones Eficientemente

```typescript
// ✅ BIEN - Transacción corta
await client.query('BEGIN');
try {
  await client.query('INSERT INTO ...');
  await client.query('UPDATE ...');
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

---

### 5. Monitoreo y Alertas

#### A. Monitorear Tamaño de Base de Datos

```sql
-- Consultar tamaño de la base de datos
SELECT 
    pg_size_pretty(pg_database_size('postgres')) as database_size,
    pg_size_pretty(pg_total_relation_size('audit_log')) as audit_log_size,
    pg_size_pretty(pg_total_relation_size('sales')) as sales_size;
```

**Implementación en NestJS:**
```typescript
@Cron('0 9 * * *') // Cada día a las 9 AM
async checkDatabaseSize() {
  const result = await this.pool.query(
    'SELECT pg_size_pretty(pg_database_size($1)) as size',
    ['postgres']
  );
  
  const size = result.rows[0].size;
  
  // Alerta si supera 400 MB (80% del límite)
  if (size.includes('400 MB') || size.includes('500 MB')) {
    await this.sendAlert(`Base de datos casi llena: ${size}`);
  }
}
```

#### B. Monitorear Bandwidth

En el dashboard de Supabase:
- Ir a **Settings** → **Billing**
- Ver **Bandwidth Usage**
- Configurar alertas al 80% del límite

#### C. Monitorear Conexiones Simultáneas

```sql
-- Ver conexiones activas
SELECT count(*) FROM pg_stat_activity WHERE datname = 'postgres';
```

---

### 6. Arquitectura para Escalar

#### A. Particionamiento de Tablas Grandes

Cuando una tabla crece demasiado, particionar por fecha:

```sql
-- Particionar sales por año
CREATE TABLE sales_2024 PARTITION OF sales
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE sales_2025 PARTITION OF sales
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

#### B. Lectura de Réplicas (Plan Pro)

Cuando se necesite más rendimiento:
- Migrar a plan Pro de Supabase
- Usar read replicas para consultas de lectura
- Escribir en primary, leer de replicas

#### C. Caché Distribuido

Para alta concurrencia:
- Usar Redis Cloud (plan pago)
- O implementar caché local con node-cache
- Estrategia: caché distribuido + caché local

---

### 7. Buenas Prácticas de Desarrollo

#### A. Evitar N+1 Queries

```typescript
// ❌ MAL - N+1 queries
for (const sale of sales) {
  const items = await this.pool.query(
    'SELECT * FROM sale_items WHERE venta_id = $1',
    [sale.id]
  );
}

// ✅ BIEN - Una sola query con JOIN
const result = await this.pool.query(`
  SELECT s.*, si.* 
  FROM sales s
  LEFT JOIN sale_items si ON s.id = si.venta_id
  WHERE s.empresa_id = $1
`, [empresaId]);
```

#### B. Usar Índices Apropiadamente

Ya implementado en el schema SQL. Verificar que se usen:

```sql
-- Verificar uso de índices
EXPLAIN ANALYZE SELECT * FROM clients WHERE empresa_id = 'xxx';

-- Debe mostrar "Index Scan" en idx_clients_empresa_id
```

#### C. Evitar Queries Complejos en Hot Paths

Para endpoints frecuentes, mantener queries simples:

```typescript
// ❌ MAL - Query complejo en endpoint frecuente
SELECT c.*, 
       (SELECT COUNT(*) FROM sales WHERE cliente_id = c.id) as total_ventas,
       (SELECT SUM(total) FROM sales WHERE cliente_id = c.id) as total_gastado
FROM clients c;

// ✅ BIEN - Query simple, calcular en backend si es necesario
SELECT id, nombre_completo, email, telefono FROM clients WHERE empresa_id = $1;
```

---

### 8. Estrategias de Limpieza Automática

#### A. Job de Limpieza de Logs

```typescript
// src/jobs/cleanup/cleanup.service.ts
@Injectable()
export class CleanupService {
  @Cron('0 2 * * 0') // Domingo a las 2 AM
  async cleanupAuditLogs() {
    await this.pool.query(
      'DELETE FROM audit_log WHERE fecha_creacion < CURRENT_DATE - INTERVAL \'90 days\''
    );
  }

  @Cron('0 3 * * 1') // Lunes a las 3 AM
  async cleanupOldSales() {
    // Archivar ventas de más de 2 años
    await this.pool.query(
      'DELETE FROM sales WHERE fecha_venta < CURRENT_DATE - INTERVAL \'2 years\' AND estado = $1',
      ['cancelled']
    );
  }
}
```

#### B. Soft Delete con Limpieza Diferida

```typescript
// Primero marcar como inactivo
await this.pool.query(
  'UPDATE clients SET estado = $1 WHERE id = $2',
  ['inactivo', id]
);

// Job nocturno elimina registros inactivos de más de 6 meses
@Cron('0 4 * * *')
async cleanupInactiveRecords() {
  await this.pool.query(
    'DELETE FROM clients WHERE estado = $1 AND fecha_actualizacion < CURRENT_DATE - INTERVAL \'6 months\'',
    ['inactivo']
  );
}
```

---

### 9. Optimización de Redis

#### A. Usar TTL Apropiado

```typescript
// Configuración de TTL según tipo de dato
const CACHE_TTL = {
  payment_methods: 3600,      // 1 hora
  shipping_methods: 3600,      // 1 hora
  business_info: 1800,        // 30 minutos
  user_profile: 300,         // 5 minutos
  dashboard_stats: 60,        // 1 minuto
};

await this.redis.setex(key, CACHE_TTL.payment_methods, value);
```

#### B. Evitar Caché de Datos Grandes

```typescript
// ❌ MAL - Caché de lista completa
const allClients = await this.redis.get('all_clients');

// ✅ BIEN - Caché por página
const clientsPage1 = await this.redis.get('clients:page:1');
```

#### C. Usar Hash para Datos Relacionados

```typescript
// En lugar de múltiples keys
await this.redis.set('client:123:name', 'Juan');
await this.redis.set('client:123:email', 'juan@email.com');

// Usar hash
await this.redis.hset('client:123', {
  name: 'Juan',
  email: 'juan@email.com'
});
```

---

### 10. Plan de Migración a Plan Pago

#### Cuándo Migrar

Migrar a plan Pro cuando:

- **Database > 400 MB** (80% del límite)
- **Bandwidth > 4 GB** (80% del límite)
- **Concurrent connections > 0.8** (80% del límite)
- **MAU > 40,000** (80% del límite)

#### Plan Pro de Supabase ($25/mes)

- 8 GB de almacenamiento
- 50 GB de bandwidth
- 100,000 MAU
- Read replicas
- Daily backups (7 días retención)
- Priority support

#### Plan Enterprise ($599/mes)

- 128 GB de almacenamiento
- 500 GB de bandwidth
- 500,000 MAU
- Dedicated support
- SLA garantizado

---

### 11. Métricas a Monitorear

#### Métricas Clave

```typescript
// Métricas a monitorear
const metrics = {
  database_size: 'Tamaño de BD (MB)',
  bandwidth_used: 'Bandwidth usada (GB)',
  active_connections: 'Conexiones activas',
  cache_hit_rate: 'Tasa de aciertos de caché',
  avg_query_time: 'Tiempo promedio de query (ms)',
  error_rate: 'Tasa de error (%)',
  mau: 'Monthly Active Users',
};

// Alertas
const alerts = {
  database_size: 400, // MB
  bandwidth_used: 4,  // GB
  active_connections: 0.8, // 80% del límite
  error_rate: 1, // 1%
};
```

#### Dashboard de Monitoreo

Implementar dashboard con:
- Grafana + Prometheus
- O Supabase Dashboard nativo
- O New Relic / Datadog

---

### 12. Resumen de Recomendaciones

#### ✅ Implementar Inmediatamente

1. **Paginación estricta** en todos los endpoints (ya implementado)
2. **Limpieza automática de logs** de auditoría (job nocturno)
3. **Caché con Redis** para datos estáticos (configuración, métodos de pago)
4. **No almacenar imágenes** en Supabase Storage (usar Cloudinary)
5. **Monitorear tamaño de BD** semanalmente

#### ✅ Implementar a Mediano Plazo

1. **Soft delete con limpieza diferida** (6 meses)
2. **Archivar datos históricos** (ventas > 2 años)
3. **Compresión de respuestas** (middleware)
4. **Selectores de campos específicos** (evitar SELECT *)
5. **Optimizar queries complejos** (evitar N+1)

#### ✅ Implementar a Largo Plazo (cuando crezca)

1. **Particionamiento de tablas** por fecha
2. **Migrar a plan Pro** de Supabase
3. **Usar read replicas** para lecturas
4. **Caché distribuido** (Redis Cloud pago)
5. **Arquitectura de microservicios** si es necesario

---

### 13. Script de Monitoreo

```typescript
// src/monitoring/database-monitor.service.ts
@Injectable()
export class DatabaseMonitorService {
  @Cron('0 9 * * *') // Cada día a las 9 AM
  async checkDatabaseHealth() {
    const size = await this.getDatabaseSize();
    const connections = await this.getActiveConnections();
    
    console.log('Database Health Check:');
    console.log(`- Size: ${size}`);
    console.log(`- Connections: ${connections}`);
    
    if (this.isNearLimit(size, 400)) {
      await this.sendAlert(`Database size near limit: ${size}`);
    }
    
    if (this.isNearLimit(connections, 0.8)) {
      await this.sendAlert(`Connections near limit: ${connections}`);
    }
  }
  
  private async getDatabaseSize(): Promise<string> {
    const result = await this.pool.query(
      'SELECT pg_size_pretty(pg_database_size($1)) as size',
      ['postgres']
    );
    return result.rows[0].size;
  }
  
  private async getActiveConnections(): Promise<number> {
    const result = await this.pool.query(
      'SELECT count(*) as count FROM pg_stat_activity WHERE datname = $1',
      ['postgres']
    );
    return parseInt(result.rows[0].count);
  }
  
  private isNearLimit(current: string, limit: number): boolean {
    // Lógica para determinar si está cerca del límite
    const currentMB = parseInt(current);
    return currentMB >= limit * 0.8;
  }
}
```

---

## Conclusión

Siguiendo estas recomendaciones, TechRepair Pro puede operar cómodamente dentro del plan gratuito de Supabase durante muchos meses, incluso con un crecimiento significativo. Las claves son:

1. **Limpieza automática** de datos antiguos
2. **Caché inteligente** con Redis
3. **Optimización de queries** y paginación
4. **Monitoreo constante** de métricas
5. **Plan de migración** definido para cuando sea necesario

El sistema está diseñado para escalar de manera orgánica, permitiendo crecer desde el plan gratuito hasta planes pagados sin necesidad de reescribir la arquitectura.
