export type EnvioPackQuoteItem = {
  correo?: {
    id?: string;
    nombre?: string;
  };
  modalidad?: string;
  despacho?: string;
  servicio?: string;
  valor?: number | string;
  horas_entrega?: number | string;
  fecha_estimada?: string;
  [key: string]: unknown;
};

export type EnvioPackProvince = {
  id: string;
  nombre?: string;
  [key: string]: unknown;
};
