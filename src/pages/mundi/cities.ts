/**
 * Cidades usadas no globo e no ranking.
 * Valores de população são APROXIMADOS (região metropolitana, em milhões) — servem à visualização,
 * não a análises demográficas. `tz` é o fuso IANA usado pelo relógio local (Intl.DateTimeFormat).
 */
export interface City {
  name: string
  country: string
  lon: number
  lat: number
  /** milhões de habitantes (aprox.) */
  pop: number
  tz: string
}

export const cities: City[] = [
  { name: 'Tóquio', country: 'Japão', lon: 139.69, lat: 35.69, pop: 37.0, tz: 'Asia/Tokyo' },
  { name: 'Délhi', country: 'Índia', lon: 77.21, lat: 28.61, pop: 33.8, tz: 'Asia/Kolkata' },
  { name: 'Xangai', country: 'China', lon: 121.47, lat: 31.23, pop: 29.9, tz: 'Asia/Shanghai' },
  { name: 'Daca', country: 'Bangladesh', lon: 90.41, lat: 23.81, pop: 23.2, tz: 'Asia/Dhaka' },
  { name: 'São Paulo', country: 'Brasil', lon: -46.63, lat: -23.55, pop: 22.6, tz: 'America/Sao_Paulo' },
  { name: 'Cairo', country: 'Egito', lon: 31.24, lat: 30.04, pop: 22.6, tz: 'Africa/Cairo' },
  { name: 'Cidade do México', country: 'México', lon: -99.13, lat: 19.43, pop: 22.5, tz: 'America/Mexico_City' },
  { name: 'Pequim', country: 'China', lon: 116.41, lat: 39.9, pop: 21.8, tz: 'Asia/Shanghai' },
  { name: 'Mumbai', country: 'Índia', lon: 72.88, lat: 19.08, pop: 21.7, tz: 'Asia/Kolkata' },
  { name: 'Osaka', country: 'Japão', lon: 135.5, lat: 34.69, pop: 18.9, tz: 'Asia/Tokyo' },
  { name: 'Nova York', country: 'EUA', lon: -74.0, lat: 40.71, pop: 18.9, tz: 'America/New_York' },
  { name: 'Karachi', country: 'Paquistão', lon: 67.0, lat: 24.86, pop: 17.6, tz: 'Asia/Karachi' },
  { name: 'Kinshasa', country: 'R. D. do Congo', lon: 15.27, lat: -4.44, pop: 17.0, tz: 'Africa/Kinshasa' },
  { name: 'Lagos', country: 'Nigéria', lon: 3.38, lat: 6.52, pop: 16.5, tz: 'Africa/Lagos' },
  { name: 'Istambul', country: 'Turquia', lon: 28.98, lat: 41.01, pop: 15.8, tz: 'Europe/Istanbul' },
  { name: 'Buenos Aires', country: 'Argentina', lon: -58.38, lat: -34.6, pop: 15.6, tz: 'America/Argentina/Buenos_Aires' },
  { name: 'Calcutá', country: 'Índia', lon: 88.36, lat: 22.57, pop: 15.0, tz: 'Asia/Kolkata' },
  { name: 'Manila', country: 'Filipinas', lon: 120.98, lat: 14.6, pop: 14.9, tz: 'Asia/Manila' },
  { name: 'Rio de Janeiro', country: 'Brasil', lon: -43.17, lat: -22.91, pop: 13.8, tz: 'America/Sao_Paulo' },
  { name: 'Moscou', country: 'Rússia', lon: 37.62, lat: 55.76, pop: 12.7, tz: 'Europe/Moscow' },
  { name: 'Los Angeles', country: 'EUA', lon: -118.24, lat: 34.05, pop: 12.5, tz: 'America/Los_Angeles' },
  { name: 'Bogotá', country: 'Colômbia', lon: -74.07, lat: 4.71, pop: 11.3, tz: 'America/Bogota' },
  { name: 'Paris', country: 'França', lon: 2.35, lat: 48.86, pop: 11.3, tz: 'Europe/Paris' },
  { name: 'Lima', country: 'Peru', lon: -77.04, lat: -12.05, pop: 11.2, tz: 'America/Lima' },
  { name: 'Jacarta', country: 'Indonésia', lon: 106.85, lat: -6.21, pop: 11.2, tz: 'Asia/Jakarta' },
  { name: 'Bangcoc', country: 'Tailândia', lon: 100.5, lat: 13.76, pop: 11.1, tz: 'Asia/Bangkok' },
  { name: 'Seul', country: 'Coreia do Sul', lon: 126.98, lat: 37.57, pop: 10.0, tz: 'Asia/Seoul' },
  { name: 'Londres', country: 'Reino Unido', lon: -0.13, lat: 51.51, pop: 9.8, tz: 'Europe/London' },
  { name: 'Teerã', country: 'Irã', lon: 51.39, lat: 35.69, pop: 9.4, tz: 'Asia/Tehran' },
  { name: 'Chicago', country: 'EUA', lon: -87.63, lat: 41.88, pop: 8.9, tz: 'America/Chicago' },
  { name: 'Riade', country: 'Arábia Saudita', lon: 46.68, lat: 24.71, pop: 7.7, tz: 'Asia/Riyadh' },
  { name: 'Hong Kong', country: 'China', lon: 114.17, lat: 22.32, pop: 7.5, tz: 'Asia/Hong_Kong' },
  { name: 'Madri', country: 'Espanha', lon: -3.7, lat: 40.42, pop: 6.7, tz: 'Europe/Madrid' },
  { name: 'Santiago', country: 'Chile', lon: -70.65, lat: -33.45, pop: 6.9, tz: 'America/Santiago' },
  { name: 'Toronto', country: 'Canadá', lon: -79.38, lat: 43.65, pop: 6.3, tz: 'America/Toronto' },
  { name: 'Joanesburgo', country: 'África do Sul', lon: 28.05, lat: -26.2, pop: 6.2, tz: 'Africa/Johannesburg' },
  { name: 'Singapura', country: 'Singapura', lon: 103.82, lat: 1.35, pop: 5.9, tz: 'Asia/Singapore' },
  { name: 'Nairóbi', country: 'Quênia', lon: 36.82, lat: -1.29, pop: 5.5, tz: 'Africa/Nairobi' },
  { name: 'Adis Abeba', country: 'Etiópia', lon: 38.75, lat: 9.03, pop: 5.5, tz: 'Africa/Addis_Ababa' },
  { name: 'Sydney', country: 'Austrália', lon: 151.21, lat: -33.87, pop: 5.4, tz: 'Australia/Sydney' },
  { name: 'Brasília', country: 'Brasil', lon: -47.93, lat: -15.78, pop: 4.8, tz: 'America/Sao_Paulo' },
  { name: 'Cidade do Cabo', country: 'África do Sul', lon: 18.42, lat: -33.92, pop: 4.8, tz: 'Africa/Johannesburg' },
  { name: 'Roma', country: 'Itália', lon: 12.5, lat: 41.9, pop: 4.3, tz: 'Europe/Rome' },
  { name: 'Salvador', country: 'Brasil', lon: -38.5, lat: -12.97, pop: 3.9, tz: 'America/Bahia' },
  { name: 'Berlim', country: 'Alemanha', lon: 13.4, lat: 52.52, pop: 3.7, tz: 'Europe/Berlin' },
  { name: 'Dubai', country: 'Emirados Árabes', lon: 55.27, lat: 25.2, pop: 3.6, tz: 'Asia/Dubai' },
  { name: 'Kiev', country: 'Ucrânia', lon: 30.52, lat: 50.45, pop: 3.0, tz: 'Europe/Kyiv' },
  { name: 'Lisboa', country: 'Portugal', lon: -9.14, lat: 38.72, pop: 2.9, tz: 'Europe/Lisbon' },
  { name: 'Vancouver', country: 'Canadá', lon: -123.12, lat: 49.28, pop: 2.7, tz: 'America/Vancouver' },
  { name: 'Manaus', country: 'Brasil', lon: -60.02, lat: -3.12, pop: 2.3, tz: 'America/Manaus' },
  { name: 'Auckland', country: 'Nova Zelândia', lon: 174.76, lat: -36.85, pop: 1.7, tz: 'Pacific/Auckland' },
  { name: 'Honolulu', country: 'EUA', lon: -157.86, lat: 21.31, pop: 1.0, tz: 'Pacific/Honolulu' },
  { name: 'Anchorage', country: 'EUA', lon: -149.9, lat: 61.22, pop: 0.3, tz: 'America/Anchorage' },
  { name: 'Reykjavík', country: 'Islândia', lon: -21.94, lat: 64.15, pop: 0.24, tz: 'Atlantic/Reykjavik' },
]
