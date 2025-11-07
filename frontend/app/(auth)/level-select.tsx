// app/(auth)/level-select.tsx
import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useUserStore } from '../../store/userStore';

export default function LevelSelect() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const updateLevel = useUserStore((s) => s.updateLevel); // si no existe, luego lo agregamos

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleSelect = useCallback((level: string) => {
    try {
      if (!mountedRef.current) return;
      updateLevel?.(level); // guarda el nivel en tu estado global si corresponde
      router.replace('/(tabs)' as any); // 🔹 ir directo a las pestañas
    } catch (err) {
      Alert.alert('Ups', 'No se pudo cambiar el nivel.');
    }
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona tu nivel</Text>
      <Text style={styles.subtitle}>Hola {user?.name ?? '👋'}, elige tu nivel educativo</Text>

      <View style={styles.levels}>
        <TouchableOpacity style={[styles.card, { backgroundColor: '#FDE68A' }]} onPress={() => handleSelect('inicial')}>
          <Text style={styles.cardTitle}>🧩 Inicial</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, { backgroundColor: '#93C5FD' }]} onPress={() => handleSelect('primaria')}>
          <Text style={styles.cardTitle}>📘 Primaria</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, { backgroundColor: '#A7F3D0' }]} onPress={() => handleSelect('secundaria')}>
          <Text style={styles.cardTitle}>📗 Secundaria</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
        <Text style={styles.link}>⬅ Volver a inicio de sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors?.primary ?? '#18A7A7',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors?.textLight ?? '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  levels: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  card: {
    width: '80%',
    borderRadius: 16,
    paddingVertical: 16,
    marginVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  link: {
    fontSize: 14,
    color: Colors?.primary ?? '#18A7A7',
    fontWeight: '600',
    marginTop: 8,
  },
});
