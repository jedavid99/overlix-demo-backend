export interface Shipment {
  id: string;
  empresa_id: string;
  numero_envio: string;
  venta_id?: string;
  cliente_id?: string;
  cliente_nombre?: string;
  direccion_envio: string;
  ciudad: string;
  provincia: string;
  codigo_postal: string;
  pais: string;
  transportista: string;
  numero_seguimiento?: string;
  fecha_envio: Date;
  fecha_estimada_entrega?: Date;
  fecha_entrega?: Date;
  estado: string;
  notas?: string;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}
