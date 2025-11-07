// src/navigation/routes.ts
export const ROUTES = {
  AUTH_LOGIN: '/(auth)/login',
  AUTH_REGISTER: '/(auth)/register',
  LEVEL_SELECT: '/(auth)/level-select',
  TABS_ROOT: '/(tabs)',
  INDEX: '/(tabs)/index',
  MODULES: '/(tabs)/modules',
  SHOP: '/(tabs)/shop',
  PROGRESS: '/(tabs)/progress',
  TIPS: '/(tabs)/tips',
} as const;

export type RouteKey = keyof typeof ROUTES;
