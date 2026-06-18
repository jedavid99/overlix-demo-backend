export interface Product {
  id: string;
  empresa_id: string;
  codigo_producto?: string;
  nombre: string;
  descripcion?: string;
  categoria_id?: string;
  categoria_nombre?: string;
  precio_costo: number;
  precio_venta: number;
  precio_mayorista?: number;
  cantidad_stock: number;
  cantidad_minima: number;
  marca?: string;
  modelo?: string;
  compatibilidad?: any;
  imagen_url?: string;
  sku?: string;
  tipo_producto: string;
  estado: string;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
  activo_en_ventas: boolean;
  activo_en_reparaciones: boolean;
}

export interface ProductCategory {
  id: string;
  empresa_id: string;
  nombre: string;
  descripcion?: string;
  fecha_creacion: Date;
}
