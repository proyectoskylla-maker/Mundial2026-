export interface Equipo {
  name: string;
  flag: string;
  grupo: string;
  conf: string;
  ranking: number;
  climaFav: string[];
  climaAfecta: string[];
  golesXP: number;
  estiloGol: string;
  handicapBias: number;
  climaData: string;
}

export interface Estadio {
  name: string;
  ciudad: string;
  pais: string;
  cap: number;
  temp: string;
  tipo: string;
  altitud: string;
  humedad: string;
  historia: string;
  flag: string;
  partidos: string;
}

export interface WeatherOption {
  id: string;
  icon: string;
  label: string;
  temp: [number, number];
  hum: [number, number];
  viento: [number, number];
  golesAdj: number;
  handicapAdj: number;
}

export interface SavedPick {
  id: number;
  local: string;
  visitante: string;
  localFlag: string;
  visitanteFlag: string;
  linea: string;
  mercado: string;
  prob: string;
  probRaw: number;
  cuotaJusta: string;
  clima: string;
  fase: string;
  date: string;
  result: 'open' | 'win' | 'loss' | 'void';
  cuotaReal?: number;
}

export interface AIPick {
  mercado: string;
  pick: string;
  razon: string;
  confianza: 'alta' | 'media' | 'baja';
}
