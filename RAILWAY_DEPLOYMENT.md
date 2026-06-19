# RAILWAY DEPLOYMENT GUIDE
# Guía paso a paso para desplegar TechRepair Pro en Railway

## REQUISITOS PREVIOS

- Cuenta en GitHub con el repositorio del backend
- Cuenta en Railway (https://railway.app)
- Proyecto en Supabase configurado
- Archivo .env.production completado con valores reales

## PASO 1: CREAR CUENTA EN RAILWAY

1. Ve a https://railway.app
2. Haz clic en "Sign Up"
3. Elige "Sign up with GitHub" (recomendado)
4. Autoriza Railway para acceder a tu cuenta de GitHub
5. Completa el registro con tu email

## PASO 2: CREAR NUEVO PROYECTO

1. En el dashboard de Railway, haz clic en "New Project"
2. Selecciona "Deploy from GitHub repo"
3. Railway te pedirá autorización para acceder a tus repositorios de GitHub
4. Haz clic en "Configure GitHub App" si es la primera vez
5. Selecciona el repositorio "techrepair-backend" (o el nombre que le hayas dado)
6. Haz clic en "Import"

## PASO 3: CONFIGURAR EL PROYECTO

### 3.1 Seleccionar Branch

1. En la sección "Branch", selecciona "main"
2. Esto asegura que solo se despliegue código de la rama de producción

### 3.2 Configurar Comando de Inicio

1. En la sección "Build & Deployment Settings"
2. En "Start Command", ingresa:
```
npm run start:prod
```

O alternativamente:
```
node dist/main
```

### 3.3 Configurar Variables de Entorno

1. Ve a la pestaña "Variables" en el panel lateral
2. Haz clic en "New Variable"
3. Agrega las siguientes variables una por una:

```
NODE_ENV=production
API_PREFIX=api
DATABASE_URL=postgresql://postgres.YOUR_PASSWORD@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://tu-project-id.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
SUPABASE_HOST=aws-1-sa-east-1.pooler.supabase.com
SUPABASE_PORT=5432
SUPABASE_DATABASE=postgres
SUPABASE_USER=postgres
SUPABASE_PASSWORD=tu_password
DATABASE_POOL_SIZE=20
JWT_SECRET=tu_jwt_secret_seguro
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=tu_jwt_refresh_secret_seguro
JWT_REFRESH_EXPIRES_IN=30d
FRONTEND_URL=https://tu-frontend-netlify.app
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

IMPORTANTE:
- Obtén los valores de Supabase desde: https://supabase.com/dashboard/project/tu-project-id/settings/database
- Genera nuevos JWT secrets para producción (no uses los de desarrollo)
- FRONTEND_URL debe ser la URL de tu frontend en Netlify u otro hosting

### 3.4 Configurar Root Directory

1. Si tu repositorio tiene el backend en una subcarpeta, configura "Root Directory"
2. Para este proyecto, déjalo vacío (raíz del repositorio)

## PASO 4: INICIAR DESPLIEGUE

1. Haz clic en "Deploy" en la parte superior
2. Railway comenzará a:
   - Clonar el repositorio
   - Instalar dependencias (npm install)
   - Compilar el proyecto (npm run build)
   - Iniciar la aplicación (npm run start:prod)

3. Puedes ver el progreso en la pestaña "Deployments"
4. El despliegue suele tardar 2-5 minutos

## PASO 5: VERIFICAR DESPLIEGUE

### 5.1 Ver Logs

1. Ve a la pestaña "Deployments"
2. Haz clic en el deployment más reciente
3. Verifica que no haya errores en los logs
4. Busca mensajes como:
```
Application is running in production mode
API endpoint: https://tu-app.railway.app/api
Health check: https://tu-app.railway.app/api/health
```

### 5.2 Probar Health Check

1. En la pestaña "Deployments", copia la URL del dominio (ej: https://tu-app.railway.app)
2. Abre en tu navegador: https://tu-app.railway.app/api/health
3. Deberías ver una respuesta JSON con el estado de la aplicación

### 5.3 Probar API

1. Usa los cURLs de API_TEST_CURLS.md
2. Reemplaza BASE_URL con tu URL de Railway
3. Prueba el endpoint de login:
```bash
curl -X POST https://tu-app.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@techrepair.com",
    "contraseña": "tu_contraseña",
    "codigo_empresa": "tu_codigo"
  }'
```

## PASO 6: CONFIGURAR DOMINIO PERSONALIZADO (OPCIONAL)

### 6.1 Agregar Dominio

1. Ve a la pestaña "Settings"
2. En "Domains", haz clic en "Add Domain"
3. Ingresa tu dominio (ej: api.techrepair.com)
4. Haz clic en "Add"

### 6.2 Configurar DNS

1. Railway te proporcionará registros DNS
2. Ve a tu proveedor de dominios (GoDaddy, Namecheap, etc.)
3. Agrega los registros DNS:
   - Tipo: CNAME
   - Nombre: api (o el subdominio que elegiste)
   - Valor: tu-app.railway.app

### 6.3 Configurar SSL

1. Railway configurará SSL automáticamente
2. Espera unos minutos para que el certificado se genere
3. Tu API estará disponible en HTTPS

## PASO 7: CONFIGURAR AUTO-DEPLOY

### 7.1 Habilitar Auto-Deploy

1. Ve a la pestaña "Settings"
2. En "General", busca "Auto Deploy"
3. Habilita "Auto Deploy on Push to main"
4. Ahora cada push a la rama main desplegará automáticamente

### 7.2 Configurar Webhooks (Opcional)

1. Si necesitas notificaciones de despliegue
2. Ve a "Settings" > "Notifications"
3. Configura webhooks para Slack, Discord, etc.

## PASO 8: MONITOREO

### 8.1 Ver Métricas

1. Ve a la pestaña "Metrics"
2. Puedes ver:
   - CPU usage
   - Memory usage
   - Network traffic
   - Response times

### 8.2 Configurar Alertas

1. Ve a "Settings" > "Alerts"
2. Configura alertas para:
   - CPU > 80%
   - Memory > 80%
   - Error rate > 5%

### 8.3 Ver Logs en Tiempo Real

1. Ve a la pestaña "Logs"
2. Puedes ver logs en tiempo real
3. Filtra por nivel (error, warn, info)

## PASO 9: CONFIGURAR REDIS (OPCIONAL)

Si necesitas Redis para caching o rate limiting avanzado:

1. En el proyecto, haz clic en "New Service"
2. Selecciona "Add Service"
3. Elige "Redis"
4. Railway creará una instancia de Redis
5. Agrega las variables de entorno:
```
REDIS_HOST=redis.railway.internal
REDIS_PORT=6379
REDIS_PASSWORD=tu_redis_password
REDIS_DB=0
```

## PASO 10: CONFIGURAR BASE DE DATOS POSTGRES (OPCIONAL)

Si prefieres usar Railway Postgres en lugar de Supabase:

1. En el proyecto, haz clic en "New Service"
2. Selecciona "Add Service"
3. Elige "PostgreSQL"
4. Railway creará una instancia de Postgres
5. Actualiza DATABASE_URL con la conexión de Railway

## SOLUCIÓN DE PROBLEMAS

### Error: Build Failed

**Causa:** Dependencias faltantes o errores de compilación

**Solución:**
1. Verifica los logs de build
2. Asegúrate de que package.json tenga todos los scripts necesarios
3. Verifica que no haya errores de TypeScript

### Error: Port Already in Use

**Causa:** La aplicación no usa process.env.PORT

**Solución:**
1. Verifica que main.ts use: `await app.listen(port, '0.0.0.0')`
2. Verifica que use: `const port = configService.get<number>('PORT') || 3000`

### Error: Database Connection Failed

**Causa:** Variables de entorno incorrectas o Supabase no accesible

**Solución:**
1. Verifica DATABASE_URL en Railway Variables
2. Verifica que Supabase permita conexiones desde Railway IPs
3. Verifica que las credenciales sean correctas

### Error: CORS Errors

**Causa:** FRONTEND_URL no configurado correctamente

**Solución:**
1. Verifica FRONTEND_URL en Railway Variables
2. Asegúrate de que sea la URL correcta de tu frontend
3. Verifica que el endpoint de CORS esté configurado

### Error: 502 Bad Gateway

**Causa:** Aplicación no inició correctamente

**Solución:**
1. Verifica los logs de la aplicación
2. Asegúrate de que el comando de inicio sea correcto
3. Verifica que no haya errores en el código

## COSTOS

### Plan Gratuito
- $5/mes de crédito
- 512MB RAM
- 0.5 vCPU
- 1GB de almacenamiento
- Suficiente para desarrollo y pruebas

### Plan Hobby ($5/mes)
- 1GB RAM
- 0.5 vCPU
- 10GB de almacenamiento
- Recomendado para producción inicial

### Plan Pro ($20/mes)
- 2GB RAM
- 1 vCPU
- 50GB de almacenamiento
- Para producción con alto tráfico

## COMANDOS ÚTILES

### Ver logs en tiempo real
```bash
railway logs
```

### Ver estado del proyecto
```bash
railway status
```

### Re-desplegar manualmente
```bash
railway up
```

### Abrir dashboard en navegador
```bash
railway open
```

## ACTUALIZACIÓN POST-DESPLIEGUE

### Para actualizar la aplicación:

1. Haz cambios en tu rama develop
```bash
git checkout develop
# ... hacer cambios ...
git add .
git commit -m "feat: nueva funcionalidad"
git push origin develop
```

2. Fusiona con main
```bash
git checkout main
git merge develop
git push origin main
```

3. Railway desplegará automáticamente
4. Verifica el despliegue en la pestaña "Deployments"

## SEGURIDAD

### Buenas Prácticas

1. Nunca commits .env files
2. Usa Railway Variables para secrets
3. Rota JWT secrets regularmente
4. Habilita HTTPS (Railway lo hace por defecto)
5. Configura CORS correctamente
6. Usa rate limiting
7. Monitorea logs regularmente

### Variables Sensibles

Nunca expongas:
- JWT_SECRET
- JWT_REFRESH_SECRET
- SUPABASE_SERVICE_ROLE_KEY
- DATABASE_URL
- REDIS_PASSWORD

## CONTACTO Y SOPORTE

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Twitter: @railway_app
- Email: support@railway.app
