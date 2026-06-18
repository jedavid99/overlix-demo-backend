/*
 * TechRepair Pro - Initial Database Schema
 * PostgreSQL with Supabase RLS (Row Level Security)
 * Multi-tenant architecture with empresa_id isolation
 */

export const initialSchema = `
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate company code (6 characters)
CREATE OR REPLACE FUNCTION generate_company_code()
RETURNS VARCHAR(6) AS $$
DECLARE
    chars VARCHAR(36) := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR(6) := '';
    i INT;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || SUBSTRING(chars FROM (FLOOR(RANDOM() * 36) + 1)::INT FOR 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate sale number
CREATE OR REPLACE FUNCTION generate_sale_number(p_empresa_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    seq_num BIGINT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_venta FROM 3) AS BIGINT)), 0) + 1
    INTO seq_num
    FROM sales
    WHERE empresa_id = p_empresa_id;
    
    RETURN 'V-' || LPAD(seq_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate repair number
CREATE OR REPLACE FUNCTION generate_repair_number(p_empresa_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    seq_num BIGINT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_reparacion FROM 5) AS BIGINT)), 0) + 1
    INTO seq_num
    FROM repairs
    WHERE empresa_id = p_empresa_id;
    
    RETURN 'REP-' || LPAD(seq_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate budget number
CREATE OR REPLACE FUNCTION generate_budget_number(p_empresa_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    seq_num BIGINT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_presupuesto FROM 6) AS BIGINT)), 0) + 1
    INTO seq_num
    FROM budgets
    WHERE empresa_id = p_empresa_id;
    
    RETURN 'PRES-' || LPAD(seq_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate warranty number
CREATE OR REPLACE FUNCTION generate_warranty_number(p_empresa_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    seq_num BIGINT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_garantia FROM 4) AS BIGINT)), 0) + 1
    INTO seq_num
    FROM warranties
    WHERE empresa_id = p_empresa_id;
    
    RETURN 'GAR-' || LPAD(seq_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate shipment number
CREATE OR REPLACE FUNCTION generate_shipment_number(p_empresa_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    seq_num BIGINT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_envio FROM 5) AS BIGINT)), 0) + 1
    INTO seq_num
    FROM shipments
    WHERE empresa_id = p_empresa_id;
    
    RETURN 'ENV-' || LPAD(seq_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate expense number
CREATE OR REPLACE FUNCTION generate_expense_number(p_empresa_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    seq_num BIGINT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_gasto FROM 3) AS BIGINT)), 0) + 1
    INTO seq_num
    FROM expenses
    WHERE empresa_id = p_empresa_id;
    
    RETURN 'G-' || LPAD(seq_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate appointment number
CREATE OR REPLACE FUNCTION generate_appointment_number(p_empresa_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    seq_num BIGINT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_cita FROM 5) AS BIGINT)), 0) + 1
    INTO seq_num
    FROM appointments
    WHERE empresa_id = p_empresa_id;
    
    RETURN 'CITA-' || LPAD(seq_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_status AS ENUM ('activo', 'inactivo', 'suspendido');
CREATE TYPE company_status AS ENUM ('activa', 'inactiva', 'suspendida');
CREATE TYPE subscription_plan AS ENUM ('basico', 'premium', 'empresarial');
CREATE TYPE client_type AS ENUM ('particular', 'empresa', 'mayorista');
CREATE TYPE product_type AS ENUM ('modulo', 'bateria', 'accesorio', 'otro');
CREATE TYPE product_status AS ENUM ('activo', 'inactivo', 'descontinuado');
CREATE TYPE sale_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE repair_status AS ENUM ('diagnostic', 'in_progress', 'waiting_parts', 'testing', 'completed', 'cancelled');
CREATE TYPE repair_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE budget_status AS ENUM ('pendiente', 'aceptado', 'rechazado', 'vencido');
CREATE TYPE warranty_coverage AS ENUM ('completa', 'limitada', 'parcial');
CREATE TYPE warranty_status AS ENUM ('activa', 'vencida', 'cancelada');
CREATE TYPE shipment_status AS ENUM ('pendiente', 'en_transito', 'entregado', 'fallido', 'devuelto');
CREATE TYPE expense_status AS ENUM ('registrado', 'pagado', 'rechazado');
CREATE TYPE payment_method_type AS ENUM ('cash', 'card', 'transfer', 'digital', 'wallet');
CREATE TYPE shipping_method_type AS ENUM ('pickup', 'delivery', 'express', 'local');
CREATE TYPE social_platform AS ENUM ('whatsapp', 'instagram', 'facebook', 'twitter', 'tiktok', 'youtube');
CREATE TYPE day_of_week AS ENUM ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo');
CREATE TYPE appointment_type AS ENUM ('diagnostic', 'reparacion', 'entrega', 'consulta', 'mantenimiento');
CREATE TYPE appointment_status AS ENUM ('programada', 'en_progreso', 'completada', 'cancelada', 'no_asistio');
CREATE TYPE audit_action AS ENUM ('crear', 'leer', 'actualizar', 'eliminar', 'login', 'logout', 'exportar');
CREATE TYPE audit_status AS ENUM ('exitosa', 'fallida', 'error');
CREATE TYPE sales_channel AS ENUM ('local', 'web', 'mercadolibre');

-- ============================================
-- TABLES
-- ============================================

-- EMPRESAS (Companies)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_empresa VARCHAR(255) NOT NULL UNIQUE,
    razon_social VARCHAR(255) NOT NULL,
    cuit VARCHAR(13) UNIQUE,
    email VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    direccion TEXT,
    ciudad VARCHAR(100),
    provincia VARCHAR(100),
    codigo_postal VARCHAR(10),
    sitio_web VARCHAR(255),
    logo_url VARCHAR(255),
    descripcion TEXT,
    propietario_nombre VARCHAR(255),
    codigo_empresa VARCHAR(6) UNIQUE NOT NULL DEFAULT generate_company_code(),
    estado company_status DEFAULT 'activa',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    plan_suscripcion subscription_plan DEFAULT 'basico',
    fecha_vencimiento_plan DATE
);

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_companies_codigo_empresa ON companies(codigo_empresa);
CREATE INDEX idx_companies_estado ON companies(estado);
CREATE INDEX idx_companies_email ON companies(email);

-- ROLES (Roles)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    permisos JSONB NOT NULL,
    empresa_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_roles_empresa_id ON roles(empresa_id);
CREATE INDEX idx_roles_nombre ON roles(nombre);

-- USUARIOS (Users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    rol_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    estado user_status DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP,
    telefono VARCHAR(20),
    dni VARCHAR(20),
    auth_user_id UUID, -- Reference to Supabase auth.users
    UNIQUE(empresa_id, email)
);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_users_empresa_id ON users(empresa_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_rol_id ON users(rol_id);
CREATE INDEX idx_users_estado ON users(estado);
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);

-- CLIENTES (Clients)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nombre_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(20) NOT NULL,
    telefono_secundario VARCHAR(20),
    dni VARCHAR(20),
    direccion TEXT,
    ciudad VARCHAR(100),
    provincia VARCHAR(100),
    codigo_postal VARCHAR(10),
    tipo_cliente client_type DEFAULT 'particular',
    estado user_status DEFAULT 'activo',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deuda_actual DECIMAL(12,2) DEFAULT 0,
    credito_disponible DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    UNIQUE(empresa_id, dni)
);

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_clients_empresa_id ON clients(empresa_id);
CREATE INDEX idx_clients_dni ON clients(dni);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_telefono ON clients(telefono);
CREATE INDEX idx_clients_estado ON clients(estado);
CREATE INDEX idx_clients_tipo_cliente ON clients(tipo_cliente);

-- CATEGORÍAS DE PRODUCTOS (Product Categories)
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50),
    color VARCHAR(7),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(empresa_id, nombre)
);

CREATE INDEX idx_product_categories_empresa_id ON product_categories(empresa_id);

-- PRODUCTOS (Products)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    codigo_producto VARCHAR(50),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    categoria_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    precio_costo DECIMAL(12,2) NOT NULL,
    precio_venta DECIMAL(12,2) NOT NULL,
    precio_mayorista DECIMAL(12,2),
    cantidad_stock INT DEFAULT 0,
    cantidad_minima INT DEFAULT 5,
    marca VARCHAR(100),
    modelo VARCHAR(100),
    compatibilidad JSONB,
    imagen_url VARCHAR(255),
    sku VARCHAR(50) UNIQUE,
    tipo_producto product_type NOT NULL,
    estado product_status DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo_en_ventas BOOLEAN DEFAULT true,
    activo_en_reparaciones BOOLEAN DEFAULT true,
    UNIQUE(empresa_id, codigo_producto)
);

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_products_empresa_id ON products(empresa_id);
CREATE INDEX idx_products_codigo_producto ON products(codigo_producto);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_categoria_id ON products(categoria_id);
CREATE INDEX idx_products_estado ON products(estado);
CREATE INDEX idx_products_tipo_producto ON products(tipo_producto);
CREATE INDEX idx_products_cantidad_stock ON products(cantidad_stock);

-- MÉTODOS DE PAGO (Payment Methods)
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    tipo payment_method_type NOT NULL,
    habilitado BOOLEAN DEFAULT true,
    icono VARCHAR(50),
    color VARCHAR(7),
    descripcion TEXT,
    datos_configuracion JSONB,
    porcentaje_comision DECIMAL(5,2) DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_methods_empresa_id ON payment_methods(empresa_id);
CREATE INDEX idx_payment_methods_habilitado ON payment_methods(habilitado);

-- MÉTODOS DE ENVÍO (Shipping Methods)
CREATE TABLE shipping_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    tipo shipping_method_type NOT NULL,
    habilitado BOOLEAN DEFAULT true,
    icono VARCHAR(50),
    color VARCHAR(7),
    precio_base DECIMAL(12,2) DEFAULT 0,
    tiempo_estimado VARCHAR(100),
    descripcion TEXT,
    configuracion JSONB,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shipping_methods_empresa_id ON shipping_methods(empresa_id);
CREATE INDEX idx_shipping_methods_habilitado ON shipping_methods(habilitado);

-- VENTAS (Sales)
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    numero_venta VARCHAR(50) NOT NULL,
    cliente_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    fecha_venta DATE NOT NULL,
    hora_venta TIME NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    impuestos DECIMAL(12,2) DEFAULT 0,
    descuento DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    estado sale_status NOT NULL,
    metodo_pago_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    metodo_entrega_id UUID REFERENCES shipping_methods(id) ON DELETE SET NULL,
    direccion_entrega TEXT,
    vendedor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    canal_venta sales_channel DEFAULT 'local',
    referencia_externa VARCHAR(100),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id_creacion UUID REFERENCES users(id) ON DELETE SET NULL,
    notas TEXT,
    UNIQUE(empresa_id, numero_venta)
);

CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_sales_empresa_id ON sales(empresa_id);
CREATE INDEX idx_sales_numero_venta ON sales(numero_venta);
CREATE INDEX idx_sales_cliente_id ON sales(cliente_id);
CREATE INDEX idx_sales_fecha_venta ON sales(fecha_venta);
CREATE INDEX idx_sales_estado ON sales(estado);
CREATE INDEX idx_sales_vendedor_id ON sales(vendedor_id);
CREATE INDEX idx_sales_canal_venta ON sales(canal_venta);

-- DETALLES DE VENTA (Sale Items)
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES products(id) ON DELETE SET NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    descuento_linea DECIMAL(12,2) DEFAULT 0
);

CREATE INDEX idx_sale_items_venta_id ON sale_items(venta_id);
CREATE INDEX idx_sale_items_producto_id ON sale_items(producto_id);

-- REPARACIONES (Repairs)
CREATE TABLE repairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    numero_reparacion VARCHAR(50) NOT NULL,
    cliente_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    dispositivo VARCHAR(100) NOT NULL,
    marca VARCHAR(100),
    modelo VARCHAR(100),
    numero_serie VARCHAR(100),
    problema_reportado TEXT NOT NULL,
    diagnosis TEXT,
    reparacion_realizada TEXT,
    estado repair_status NOT NULL,
    prioridad repair_priority DEFAULT 'medium',
    tecnico_asignado_id UUID REFERENCES users(id) ON DELETE SET NULL,
    fecha_ingreso DATE NOT NULL,
    hora_ingreso TIME NOT NULL,
    fecha_estimada_entrega DATE,
    fecha_entrega_real DATE,
    hora_entrega TIME,
    tiempo_estimado_minutos INT,
    presupuesto_id UUID,
    costo_piezas DECIMAL(12,2) DEFAULT 0,
    costo_mano_obra DECIMAL(12,2) DEFAULT 0,
    total_reparacion DECIMAL(12,2) NOT NULL,
    metodo_pago_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    pagado BOOLEAN DEFAULT false,
    garantia_meses INT DEFAULT 3,
    fecha_vencimiento_garantia DATE,
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id_creacion UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(empresa_id, numero_reparacion)
);

CREATE TRIGGER update_repairs_updated_at
    BEFORE UPDATE ON repairs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_repairs_empresa_id ON repairs(empresa_id);
CREATE INDEX idx_repairs_numero_reparacion ON repairs(numero_reparacion);
CREATE INDEX idx_repairs_cliente_id ON repairs(cliente_id);
CREATE INDEX idx_repairs_tecnico_asignado_id ON repairs(tecnico_asignado_id);
CREATE INDEX idx_repairs_estado ON repairs(estado);
CREATE INDEX idx_repairs_prioridad ON repairs(prioridad);
CREATE INDEX idx_repairs_fecha_ingreso ON repairs(fecha_ingreso);

-- PRESUPUESTOS (Budgets)
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    numero_presupuesto VARCHAR(50) NOT NULL,
    reparacion_id UUID REFERENCES repairs(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    costo_piezas DECIMAL(12,2) NOT NULL,
    costo_mano_obra DECIMAL(12,2) NOT NULL,
    impuestos DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    estado budget_status DEFAULT 'pendiente',
    descripcion_trabajos TEXT NOT NULL,
    observaciones TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id_creacion UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(empresa_id, numero_presupuesto)
);

CREATE INDEX idx_budgets_empresa_id ON budgets(empresa_id);
CREATE INDEX idx_budgets_numero_presupuesto ON budgets(numero_presupuesto);
CREATE INDEX idx_budgets_reparacion_id ON budgets(reparacion_id);
CREATE INDEX idx_budgets_cliente_id ON budgets(cliente_id);
CREATE INDEX idx_budgets_estado ON budgets(estado);

-- GARANTÍAS (Warranties)
CREATE TABLE warranties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    numero_garantia VARCHAR(50) NOT NULL,
    venta_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    reparacion_id UUID REFERENCES repairs(id) ON DELETE SET NULL,
    cliente_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES products(id) ON DELETE SET NULL,
    fecha_inicio DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    duracion_meses INT NOT NULL,
    tipo_cobertura warranty_coverage DEFAULT 'completa',
    descripcion TEXT,
    estado warranty_status DEFAULT 'activa',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id_creacion UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(empresa_id, numero_garantia)
);

CREATE INDEX idx_warranties_empresa_id ON warranties(empresa_id);
CREATE INDEX idx_warranties_numero_garantia ON warranties(numero_garantia);
CREATE INDEX idx_warranties_venta_id ON warranties(venta_id);
CREATE INDEX idx_warranties_reparacion_id ON warranties(reparacion_id);
CREATE INDEX idx_warranties_cliente_id ON warranties(cliente_id);
CREATE INDEX idx_warranties_estado ON warranties(estado);

-- ENVÍOS (Shipments)
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    numero_envio VARCHAR(50) NOT NULL,
    venta_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    cliente_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    metodo_envio_id UUID REFERENCES shipping_methods(id) ON DELETE SET NULL,
    direccion_entrega TEXT NOT NULL,
    codigo_postal VARCHAR(10) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    provincia VARCHAR(100) NOT NULL,
    estado shipment_status NOT NULL,
    fecha_creacion DATE NOT NULL,
    fecha_envio DATE,
    fecha_entrega_estimada DATE,
    fecha_entrega_real DATE,
    costo_envio DECIMAL(12,2) NOT NULL,
    numero_seguimiento VARCHAR(100),
    notas TEXT,
    firma_entrega VARCHAR(255),
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(empresa_id, numero_envio)
);

CREATE TRIGGER update_shipments_updated_at
    BEFORE UPDATE ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_shipments_empresa_id ON shipments(empresa_id);
CREATE INDEX idx_shipments_numero_envio ON shipments(numero_envio);
CREATE INDEX idx_shipments_venta_id ON shipments(venta_id);
CREATE INDEX idx_shipments_cliente_id ON shipments(cliente_id);
CREATE INDEX idx_shipments_estado ON shipments(estado);
CREATE INDEX idx_shipments_numero_seguimiento ON shipments(numero_seguimiento);

-- CATEGORÍAS DE GASTOS (Expense Categories)
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(empresa_id, nombre)
);

CREATE INDEX idx_expense_categories_empresa_id ON expense_categories(empresa_id);

-- GASTOS (Expenses)
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    numero_gasto VARCHAR(50) NOT NULL,
    categoria_gasto_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    descripcion TEXT NOT NULL,
    monto DECIMAL(12,2) NOT NULL,
    metodo_pago_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    fecha_gasto DATE NOT NULL,
    fecha_pago DATE,
    comprobante_numero VARCHAR(100),
    proveedor VARCHAR(255),
    proveedor_id UUID,
    estado expense_status DEFAULT 'registrado',
    usuario_id_creacion UUID REFERENCES users(id) ON DELETE SET NULL,
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(empresa_id, numero_gasto)
);

CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_expenses_empresa_id ON expenses(empresa_id);
CREATE INDEX idx_expenses_numero_gasto ON expenses(numero_gasto);
CREATE INDEX idx_expenses_categoria_gasto_id ON expenses(categoria_gasto_id);
CREATE INDEX idx_expenses_fecha_gasto ON expenses(fecha_gasto);
CREATE INDEX idx_expenses_estado ON expenses(estado);

-- PROVEEDORES (Suppliers)
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nombre_empresa VARCHAR(255) NOT NULL,
    contacto_nombre VARCHAR(255),
    contacto_email VARCHAR(255),
    contacto_telefono VARCHAR(20),
    contacto_celular VARCHAR(20),
    cuit VARCHAR(13),
    direccion TEXT,
    ciudad VARCHAR(100),
    provincia VARCHAR(100),
    codigo_postal VARCHAR(10),
    website VARCHAR(255),
    condiciones_pago TEXT,
    plazo_entrega_dias INT,
    estado user_status DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calificacion DECIMAL(3,2) DEFAULT 0,
    notas TEXT,
    UNIQUE(empresa_id, nombre_empresa)
);

CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_suppliers_empresa_id ON suppliers(empresa_id);
CREATE INDEX idx_suppliers_nombre_empresa ON suppliers(nombre_empresa);
CREATE INDEX idx_suppliers_estado ON suppliers(estado);

-- PRECIOS PROVEEDOR (Supplier Prices)
CREATE TABLE supplier_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proveedor_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    precio DECIMAL(12,2) NOT NULL,
    cantidad_minima INT DEFAULT 1,
    tiempo_entrega_dias INT,
    vigencia_desde DATE NOT NULL,
    vigencia_hasta DATE,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supplier_prices_proveedor_id ON supplier_prices(proveedor_id);
CREATE INDEX idx_supplier_prices_producto_id ON supplier_prices(producto_id);
CREATE INDEX idx_supplier_prices_activo ON supplier_prices(activo);

-- REDES SOCIALES (Social Media)
CREATE TABLE social_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plataforma social_platform NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    url VARCHAR(255) NOT NULL,
    habilitado BOOLEAN DEFAULT true,
    icono VARCHAR(50),
    color VARCHAR(7),
    orden INT DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(empresa_id, plataforma)
);

CREATE INDEX idx_social_media_empresa_id ON social_media(empresa_id);
CREATE INDEX idx_social_media_plataforma ON social_media(plataforma);

-- HORARIOS DE NEGOCIO (Business Hours)
CREATE TABLE business_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    dia_semana day_of_week NOT NULL,
    hora_apertura TIME NOT NULL,
    hora_cierre TIME NOT NULL,
    abierto BOOLEAN DEFAULT true,
    descanso_inicio TIME,
    descanso_fin TIME,
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(empresa_id, dia_semana)
);

CREATE INDEX idx_business_hours_empresa_id ON business_hours(empresa_id);

-- CITAS/TURNOS (Appointments)
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    numero_cita VARCHAR(50) NOT NULL,
    cliente_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    tecnico_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tipo_cita appointment_type NOT NULL,
    fecha_cita DATE NOT NULL,
    hora_cita TIME NOT NULL,
    duracion_minutos INT DEFAULT 30,
    descripcion TEXT,
    reparacion_id UUID REFERENCES repairs(id) ON DELETE SET NULL,
    venta_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    estado appointment_status DEFAULT 'programada',
    recordatorio_enviado BOOLEAN DEFAULT false,
    fecha_recordatorio TIMESTAMP,
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(empresa_id, numero_cita)
);

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_appointments_empresa_id ON appointments(empresa_id);
CREATE INDEX idx_appointments_numero_cita ON appointments(numero_cita);
CREATE INDEX idx_appointments_cliente_id ON appointments(cliente_id);
CREATE INDEX idx_appointments_tecnico_id ON appointments(tecnico_id);
CREATE INDEX idx_appointments_fecha_cita ON appointments(fecha_cita);
CREATE INDEX idx_appointments_estado ON appointments(estado);

-- INFORMACIÓN DE NEGOCIO (Business Info)
CREATE TABLE business_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nombre_negocio VARCHAR(255) NOT NULL,
    propietario_nombre VARCHAR(255),
    telefono VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    direccion TEXT,
    ciudad VARCHAR(100),
    provincia VARCHAR(100),
    codigo_postal VARCHAR(10),
    sitio_web VARCHAR(255),
    logo_url VARCHAR(255),
    descripcion TEXT,
    horarios JSONB NOT NULL,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(empresa_id)
);

CREATE INDEX idx_business_info_empresa_id ON business_info(empresa_id);

-- AUDITORÍA (Audit Log)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tipo_accion audit_action NOT NULL,
    modulo VARCHAR(100) NOT NULL,
    tabla VARCHAR(100) NOT NULL,
    registro_id VARCHAR(100),
    descripcion TEXT NOT NULL,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    direccion_ip VARCHAR(45),
    user_agent VARCHAR(255),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado audit_status DEFAULT 'exitosa'
);

CREATE INDEX idx_audit_log_empresa_id ON audit_log(empresa_id);
CREATE INDEX idx_audit_log_usuario_id ON audit_log(usuario_id);
CREATE INDEX idx_audit_log_tipo_accion ON audit_log(tipo_accion);
CREATE INDEX idx_audit_log_modulo ON audit_log(modulo);
CREATE INDEX idx_audit_log_fecha_creacion ON audit_log(fecha_creacion);
CREATE INDEX idx_audit_log_registro_id ON audit_log(registro_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all multi-tenant tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Function to check if user belongs to company
CREATE OR REPLACE FUNCTION check_company_access(p_empresa_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN p_empresa_id = (
        SELECT empresa_id FROM users 
        WHERE id = auth.uid()::TEXT::UUID
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's empresa_id
CREATE OR REPLACE FUNCTION get_current_empresa_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT empresa_id FROM users 
        WHERE id = auth.uid()::TEXT::UUID
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for Companies
CREATE POLICY "Users can view their own company" ON companies
    FOR SELECT
    USING (id = get_current_empresa_id());

CREATE POLICY "Users can update their own company" ON companies
    FOR UPDATE
    USING (id = get_current_empresa_id());

-- RLS Policies for Roles
CREATE POLICY "Users can view roles from their company" ON roles
    FOR SELECT
    USING (empresa_id = get_current_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Users can create roles for their company" ON roles
    FOR INSERT
    WITH CHECK (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can update roles from their company" ON roles
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

-- RLS Policies for Users
CREATE POLICY "Users can view users from their company" ON users
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can create users for their company" ON users
    FOR INSERT
    WITH CHECK (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can update users from their company" ON users
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT
    USING (id = auth.uid()::TEXT::UUID);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE
    USING (id = auth.uid()::TEXT::UUID);

-- RLS Policies for Clients
CREATE POLICY "Users can view clients from their company" ON clients
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can create clients for their company" ON clients
    FOR INSERT
    WITH CHECK (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can update clients from their company" ON clients
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can delete clients from their company" ON clients
    FOR DELETE
    USING (empresa_id = get_current_empresa_id());

-- RLS Policies for Product Categories
CREATE POLICY "Users can view product categories from their company" ON product_categories
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can create product categories for their company" ON product_categories
    FOR INSERT
    WITH CHECK (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can update product categories from their company" ON product_categories
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

-- RLS Policies for Products
CREATE POLICY "Users can view products from their company" ON products
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can create products for their company" ON products
    FOR INSERT
    WITH CHECK (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can update products from their company" ON products
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can delete products from their company" ON products
    FOR DELETE
    USING (empresa_id = get_current_empresa_id());

-- RLS Policies for Payment Methods
CREATE POLICY "Users can view payment methods from their company" ON payment_methods
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can create payment methods for their company" ON payment_methods
    FOR INSERT
    WITH CHECK (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can update payment methods from their company" ON payment_methods
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

-- RLS Policies for Shipping Methods
CREATE POLICY "Users can view shipping methods from their company" ON shipping_methods
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can create shipping methods for their company" ON shipping_methods
    FOR INSERT
    WITH CHECK (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can update shipping methods from their company" ON shipping_methods
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

-- RLS Policies for Sales
CREATE POLICY "Users can view sales from their company" ON sales
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can create sales for their company" ON sales
    FOR INSERT
    WITH CHECK (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can update sales from their company" ON sales
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can delete sales from their company" ON sales
    FOR DELETE
    USING (empresa_id = get_current_empresa_id());

-- RLS Policies for Sale Items
CREATE POLICY "Users can view sale items from their company" ON sale_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sales 
            WHERE sales.id = sale_items.venta_id 
            AND sales.empresa_id = get_current_empresa_id()
        )
    );

CREATE POLICY "Users can create sale items for their company" ON sale_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sales 
            WHERE sales.id = sale_items.venta_id 
            AND sales.empresa_id = get_current_empresa_id()
        )
    );

CREATE POLICY "Users can update sale items from their company" ON sale_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM sales 
            WHERE sales.id = sale_items.venta_id 
            AND sales.empresa_id = get_current_empresa_id()
        )
    );

-- RLS Policies for Repairs
CREATE POLICY "Users can view repairs from their company" ON repairs
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can create repairs for their company" ON repairs
    FOR INSERT
    WITH CHECK (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can update repairs from their company" ON repairs
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can delete repairs from their company" ON repairs
    FOR DELETE
    USING (empresa_id = get_current_empresa_id());

-- RLS Policies for Budgets
CREATE POLICY "Users can view budgets from their company" ON budgets
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can create budgets for their company" ON budgets
    FOR INSERT
    WITH CHECK (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can update budgets from their company" ON budgets
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

-- RLS Policies for Warranties
CREATE POLICY "Users can view warranties from their company" ON warranties
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can create warranties for their company" ON warranties
    FOR INSERT
    WITH CHECK (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can update warranties from their company" ON warranties
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

-- RLS Policies for Shipments
CREATE POLICY "Users can view shipments from their company" ON shipments
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can create shipments for their company" ON shipments
    FOR INSERT
    WITH CHECK (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can update shipments from their company" ON shipments
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

-- RLS Policies for Expense Categories
CREATE POLICY "Users can view expense categories from their company" ON expense_categories
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can create expense categories for their company" ON expense_categories
    FOR INSERT
    WITH CHECK (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can update expense categories from their company" ON expense_categories
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

-- RLS Policies for Expenses
CREATE POLICY "Users can view expenses from their company" ON expenses
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can create expenses for their company" ON expenses
    FOR INSERT
    WITH CHECK (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can update expenses from their company" ON expenses
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can delete expenses from their company" ON expenses
    FOR DELETE
    USING (empresa_id = get_current_empresa_id());

-- RLS Policies for Suppliers
CREATE POLICY "Users can view suppliers from their company" ON suppliers
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can create suppliers for their company" ON suppliers
    FOR INSERT
    WITH CHECK (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can update suppliers from their company" ON suppliers
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can delete suppliers from their company" ON suppliers
    FOR DELETE
    USING (empresa_id = get_current_empresa_id());

-- RLS Policies for Supplier Prices
CREATE POLICY "Users can view supplier prices from their company" ON supplier_prices
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM suppliers 
            WHERE suppliers.id = supplier_prices.proveedor_id 
            AND suppliers.empresa_id = get_current_empresa_id()
        )
    );

CREATE POLICY "Users can create supplier prices for their company" ON supplier_prices
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM suppliers 
            WHERE suppliers.id = supplier_prices.proveedor_id 
            AND suppliers.empresa_id = get_current_empresa_id()
        )
    );

-- RLS Policies for Social Media
CREATE POLICY "Users can view social media from their company" ON social_media
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can create social media for their company" ON social_media
    FOR INSERT
    WITH CHECK (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can update social media from their company" ON social_media
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

-- RLS Policies for Business Hours
CREATE POLICY "Users can view business hours from their company" ON business_hours
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can create business hours for their company" ON business_hours
    FOR INSERT
    WITH CHECK (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can update business hours from their company" ON business_hours
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

-- RLS Policies for Appointments
CREATE POLICY "Users can view appointments from their company" ON appointments
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can create appointments for their company" ON appointments
    FOR INSERT
    WITH CHECK (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can update appointments from their company" ON appointments
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can delete appointments from their company" ON appointments
    FOR DELETE
    USING (empresa_id = get_current_empresa_id());

-- RLS Policies for Business Info
CREATE POLICY "Users can view business info from their company" ON business_info
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "Users can update business info for their company" ON business_info
    FOR UPDATE
    USING (empresa_id = get_current_empresa_id());

-- RLS Policies for Audit Log
CREATE POLICY "Users can view audit logs from their company" ON audit_log
    FOR SELECT
    USING (empresa_id = get_current_empresa_id());

CREATE POLICY "System can create audit logs" ON audit_log
    FOR INSERT
    WITH CHECK (true);

-- ============================================
-- SEED DATA (Initial Roles)
-- ============================================

INSERT INTO roles (nombre, descripcion, permisos, empresa_id) VALUES
(
    'admin',
    'Administrador con acceso total al sistema',
    '{
        "clientes": ["crear", "leer", "actualizar", "eliminar"],
        "ventas": ["crear", "leer", "actualizar", "eliminar"],
        "reparaciones": ["crear", "leer", "actualizar", "eliminar"],
        "stock": ["crear", "leer", "actualizar", "eliminar"],
        "reportes": ["leer", "exportar"],
        "usuarios": ["crear", "leer", "actualizar", "eliminar"],
        "configuracion": ["leer", "actualizar"],
        "gastos": ["crear", "leer", "actualizar", "eliminar"],
        "proveedores": ["crear", "leer", "actualizar", "eliminar"],
        "envios": ["crear", "leer", "actualizar", "eliminar"],
        "citas": ["crear", "leer", "actualizar", "eliminar"],
        "auditoria": ["leer"]
    }'::jsonb,
    NULL
),
(
    'gerente',
    'Gerente con acceso a reportes y configuración',
    '{
        "clientes": ["crear", "leer", "actualizar"],
        "ventas": ["crear", "leer", "actualizar"],
        "reparaciones": ["crear", "leer", "actualizar"],
        "stock": ["leer", "actualizar"],
        "reportes": ["leer", "exportar"],
        "usuarios": ["leer", "actualizar"],
        "configuracion": ["leer", "actualizar"],
        "gastos": ["crear", "leer", "actualizar"],
        "proveedores": ["crear", "leer", "actualizar"],
        "envios": ["crear", "leer", "actualizar"],
        "citas": ["crear", "leer", "actualizar"]
    }'::jsonb,
    NULL
),
(
    'vendedor',
    'Vendedor con acceso a ventas y clientes',
    '{
        "clientes": ["crear", "leer", "actualizar"],
        "ventas": ["crear", "leer", "actualizar"],
        "reparaciones": ["leer"],
        "stock": ["leer"],
        "reportes": ["leer"],
        "usuarios": ["leer"],
        "configuracion": ["leer"]
    }'::jsonb,
    NULL
),
(
    'tecnico',
    'Técnico con acceso a reparaciones',
    '{
        "clientes": ["leer"],
        "ventas": ["leer"],
        "reparaciones": ["crear", "leer", "actualizar"],
        "stock": ["leer"],
        "reportes": ["leer"],
        "usuarios": ["leer"],
        "configuracion": ["leer"]
    }'::jsonb,
    NULL
),
(
    'asistente',
    'Asistente con acceso limitado',
    '{
        "clientes": ["leer"],
        "ventas": ["leer"],
        "reparaciones": ["leer"],
        "stock": ["leer"],
        "reportes": ["leer"],
        "usuarios": ["leer"],
        "configuracion": ["leer"]
    }'::jsonb,
    NULL
);
`;
