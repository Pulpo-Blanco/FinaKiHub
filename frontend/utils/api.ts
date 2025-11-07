// frontend/utils/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL base (sin barras finales)
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

// Instancia Axios
export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ================== Tipos ==================
export interface User {
  id: string;
  username: string;
  age: number;
  avatar_config: any;
  coins: number;
  level: number;
  xp: number;
  badges: string[];
  purchased_items: string[];
  equipped_items: Record<string, string>;
  selected_level: string; // 'inicial' | 'primaria' | 'secundaria'
}

export interface Module {
  id: string;
  title: string;
  description: string;
  icon: string;
  coins_reward: number;
  type: string;
  level: string;
}

export interface Progress {
  user_id: string;
  completed_modules: string[];
  module_scores: Record<string, number>;
  total_score: number;
}

export interface ShopItem {
  id: string;
  name: string;
  category: string; // 'hat' | 'accessory' | 'background' | 'special'
  price: number;
  icon: string;
}

// ================== Auth ==================
export const registerUser = async (username: string, age: number): Promise<User> => {
  const { data } = await api.post('/api/auth/register', {
    username,
    age,
    avatar_config: { color: 'blue', style: 'default' },
  });
  return data;
};

export const loginUser = async (username: string): Promise<User> => {
  const { data } = await api.post('/api/auth/login', { username });
  return data;
};

// ================== Usuario ==================
export const getUser = async (userId: string): Promise<User> => {
  const { data } = await api.get(`/api/user/${userId}`);
  return data;
};

export const updateAvatar = async (userId: string, avatarConfig: any): Promise<User> => {
  const { data } = await api.put('/api/user/avatar', { user_id: userId, avatar_config: avatarConfig });
  return data;
};

export const updateUserLevel = async (userId: string, level: string): Promise<User> => {
  const { data } = await api.put('/api/user/level', { user_id: userId, level });
  return data;
};

// ================== Progreso ==================
export const getProgress = async (userId: string): Promise<Progress> => {
  const { data } = await api.get(`/api/progress/${userId}`);
  return data;
};

export const updateProgress = async (progress: Progress): Promise<any> => {
  const { data } = await api.post('/api/progress/update', progress);
  return data;
};

// ================== Módulos ==================
export const getPrimaryModules = async (): Promise<Module[]> => {
  const { data } = await api.get('/api/modules/primary');
  return data;
};

export const getModulesByLevel = async (level: string): Promise<Module[]> => {
  const safeLevel = (level || 'inicial').toLowerCase();
  const { data } = await api.get(`/api/modules/${safeLevel}`);
  return Array.isArray(data) ? data : [];
};

// ================== Monedas / Insignias ==================
export const addCoins = async (
  userId: string,
  coins: number
): Promise<{ success: boolean; new_total: number }> => {
  const { data } = await api.post('/api/coins/add', { user_id: userId, coins });
  return data;
};

export const unlockBadge = async (
  userId: string,
  badgeId: string
): Promise<{ success: boolean; new_badge: boolean }> => {
  const { data } = await api.post('/api/badges/unlock', { user_id: userId, badge_id: badgeId });
  return data;
};

// ================== Juegos ==================
export const saveLemonadeGame = async (gameState: any): Promise<{ success: boolean; score: number }> => {
  const { data } = await api.post('/api/game/lemonade', gameState);
  return data;
};

export const getLemonadeGame = async (userId: string): Promise<any | null> => {
  try {
    const { data } = await api.get(`/api/game/lemonade/${userId}`);
    return data ?? null;
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    console.error('Error fetching lemonade game state:', error);
    throw error;
  }
};

// ================== Tienda ==================
export const getShopItems = async (): Promise<ShopItem[]> => {
  const { data } = await api.get('/api/shop/items');
  return data;
};

export const purchaseItem = async (
  userId: string,
  itemId: string,
  price: number
): Promise<{ success: boolean; new_coins: number }> => {
  const { data } = await api.post('/api/shop/purchase', { user_id: userId, item_id: itemId, price });
  return data;
};

export const equipItem = async (
  userId: string,
  category: string,
  itemId: string | null
): Promise<{ success: boolean; equipped_items: Record<string, string> }> => {
  const { data } = await api.post('/api/shop/equip', { user_id: userId, category, item_id: itemId });
  return data;
};

// ================== XP ==================
export const addXP = async (
  userId: string,
  xp: number
): Promise<{ success: boolean; new_xp: number; new_level: number; level_up: boolean; bonus_coins: number; total_coins: number }> => {
  const { data } = await api.post('/api/xp/add', { user_id: userId, xp });
  return data;
};

// ================== Storage ==================
export const saveUserToStorage = async (user: User): Promise<void> => {
  try {
    await AsyncStorage.setItem('user', JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save user data to storage', e);
  }
};

export const getUserFromStorage = async (): Promise<User | null> => {
  try {
    const raw = await AsyncStorage.getItem('user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch (e) {
    console.error('Failed to load user data from storage', e);
    return null;
  }
};

export const clearStorage = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('user');
  } catch (e) {
    console.error('Failed to clear user data from storage', e);
  }
};
