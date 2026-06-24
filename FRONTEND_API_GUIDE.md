# TechRepair Pro Backend - API Guide para Frontend

Guía completa de endpoints para integración con el frontend.

## 📋 Información General

- **Base URL**: `http://localhost:3000/api` (desarrollo)
- **Base URL**: `https://tu-backend.railway.app/api` (producción)
- **Autenticación**: JWT Bearer Token
- **Content-Type**: `application/json`
- **Prefijo global**: `/api`

---

## 🔐 Autenticación

### Headers para endpoints protegidos
```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### Endpoints Públicos (Sin autenticación)

#### 1. Registrar nueva empresa
```http
POST /api/auth/register
```

**Body:**
```json
{
  "nombre_empresa": "TechRepair Pro",
  "razon_social": "TechRepair Pro S.A.",
  "cuit": "20-12345678-9",
  "email": "admin@techrepair.com",
  "telefono": "+5491112345678",
  "direccion": "Av. Corrientes 1234",
  "ciudad": "Buenos Aires",
  "provincia": "Buenos Aires",
  "codigo_postal": "1234",
  "nombre_completo": "Juan Pérez",
  "contraseña": "Password123!"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Empresa registrada exitosamente",
  "data": {
    "empresa_id": "uuid",
    "usuario_id": "uuid",
    "codigo_empresa": "TECH123"
  }
}
```

---

#### 2. Iniciar sesión
```http
POST /api/auth/login
```

**Body:**
```json
{
  "email": "admin@techrepair.com",
  "contraseña": "Password123!",
  "codigo_empresa": "TECH123"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id": "uuid",
      "nombre_completo": "Juan Pérez",
      "email": "admin@techrepair.com",
      "rol": "admin",
      "empresa_id": "uuid",
      "empresa_nombre": "TechRepair Pro",
      "permisos": {...}
    }
  }
}
```

---

#### 3. Verificar código de empresa
```http
POST /api/auth/verify-company
```

**Body:**
```json
{
  "codigo_empresa": "TECH123"
}
```

**Respuesta:**
```json
{
  "success": true,
  "valid": true,
  "data": {
    "empresa_id": "uuid",
    "empresa_nombre": "TechRepair Pro"
  }
}
```

---

### Endpoints Protegidos (Requieren token)

#### 4. Obtener perfil del usuario actual
```http
GET /api/auth/me
```

**Headers:**
```javascript
{
  'Authorization': `Bearer ${token}`
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nombre_completo": "Juan Pérez",
    "email": "admin@techrepair.com",
    "telefono": "+5491112345678",
    "dni": "12345678",
    "estado": "activo",
    "empresa_id": "uuid",
    "empresa_nombre": "TechRepair Pro",
    "codigo_empresa": "TECH123",
    "rol": "admin",
    "permisos": {...},
    "ultimo_acceso": "2026-06-23T20:00:00.000Z",
    "fecha_creacion": "2026-01-01T00:00:00.000Z"
  }
}
```

---

#### 5. Cerrar sesión
```http
POST /api/auth/logout
```

**Headers:**
```javascript
{
  'Authorization': `Bearer ${token}`
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Sesión cerrada correctamente"
}
```

---

#### 6. Listar usuarios
```http
GET /api/auth/users
```

**Headers:**
```javascript
{
  'Authorization': `Bearer ${token}`
}
```

**Respuesta:**
```json
{
  "success": true,
  "users": [...],
  "total": 10
}
```

---

#### 7. Obtener usuario por ID
```http
GET /api/auth/users/:id
```

**Headers:**
```javascript
{
  'Authorization': `Bearer ${token}`
}
```

---

#### 8. Crear usuario
```http
POST /api/auth/users
```

**Headers:**
```javascript
{
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

**Body:**
```json
{
  "email": "nuevo@techrepair.com",
  "contraseña": "Password123!",
  "nombre_completo": "Nuevo Usuario",
  "telefono": "+5491198765432",
  "dni": "87654321",
  "rol_id": "uuid"
}
```

---

#### 9. Actualizar usuario
```http
PUT /api/auth/users/:id
```

**Headers:**
```javascript
{
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

**Body:**
```json
{
  "nombre_completo": "Nombre Actualizado",
  "telefono": "+5491199999999"
}
```

---

#### 10. Eliminar usuario
```http
DELETE /api/auth/users/:id
```

**Headers:**
```javascript
{
  'Authorization': `Bearer ${token}`
}
```

---

## 👥 Usuarios

#### 1. Listar usuarios
```http
GET /api/users
```

#### 2. Obtener usuario por ID
```http
GET /api/users/:id
```

#### 3. Crear usuario
```http
POST /api/users
```

**Body:**
```json
{
  "email": "usuario@techrepair.com",
  "contraseña": "Password123!",
  "nombre_completo": "Usuario",
  "rol_id": "uuid"
}
```

#### 4. Actualizar usuario
```http
PATCH /api/users/:id
```

#### 5. Eliminar usuario
```http
DELETE /api/users/:id
```

---

## 🎭 Roles

#### 1. Listar roles
```http
GET /api/roles
```

#### 2. Obtener rol por ID
```http
GET /api/roles/:id
```

#### 3. Crear rol
```http
POST /api/roles
```

**Body:**
```json
{
  "nombre": "tecnico",
  "descripcion": "Técnico de reparaciones",
  "permisos": {
    "reparaciones": ["leer", "crear", "actualizar"],
    "clientes": ["leer"]
  }
}
```

#### 4. Actualizar rol
```http
PUT /api/roles/:id
```

#### 5. Eliminar rol
```http
DELETE /api/roles/:id
```

#### 6. Asignar rol a usuario
```http
POST /api/roles/assign/:userId/:roleId
```

---

## 👤 Clientes

#### 1. Listar clientes
```http
GET /api/clients?page=1&limit=20&search=Juan&estado=activo
```

**Query Params:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Resultados por página (default: 20)
- `search` (opcional): Buscar por nombre, email, teléfono
- `estado` (opcional): activo, inactivo

#### 2. Obtener cliente por ID
```http
GET /api/clients/:id
```

#### 3. Crear cliente
```http
POST /api/clients
```

**Body:**
```json
{
  "nombre_completo": "Juan García",
  "email": "juan@gmail.com",
  "telefono": "+5491112345678",
  "dni": "12345678",
  "direccion": "Calle 123",
  "ciudad": "Buenos Aires",
  "provincia": "Buenos Aires",
  "codigo_postal": "1234",
  "notas": "Cliente VIP"
}
```

#### 4. Actualizar cliente
```http
PUT /api/clients/:id
```

**Body:**
```json
{
  "nombre_completo": "Juan García Actualizado",
  "telefono": "+5491199999999"
}
```

#### 5. Eliminar cliente
```http
DELETE /api/clients/:id
```

#### 6. Historial de compras del cliente
```http
GET /api/clients/:id/compras
```

---

## 📦 Productos

#### 1. Listar productos
```http
GET /api/products?page=1&limit=20&search=iPhone&categoria_id=uuid&estado=activo&tipo_producto=repuesto
```

**Query Params:**
- `page` (opcional): Número de página
- `limit` (opcional): Resultados por página
- `search` (opcional): Buscar por nombre, código
- `categoria_id` (opcional): Filtrar por categoría
- `estado` (opcional): activo, inactivo
- `tipo_producto` (opcional): repuesto, accesorio, servicio

#### 2. Obtener producto por ID
```http
GET /api/products/:id
```

#### 3. Crear producto
```http
POST /api/products
```

**Body:**
```json
{
  "nombre": "Pantalla iPhone 13",
  "codigo": "IPH13-SCR",
  "descripcion": "Pantalla LCD original iPhone 13",
  "categoria_id": "uuid",
  "tipo_producto": "repuesto",
  "precio_compra": 50.00,
  "precio_venta": 100.00,
  "stock_actual": 10,
  "stock_minimo": 5,
  "estado": "activo"
}
```

#### 4. Actualizar producto
```http
PUT /api/products/:id
```

#### 5. Ajustar stock
```http
PATCH /api/products/:id/stock
```

**Body:**
```json
{
  "cantidad": 5,
  "motivo": "Reposición de inventario",
  "tipo": "entrada"
}
```

#### 6. Eliminar producto
```http
DELETE /api/products/:id
```

#### 7. Alertas de stock bajo
```http
GET /api/products/alertas/bajo-stock
```

---

## 💰 Ventas

#### 1. Listar ventas
```http
GET /api/sales?page=1&limit=20&cliente_id=uuid&estado=completada&fecha_desde=2026-01-01&fecha_hasta=2026-12-31&metodo_pago=efectivo&canal=tienda
```

**Query Params:**
- `page`, `limit`: Paginación
- `cliente_id`: Filtrar por cliente
- `estado`: pendiente, completada, cancelada
- `fecha_desde`, `fecha_hasta`: Rango de fechas
- `metodo_pago`: efectivo, tarjeta, transferencia
- `canal`: tienda, online

#### 2. Obtener venta por ID
```http
GET /api/sales/:id
```

#### 3. Crear venta
```http
POST /api/sales
```

**Body:**
```json
{
  "cliente_id": "uuid",
  "items": [
    {
      "producto_id": "uuid",
      "cantidad": 2,
      "precio_unitario": 100.00
    }
  ],
  "metodo_pago_id": "uuid",
  "metodo_envio_id": "uuid",
  "descuento": 10.00,
  "notas": "Venta con descuento"
}
```

#### 4. Actualizar venta
```http
PUT /api/sales/:id
```

#### 5. Eliminar venta
```http
DELETE /api/sales/:id
```

---

## 🔧 Reparaciones

#### 1. Listar reparaciones
```http
GET /api/repairs?page=1&limit=20&estado=pendiente&cliente_id=uuid&tecnico_id=uuid&prioridad=alta&fecha_desde=2026-01-01&fecha_hasta=2026-12-31
```

**Query Params:**
- `estado`: pendiente, en_progreso, completada, cancelada
- `cliente_id`: Filtrar por cliente
- `tecnico_id`: Filtrar por técnico
- `prioridad`: baja, media, alta
- `fecha_desde`, `fecha_hasta`: Rango de fechas

#### 2. Obtener reparación por ID
```http
GET /api/repairs/:id
```

#### 3. Crear reparación
```http
POST /api/repairs
```

**Body:**
```json
{
  "cliente_id": "uuid",
  "dispositivo": "iPhone 13",
  "marca": "Apple",
  "modelo": "iPhone 13",
  "problema": "Pantalla rota",
  "descripcion": "Pantalla completamente rota, no responde al tacto",
  "prioridad": "alta",
  "presupuesto_estimado": 150.00,
  "fecha_estimada_entrega": "2026-06-25"
}
```

#### 4. Actualizar reparación
```http
PUT /api/repairs/:id
```

**Body:**
```json
{
  "estado": "en_progreso",
  "tecnico_id": "uuid",
  "notas": "Comenzando reparación"
}
```

#### 5. Completar reparación
```http
PUT /api/repairs/:id/completar
```

**Body:**
```json
{
  "costo_final": 145.00,
  "notas": "Reparación completada exitosamente"
}
```

#### 6. Eliminar reparación
```http
DELETE /api/repairs/:id
```

---

## 📦 Envíos

#### 1. Listar envíos
```http
GET /api/shipments?page=1&limit=20&estado=pendiente&cliente_id=uuid
```

**Query Params:**
- `estado`: pendiente, en_transito, entregado, cancelado
- `cliente_id`: Filtrar por cliente

#### 2. Obtener envío por ID
```http
GET /api/shipments/:id
```

#### 3. Crear envío
```http
POST /api/shipments
```

**Body:**
```json
{
  "cliente_id": "uuid",
  "venta_id": "uuid",
  "direccion_destino": "Calle 456, Ciudad",
  "metodo_envio_id": "uuid",
  "costo_envio": 150.00,
  "notas": "Entregar entre 9-18hs"
}
```

#### 4. Actualizar envío
```http
PUT /api/shipments/:id
```

#### 5. Actualizar estado de envío
```http
PATCH /api/shipments/:id/status
```

**Body:**
```json
{
  "estado": "en_transito"
}
```

#### 6. Eliminar envío
```http
DELETE /api/shipments/:id
```

---

## 💸 Gastos

#### 1. Listar gastos
```http
GET /api/expenses?page=1&limit=20&categoria_id=uuid&estado=pagado&fecha_desde=2026-01-01&fecha_hasta=2026-12-31&metodo_pago=transferencia
```

**Query Params:**
- `categoria_id`: Filtrar por categoría
- `estado`: pendiente, pagado, cancelado
- `fecha_desde`, `fecha_hasta`: Rango de fechas
- `metodo_pago`: efectivo, tarjeta, transferencia

#### 2. Obtener categorías de gastos
```json
GET /api/expenses/categories
```

#### 3. Reporte de gastos por mes
```http
GET /api/expenses/report?mes=2026-06
```

#### 4. Obtener gasto por ID
```http
GET /api/expenses/:id
```

#### 5. Crear gasto
```http
POST /api/expenses
```

**Body:**
```json
{
  "categoria_id": "uuid",
  "monto": 5000.00,
  "descripcion": "Pago de alquiler",
  "fecha": "2026-06-01",
  "metodo_pago": "transferencia",
  "proveedor": "Inmobiliaria XYZ",
  "factura": "FAC-001"
}
```

#### 6. Actualizar gasto
```http
PUT /api/expenses/:id
```

#### 7. Eliminar gasto
```http
DELETE /api/expenses/:id
```

---

## 📅 Citas

#### 1. Listar citas
```http
GET /api/appointments?page=1&limit=20&estado=confirmada&cliente_id=uuid&tecnico_id=uuid&fecha_desde=2026-06-01&fecha_hasta=2026-06-30
```

**Query Params:**
- `estado`: pendiente, confirmada, completada, cancelada
- `cliente_id`: Filtrar por cliente
- `tecnico_id`: Filtrar por técnico
- `fecha_desde`, `fecha_hasta`: Rango de fechas

#### 2. Obtener calendario de citas
```http
GET /api/appointments/calendar?fecha=2026-06-23
```

#### 3. Obtener citas por técnico
```http
GET /api/appointments/tecnicos/:tecnicoId
```

#### 4. Obtener cita por ID
```http
GET /api/appointments/:id
```

#### 5. Crear cita
```http
POST /api/appointments
```

**Body:**
```json
{
  "cliente_id": "uuid",
  "tecnico_id": "uuid",
  "fecha": "2026-06-25",
  "hora_inicio": "10:00",
  "hora_fin": "11:00",
  "motivo": "Revisión de iPhone",
  "notas": "Cliente prefiere ser atendido por técnico senior"
}
```

#### 6. Actualizar cita
```http
PUT /api/appointments/:id
```

#### 7. Eliminar cita
```http
DELETE /api/appointments/:id
```

---

## 🕐 Horarios de Negocio

#### 1. Listar horarios
```http
GET /api/business-hours
```

#### 2. Obtener horario por día
```http
GET /api/business-hours/:dia
```

**Días:** lunes, martes, miercoles, jueves, viernes, sabado, domingo

#### 3. Obtener slots disponibles
```http
GET /api/business-hours/slots/:fecha
```

#### 4. Actualizar horario
```http
PUT /api/business-hours/:dia
```

**Body:**
```json
{
  "abierto": true,
  "hora_apertura": "09:00",
  "hora_cierre": "18:00",
  "intervalo": 30
}
```

---

## 🏢 Información del Negocio

#### 1. Obtener información del negocio
```http
GET /api/business-info
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "nombre_negocio": "TechRepair Pro",
    "telefono": "+5491112345678",
    "email": "info@techrepair.com",
    "direccion": "Av. Corrientes 1234",
    "ciudad": "Buenos Aires",
    "provincia": "Buenos Aires",
    "codigo_postal": "1234",
    "logo_url": "https://...",
    "horarios": {...}
  }
}
```

#### 2. Actualizar información del negocio
```http
PUT /api/business-info
```

**Body:**
```json
{
  "nombre_negocio": "TechRepair Pro Actualizado",
  "telefono": "+5491199999999",
  "email": "nuevo@techrepair.com"
}
```

#### 3. Actualizar logo
```http
PUT /api/business-info/logo
```

**Body:**
```json
{
  "logo_url": "https://example.com/logo.png"
}
```

---

## 📱 Redes Sociales

#### 1. Listar redes sociales
```http
GET /api/social-media?activo=true
```

**Query Params:**
- `activo` (opcional): true/false

#### 2. Obtener red social por ID
```http
GET /api/social-media/:id
```

#### 3. Crear red social
```http
POST /api/social-media
```

**Body:**
```json
{
  "plataforma": "facebook",
  "url": "https://facebook.com/techrepair",
  "usuario": "@techrepair",
  "activo": true
}
```

#### 4. Actualizar red social
```http
PUT /api/social-media/:id
```

#### 5. Eliminar red social
```http
DELETE /api/social-media/:id
```

---

## 📊 Auditoría

#### 1. Listar logs de auditoría
```http
GET /api/audit-log?page=1&limit=20&modulo=usuarios&accion=crear&fecha_desde=2026-06-01&fecha_hasta=2026-06-30
```

**Query Params:**
- `modulo`: usuarios, clientes, productos, ventas, etc.
- `accion`: crear, leer, actualizar, eliminar, login, logout
- `fecha_desde`, `fecha_hasta`: Rango de fechas

#### 2. Obtener log por ID
```http
GET /api/audit-log/:id
```

---

## ❤️ Health Check

#### 1. Verificar estado del servidor
```http
GET /api/health
```

**Respuesta:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-23T20:00:00.000Z",
  "service": "TechRepair Pro Backend",
  "version": "1.0.0",
  "database": "connected",
  "databaseLatency": 45,
  "uptime": 3600,
  "uptimeFormatted": "1h 0m 0s"
}
```

---

## 📝 Errores Comunes

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Token inválido o expirado",
  "error": "Unauthorized"
}
```
**Solución:** Verificar que el token sea válido y no haya expirado.

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "No tienes permiso para realizar esta acción",
  "error": "Forbidden"
}
```
**Solución:** Verificar que el usuario tenga los permisos necesarios.

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Recurso no encontrado",
  "error": "Not Found"
}
```
**Solución:** Verificar que el ID del recurso sea correcto.

### 422 Unprocessable Entity
```json
{
  "statusCode": 422,
  "message": "Validation failed",
  "error": "Unprocessable Entity"
}
```
**Solución:** Verificar que los datos enviados cumplan con la validación.

---

## 🔧 Ejemplo de Implementación en React

### Configuración de Axios
```javascript
// src/utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api'
});

// Interceptor para agregar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Ejemplo de Login
```javascript
import api from '../utils/api';

const handleLogin = async (email, password, companyCode) => {
  try {
    const response = await api.post('/auth/login', {
      email,
      contraseña: password,
      codigo_empresa: companyCode
    });
    
    const { token, refreshToken, usuario } = response.data.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(usuario));
    
    return response.data;
  } catch (error) {
    throw error;
  }
};
```

### Ejemplo de Logout
```javascript
const handleLogout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Error en logout:', error);
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
};
```

---

## 📚 Documentación Adicional

- **Swagger UI**: `http://localhost:3000/api/docs` (solo desarrollo)
- **Health Check**: `http://localhost:3000/api/health`
- **README del proyecto**: `README.md`
- **Guía de despliegue**: `DEPLOYMENT.md`
- **Guía de despliegue en Railway**: `RAILWAY_DEPLOYMENT.md`

---

## 🆘 Soporte

Para problemas o preguntas, contactar al equipo de desarrollo.
