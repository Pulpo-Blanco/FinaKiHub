// store/userStore.ts
import { create } from 'zustand';
import { User } from '../utils/api';

/** Tipo compatible con lo que llega de tu API + campos opcionales que usa la app */
type UserLike = User & Partial<{
  name: string;
  level: string;
  coins: number;
  xp: number;
  badges: string[];
  purchased_items: string[];
  equipped_items: Record<string, string>;
}>;

interface UserState {
  user: UserLike | null;
  setUser: (user: UserLike | null) => void;

  updateCoins: (coins: number) => void;
  updateXP: (xp: number, level: number) => void;
  updateLevel: (level: string) => void;

  addBadge: (badgeId: string) => void;
  addPurchasedItem: (itemId: string) => void;
  updateEquippedItems: (equippedItems: Record<string, string>) => void;

  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  // ---------- STATE ----------
  user: null,

  // ---------- ACTIONS ----------
  setUser: (user) => set({ user }),

  updateCoins: (coins) =>
    set((state): Partial<UserState> => ({
      user: state.user ? ({ ...(state.user as any), coins } as any) : state.user,
    })),

  updateXP: (xp, level) =>
    set((state): Partial<UserState> => ({
      user: state.user ? ({ ...(state.user as any), xp, level } as any) : state.user,
    })),

  updateLevel: (level) =>
    set((state): Partial<UserState> => ({
      user: state.user ? ({ ...(state.user as any), level } as any) : state.user,
    })),

  addBadge: (badgeId) =>
    set((state): Partial<UserState> => {
      if (!state.user) return { user: state.user };
      const prev = state.user.badges ?? [];
      if (prev.includes(badgeId)) return { user: state.user };
      return { user: { ...(state.user as any), badges: [...prev, badgeId] } as any };
    }),

  addPurchasedItem: (itemId) =>
    set((state): Partial<UserState> => {
      if (!state.user) return { user: state.user };
      const prev = state.user.purchased_items ?? [];
      if (prev.includes(itemId)) return { user: state.user };
      return { user: { ...(state.user as any), purchased_items: [...prev, itemId] } as any };
    }),

  updateEquippedItems: (equipped_items) =>
    set((state): Partial<UserState> => ({
      user: state.user ? ({ ...(state.user as any), equipped_items } as any) : state.user,
    })),

  logout: () => set({ user: null }),
}));
