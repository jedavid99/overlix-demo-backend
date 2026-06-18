export interface SocialMedia {
  id: string;
  empresa_id: string;
  plataforma: string;
  url: string;
  usuario?: string;
  activo: boolean;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}
