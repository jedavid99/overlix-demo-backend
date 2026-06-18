# TechRepair Pro - Backend

Sistema de gestión integral para negocios de reparación y venta de dispositivos electrónicos.

## Stack Tecnológico

- **Framework:** NestJS (TypeScript)
- **Base de Datos:** PostgreSQL (Supabase)
- **Cache:** Redis
- **Colas:** BullMQ
- **Autenticación:** JWT + Supabase Auth
- **ORM:** pg (node-postgres) con queries nativas

## Estructura del Proyecto

```
src/
├── main.ts                          # Punto de entrada
├── app.module.ts                    # Módulo raíz
├── common/                          # Utilidades compartidas
│   ├── decorators/                  # Decoradores personalizados
│   ├── dto/                         # DTOs genéricos
│   ├── filters/                     # Filtros de excepción
│   ├── guards/                      # Guards de autenticación/autorización
│   ├── interceptors/                # Interceptors
│   ├── middlewares/                 # Middlewares
│   ├── pipes/                       # Pipes de validación
│   └── utils/                       # Funciones utilitarias
├── config/                          # Configuración
│   ├── database.config.ts           # Configuración de BD
│   ├── redis.config.ts              # Configuración de Redis
│   └── jwt.config.ts                # Configuración de JWT
├── database/                       # Base de datos
│   ├── migrations/                  # Migraciones SQL
│   ├── seeds/                       # Datos iniciales
│   └── queries/                     # Queries SQL organizados
├── modules/                         # Módulos de negocio
│   ├── auth/                        # Autenticación
│   ├── companies/                   # Empresas
│   ├── users/                       # Usuarios
│   ├── roles/                       # Roles y permisos
│   ├── clients/                     # Clientes
│   ├── products/                    # Productos y stock
│   ├── sales/                       # Ventas
│   ├── repairs/                     # Reparaciones
│   ├── shipments/                   # Envíos
│   ├── expenses/                    # Gastos
│   ├── suppliers/                   # Proveedores
│   ├── appointments/                # Citas
│   ├── warranties/                  # Garantías
│   ├── payment-methods/             # Métodos de pago
│   ├── shipping-methods/            # Métodos de envío
│   ├── social-media/                # Redes sociales
│   ├── business-hours/              # Horarios de negocio
│   ├── reports/                     # Reportes
│   ├── settings/                    # Configuración
│   └── audit/                       # Auditoría
└── jobs/                            # Trabajos en cola (BullMQ)
    ├── email/                       # Envío de emails
    ├── pdf/                         # Generación de PDFs
    └── cleanup/                     # Limpieza de datos
```

## Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar migraciones
npm run migration:run

# Iniciar en desarrollo
npm run start:dev

# Iniciar en producción
npm run build
npm run start:prod
```

## Características

- **Multi-tenant:** Aislamiento completo de datos por empresa
- **RLS (Row Level Security):** Políticas de seguridad a nivel de fila en PostgreSQL
- **Autenticación robusta:** JWT con refresh tokens
- **Autorización granular:** Sistema de roles y permisos
- **Auditoría completa:** Registro de todas las acciones
- **Cache con Redis:** Mejora de rendimiento
- **Colas de trabajos:** Procesamiento asíncrono
- **Rate limiting:** Protección contra abuso
- **Validación de datos:** Class-validator y class-transformer
- **Documentación API:** Swagger/OpenAPI

## Documentación de la API

Una vez iniciado el servidor, accede a:
- Swagger UI: `http://localhost:3000/api/docs`
- Health check: `http://localhost:3000/health`

## Variables de Entorno

Ver `.env.example` para todas las variables requeridas.

## Despliegue

Ver `DEPLOYMENT.md` para instrucciones detalladas de despliegue.
