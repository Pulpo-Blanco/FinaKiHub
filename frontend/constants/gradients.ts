// constants/gradients.ts
export type GradientPalette = { name: string; colors: [string, string] };

export const GRADIENTS: Record<string, GradientPalette> = {
  // Secciones
  inicial:     { name: 'Inicial',     colors: ['#34d399', '#2563eb'] }, // verde → azul
  primaria:    { name: 'Primaria',    colors: ['#38bdf8', '#3b82f6'] }, // celeste → azul
  secundaria:  { name: 'Secundaria',  colors: ['#ec4899', '#8b5cf6'] }, // rosa → violeta
  shop:        { name: 'Tienda',      colors: ['#f59e0b', '#ef4444'] }, // ámbar → rojo
  avatar:      { name: 'Avatar',      colors: ['#22c55e', '#facc15'] }, // verde → amarillo
  progreso:    { name: 'Progreso',    colors: ['#06b6d4', '#2563eb'] }, // cian → azul

  // Juegos (puedes afinarlos uno a uno)
  debt:        { name: 'Préstamos',   colors: ['#34d399', '#2563eb'] },
  savings:     { name: 'Ahorro',      colors: ['#22c55e', '#16a34a'] },
  interest:    { name: 'Interés',     colors: ['#38bdf8', '#3b82f6'] },
  lemonade:    { name: 'Emprende',    colors: ['#facc15', '#f97316'] },
};

export const DEFAULT_GRADIENT: GradientPalette = GRADIENTS.primaria;
