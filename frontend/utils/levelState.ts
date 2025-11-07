// frontend/utils/levelState.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '../store/userStore';
import { updateUserLevel } from './api';

export type AppLevel = 'inicial' | 'primaria' | 'secundaria';

const KEY = 'fk:selected_level';

function normalizeLevel(v: any): AppLevel {
  const s = String(v ?? '').toLowerCase();
  if (s === 'primaria' || s === 'secundaria') return s;
  return 'inicial';
}

/**
 * Hook centralizado para leer/escribir el nivel educativo:
 * - Fuente 1: user.selected_level del store.
 * - Fuente 2 (fallback): AsyncStorage si aún no hay user.
 * - Al cambiar nivel: actualiza store, guarda en AsyncStorage y notifica backend (si hay user.id).
 */
export function useLevel() {
  const user = useUserStore((s: any) => s.user);
  const setUser = useUserStore((s: any) => s.setUser);

  // 1) nivel desde el usuario si existe
  let raw = user?.selected_level;

  // 2) compat: si alguna vez quedó “educationLevel/difficulty”
  if (!raw) {
    const st: any = (useUserStore as any).getState?.();
    raw = st?.educationLevel ?? st?.difficulty ?? raw;
  }

  const level: AppLevel = normalizeLevel(raw);

  const setLevel = async (next: AppLevel) => {
    const normalized = normalizeLevel(next);

    // a) Actualizar store
    if (user && typeof setUser === 'function') {
      try { setUser({ ...user, selected_level: normalized } as any); } catch {}
    }

    // b) Persistir localmente
    try { await AsyncStorage.setItem(KEY, normalized); } catch {}

    // c) Notificar backend (opcional si hay user)
    try { if (user?.id) await updateUserLevel(user.id, normalized).catch(() => {}); } catch {}
  };

  return { level, setLevel };
}

/** Hidrata el nivel desde AsyncStorage cuando aún no hay user cargado. */
export async function hydrateLevelIfMissing() {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (!stored) return;
    const lvl = normalizeLevel(stored);
    const st: any = (useUserStore as any).getState?.();
    const user = st?.user;
    if (user && st?.setUser) {
      st.setUser({ ...user, selected_level: lvl });
    }
  } catch {}
}
