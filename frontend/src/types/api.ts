// src/types/api.ts
export interface AddCoinsResponse {
  new_coins: number;
}

export interface AddXPResponse {
  new_xp: number;
  new_level: number;
}

export interface UpdateProgressResponse {
  ok: boolean;
  snapshot?: {
    coins: number;
    xp: number;
    level: number;
    best_scores?: Record<string, number>;
    completed_modules?: string[];
  };
}

export interface CommitProgressBody {
  user_id: string;
  client_tx_id?: string;
  delta: { coins: number; xp: number };
  module_key: string;
  score: { correct: number; total: number };
  finished_at: string;
}
