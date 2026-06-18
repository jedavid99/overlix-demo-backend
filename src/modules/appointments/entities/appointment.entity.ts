export interface Appointment {
  id: string;
  empresa_id: string;
  numero_cita: string;
  cliente_id: string;
  cliente_nombre?: string;
  tecnico_id?: string;
  tecnico_nombre?: string;
  tipo_cita: string;
  fecha_cita: Date;
  hora_cita: string;
  duracion_minutos: number;
  descripcion?: string;
  reparacion_id?: string;
  venta_id?: string;
  estado: string;
  recordatorio_enviado: boolean;
  fecha_recordatorio?: Date;
  notas?: string;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}
