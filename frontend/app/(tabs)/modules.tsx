// app/(tabs)/modules.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, ActivityIndicator, Platform, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { useUserStore } from '../../store/userStore';
import { getModulesByLevel, getProgress, Module, Progress } from '../../utils/api';
import { Colors, Spacing } from '../../constants/Colors';
import { useLevel, AppLevel } from '../../utils/levelState';

const BANNERS = {
  inicial: require('../../assets/images/banner_selva.png'),
  primaria: require('../../assets/images/banner_desierto.png'),
  secundaria: require('../../assets/images/banner_antar.png'),
};

const CARD_GRADIENTS: [string, string][] = [
  ['#4cc9f0', '#4361ee'], // celeste → azul
  ['#22c55e', '#16a34a'], // verde
  ['#a855f7', '#7c3aed'], // púrpura
];

const EMOJI_BY_ID: Record<string, string> = {
  lemonade_stand: '🍋',
  savings_challenge: '💰',
  simple_interest: '📈',
  compound_interest: '📈',
  debt_game: '💳',
  budgeting: '📒',
  stock_market: '📊',
  credit_cards: '💳',
  coin_recognition: '🪙',
  counting_money: '🔢',
  needs_wants: '🧠',
  piggy_bank: '🐷',
};

type ModuleDisplay = Module & { xp?: number; reward_xp?: number; points?: number; coins?: number; reward_coins?: number; description?: string; };
const getModuleXP = (m: ModuleDisplay) => m.xp ?? m.reward_xp ?? m.points ?? m.coins ?? m.reward_coins ?? 0;
const getEmoji = (mod: Module) => EMOJI_BY_ID[(mod as any).id] || EMOJI_BY_ID[(mod as any).key] || '🎯';
const getDesc  = (m: ModuleDisplay) => (m.description && m.description.trim().length > 0) ? m.description : 'Mini-juego para aprender jugando.';

export default function Modules() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const userId = user?.id;

  const { level } = useLevel();

  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const [mods, prog] = await Promise.all([ getModulesByLevel(level), getProgress(userId) ]);
      setModules(mods);
      setProgress(prog);
    } catch (error) {
      console.error('Error loading modules:', error);
      Alert.alert('Error', 'No se pudieron cargar los módulos.');
    } finally {
      setLoading(false);
    }
  }, [userId, level]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadData(); setRefreshing(false); }, [loadData]);

  const isCompleted = (id: string) => progress?.completed_modules?.includes(id) ?? false;

  const { percentCompleted, completedCount } = useMemo(() => {
    const total = modules.length || 1;
    const done = progress?.completed_modules?.length ?? 0;
    return { completedCount: done, percentCompleted: Math.min(100, Math.round((done * 100) / total)) };
  }, [modules.length, progress?.completed_modules]);

  const progressColor = percentCompleted === 0 ? '#9ca3af' : '#16a34a';

  const routeMap: { [key: string]: string } = {
    lemonade_stand: 'lemonade',
    savings_challenge: 'savings',
    simple_interest: 'interest',
    debt_game: 'debt',
    compound_interest: 'interest',
    budgeting: 'savings',
    credit_cards: 'debt',
    stock_market: 'interest',
    coin_recognition: 'inicial/coins',
    needs_wants: 'inicial/needs-wants',
    piggy_bank: 'inicial/piggy-bank',
    counting_money: 'inicial/counting',
  };

  const goToModule = (moduleId: string) => {
    const route = routeMap[moduleId];
    if (route) router.push(`/game/${route}` as any);
    else Alert.alert('Pronto', 'Este módulo aún no está disponible.');
  };

  const renderItem = ({ item, index }: { item: Module; index: number }) => {
    const grad = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
    const completed = isCompleted((item as any).id);
    const disabled = !routeMap[(item as any).id];
    const xp = getModuleXP(item as any);
    const emoji = getEmoji(item);
    const desc = getDesc(item as any);

    return (
      <View style={styles.cardCol}>
        <Pressable disabled={disabled} onPress={() => goToModule((item as any).id)} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.moduleBlock, (completed || disabled) && styles.disabledBlock]}>
            <View style={styles.blockHeader}>
              <Text style={styles.blockEmoji}>{emoji}</Text>
              {completed && (
                <View style={styles.donePill}>
                  <Ionicons name="checkmark" size={14} color="#065f46" />
                  <Text style={styles.donePillText}>Completado</Text>
                </View>
              )}
              {disabled && !completed && (
                <View style={[styles.donePill, { backgroundColor: '#e5e7eb', borderColor: '#cbd5e1' }]}>
                  <Ionicons name="lock-closed" size={14} color="#374151" />
                  <Text style={[styles.donePillText, { color: '#374151' }]}>Pronto</Text>
                </View>
              )}
            </View>

            <Text style={styles.blockTitle} numberOfLines={1}>{(item as any).title || 'Módulo'}</Text>
            <Text style={styles.blockDesc} numberOfLines={2}>{desc}</Text>

            <View style={styles.blockFooter}>
              {xp > 0 && <Text style={styles.blockXP}>💎 {xp}</Text>}
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Banner del nivel */}
      <View style={styles.bannerCard}>
        <Image
          source={BANNERS[level]}
          style={styles.banner}
          contentFit="contain"
          transition={150}
          placeholder={Platform.OS === 'web' ? undefined : BANNERS[level]}
          cachePolicy="memory-disk"
        />
      </View>

      {/* CONTENIDO */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Progreso global */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Tu progreso en este nivel</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${percentCompleted}%`, backgroundColor: progressColor }]} />
          </View>
          <Text style={styles.progressHelp}>
            {completedCount}/{modules.length} completados — {percentCompleted}%
          </Text>
        </View>

        {/* Grid */}
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} />
        ) : (
          <FlatList
            data={modules}
            keyExtractor={(m: any) => m.id}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={styles.row}
            scrollEnabled={false}
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const CARD_RADIUS = 16;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },

  bannerCard: { backgroundColor: '#e8f3f8', margin: Spacing.lg, borderRadius: 12, overflow: 'hidden', borderTopWidth: 1, borderTopColor: '#d9e6ee' },
  banner: { width: '100%', aspectRatio: 16/5, maxHeight: 180, alignSelf: 'center' },

  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },

  progressCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  progressTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  progressBarBg: { height: 10, backgroundColor: '#e5e7eb', borderRadius: 999, marginVertical: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%' },
  progressHelp: { color: Colors.textLight, fontSize: 12 },

  row: { gap: 12, marginBottom: 12 },
  cardCol: { flex: 1 },

  moduleBlock: {
    borderRadius: CARD_RADIUS, padding: 16, minHeight: 120, justifyContent: 'space-between',
    shadowColor: 'rgba(18, 24, 40, 0.12)', shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  disabledBlock: { opacity: 0.85, filter: Platform.OS === 'web' ? ('grayscale(0.1)' as any) : undefined },
  blockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  blockEmoji: { fontSize: 26, color: '#fff' },
  blockTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  blockDesc: { fontSize: 13, color: 'rgba(255,255,255,0.95)', marginTop: 2 },
  blockFooter: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  blockXP: { color: '#fff', fontWeight: '800' },

  donePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#d1fae5', borderColor: '#34d399', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  donePillText: { color: '#065f46', fontWeight: '800', fontSize: 12 },
});
