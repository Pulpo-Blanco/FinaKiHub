// app/(tabs)/index.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Modal, TouchableOpacity, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useUserStore } from '../../store/userStore';
import { useLevel, AppLevel } from '../../utils/levelState';

const BANNERS = {
  inicio: require('../../assets/images/banner_inicio2.png'),
};

function Inicio() {
  const user = useUserStore((s: any) => s.user) as any;

  // Datos del usuario con fallbacks
  const name = user?.name ?? user?.username ?? 'Usuario';
  const levelNum = Number(user?.level ?? 1);
  const xp = Number(user?.xp ?? 0);
  const xpToNext = Number(user?.xpToNext ?? 100);
  const coins = Number(user?.coins ?? 0);

  const xpPct = xpToNext > 0 ? Math.min(1, Math.max(0, xp / xpToNext)) : 0;

  // Nivel educativo global
  const { level, setLevel } = useLevel();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 600); }, []);

  const [showLevel, setShowLevel] = useState(false);

  const LABEL: Record<AppLevel, { emoji: string; text: string; color: string }> = {
    inicial:    { emoji: '🎈', text: 'Inicial',     color: '#4FC3F7' },
    primaria:   { emoji: '✏️', text: 'Primaria',    color: '#81C784' },
    secundaria: { emoji: '🎓', text: 'Secundaria',  color: '#FFB74D' },
  };
  const d = LABEL[level];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header / jugador */}
      <View style={styles.header}>
        <Text style={styles.hello}>¡Hola, {name}!</Text>
        <Text style={styles.subHello}>¡Bienvenido de vuelta! 👋</Text>

        <Text style={[styles.education, { color: '#2E7D32' }]}>
          {d.emoji} Nivel educativo actual: <Text style={{ fontWeight: '800', color: d.color }}>{d.text}</Text>
        </Text>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${xpPct * 100}%` }]} />
        </View>
        <Text style={styles.xpText}>
          {xp} / {xpToNext} XP
        </Text>

        <View style={styles.coinBox}>
          <Text style={styles.coinText}>💰 {coins}</Text>
        </View>
      </View>

      {/* Tu Progreso por nivel (mock visual estable) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📘 Tu Progreso</Text>

        {(['inicial','primaria','secundaria'] as AppLevel[]).map(nv => (
          <View key={nv} style={{ marginTop: 10 }}>
            <Text style={styles.progressLabel}>
              <Text style={{ color: LABEL[nv].color }}>● </Text>
              {LABEL[nv].text}
            </Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, {
                width: nv==='inicial' ? '100%' : nv==='primaria' ? '30%' : '0%',
                backgroundColor: LABEL[nv].color,
              }]} />
            </View>
            <Text style={styles.progressCount}>
              {nv==='inicial' ? '4 / 4' : nv==='primaria' ? '1 / 6' : '0 / 6'} módulos
            </Text>
          </View>
        ))}
      </View>

      {/* Estadísticas */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Estadísticas Generales</Text>
        <View style={styles.statsRow}>
          <Stat icon="🏅" value={Number(user?.badges ?? 0)} label="Insignias" />
          <Stat icon="💰" value={coins} label="Monedas" />
          <Stat icon="⭐" value={Number(user?.points ?? 0)} label="Puntos" />
          {/* Opcional 4ta métrica:
          <Stat icon="⏱️" value={Number(user?.playtime ?? 0)} label="Minutos" />
          */}
        </View>
      </View>

      {/* Botón elegir nivel */}
      <View style={[styles.card, styles.configCard]}>
        <Pressable onPress={() => setShowLevel(true)} style={styles.configBtn}>
          <Text style={styles.configText}>🎓 Elegir nivel</Text>
        </Pressable>
      </View>

      {/* Banner inferior — SIEMPRE COMPLETO (contain) */}
      <View style={styles.card}>
        <View style={styles.bannerWrap}>
          <Image
            source={BANNERS.inicio}
            style={styles.footerBanner}
            contentFit="contain"
            transition={200}
            placeholder={Platform.OS === 'web' ? undefined : BANNERS.inicio}
            cachePolicy="memory-disk"
          />
        </View>
      </View>

      {/* Modal local (abre el mismo estado global) */}
      <Modal transparent visible={showLevel} animationType="fade" onRequestClose={() => setShowLevel(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Selecciona el nivel educativo</Text>
            {(['inicial','primaria','secundaria'] as AppLevel[]).map(v => (
              <TouchableOpacity key={v} onPress={() => { setLevel(v); setShowLevel(false); }}
                style={[styles.diffOption, {
                  backgroundColor: v==='inicial' ? '#e3f2fd' : v==='primaria' ? '#e8f5e9' : '#fff3e0',
                }]}>
                <Text style={styles.diffOptionText}>{LABEL[v].emoji} {LABEL[v].text}</Text>
              </TouchableOpacity>
            ))}
            <Pressable onPress={() => setShowLevel(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const Stat = ({ icon, value, label }: any) => (
  <View style={styles.statItem}>
    <Text style={styles.statEmoji}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0F7FA', paddingHorizontal: 16 },

  header: { backgroundColor: '#C8E6C9', borderRadius: 12, padding: 16, marginTop: 16, elevation: 2 },
  hello: { fontSize: 22, fontWeight: 'bold', color: '#1E88E5', fontFamily: 'BubblegumSans_400Regular' },
  subHello: { fontSize: 13, color: '#607D8B', marginTop: 2 },
  education: { fontSize: 15, marginTop: 6, fontWeight: '500' },
  progressContainer: { width: '100%', height: 10, backgroundColor: '#A5D6A7', borderRadius: 8, marginTop: 10, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#00C851', borderRadius: 8 },
  xpText: { fontSize: 14, color: '#607D8B', marginTop: 6 },

  coinBox: { position: 'absolute', top: 16, right: 16, backgroundColor: '#e8f5e9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  coinText: { fontWeight: 'bold', color: '#2E7D32' },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 16, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#212121', marginBottom: 8 },

  progressLabel: { fontSize: 15, fontWeight: '600', color: '#212121' },
  progressBarBg: { width: '100%', height: 8, borderRadius: 6, backgroundColor: '#E0E0E0', marginTop: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 6 },
  progressCount: { fontSize: 13, color: '#607D8B', marginTop: 2 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  statItem: { alignItems: 'center' },
  statEmoji: { fontSize: 28 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#1565C0' },
  statLabel: { fontSize: 14, color: '#607D8B' },

  configCard: { borderColor: '#29B6F6', borderWidth: 1 },
  configBtn: { alignItems: 'center' },
  configText: { textAlign: 'center', color: '#1565C0', fontSize: 16, fontWeight: 'bold' },

  bannerWrap: { width: '100%', backgroundColor: '#e8f3f8', borderRadius: 10, overflow: 'hidden', borderTopWidth: 1, borderTopColor: '#d9e6ee' },
  footerBanner: { width: '100%', aspectRatio: 16 / 5, maxHeight: 210, alignSelf: 'center' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', paddingHorizontal: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 4 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#212121', marginBottom: 12, textAlign: 'center' },
  diffOption: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  diffOptionText: { fontSize: 16, color: '#212121', fontWeight: '600' },
  cancelBtn: { marginTop: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#eeeeee', alignItems: 'center' },
  cancelText: { color: '#333', fontWeight: '600' },
});

export default Inicio;
