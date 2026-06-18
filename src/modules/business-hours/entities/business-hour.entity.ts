export interface BusinessHour {
  id: string;
  empresa_id: string;
  dia_semana: string;
  hora_apertura: string;
  hora_cierre: string;
  abierto: boolean;
  descanso_inicio?: string;
  descanso_fin?: string;
  notas?: string;
  fecha_creacion: Date;
}
