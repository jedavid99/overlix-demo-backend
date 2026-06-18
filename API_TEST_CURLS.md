# API TEST COLLECTION - TECHREPAIR PRO
# Colección de cURLs para probar todos los endpoints principales

## VARIABLES GLOBALES
Reemplaza las siguientes variables en los comandos:
- BASE_URL: http://localhost:3000 (local) o https://tu-app.railway.app (producción)
- JWT_TOKEN: Token obtenido del login

## HEALTH CHECK

```bash
curl -X GET http://localhost:3000/api/health
```

## AUTENTICACIÓN

### 1. Registrar Usuario (POST /api/auth/register)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre_empresa": "TechRepair Pro",
    "razon_social": "TechRepair Pro S.A.",
    "email": "admin@techrepair.com",
    "contraseña": "SecurePass123!",
    "nombre_completo": "Administrador",
    "telefono": "+5491112345678",
    "direccion": "Av. Corrientes 1234",
    "ciudad": "Buenos Aires",
    "codigo_postal": "C1043",
    "pais": "Argentina"
  }'
```

### 2. Login (POST /api/auth/login)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@techrepair.com",
    "contraseña": "SecurePass123!",
    "codigo_empresa": "TECH001"
  }'
```

### 3. Obtener Perfil (GET /api/auth/me)
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

### 4. Listar Usuarios (GET /api/auth/users)
```bash
curl -X GET http://localhost:3000/api/auth/users \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

### 5. Obtener Usuario por ID (GET /api/auth/users/:id)
```bash
curl -X GET http://localhost:3000/api/auth/users/USER_ID \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

### 6. Actualizar Usuario (PUT /api/auth/users/:id)
```bash
curl -X PUT http://localhost:3000/api/auth/users/USER_ID \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre_completo": "Nuevo Nombre",
    "telefono": "+5491198765432"
  }'
```

### 7. Logout (POST /api/auth/logout)
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

## CLIENTES

### 8. Crear Cliente (POST /api/clients)
```bash
curl -X POST http://localhost:3000/api/clients \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre_completo": "Juan Pérez",
    "email": "juan.perez@email.com",
    "telefono": "+5491155555555",
    "direccion": "Calle Falsa 123",
    "ciudad": "Buenos Aires",
    "codigo_postal": "C1000",
    "dni": "12345678"
  }'
```

### 9. Listar Clientes (GET /api/clients)
```bash
curl -X GET http://localhost:3000/api/clients \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

### 10. Obtener Cliente por ID (GET /api/clients/:id)
```bash
curl -X GET http://localhost:3000/api/clients/CLIENT_ID \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

### 11. Actualizar Cliente (PUT /api/clients/:id)
```bash
curl -X PUT http://localhost:3000/api/clients/CLIENT_ID \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre_completo": "Juan Pérez Actualizado",
    "telefono": "+5491166666666"
  }'
```

### 12. Eliminar Cliente (DELETE /api/clients/:id)
```bash
curl -X DELETE http://localhost:3000/api/clients/CLIENT_ID \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

## PRODUCTOS

### 13. Crear Producto (POST /api/products)
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Pantalla iPhone 13",
    "descripcion": "Pantalla OLED original para iPhone 13",
    "categoria_id": "CAT_UUID",
    "precio_compra": 150.00,
    "precio_venta": 250.00,
    "stock": 10,
    "stock_minimo": 3,
    "codigo_barras": "7501234567890"
  }'
```

### 14. Listar Productos (GET /api/products)
```bash
curl -X GET http://localhost:3000/api/products \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

### 15. Obtener Producto por ID (GET /api/products/:id)
```bash
curl -X GET http://localhost:3000/api/products/PRODUCT_ID \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

### 16. Actualizar Producto (PUT /api/products/:id)
```bash
curl -X PUT http://localhost:3000/api/products/PRODUCT_ID \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "precio_venta": 275.00,
    "stock": 15
  }'
```

### 17. Ajustar Stock (POST /api/products/:id/adjust-stock)
```bash
curl -X POST http://localhost:3000/api/products/PRODUCT_ID/adjust-stock \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cantidad": 5,
    "motivo": "Reposición de inventario"
  }'
```

### 18. Eliminar Producto (DELETE /api/products/:id)
```bash
curl -X DELETE http://localhost:3000/api/products/PRODUCT_ID \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

## REPARACIONES

### 19. Crear Reparación (POST /api/repairs)
```bash
curl -X POST http://localhost:3000/api/repairs \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": "CLIENT_UUID",
    "dispositivo": "iPhone 13",
    "marca": "Apple",
    "modelo": "iPhone 13 Pro",
    "numero_serie": "SN123456789",
    "problema_reportado": "Pantalla rota",
    "fecha_ingreso": "2026-06-18",
    "prioridad": "high",
    "tecnico_asignado_id": "TECH_UUID",
    "fecha_estimada_entrega": "2026-06-20",
    "tiempo_estimado_minutos": 120
  }'
```

### 20. Listar Reparaciones (GET /api/repairs)
```bash
curl -X GET "http://localhost:3000/api/repairs?page=1&limit=20&estado=diagnostic" \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

### 21. Obtener Reparación por ID (GET /api/repairs/:id)
```bash
curl -X GET http://localhost:3000/api/repairs/REPAIR_ID \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

### 22. Actualizar Reparación (PUT /api/repairs/:id)
```bash
curl -X PUT http://localhost:3000/api/repairs/REPAIR_ID \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "estado": "in_progress",
    "diagnosis": "Pantalla dañada, requiere reemplazo",
    "notas": "Cliente autorizó reparación"
  }'
```

### 23. Completar Reparación (PUT /api/repairs/:id/completar)
```bash
curl -X PUT http://localhost:3000/api/repairs/REPAIR_ID/completar \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reparacion_realizada": "Cambio de pantalla completado",
    "costo_piezas": 150.00,
    "costo_mano_obra": 50.00,
    "fecha_entrega": "2026-06-20"
  }'
```

### 24. Cancelar Reparación (DELETE /api/repairs/:id)
```bash
curl -X DELETE http://localhost:3000/api/repairs/REPAIR_ID \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

## VENTAS

### 25. Crear Venta (POST /api/sales)
```bash
curl -X POST http://localhost:3000/api/sales \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": "CLIENT_UUID",
    "items": [
      {
        "producto_id": "PRODUCT_UUID",
        "cantidad": 2,
        "precio_unitario": 250.00
      }
    ],
    "metodo_pago": "efectivo",
    "estado": "completada"
  }'
```

### 26. Listar Ventas (GET /api/sales)
```bash
curl -X GET "http://localhost:3000/api/sales?page=1&limit=20&fecha_desde=2026-06-01" \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

### 27. Obtener Venta por ID (GET /api/sales/:id)
```bash
curl -X GET http://localhost:3000/api/sales/SALE_ID \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

### 28. Actualizar Venta (PUT /api/sales/:id)
```bash
curl -X PUT http://localhost:3000/api/sales/SALE_ID \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "estado": "cancelada",
    "notas": "Cliente solicitó cancelación"
  }'
```

## GASTOS

### 29. Crear Gasto (POST /api/expenses)
```bash
curl -X POST http://localhost:3000/api/expenses \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "categoria": "inventario",
    "monto": 500.00,
    "descripcion": "Compra de repuestos",
    "fecha": "2026-06-18",
    "proveedor": "TechParts S.A."
  }'
```

### 30. Listar Gastos (GET /api/expenses)
```bash
curl -X GET "http://localhost:3000/api/expenses?page=1&limit=20&categoria=inventario" \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

### 31. Obtener Gasto por ID (GET /api/expenses/:id)
```bash
curl -X GET http://localhost:3000/api/expenses/EXPENSE_ID \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

### 32. Actualizar Gasto (PUT /api/expenses/:id)
```bash
curl -X PUT http://localhost:3000/api/expenses/EXPENSE_ID \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "monto": 550.00,
    "descripcion": "Compra de repuestos actualizada"
  }'
```

### 33. Eliminar Gasto (DELETE /api/expenses/:id)
```bash
curl -X DELETE http://localhost:3000/api/expenses/EXPENSE_ID \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

## CITAS

### 34. Crear Cita (POST /api/appointments)
```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": "CLIENT_UUID",
    "tecnico_id": "TECH_UUID",
    "fecha": "2026-06-20",
    "hora_inicio": "10:00",
    "hora_fin": "11:00",
    "motivo": "Revisión de dispositivo"
  }'
```

### 35. Listar Citas (GET /api/appointments)
```bash
curl -X GET "http://localhost:3000/api/appointments?page=1&limit=20&fecha=2026-06-20" \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

### 36. Obtener Cita por ID (GET /api/appointments/:id)
```bash
curl -X GET http://localhost:3000/api/appointments/APPOINTMENT_ID \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

### 37. Actualizar Cita (PUT /api/appointments/:id)
```bash
curl -X PUT http://localhost:3000/api/appointments/APPOINTMENT_ID \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "estado": "completada",
    "notas": "Cliente llegó puntual"
  }'
```

### 38. Eliminar Cita (DELETE /api/appointments/:id)
```bash
curl -X DELETE http://localhost:3000/api/appointments/APPOINTMENT_ID \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

## ERRORES ESPERADOS

### 401 Unauthorized (Sin token)
```bash
curl -X GET http://localhost:3000/api/auth/users
# Respuesta esperada: 401 Unauthorized
```

### 403 Forbidden (Sin permisos)
```bash
curl -X GET http://localhost:3000/api/repairs \
  -H "Authorization: Bearer TOKEN_SIN_PERMISOS"
# Respuesta esperada: 403 Forbidden
```

### 404 Not Found (Recurso no existe)
```bash
curl -X GET http://localhost:3000/api/clients/non-existent-id \
  -H "Authorization: Bearer TU_JWT_TOKEN"
# Respuesta esperada: 404 Not Found
```

### 400 Bad Request (Datos inválidos)
```bash
curl -X POST http://localhost:3000/api/clients \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
# Respuesta esperada: 400 Bad Request
```

## SCRIPT DE PRUEBA AUTOMATIZADO

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
JWT_TOKEN=""

echo "=== TechRepair Pro API Test Suite ==="
echo ""

# 1. Health Check
echo "1. Health Check..."
curl -s -X GET $BASE_URL/api/health
echo ""

# 2. Register
echo "2. Register user..."
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre_empresa": "Test Company",
    "razon_social": "Test Company S.A.",
    "email": "test@test.com",
    "contraseña": "Test123!",
    "nombre_completo": "Test User",
    "telefono": "+5491112345678"
  }')
echo $REGISTER_RESPONSE

# 3. Login
echo "3. Login..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "contraseña": "Test123!",
    "codigo_empresa": "TEST001"
  }')
echo $LOGIN_RESPONSE

# Extract JWT token (requiere jq)
JWT_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')
echo "JWT Token: $JWT_TOKEN"

# 4. Get Profile
echo "4. Get profile..."
curl -s -X GET $BASE_URL/api/auth/me \
  -H "Authorization: Bearer $JWT_TOKEN"
echo ""

echo "=== Test Suite Complete ==="
```

Para usar el script:
```bash
chmod +x test_api.sh
./test_api.sh
```
