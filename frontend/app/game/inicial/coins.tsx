// app/game/inicial/coins.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { useUserStore } from '../../../store/userStore';
import {
  addCoins,
  addXP,
  updateProgress,
  unlockBadge,
  getProgress,
  User,
  Progress,
} from '../../../utils/api';
import Button from '../../../components/Button';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../constants/Colors';

// ---------- Tipos y datos ----------
interface CoinInfo {
  id: string;
  value: number;
  image: ImageSourcePropType;
  name: string;
}

const COINS: CoinInfo[] = [
  { id: '1', value: 1, image: require('../../../assets/images/moneda_1.png'), name: '1 Moneda' },
  { id: '5', value: 5, image: require('../../../assets/images/moneda_5.png'), name: '5 Monedas' },
  { id: '10', value: 10, image: require('../../../assets/images/moneda_10.png'), name: '10 Monedas' },
  { id: '20', value: 20, image: require('../../../assets/images/moneda_20.png'), name: '20 Monedas' },
];

const bigIconSource: ImageSourcePropType = require('../../../assets/images/moneda_icono_grande.png');
const TOTAL_ROUNDS = 5;
const NBSP = '\u00A0';

const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---------- Botón con animación ----------
function CoinButton({
  coin,
  onPress,
  disabled,
}: {
  coin: CoinInfo;
  onPress: (c: CoinInfo) => void;
  disabled: boolean;
}) {
  const press = useRef(new Animated.Value(0)).current;
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] });

  const handlePressIn = () => {
    if (disabled) return;
    Animated.timing(press, {
      toValue: 1,
      duration: 80,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();
  };
  const handlePressOut = () => {
    Animated.timing(press, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();
  };

  return (
    <Animated.View style={[styles.option, { transform: [{ scale }], opacity: disabled ? 0.5 : 1 }]}>
      <TouchableOpacity
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPress(coin)}
        activeOpacity={0.85}
        style={styles.optionTouch}
      >
        <Image source={coin.image} style={styles.optionImage} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function CoinRecognition() {
  const router = useRouter();
  const user = useUserStore((s) => s.user as User | null);
  const updateCoins = useUserStore((s) => s.updateCoins);
  const updateXP = useUserStore((s) => s.updateXP);
  const addBadge = useUserStore((s) => s.addBadge);

  // Montaje / desmontaje seguro
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      feedbackOpacity.stopAnimation();
      feedbackScale.stopAnimation();
      if (nextTimerRef.current) {
        clearTimeout(nextTimerRef.current);
        nextTimerRef.current = null;
      }
    };
  }, []);

  const [phase, setPhase] = useState<'intro' | 'playing' | 'summary'>('intro');

  // 👇 Estado visible (re-render) y ref sincronizada (anti-stale en timeouts)
  const [roundNumber, setRoundNumber] = useState(1); // 1..TOTAL_ROUNDS
  const roundRef = useRef(1);
  useEffect(() => {
    roundRef.current = roundNumber;
  }, [roundNumber]);

  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [targetCoin, setTargetCoin] = useState<CoinInfo>(COINS[0]);
  const [roundOptions, setRoundOptions] = useState<CoinInfo[]>(shuffle(COINS));
  const [loading, setLoading] = useState(false);
  const [inputLocked, setInputLocked] = useState(false);

  // ---------- Sonidos ----------
  const soundAcierto = useRef<Audio.Sound | null>(null);
  const soundError = useRef<Audio.Sound | null>(null);
  const soundFinal = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const [ok, err, fin] = await Promise.all([
          Audio.Sound.createAsync(require('../../../assets/sounds/acierto.wav')),
          Audio.Sound.createAsync(require('../../../assets/sounds/error.wav')),
          Audio.Sound.createAsync(require('../../../assets/sounds/fin_retro.wav')),
        ]);
        if (!isMounted) return;
        soundAcierto.current = ok.sound;
        soundError.current = err.sound;
        soundFinal.current = fin.sound;
      } catch (e) {
        console.warn('Error al cargar sonidos:', e);
      }
    })();
    return () => {
      isMounted = false;
      soundAcierto.current?.unloadAsync();
      soundError.current?.unloadAsync();
      soundFinal.current?.unloadAsync();
    };
  }, []);

  const playAcierto = async () => { try { await soundAcierto.current?.replayAsync(); } catch {} };
  const playError   = async () => { try { await soundError.current?.replayAsync(); } catch {} };
  const playFinal   = async () => { try { await soundFinal.current?.replayAsync(); } catch {} };

  // ---------- Feedback siempre montado ----------
  const [feedbackText, setFeedbackText] = useState(NBSP);
  const [feedbackColor, setFeedbackColor] = useState<string>(Colors.textLight);
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const feedbackScale = useRef(new Animated.Value(0.98)).current;

  const showFeedback = (isCorrect: boolean) => {
    setFeedbackText(isCorrect ? '✅ ¡Correcto!' : '❌ Incorrecto');
    setFeedbackColor(isCorrect ? Colors.success : Colors.error);
    feedbackOpacity.stopAnimation();
    feedbackScale.stopAnimation();
    feedbackOpacity.setValue(0);
    feedbackScale.setValue(0.98);
    Animated.parallel([
      Animated.timing(feedbackOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.spring(feedbackScale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
    ]).start();
  };

  const hideFeedback = () => {
    Animated.timing(feedbackOpacity, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      if (mountedRef.current) setFeedbackText(NBSP);
    });
  };

  useEffect(() => {
    if (phase !== 'playing') hideFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ---------- Juego ----------
  const generateNewRoundCoin = (previousCoinId: string) => {
    let randomCoin = COINS[Math.floor(Math.random() * COINS.length)];
    while (randomCoin.id === previousCoinId && COINS.length > 1) {
      randomCoin = COINS[Math.floor(Math.random() * COINS.length)];
    }
    if (!mountedRef.current) return;
    setTargetCoin(randomCoin);
    setRoundOptions(shuffle(COINS));
  };

  const startGame = () => {
    setRoundNumber(1);
    roundRef.current = 1; // sync ref
    setCorrectAnswers(0);
    setFeedbackText(NBSP);
    setFeedbackColor(Colors.textLight);
    setInputLocked(false);
    setRoundOptions(shuffle(COINS));
    generateNewRoundCoin('initial_dummy_id');
    setPhase('playing');
  };

  // Timers portables (Web/Node)
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleNext = (fn: () => void, ms: number) => {
    if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    nextTimerRef.current = setTimeout(() => {
      nextTimerRef.current = null;
      if (mountedRef.current) fn();
    }, ms);
  };

  // Avance de ronda: lógica usa roundRef; UI re-renderiza con roundNumber
  const advanceToNextAction = () => {
    if (!mountedRef.current) return;
    hideFeedback();

    const next = roundRef.current + 1;

    if (next > TOTAL_ROUNDS) {
      playFinal();
      setInputLocked(false);
      setPhase('summary');
      return;
    }

    setRoundNumber(next);
    roundRef.current = next; // sincroniza inmediatamente
    generateNewRoundCoin(targetCoin.id);
    setInputLocked(false);
  };

  const handleCoinSelect = (selectedCoin: CoinInfo) => {
    if (loading || phase !== 'playing' || inputLocked) return;
    setInputLocked(true);

    const isCorrect = selectedCoin.value === targetCoin.value;
    if (isCorrect) {
      setCorrectAnswers((p) => p + 1);
      playAcierto();
    } else {
      playError();
    }
    showFeedback(isCorrect);
    scheduleNext(advanceToNextAction, 700);
  };

  const handleComplete = async () => {
    if (!user) { Alert.alert('Error', 'Usuario no encontrado.'); return; }
    setLoading(true);
    try {
      const coinsEarned = 20;
      const scorePercentage = Math.round((correctAnswers / TOTAL_ROUNDS) * 100);

      await addCoins(user.id, coinsEarned);
      updateCoins(user.coins + coinsEarned);

      const xpEarned = 50;
      const xpRes = await addXP(user.id, xpEarned);
      updateXP(xpRes.new_xp, xpRes.new_level);

      const currentProgress = await getProgress(user.id);
      const moduleKey = 'coin_recognition';
      let progressNeedsUpdate = false;
      const newCompleted = [...(currentProgress?.completed_modules || [])];
      const newScores = { ...(currentProgress?.module_scores || {}) } as Record<string, number>;
      let newTotal = currentProgress?.total_score || 0;
      const existing = Number(newScores[moduleKey] || 0);

      if (!newCompleted.includes(moduleKey)) {
        progressNeedsUpdate = true;
        newCompleted.push(moduleKey);
        newScores[moduleKey] = scorePercentage;
        newTotal += scorePercentage;
        if (newCompleted.length === 1 && !user.badges.includes('first_module')) {
          try { await unlockBadge(user.id, 'first_module'); addBadge('first_module'); } catch {}
        }
      } else if (scorePercentage > existing) {
        progressNeedsUpdate = true;
        newScores[moduleKey] = scorePercentage;
        newTotal = newTotal - existing + scorePercentage;
      }

      if (progressNeedsUpdate) {
        const payload: Progress = {
          user_id: user.id,
          completed_modules: newCompleted,
          module_scores: newScores,
          total_score: newTotal,
        };
        await updateProgress(payload);
      }

      if (Platform.OS === 'web') {
        window.alert(`¡Completaste el juego!\n\n💰 Monedas: ${coinsEarned}\n⭐ XP: ${xpEarned}`);
        router.back();
      } else {
        Alert.alert(
          '¡Felicidades! 🎉',
          `¡Completaste el juego!\n\n💰 Ganaste: ${coinsEarned} monedas\n⭐ XP: ${xpEarned}`,
          [{ text: 'Volver', onPress: () => router.back() }],
        );
      }
    } catch (e: any) {
      console.error('Error al completar:', e?.message || e);
      Alert.alert('Error', 'No se pudo guardar tu progreso.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ---------- Render ----------
  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text>Cargando usuario...</Text>
      </View>
    );
  }

  const isIntro = phase === 'intro';
  const isPlaying = phase === 'playing';
  const isSummary = phase === 'summary';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Intro */}
      {isIntro && (
        <View style={styles.block}>
          <Image source={bigIconSource} style={styles.bigIconImage} />
          <Text style={styles.title}>¡Reconoce las Monedas!</Text>
          <Text style={styles.subtitle}>Aprende a identificar diferentes monedas</Text>

          <View style={styles.coinsPreview}>
            {COINS.map((coin) => (
              <View key={`preview-${coin.id}`} style={styles.coinPreview}>
                <Image source={coin.image} style={styles.coinImagePreview} />
                <Text style={styles.coinName}>{coin.name}</Text>
              </View>
            ))}
          </View>

          <Button title="¡Comenzar!" onPress={startGame} size="large" />
        </View>
      )}

      {/* Playing */}
      {isPlaying && (
        <View style={styles.block}>
          {/* 👇 UI usa el estado roundNumber (re-render asegurado) */}
          <Text style={styles.roundText}>Ronda {roundNumber} de {TOTAL_ROUNDS}</Text>
          <Text style={styles.question}>Encuentra la moneda de:</Text>
          <Text style={styles.targetValue}>{targetCoin.name}</Text>

          {/* Feedback siempre montado */}
          <Animated.View style={[styles.feedbackWrap, { opacity: feedbackOpacity, transform: [{ scale: feedbackScale }] }]}>
            <Text style={[styles.feedbackFixed, { color: feedbackColor }]}>{feedbackText}</Text>
          </Animated.View>

          <View style={styles.optionsGrid}>
            {roundOptions.map((coin) => (
              <CoinButton key={`opt-${coin.id}`} coin={coin} onPress={handleCoinSelect} disabled={inputLocked} />
            ))}
          </View>
        </View>
      )}

      {/* Summary */}
      {isSummary && (
        <View style={styles.block}>
          <Text style={styles.bigEmoji}>🏆</Text>
          <Text style={styles.title}>¡Terminaste!</Text>
          <Text style={styles.score}>Acertaste {correctAnswers} de {TOTAL_ROUNDS}</Text>

          {/* Botones con mismo tamaño y separación */}
          <View style={styles.actions}>
            <View style={styles.actionBtn}>
              <Button
                title="Completar y Recibir Recompensas"
                onPress={handleComplete}
                loading={loading}
                size="large"
              />
            </View>
            <View style={styles.actionBtn}>
              <Button
                title="Volver a Módulos"
                onPress={() => router.back()}
                variant="outline"
                size="large"
              />
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ---------- Estilos ----------
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    padding: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  block: { width: '100%', maxWidth: 480, alignItems: 'center' },

  bigIconImage: { width: 80, height: 80, marginBottom: Spacing.md, resizeMode: 'contain' },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm, textAlign: 'center' },
  subtitle: { fontSize: FontSize.lg, color: Colors.textLight, marginBottom: Spacing.xl, textAlign: 'center' },

  coinsPreview: { width: '100%', maxWidth: 400, marginBottom: Spacing.xl },
  coinPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  coinImagePreview: { width: 32, height: 32, marginRight: Spacing.md, resizeMode: 'contain' },
  coinName: { fontSize: FontSize.md, color: Colors.text, fontWeight: '600' },

  roundText: { fontSize: FontSize.md, color: Colors.textLight, marginBottom: Spacing.sm, textAlign: 'center' },
  question: { fontSize: FontSize.lg, color: Colors.text, marginBottom: Spacing.sm, textAlign: 'center' },
  targetValue: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.lg, textAlign: 'center' },

  feedbackWrap: { minHeight: 30, marginBottom: 18, justifyContent: 'center', alignItems: 'center' },
  feedbackFixed: { fontSize: FontSize.lg, fontWeight: '700', textAlign: 'center' },

  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 360, marginTop: 12 },
  option: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.lg,
    margin: 10,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTouch: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  optionImage: { width: 80, height: 80, resizeMode: 'contain' },

  score: { fontSize: FontSize.xl, color: Colors.primary, marginBottom: Spacing.md, textAlign: 'center' },
  bigEmoji: { fontSize: 80, marginBottom: Spacing.md },

  // Botones del resumen
  actions: {
    width: '100%',
    maxWidth: 360,
    gap: 12,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  actionBtn: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
  },
});
