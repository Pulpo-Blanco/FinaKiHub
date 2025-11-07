// app/(auth)/login.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFonts, BubblegumSans_400Regular } from '@expo-google-fonts/bubblegum-sans';

import Button from '../../components/Button';
import { loginUser, saveUserToStorage } from '../../utils/api';
import { useUserStore } from '../../store/userStore';
import { Colors } from '../../constants/Colors';

// Relación del banner panorámico (antes con video)
const VIDEO_RATIO = 1920 / 600;

// Imágenes estáticas del banner (fuera del componente)
const IMAGES = [
  require('../../assets/images/pregunta1.png'),
  require('../../assets/images/respuesta1.png'),
];

function FeatureCard({
  emoji,
  title,
  desc,
  from = '#ff6aa1',
  to = '#8e2de2',
}: {
  emoji: string;
  title: string;
  desc: string;
  from?: string;
  to?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const handleIn = () =>
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 18, bounciness: 7 }).start();
  const handleOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 7 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }], flexGrow: 1, minWidth: 260, flexBasis: '31%' }}>
      <Pressable onPressIn={handleIn} onPressOut={handleOut}>
        <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.featureGradient}>
          <Text style={styles.featureEmoji}>{emoji}</Text>
          <Text style={styles.featureTitle}>{title}</Text>
          <Text style={styles.featureDesc}>{desc}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export default function Login() {
  // --- estado básico ---
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  // --- navegación y store ---
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);

  // --- fuentes (hook siempre arriba; no retornar aún) ---
  const [fontsLoaded] = useFonts({ BubblegumSans_400Regular });

  // --- dimensiones responsivas (nunca dentro de condicionales) ---
  const { width } = useWindowDimensions();
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const bannerWidthPct = isDesktop ? 0.86 : isTablet ? 0.92 : 1;

  // --- animaciones base ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // --- animación "bob" del banner ---
  const bob = useRef(new Animated.Value(0)).current;
  const bobTranslate = bob.interpolate({ inputRange: [0, 1], outputRange: [-4, 4] });
  const bobScale = bob.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] });

  // --- carrusel de imágenes ---
  const [indice, setIndice] = useState(0);
  const bannerOpacity = useRef(new Animated.Value(1)).current;

  // --- evitar setState tras desmontar ---
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // --- entrada + bob + carrusel ---
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 3500, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 3500, useNativeDriver: true }),
      ])
    );
    loop.start();

    const interval = setInterval(() => {
      Animated.timing(bannerOpacity, { toValue: 0, duration: 450, useNativeDriver: true }).start(({ finished }) => {
        if (finished) {
          setIndice((prev) => (prev + 1) % IMAGES.length);
          Animated.timing(bannerOpacity, { toValue: 1, duration: 450, useNativeDriver: true }).start();
        }
      });
    }, 4000);

    return () => {
      loop.stop();
      clearInterval(interval);
    };
  }, [fadeAnim, slideAnim, bob, bannerOpacity]);

  // --- callbacks de navegación y login ---
  const goRegister = useCallback(() => router.push('/(auth)/register'), [router]);

  const handleLogin = useCallback(async () => {
    const name = username.trim();
    if (!name || name.length < 3) {
      Alert.alert('Error', 'Ingresa un nombre de usuario válido (mín. 3 caracteres).');
      return;
    }
    if (loading) return;

    setLoading(true);
    try {
      // Algunas APIs devuelven el user directo, otras { user }
      const res: any = await (loginUser as any)(name);
      const user = res?.user ?? res;

      await saveUserToStorage(user);
      if (mountedRef.current) setUser(user);

      // Si no hay level, primero elige nivel; si sí, directo a tabs.
      if (user?.level) {
        router.replace('/(tabs)' as any);
      } else {
        router.replace('/(auth)/level-select');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || 'Usuario no encontrado');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [username, loading, router, setUser]);

  // --- loader de fuentes (recién aquí condicionamos el return) ---
  if (!fontsLoaded) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#8e2de2" />
      </View>
    );
  }

  // --- UI ---
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <LinearGradient colors={['#ff416c', '#8e2de2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          <Text style={styles.headerText}>¡Qué bueno verte! 👋</Text>
          <Text style={styles.subHeaderText}>💡 Aprende finanzas jugando</Text>
        </LinearGradient>

        {/* Banner panorámico con imágenes rotativas */}
        <LinearGradient
          colors={['#ffe3ef', '#e9f0ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bannerTrack}
        >
          <View style={styles.sideDecorLeft}>
            <Text style={styles.sideEmoji}>💰</Text>
            <Text style={styles.sideEmoji}>⭐</Text>
          </View>

          <Animated.View
            style={[
              styles.bannerBox,
              { width: `${bannerWidthPct * 100}%`, alignSelf: 'center' },
              styles.panoramicBox,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.videoWrapper}>
              <Animated.Image
                source={IMAGES[indice]}
                style={[
                  styles.bannerVideo,
                  Platform.OS === 'web' ? ({ objectFit: 'cover', objectPosition: 'center' } as any) : null,
                  { transform: [{ translateY: bobTranslate }, { scale: bobScale }], opacity: bannerOpacity },
                ]}
                resizeMode="cover"
              />
            </View>
          </Animated.View>

          <View style={styles.sideDecorRight}>
            <Text style={styles.sideEmoji}>✨</Text>
            <Text style={styles.sideEmoji}>🪙</Text>
          </View>
        </LinearGradient>

        {/* Info + Cards */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>¿Qué es FinaKiHub?</Text>
          <Text style={styles.infoText}>
            Es una app para niños y niñas donde aprenderán hábitos saludables de dinero con juegos, historias y
            recompensas. Todo en un entorno seguro y amigable.
          </Text>

        <View style={styles.bullets}>
            <Text style={styles.bullet}>✅ Minijuegos para aprender sin aburrirse</Text>
            <Text style={styles.bullet}>✅ Progreso, niveles, monedas y logros</Text>
            <Text style={styles.bullet}>✅ Temas: ahorro, presupuesto, deudas, metas</Text>
          </View>

          <View style={styles.featuresRow}>
            <FeatureCard emoji="🎮" title="Aprendizaje divertido" desc="Retos cortos y dinámicos que convierten la educación financiera en un juego." from="#ff6aa1" to="#8e2de2" />
            <FeatureCard emoji="📈" title="Progreso visible" desc="Sube de nivel, gana monedas y desbloquea insignias por tus logros." from="#ffa751" to="#f45c43" />
            <FeatureCard emoji="🛡️" title="Entorno seguro" desc="Pensado para menores: sin datos sensibles ni compras reales." from="#00c6ff" to="#0072ff" />
          </View>
        </View>

        {/* Formulario */}
        <View style={styles.formContainer}>
          <Text style={styles.label}>Nombre de Usuario</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Ingresa tu nombre de usuario"
            placeholderTextColor={Colors.textLight}
            autoCapitalize="none"
            autoCorrect={false}
            accessible
            accessibilityLabel="Campo: nombre de usuario"
          />

          <LinearGradient colors={['#27ae60', '#219150']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientButton}>
            <Button title="🚀 Iniciar sesión" onPress={handleLogin} loading={loading} />
          </LinearGradient>

          <Button
            title="📝 ¿No tienes cuenta? Regístrate"
            onPress={goRegister}
            variant="outline"
            style={styles.secondaryButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9ff' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flexGrow: 1, paddingBottom: 30 },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerText: {
    color: Colors.white,
    fontSize: 28,
    fontFamily: 'BubblegumSans_400Regular',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    textAlign: 'left',
  },
  subHeaderText: {
    color: Colors.white,
    fontSize: 18,
    fontFamily: 'BubblegumSans_400Regular',
    textAlign: 'center',
    marginTop: 6,
  },
  bannerTrack: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerBox: { justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  panoramicBox: { aspectRatio: VIDEO_RATIO, borderRadius: 14 },
  videoWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bannerVideo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  poster: { width: '100%', height: '100%' },
  videoLoading: {
    position: 'absolute',
    inset: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  sideDecorLeft: {
    position: 'absolute',
    left: 8,
    top: 8,
    bottom: 8,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    pointerEvents: 'none',
  },
  sideDecorRight: {
    position: 'absolute',
    right: 8,
    top: 8,
    bottom: 8,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    pointerEvents: 'none',
  },
  sideEmoji: { fontSize: 28, opacity: 0.75 },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  infoTitle: { fontSize: 22, fontWeight: '900', color: Colors.text, marginBottom: 10 },
  infoText: { fontSize: 15, color: Colors.text, lineHeight: 22 },
  bullets: { marginTop: 12, gap: 8 },
  bullet: { fontSize: 15, color: Colors.text },
  featuresRow: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureGradient: {
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  featureEmoji: { fontSize: 28, marginBottom: 8, color: '#fff' },
  featureTitle: { fontWeight: '900', fontSize: 18, color: '#fff', marginBottom: 4 },
  featureDesc: { fontSize: 15, color: 'rgba(255,255,255,0.92)', lineHeight: 20 },
  formContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginHorizontal: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  label: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  input: {
    backgroundColor: '#f2f4f8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d6d9df',
  },
  gradientButton: {
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 4,
  },
  secondaryButton: { borderColor: '#27ae60', borderWidth: 1.5, borderRadius: 12 },
});
