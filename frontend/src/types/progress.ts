// src/types/progress.ts
export type AppLevel = 'inicial' | 'primaria' | 'secundaria';

export type ModuleKey =
  | 'inicial/coins'
  | 'inicial/counting'
  | 'inicial/piggy-bank'
  // agrega los que vayas usando
  ;

export interface ModuleScore {
  correct: number;
  total: number;
}

export interface ProgressSnapshot {
  level: AppLevel;
  coins: number;
  xp: number;
  best_scores: Record<ModuleKey, number>;
  completed_modules: ModuleKey[];
}
