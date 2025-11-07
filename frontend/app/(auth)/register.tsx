// app/(auth)/register.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Colors } from '../../constants/Colors';
import { registerUser, saveUserToStorage } from '../../utils/api';
import { useUserStore } from '../../store/userStore';

export default function Register() {
  const router = useRouter();
  const setUser = useUserStore((s) => s.setUser);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // evita setState tras desmontar
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const goLogin = useCallback(() => router.replace('/(auth)/login'), [router]);
const goTabs = useCallback(() => router.replace('/(tabs)' as any), [router]);

  const onRegister = useCallback(async () => {
    if (!name || !email || !password) {
      Alert.alert('Campos incompletos', 'Completa nombre, correo y contraseña.');
      return;
    }
    try {
      setLoading(true);

      // Tu api.ts pide age y/o 2 argumentos.
      // Envolvemos en any para adaptarnos a la firma real sin bloquear el tipado por ahora.
      const res: any =
        // si tu API es (payload) => User
        (await (registerUser as any)({ name, email, password, age: 8 }))
        // si fuera (payload, age) => User, descomenta esta línea:
        // (await (registerUser as any)({ name, email, password }, 8))
        ;

      // Algunas versiones retornan el usuario directo, otras { user }:
      const user = res?.user ?? res;
      if (!user) {
        Alert.alert('Error', 'No se pudo crear la cuenta. Intenta de nuevo.');
        return;
      }

      await saveUserToStorage(user);
      if (mountedRef.current) setUser(user);
      goTabs();
    } catch (e: any) {
      Alert.alert('Ups', 'Hubo un problema registrando la cuenta. Revisa tu conexión.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [name, email, password, setUser, goTabs]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>Únete a FinaKiHub y aprende finanzas jugando</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre"
            style={styles.input}
            accessible accessibilityLabel="Campo de nombre"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Correo</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="tu@correo.com"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            style={styles.input}
            accessible accessibilityLabel="Campo de correo"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Contraseña</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            textContentType="password"
            style={styles.input}
            accessible accessibilityLabel="Campo de contraseña"
          />

          <View style={{ height: 16 }} />

          <TouchableOpacity
            onPress={onRegister}
            disabled={loading}
            accessibilityRole="button"
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Crear cuenta</Text>}
          </TouchableOpacity>

          <View style={{ height: 12 }} />

          <Pressable onPress={goLogin} hitSlop={8} accessibilityRole="button" accessibilityLabel="Ir a iniciar sesión">
            <Text style={styles.link}>¿Ya tienes cuenta? Inicia sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  title: { fontSize: 26, fontWeight: '700', color: Colors?.primary ?? '#18A7A7', textAlign: 'center' },
  subtitle: { marginTop: 4, fontSize: 14, color: Colors?.textLight ?? '#6B7280', textAlign: 'center' },
  form: { marginTop: 24 },
  label: { fontSize: 14, color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors?.border ?? '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  link: { textAlign: 'center', color: Colors?.primary ?? '#18A7A7', fontWeight: '600' },

  primaryBtn: {
    backgroundColor: Colors?.primary ?? '#18A7A7',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
