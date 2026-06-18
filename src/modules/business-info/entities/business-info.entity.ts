export interface BusinessInfo {
  id: string;
  empresa_id: string;
  nombre_negocio: string;
  propietario_nombre?: string;
  telefono: string;
  email: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  codigo_postal?: string;
  sitio_web?: string;
  logo_url?: string;
  descripcion?: string;
  horarios: Record<string, any>;
  fecha_actualizacion: Date;
}
