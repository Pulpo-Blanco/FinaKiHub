// src/services/progress.service.ts
import type { ModuleKey, ModuleScore } from '../types/progress';
import type { UpdateProgressResponse, CommitProgressBody } from '../types/api';

// ⚠️ tu utils/api.ts está FUERA de src/
import { addCoins, addXP, updateProgress } from '../../utils/api';

import 'react-native-get-random-values';
import { v4 as uuid } from 'uuid';

type Safe<T> = T | null | undefined;
function isNumber(n: any): n is number {
  return typeof n === 'number' && !Number.isNaN(n);
}

/**
 * Sube monedas y XP de forma segura.
 * Acepta { new_coins/new_xp } o { new_total }.
 */
export async function awardCoinsXP(
  userId: string,
  delta: { coins: number; xp: number }
) {
  const results = {
    coins: null as Safe<number>,
    xp: null as Safe<number>,
    level: null as Safe<number>,
  };

  // 🪙 Coins
  try {
    const coinsRes: any = await addCoins(userId, delta.coins);
    const nc =
      isNumber(coinsRes?.new_coins)
        ? coinsRes.new_coins
        : isNumber(coinsRes?.new_total)
        ? coinsRes.new_total
        : null;

    if (nc != null) results.coins = nc;
  } catch {}

  // ✨ XP
  try {
    const xpRes: any = await addXP(userId, delta.xp);
    const nxp =
      isNumber(xpRes?.new_xp)
        ? xpRes.new_xp
        : isNumber(xpRes?.new_total)
        ? xpRes.new_total
        : null;

    if (nxp != null) {
      results.xp = nxp;
      results.level = isNumber(xpRes?.new_level) ? xpRes.new_level : null;
    }
  } catch {}

  return results;
}

/**
 * Guarda el progreso de un módulo (compatible con tu backend actual).
 * Si luego creas /progress/commit, pon useBulkCommit=true.
 */
export async function commitModuleProgress(opts: {
  userId: string;
  moduleKey: ModuleKey;
  score: ModuleScore;
  delta: { coins: number; xp: number };
  useBulkCommit?: boolean;
}) {
  const { userId, moduleKey, score, delta, useBulkCommit } = opts;

  if (useBulkCommit) {
    const body: CommitProgressBody = {
      user_id: userId,
      client_tx_id: uuid(),
      delta,
      module_key: moduleKey,
      score: { correct: score.correct, total: score.total },
      finished_at: new Date().toISOString(),
    };
    const res = (await (updateProgress as any)(body)) as UpdateProgressResponse;
    return res?.snapshot ?? null;
  }

  await awardCoinsXP(userId, delta);

  try {
    const upd = (await (updateProgress as any)({
      user_id: userId,
      module_key: moduleKey,
      score,
    })) as UpdateProgressResponse;

    return upd?.snapshot ?? null;
  } catch {
    return null;
  }
}

/** ¿Es mejor el puntaje actual que el previo? */
export function isBetterScore(prevBest: number | undefined, now: ModuleScore) {
  if (!isNumber(prevBest)) return true;
  return now.correct > prevBest;
}
