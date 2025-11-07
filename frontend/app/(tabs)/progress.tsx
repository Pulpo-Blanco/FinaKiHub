// app/(tabs)/progress.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Platform } from 'react-native';
import { useUserStore } from '../../store/userStore';
import { getProgress } from '../../utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/Colors';
import { Image } from 'expo-image';

const BANNER = require('../../assets/images/banner_antar.png');

const ALL_BADGES = ['first_module', 'lemonade_master', 'saver', 'financial_wizard'];

export default function Progress() {
  const user = useUserStore((state) => state.user);
  const [progress, setProgress] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadProgress = async () => {
    if (!user) return;
    try {
      const data = await getProgress(user.id);
      setProgress(data);
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  useEffect(() => { loadProgress(); }, [user?.id]);

  const onRefresh = async () => { setRefreshing(true); await loadProgress(); setRefreshing(false); };

  if (!user) return null;

  const completedCount = progress?.completed_modules?.length || 0;
  const totalModules = 4;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Banner superior */}
      <View style={styles.bannerCard}>
        <Image
          source={BANNER}
          style={styles.banner}
          contentFit="contain"
          transition={150}
          placeholder={Platform.OS === 'web' ? undefined : BANNER}
          cachePolicy="memory-disk"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Resumen de Progreso</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Módulos completados:</Text>
          <Text style={styles.statValue}>{completedCount}/{totalModules}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Puntuación total:</Text>
          <Text style={styles.statValue}>{progress?.total_score || 0}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Insignias desbloqueadas:</Text>
          <Text style={styles.statValue}>{user.badges.length}/{ALL_BADGES.length}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏆 Insignias</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg }}>
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            {ALL_BADGES.map((badgeId) => (
              <View key={badgeId} style={styles.badge}>
                <Text style={{ fontSize: 26 }}>🏅</Text>
                <Text style={{ marginTop: 6, color: user.badges.includes(badgeId) ? Colors.text : Colors.textLight }}>
                  {user.badges.includes(badgeId) ? 'Desbloqueada' : 'Bloqueada'}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Historial de Módulos</Text>
        {progress?.completed_modules && progress.completed_modules.length > 0 ? (
          progress.completed_modules.map((moduleId: string) => (
            <View key={moduleId} style={styles.historyItem}>
              <Text style={styles.historyModule}>{moduleId}</Text>
              <Text style={styles.historyScore}>Puntos: {progress.module_scores?.[moduleId] || 0}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Aún no has completado ningún módulo. ¡Comienza tu aventura!</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },

  bannerCard: { backgroundColor: '#e8f3f8', borderRadius: BorderRadius.lg, overflow: 'hidden', borderTopWidth: 1, borderTopColor: '#d9e6ee', marginBottom: Spacing.md },
  banner: { width: '100%', aspectRatio: 16/5, maxHeight: 180, alignSelf: 'center' },

  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },

  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  statLabel: { fontSize: FontSize.md, color: Colors.textLight },
  statValue: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },

  badge: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 12, minWidth: 120, alignItems: 'center' },

  historyItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  historyModule: { fontSize: FontSize.md, color: Colors.text },
  historyScore: { fontSize: FontSize.sm, color: Colors.textLight },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, textAlign: 'center', paddingVertical: Spacing.lg },
});
