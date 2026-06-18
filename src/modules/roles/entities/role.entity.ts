export interface Role {
  id: string;
  empresa_id?: string;
  nombre: string;
  descripcion?: string;
  permisos: Record<string, string[]>;
  fecha_creacion: Date;
}
