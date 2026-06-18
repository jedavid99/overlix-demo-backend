export interface Expense {
  id: string;
  empresa_id: string;
  numero_gasto: string;
  categoria_gasto_id?: string;
  categoria_nombre?: string;
  descripcion: string;
  monto: number;
  metodo_pago_id?: string;
  metodo_pago_nombre?: string;
  fecha_gasto: Date;
  fecha_pago?: Date;
  comprobante_numero?: string;
  proveedor?: string;
  proveedor_id?: string;
  estado: string;
  usuario_id_creacion?: string;
  usuario_nombre?: string;
  notas?: string;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

export interface ExpenseCategory {
  id: string;
  empresa_id: string;
  nombre: string;
  descripcion?: string;
  fecha_creacion: Date;
}
