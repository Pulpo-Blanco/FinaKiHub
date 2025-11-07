// app/(tabs)/tips.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/Colors';
import { useUserStore } from '../../store/userStore';
import { useLevel, AppLevel } from '../../utils/levelState';

const LABEL: Record<AppLevel, string> = {
  inicial: 'Inicial',
  primaria: 'Primaria',
  secundaria: 'Secundaria',
};

// --- Base de consejos por nivel ---
const TIPS_BY_LEVEL: Record<AppLevel, string[]> = {
  inicial: [
    'Antes de comprar, pregúntate: ¿Lo necesito o solo lo quiero?',
    'Si algo se rompe, primero intenta repararlo antes de comprar otro.',
    'Ahorra una parte de cualquier regalo de dinero que recibas.',
    'Haz una lista de deseos y prioriza de a poco.',
    'Guarda tus monedas en una alcancía transparente para ver tu progreso.',
    'Comparte o intercambia cosas con amigos para ahorrar.',
    'Pide recibo y guarda tus comprobantes como “tesoros de ahorro”.',
  ],
  primaria: [
    'Piensa en metas: “Quiero ahorrar $X para Y” y registra tu avance.',
    'Anota tus gastos del día; entenderlos te ayuda a decidir mejor.',
    'Compara precios antes de comprar; a veces lo más caro no es mejor.',
    'Divide tu dinero en “ahorro, gasto y donación” con sobres.',
    'Evita compras por impulso: espera 24 horas y vuelve a decidir.',
    'Aprende a diferenciar necesidad vs. deseo en cada compra.',
    'Buscar descuentos y packs puede ayudarte a ahorrar a largo plazo.',
  ],
  secundaria: [
    'El interés compuesto hace crecer tu dinero: empieza pequeño, empieza hoy.',
    'Presupuesta el mes: ingreso – gastos fijos – ahorro – gastos variables.',
    'Evalúa costo/beneficio: ¿qué valor real te aporta esta compra?',
    'Evita deudas por deseos; usa crédito con un plan claro de pago.',
    'Invierte en aprender habilidades: retornan por años.',
    'Diversifica metas: corto, mediano y largo plazo.',
    'Registra tuscrips de gasto; los datos evitan autoengaños.',
  ],
};

// Tres ideas cortas por nivel
const QUICK_BY_LEVEL: Record<AppLevel, string[]> = {
  inicial: [
    'Define una meta pequeña para esta semana.',
    'Anota tus gastos de hoy (aunque sean chicos).',
    'Comparte un consejo con alguien más.',
  ],
  primaria: [
    'Crea tu tabla simple de ingresos y gastos.',
    'Establece una meta y ponle fecha.',
    'Compara 2 opciones antes de comprar.',
  ],
  secundaria: [
    'Haz un presupuesto de este mes.',
    'Define 3 metas (corto, mediano, largo).',
    'Revisa tus gastos de la semana y recorta 1.',
  ],
};

// Hace que el “tip del día” sea determinista por fecha
function dailyIndex(total: number, userId?: string) {
  const today = new Date();
  const seed = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${userId ?? ''}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % Math.max(total, 1);
}

export default function TipsScreen() {
  const user = useUserStore((s) => s.user);
  const { level } = useLevel(); // <- SIEMPRE reflejará el nivel actual

  // Consejo del día y 3 ideas: se recalculan cuando CAMBIA el nivel o la fecha
  const tipOfDay = useMemo(() => {
    const list = TIPS_BY_LEVEL[level];
    return list[dailyIndex(list.length, user?.id)];
  }, [level, user?.id]);

  const quickIdeas = useMemo(() => QUICK_BY_LEVEL[level], [level]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Banner */}
      <View style={styles.bannerCard}>
        <Image
          source={require('../../assets/images/banner_finaki2.png')}
          style={styles.banner}
          contentFit="contain"
          transition={150}
          cachePolicy="memory-disk"
        />
      </View>

      {/* Consejo del día */}
      <View style={styles.card}>
        <Text style={styles.title}>Consejo del día <Text style={{fontSize: 14}}>🌿</Text></Text>

        <Text style={styles.tipText}>
          {'“ '}{tipOfDay}{' ”'}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.pill}>
            <Ionicons name="sparkles-outline" size={14} color="#0f766e" />
            <Text style={styles.pillText}>Nivel: {LABEL[level]}</Text>
          </View>

          <View style={[styles.pill, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }]}>
            <Ionicons name="calendar-outline" size={14} color="#3730a3" />
            <Text style={[styles.pillText, { color: '#3730a3' }]}>
              {new Date().toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Ideas rápidas */}
      <View style={styles.card}>
        <Text style={styles.subtitle}>3 ideas rápidas</Text>
        {quickIdeas.map((t, i) => (
          <View key={i} style={styles.row}>
            <Ionicons name="checkmark-circle" size={18} color="#10b981" />
            <Text style={styles.rowText}>{t}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  content: { paddingHorizontal: 16, paddingTop: 12 },

  bannerCard: {
    backgroundColor: '#eaf3fb',
    borderRadius: 12,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: '#d9e6ee',
    marginBottom: 12,
  },
  banner: { width: '100%', aspectRatio: 16 / 5, maxHeight: 180, alignSelf: 'center' },

  card: {
    backgroundColor: '#fff',
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  title: { fontSize: 18, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: 10 },
  tipText: { fontSize: 15, color: Colors.text, textAlign: 'center', lineHeight: 22 },

  metaRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 12 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, backgroundColor: '#ecfeff', borderWidth: 1, borderColor: '#99f6e4',
  },
  pillText: { fontWeight: '700', color: '#0f766e' },

  subtitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  rowText: { color: Colors.text },
});
