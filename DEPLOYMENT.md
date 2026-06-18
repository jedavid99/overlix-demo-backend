# Instrucciones de Despliegue - TechRepair Pro Backend

## Requisitos Previos

- **Node.js** 20 LTS o superior
- **npm** o **yarn**
- **PostgreSQL** 14+ (o cuenta de Supabase)
- **Redis** 6+ (para cache y colas)
- **Git**

## 1. Configuración Inicial

### Clonar el Repositorio

```bash
git clone <repositorio-url>
cd backend
```

### Instalar Dependencias

```bash
npm install
```

### Configurar Variables de Entorno

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-token-secret-min-32-chars
JWT_REFRESH_EXPIRES_IN=30d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# App
NODE_ENV=development
PORT=3000
API_PREFIX=api

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# Email (opcional - para futuras notificaciones)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@techrepair.com
```

## 2. Configuración de Base de Datos (Supabase)

### Crear Proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com)
2. Crear nuevo proyecto
3. Obtener:
   - Project URL
   - anon public key
   - service_role key (guardar de forma segura)

### Ejecutar Migraciones SQL

Opción A: Usar el SQL Editor de Supabase

1. Ir al SQL Editor en Supabase
2. Copiar el contenido de `src/database/migrations/001_initial_schema.ts`
3. Ejecutar el SQL

Opción B: Usar CLI de Supabase

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Conectar al proyecto
supabase link --project-ref your-project-ref

# Ejecutar migración
supabase db push
```

### Verificar Tablas Creadas

En el SQL Editor de Supabase:

```sql
-- Listar todas las tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verificar RLS habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

## 3. Configuración de Redis

### Opción A: Redis Local (Desarrollo)

```bash
# Windows (usando Docker)
docker run -d -p 6379:6379 redis:alpine

# Linux/Mac
redis-server
```

### Opción B: Redis Cloud (Producción)

1. Crear cuenta en [Redis Cloud](https://redis.com/try-free/)
2. Crear nueva base de datos
3. Obtener:
   - Host
   - Port
   - Password
4. Actualizar `.env` con estos valores

## 4. Compilar y Ejecutar

### Desarrollo

```bash
# Modo watch (recarga automática)
npm run start:dev

# Modo debug
npm run start:debug
```

### Producción

```bash
# Compilar
npm run build

# Ejecutar
npm run start:prod
```

## 5. Verificar Instalación

### Health Check

```bash
curl http://localhost:3000/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

### Probar Registro de Empresa

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre_empresa": "TechRepair Demo",
    "razon_social": "TechRepair Demo S.R.L.",
    "cuit": "3012345678901",
    "email": "admin@techrepair.demo",
    "contraseña": "SecurePass123!",
    "telefono": "+541123456789",
    "direccion": "Av. Principal 123",
    "ciudad": "Buenos Aires",
    "provincia": "Buenos Aires",
    "codigo_postal": "1425",
    "propietario_nombre": "Juan Pérez"
  }'
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "Empresa registrada exitosamente",
  "data": {
    "empresa_id": "uuid-empresa",
    "usuario_id": "uuid-usuario",
    "codigo_empresa": "ABC123"
  }
}
```

### Probar Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@techrepair.demo",
    "contraseña": "SecurePass123!",
    "codigo_empresa": "ABC123"
  }'
```

## 6. Despliegue en Producción

### Opción A: VPS (DigitalOcean, AWS EC2, etc.)

#### 1. Preparar el Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2 (process manager)
sudo npm install -g pm2

# Instalar Redis
sudo apt install -y redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

#### 2. Clonar y Configurar

```bash
# Clonar repositorio
git clone <repositorio-url>
cd backend

# Instalar dependencias
npm install --production

# Configurar variables de entorno
nano .env
# Pegar tus variables de producción
```

#### 3. Ejecutar Migraciones

Usar el SQL Editor de Supabase o CLI como en desarrollo.

#### 4. Iniciar con PM2

```bash
# Iniciar aplicación
pm2 start dist/main.js --name techrepair-backend

# Configurar para inicio automático
pm2 startup
pm2 save

# Monitorear
pm2 monit
```

#### 5. Configurar Nginx (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name api.techrepair.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Instalar Nginx
sudo apt install -y nginx

# Crear config
sudo nano /etc/nginx/sites-available/techrepair-api

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/techrepair-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. Configurar SSL (Let's Encrypt)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d api.techrepair.com

# Renovación automática
sudo certbot renew --dry-run
```

### Opción B: Docker

#### 1. Crear Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

#### 2. Crear docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
```

#### 3. Ejecutar

```bash
# Construir y ejecutar
docker-compose up -d

# Ver logs
docker-compose logs -f backend

# Detener
docker-compose down
```

### Opción C: Render / Railway / Vercel

#### Render

1. Crear cuenta en [render.com](https://render.com)
2. Crear nuevo **Web Service**
3. Conectar repositorio Git
4. Configurar:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Environment Variables**: Agregar todas las variables de `.env`
5. Deploy

#### Railway

1. Crear cuenta en [railway.app](https://railway.app)
2. Crear nuevo proyecto
3. Agregar base de datos PostgreSQL (Railway)
4. Agregar Redis (Railway)
5. Agregar servicio desde repositorio Git
6. Configurar variables de entorno
7. Deploy

## 7. Monitoreo y Logs

### PM2 Monitoreo

```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs techrepair-backend

# Ver métricas
pm2 monit

# Reiniciar
pm2 restart techrepair-backend

# Recargar (sin downtime)
pm2 reload techrepair-backend
```

### Logs de Aplicación

Los logs se guardan en:
- **Desarrollo**: Consola
- **Producción**: PM2 logs (`~/.pm2/logs/`)

### Supabase Logs

1. Ir al dashboard de Supabase
2. Sección **Logs**
3. Ver logs de:
   - Database
   - API
   - Auth

## 8. Actualizaciones

### Actualizar Código

```bash
# Pull cambios
git pull origin main

# Instalar nuevas dependencias
npm install

# Compilar
npm run build

# Reiniciar (PM2)
pm2 restart techrepair-backend

# O (Docker)
docker-compose down
docker-compose pull
docker-compose up -d --build
```

### Migraciones de Base de Datos

```bash
# Ejecutar nueva migración en Supabase SQL Editor
# O usando Supabase CLI
supabase db push
```

## 9. Backup y Restore

### Backup Automático (Supabase)

Supabase realiza backups automáticos diarios. Para configurar:

1. Ir al dashboard de Supabase
2. Sección **Database**
3. **Backups**
4. Configurar retención y frecuencia

### Backup Manual

```bash
# Exportar datos
pg_dump $DATABASE_URL > backup.sql

# Restaurar datos
psql $DATABASE_URL < backup.sql
```

## 10. Troubleshooting

### Error: Cannot connect to database

**Solución:**
- Verificar que `DATABASE_URL` sea correcta
- Verificar que la base de datos esté accesible
- Verificar firewall/reglas de red

### Error: Redis connection refused

**Solución:**
- Verificar que Redis esté corriendo: `redis-cli ping`
- Verificar que `REDIS_HOST` y `REDIS_PORT` sean correctos
- Verificar firewall

### Error: JWT token expired

**Solución:**
- Verificar `JWT_EXPIRES_IN` en `.env`
- Implementar refresh token en el frontend
- Verificar sincronización de relojes del servidor

### Error: RLS policy violation

**Solución:**
- Verificar que las políticas RLS estén creadas
- Verificar que `empresa_id` esté en el token JWT
- Verificar que el usuario tenga `empresa_id` en la tabla `users`

### Performance lenta

**Solución:**
- Verificar que los índices estén creados
- Usar `EXPLAIN ANALYZE` para analizar queries
- Considerar caché con Redis
- Verificar tamaño de la base de datos

## 11. Seguridad en Producción

### Checklist de Seguridad

- [ ] Cambiar `JWT_SECRET` por uno seguro (mínimo 32 caracteres)
- [ ] Usar HTTPS obligatorio
- [ ] Configurar CORS correctamente
- [ ] Limitar rate limiting
- [ ] No exponer `SUPABASE_SERVICE_ROLE_KEY` en el frontend
- [ ] Usar variables de entorno para secrets
- [ ] Configurar firewall
- [ ] Mantener dependencias actualizadas
- [ ] Habilitar logs de auditoría
- [ ] Configurar backups automáticos

### Variables de Entorno Sensibles

Nunca comitear `.env` al repositorio. Usar:

```bash
# Agregar a .gitignore
echo ".env" >> .gitignore

# Usar secretos del hosting en producción
# Render/Railway/Vercel tienen secciones de Environment Variables
```

## 12. Escalado

### Escalado Horizontal

Para escalar horizontalmente:

1. **Backend Stateless**: La aplicación ya está diseñada como stateless
2. **Load Balancer**: Usar Nginx o AWS ELB
3. **Shared Redis**: Todos los nodos usan la misma instancia de Redis
4. **Shared Database**: Todos los nodos usan la misma base de datos

### Escalado Vertical

Para escalar verticalmente:

1. Aumentar RAM del servidor
2. Aumentar CPU del servidor
3. Aumentar pool de conexiones a BD
4. Usar Redis para caché

## 13. Costos Estimados

### Plan Gratuito Supabase

- **Database**: 500 MB
- **Bandwidth**: 5 GB/month
- **File Storage**: 1 GB
- **Auth**: 50,000 MAU/month

### Plan Gratuito Redis Cloud

- **Database**: 30 MB
- **Connections**: 25
- **Operations**: 30,000/day

### VPS (DigitalOcean)

- **Basic**: $4/month (1 GB RAM, 1 vCPU)
- **Recommended**: $12/month (2 GB RAM, 1 vCPU)

### Total Estimado (Mensual)

- **Plan Gratuito**: $0 (Supabase + Redis Cloud)
- **VPS Básico**: $4/month
- **Dominio**: ~$10/year
- **SSL**: Gratis (Let's Encrypt)

**Total**: ~$4-5/month para empezar

## 14. Soporte

### Documentación Adicional

- [NestJS Documentation](https://docs.nestjs.com)
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [Redis Documentation](https://redis.io/docs)

### Contacto

Para problemas o preguntas:
- GitHub Issues
- Email de soporte
- Documentación del proyecto
