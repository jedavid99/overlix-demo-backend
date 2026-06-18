export interface AuditLog {
  id: string;
  empresa_id: string;
  usuario_id?: string;
  usuario_nombre?: string;
  tipo_accion: string;
  modulo: string;
  tabla: string;
  registro_id?: string;
  descripcion: string;
  datos_anteriores?: any;
  datos_nuevos?: any;
  direccion_ip?: string;
  user_agent?: string;
  fecha_creacion: Date;
  estado: string;
}
