# PRODUCTION DEPLOYMENT CHECKLIST
# Checklist final para verificar que todo está listo antes del despliegue en Railway

## BASE DE DATOS (SUPABASE)

- [ ] Ejecutar script `add_updated_at_tables.sql` en Supabase SQL Editor
- [ ] Verificar que todas las tablas tengan campo `fecha_actualizacion`
- [ ] Ejecutar script `verify_database.sql` para verificar estructura
- [ ] Confirmar que todas las tablas críticas existen (users, companies, clients, products, repairs, sales, expenses, appointments, roles)
- [ ] Verificar que todas las foreign keys estén configuradas correctamente
- [ ] Verificar que RLS esté habilitado en tablas sensibles
- [ ] Verificar que los triggers de `fecha_actualizacion` funcionen
- [ ] Obtener credenciales de Supabase para producción (DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Verificar que Supabase permita conexiones desde IPs de Railway

## VARIABLES DE ENTORNO

- [ ] Crear archivo `.env.production` con todas las variables
- [ ] Reemplazar valores ficticios con valores reales
- [ ] Generar nuevos JWT_SECRET y JWT_REFRESH_SECRET (minimo 32 caracteres)
- [ ] Configurar FRONTEND_URL con URL de producción del frontend
- [ ] Configurar NODE_ENV=production
- [ ] Verificar que DATABASE_URL sea correcta
- [ ] Verificar que SUPABASE_URL sea correcta
- [ ] Verificar que todas las variables requeridas estén presentes
- [ ] NO agregar .env.production al repositorio (verificar .gitignore)

## CODIGO APLICACIÓN

- [ ] Verificar que main.ts use `process.env.PORT` para Railway
- [ ] Verificar que main.ts escuche en `0.0.0.0` (todas las interfaces)
- [ ] Verificar que Swagger esté deshabilitado en producción
- [ ] Verificar que logging esté configurado apropiadamente para producción
- [ ] Verificar que graceful shutdown esté implementado
- [ ] Verificar que CORS esté configurado con FRONTEND_URL correcto
- [ ] Verificar que ThrottlerModule esté configurado con límites apropiados
- [ ] Verificar que ValidationPipe esté configurado
- [ ] Verificar que GlobalExceptionFilter esté configurado
- [ ] Compilar proyecto localmente: `npm run build`
- [ ] Ejecutar proyecto localmente: `npm run start:prod`
- [ ] Verificar que no haya errores de compilación
- [ ] Verificar que el servidor inicie correctamente

## AUTENTICACIÓN Y SEGURIDAD

- [ ] Verificar que JWT_SECRET sea seguro y diferente al de desarrollo
- [ ] Verificar que JWT_REFRESH_SECRET sea seguro y diferente al de desarrollo
- [ ] Probar registro de usuario
- [ ] Probar login y obtener JWT token
- [ ] Verificar que JWT token funcione en endpoints protegidos
- [ ] Probar que endpoints sin token retornen 401
- [ ] Verificar que Guards de permisos funcionen correctamente
- [ ] Probar diferentes roles (admin, gerente, tecnico, vendedor)
- [ ] Verificar que rate limiting esté funcionando
- [ ] Verificar que CORS esté configurado correctamente

## ENDPOINTS PRINCIPALES

- [ ] Probar health check: `GET /api/health`
- [ ] Probar registro: `POST /api/auth/register`
- [ ] Probar login: `POST /api/auth/login`
- [ ] Probar obtener perfil: `GET /api/auth/me`
- [ ] Probar listar usuarios: `GET /api/auth/users`
- [ ] Probar CRUD de clientes (crear, listar, obtener, actualizar, eliminar)
- [ ] Probar CRUD de productos (crear, listar, obtener, actualizar, eliminar)
- [ ] Probar CRUD de reparaciones (crear, listar, obtener, actualizar, completar, eliminar)
- [ ] Probar CRUD de ventas (crear, listar, obtener, actualizar)
- [ ] Probar CRUD de gastos (crear, listar, obtener, actualizar, eliminar)
- [ ] Probar CRUD de citas (crear, listar, obtener, actualizar, eliminar)
- [ ] Verificar que todos los endpoints requieran autenticación (excepto públicos)
- [ ] Verificar que los permisos funcionen correctamente

## GIT Y REPOSITORIO

- [ ] Inicializar Git (si no está inicializado)
- [ ] Crear rama `develop` desde el estado actual
- [ ] Crear rama `main`
- [ ] Agregar todos los archivos al staging
- [ ] Hacer commit inicial con mensaje descriptivo
- [ ] Crear repositorio en GitHub
- [ ] Conectar repositorio local con GitHub
- [ ] Push de rama `develop` a GitHub
- [ ] Push de rama `main` a GitHub
- [ ] Verificar que .gitignore esté configurado correctamente
- [ ] Verificar que .env y .env.local NO estén en el repositorio
- [ ] Verificar que node_modules NO esté en el repositorio
- [ ] Verificar que dist NO esté en el repositorio

## RAILWAY CONFIGURACIÓN

- [ ] Crear cuenta en Railway
- [ ] Conectar Railway con GitHub
- [ ] Crear nuevo proyecto desde repositorio GitHub
- [ ] Seleccionar rama `main` para despliegue
- [ ] Configurar comando de inicio: `npm run start:prod` o `node dist/main`
- [ ] Configurar variables de entorno en Railway (todas las de .env.production)
- [ ] Verificar que ROOT DIRECTORY esté configurado correctamente
- [ ] Configurar auto-deploy para rama `main`
- [ ] Iniciar primer despliegue
- [ ] Verificar que el despliegue sea exitoso
- [ ] Verificar logs en Railway para errores

## VERIFICACIÓN POST-DESPLIEGUE

- [ ] Obtener URL del dominio de Railway
- [ ] Probar health check en Railway: `https://tu-app.railway.app/api/health`
- [ ] Probar login en Railway con cURL
- [ ] Probar obtener perfil en Railway
- [ ] Probar listar usuarios en Railway
- [ ] Probar crear cliente en Railway
- [ ] Probar crear reparación en Railway
- [ ] Verificar que HTTPS esté funcionando (Railway lo configura automáticamente)
- [ ] Verificar que CORS permita requests del frontend
- [ ] Verificar logs en tiempo real en Railway
- [ ] Verificar métricas (CPU, Memory, Network)
- [ ] Configurar alertas para errores y uso de recursos

## DOMINIO PERSONALIZADO (OPCIONAL)

- [ ] Comprar dominio (si no se tiene)
- [ ] Configurar dominio personalizado en Railway
- [ ] Configurar registros DNS en proveedor de dominios
- [ ] Verificar que SSL se configure automáticamente
- [ ] Probar API con dominio personalizado
- [ ] Actualizar FRONTEND_URL con nuevo dominio

## MONITOREO Y LOGGING

- [ ] Verificar que logs estructurados estén funcionando
- [ ] Configurar nivel de logs apropiado para producción (error, warn, info)
- [ ] Verificar que logs de errores sean informativos
- [ ] Configurar métricas en Railway
- [ ] Configurar alertas para CPU > 80%
- [ ] Configurar alertas para Memory > 80%
- [ ] Configurar alertas para error rate > 5%
- [ ] Configurar notificaciones (Slack, Discord, email)
- [ ] Verificar que logs de auditoría se guarden en Supabase

## DOCUMENTACIÓN

- [ ] Actualizar README.md con información de producción
- [ ] Documentar URL de producción
- [ ] Documentar credenciales de acceso (en lugar seguro)
- [ ] Documentar proceso de despliegue
- [ ] Documentar proceso de actualización
- [ ] Documentar solución de problemas comunes
- [ ] Compartir documentación con equipo

## PRUEBAS FINALES

- [ ] Ejecutar suite completa de pruebas con cURLs (API_TEST_CURLS.md)
- [ ] Probar flujo completo: registro -> login -> crear cliente -> crear reparación -> completar reparación
- [ ] Probar casos de error: 401, 403, 404, 400
- [ ] Probar rate limiting (hacer muchas requests)
- [ ] Probar validación de datos (enviar datos inválidos)
- [ ] Probar concurrencia (múltiples requests simultáneas)
- [ ] Verificar que no haya memory leaks
- [ ] Verificar que graceful shutdown funcione

## SEGURIDAD FINAL

- [ ] Verificar que no haya secrets en el código
- [ ] Verificar que .env.production NO esté en el repositorio
- [ ] Verificar que JWT secrets sean fuertes
- [ ] Verificar que Supabase RLS esté configurado
- [ ] Verificar que CORS esté configurado correctamente
- [ ] Verificar que rate limiting esté activo
- [ ] Verificar que HTTPS esté forzado
- [ ] Verificar que logs no contengan información sensible
- [ ] Verificar que audit log esté funcionando
- [ ] Hacer backup de base de datos de Supabase

## COMUNICACIÓN

- [ ] Notificar al equipo sobre despliegue
- [ ] Compartir URL de producción
- [ ] Compartir credenciales de acceso (seguro)
- [ ] Documentar cambios realizados
- [ ] Programar monitoreo post-despliegue
- [ ] Establecer protocolo de rollback si es necesario

## ROLLBACK PLAN

- [ ] Documentar proceso de rollback
- [ ] Tener backup de base de datos reciente
- [ ] Saber cómo revertir a versión anterior en Railway
- [ ] Saber cómo revertir cambios en Git
- [ ] Tener comunicación de emergencia con equipo

## CHECKLIST DE EMERGENCIA

- [ ] Número de contacto de soporte Railway
- [ ] Número de contacto de soporte Supabase
- [ ] Acceso a panel de Railway
- [ ] Acceso a panel de Supabase
- [ ] Acceso a repositorio GitHub
- [ ] Acceso a credenciales de producción (seguro)
- [ ] Proceso para notificar a usuarios de downtime

## FIRMA Y APROBACIÓN

- [ ] Revisado por: _________________ Fecha: _______
- [ ] Aprobado por: _________________ Fecha: _______
- [ ] Desplegado por: _________________ Fecha: _______
- [ ] Verificado por: _________________ Fecha: _______

## NOTAS ADICIONALES

___________________________________________________________________________________
___________________________________________________________________________________
___________________________________________________________________________________
___________________________________________________________________________________
___________________________________________________________________________________

## ESTADO FINAL

- [ ] Todos los items completados
- [ ] Pruebas exitosas
- [ ] Documentación actualizada
- [ ] Equipo notificado
- [ ] Listo para producción

**FECHA DE DESPLIEGUE:** ______________________
**URL DE PRODUCCIÓN:** ______________________
**VERIÓN:** ______________________
