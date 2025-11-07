// app/(tabs)/_layout.tsx
import * as React from 'react';
import { View, Platform, Pressable, Modal, Text, TouchableOpacity } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors as Theme } from '../../constants/Colors';
import CoinDisplay from '../../components/CoinDisplay';
import { useUserStore } from '../../store/userStore';
import { useLevel, AppLevel } from '../../utils/levelState';

const PRIMARY    = (Theme as any)?.primary    ?? '#18A7A7';
const WHITE      = (Theme as any)?.white      ?? '#FFFFFF';
const BORDER     = (Theme as any)?.border     ?? '#E5E7EB';
const TEXT_LIGHT = (Theme as any)?.textLight  ?? '#8CA3AF';
const TAB_HEIGHT = 60;

function iconFor(routeName: string, focused: boolean): keyof typeof Ionicons.glyphMap {
  switch (routeName) {
    case 'index':    return focused ? 'home' : 'home-outline';
    case 'modules':  return focused ? 'book' : 'book-outline';
    case 'tips':     return focused ? 'bulb' : 'bulb-outline';
    case 'progress': return focused ? 'stats-chart' : 'stats-chart-outline';
    default:         return focused ? 'ellipse' : 'ellipse-outline';
  }
}

const LABEL: Record<AppLevel, { emoji: string; text: string }> = {
  inicial:    { emoji: '🎈', text: 'Inicial' },
  primaria:   { emoji: '✏️', text: 'Primaria' },
  secundaria: { emoji: '🎓', text: 'Secundaria' },
};

export default function TabLayout() {
  const router = useRouter(); // 👈 nuevo
  const insets = useSafeAreaInsets();
  const coins = useUserStore((s) => s.user?.coins ?? 0);
  const setUser = useUserStore((s) => s.setUser);
  const storeLogout = useUserStore((s) => (s as any).logout);

  const { level, setLevel } = useLevel();
  const lvl = LABEL[level];

  const [showLevel, setShowLevel] = React.useState(false);

  const doLogout = React.useCallback(async () => {
    try {
      const AS = require('@react-native-async-storage/async-storage') as typeof import('@react-native-async-storage/async-storage');
      await AS.default.removeItem('token').catch(() => {});
      await AS.default.removeItem('session').catch(() => {});
      await AS.default.removeItem('user').catch(() => {}); // 👈 importante si guardas el usuario aquí
    } catch {}

    try {
      if (typeof storeLogout === 'function') storeLogout();
      else if (typeof setUser === 'function') setUser(null as any);
    } catch {}

    // 👇 redirige de vuelta al login
    router.replace('/(auth)/login');
  }, [setUser, storeLogout, router]);

  // HeaderRight parametrizable: el selector de nivel solo se muestra si enableLevel=true
  const HeaderRight = ({ enableLevel }: { enableLevel: boolean }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 8 }}>
      {enableLevel && (
        <Pressable
          onPress={() => setShowLevel(true)}
          accessibilityLabel="Elegir nivel educativo"
          style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="school-outline" size={18} color={WHITE} />
            <Text style={{ color: WHITE, fontWeight: '700' }}>{lvl.text}</Text>
          </View>
        </Pressable>
      )}

      <CoinDisplay coins={coins} size="small" />

      <Pressable onPress={doLogout} accessibilityLabel="Cerrar sesión" style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
        <Ionicons name="log-out-outline" size={22} color={WHITE} />
      </Pressable>
    </View>
  );

  return (
    <>
      <Tabs
        backBehavior="initialRoute"
        screenOptions={({ route }) => ({
          tabBarActiveTintColor: PRIMARY,
          tabBarInactiveTintColor: TEXT_LIGHT,
          tabBarStyle: {
            backgroundColor: WHITE,
            borderTopWidth: 1,
            borderTopColor: BORDER,
            height: TAB_HEIGHT + (Platform.OS === 'ios' ? Math.max(0, insets.bottom) : 0),
            paddingBottom: Platform.select({ ios: Math.max(8, insets.bottom), android: 8 }),
            paddingTop: 8,
          },
          tabBarHideOnKeyboard: true,
          headerStyle: { backgroundColor: PRIMARY },
          headerTintColor: WHITE,
          headerTitleStyle: { fontWeight: '700', color: WHITE },
          // 👇 Solo mostramos el botón de nivel en la pestaña "index" (Inicio)
          headerRight: () => <HeaderRight enableLevel={route.name === 'index'} />,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={iconFor(route.name, focused)} size={size} color={color} />
          ),
        })}
      >
        <Tabs.Screen name="index"    options={{ title: 'Inicio' }} />
        <Tabs.Screen name="modules"  options={{ title: 'Módulos' }} />
        <Tabs.Screen name="tips"     options={{ title: 'Consejos' }} />
        <Tabs.Screen name="progress" options={{ title: 'Progreso' }} />
      </Tabs>

      {/* Modal global de nivel (accesible solo desde Inicio) */}
      <Modal transparent visible={showLevel} animationType="fade" onRequestClose={() => setShowLevel(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#212121', textAlign: 'center', marginBottom: 8 }}>
              Selecciona el nivel educativo
            </Text>
            {(['inicial','primaria','secundaria'] as AppLevel[]).map(v => (
              <TouchableOpacity
                key={v}
                onPress={() => { setLevel(v); setShowLevel(false); }}
                style={{
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  marginBottom: 10,
                  backgroundColor:
                    v === 'inicial' ? '#e3f2fd'
                    : v === 'primaria' ? '#e8f5e9'
                    : '#fff3e0',
                }}
              >
                <Text style={{ fontSize: 16, color: '#212121', fontWeight: '600' }}>
                  {LABEL[v].emoji} {LABEL[v].text}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowLevel(false)}
              style={{ marginTop: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#eeeeee', alignItems: 'center' }}
            >
              <Text style={{ color: '#333', fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
