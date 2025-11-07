// app/game/inicial/counting.tsx
// Versión Final V47 — Árbol estable (sin remount), fix RN Web removeChild definitivamente

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

import { useUserStore } from '../../../store/userStore';
import { addCoins, addXP, updateProgress, getProgress } from '../../../utils/api';
import Button from '../../../components/Button';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../constants/Colors';

// ---------- helpers ----------
const internalTrackEvent = (name: string, props: Record<string, any> = {}) =>
  console.log(`[TRACK] ${new Date().toLocaleTimeString()} - ${name}`, props);

type RoundData = {
  coin1: number;
  coin2: number;
  total: number;
  options: number[];
};

const makeRound = (): RoundData => {
  const coin1 = Math.floor(Math.random() * 5) + 1;
  const coin2 = Math.floor(Math.random() * 5) + 1;
  const total = coin1 + coin2;
  const set = new Set<number>([total]);
  while (set.size < 3) {
    const r = Math.floor(Math.random() * 10) + 1;
    if (!set.has(r)) set.add(r);
  }
  const options = Array.from(set).sort(() => Math.random() - 0.5);
  return { coin1, coin2, total, options };
};

// sonidos segun tu carpeta
const SOUND_PATHS: Record<'inicio' | 'acierto' | 'error' | 'completado', number> = {
  inicio: require('../../../assets/sounds/espera.wav'),
  acierto: require('../../../assets/sounds/acierto.wav'),
  error: require('../../../assets/sounds/error.wav'),
  completado: require('../../../assets/sounds/fin_retro.wav'),
};

export default function CountingMoney() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const updateCoins = useUserStore((s) => s.updateCoins);
  const updateXP = useUserStore((s) => s.updateXP);

  const TOTAL_ROUNDS = 8;

  // ---------- state ----------
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0); // 0..TOTAL_ROUNDS-1
  const [round, setRound] = useState<RoundData>(() => makeRound());
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [inputLocked, setInputLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const isSummary = started && currentIndex >= TOTAL_ROUNDS;

  // ---------- audio ----------
  const soundRefs = useRef<Partial<Record<keyof typeof SOUND_PATHS, Audio.Sound>>>({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});
    return () => {
      mounted.current = false;
      Object.values(soundRefs.current).forEach((s) => { try { s?.unloadAsync(); } catch {} });
    };
  }, []);

  const loadSound = async (k: keyof typeof SOUND_PATHS) => {
    try {
      if (soundRefs.current[k]) return soundRefs.current[k]!;
      const { sound } = await Audio.Sound.createAsync(SOUND_PATHS[k], { shouldPlay: false });
      soundRefs.current[k] = sound;
      return sound;
    } catch { return null; }
  };
  const playSound = async (k: keyof typeof SOUND_PATHS) => {
    try { const s = await loadSound(k); await s?.replayAsync(); } catch {}
  };

  // ---------- flow ----------
  const startGame = async () => {
    setStarted(true);
    setCurrentIndex(0);
    setCorrect(0);
    setSelected(null);
    setIsCorrect(null);
    setInputLocked(false);
    setRound(makeRound());
    await playSound('inicio');
    internalTrackEvent('module_started', { module_id: 'counting_money', user_id: user?.id });
  };

  const goNext = () => {
    // árbol estable: NO desmontamos, sólo avanzamos índice
    setSelected(null);
    setIsCorrect(null);
    setInputLocked(false);
    setCurrentIndex((i) => i + 1);
    // prepara próxima ronda si aun quedan
    if (currentIndex + 1 < TOTAL_ROUNDS) {
      setRound(makeRound());
    }
  };

  const handleAnswer = async (opt: number) => {
    if (inputLocked || isSummary) return;
    setInputLocked(true);
    setSelected(opt);
    const ok = opt === round.total;
    setIsCorrect(ok);
    try {
      if (ok) {
        setCorrect((c) => c + 1);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await playSound('acierto');
      } else {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        await playSound('error');
      }
    } catch {}
    setTimeout(() => { if (mounted.current) goNext(); }, 520);
  };

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const coinsEarned = 25;
      const score = (correct / TOTAL_ROUNDS) * 100;

      await addCoins(user.id, coinsEarned);
      updateCoins(user.coins + coinsEarned);

      const xpEarned = 65;
      const xpResult = await addXP(user.id, xpEarned);
      updateXP(xpResult.new_xp, xpResult.new_level);

      const curr = await getProgress(user.id);
      const completed = curr.completed_modules || [];
      if (!completed.includes('counting_money')) {
        completed.push('counting_money');
        await updateProgress({
          user_id: user.id,
          completed_modules: completed,
          module_scores: { ...curr.module_scores, counting_money: score },
          total_score: (curr.total_score || 0) + score,
        });
      }

      internalTrackEvent('module_completed', {
        module_id: 'counting_money', user_id: user.id, score_percentage: score, correct_answers: correct,
      });

      await playSound('completado');

      Alert.alert('¡Felicidades! 🎉',
        `¡Completaste el juego!\n\n💰 Monedas: ${coinsEarned}\n⭐ XP: ${xpEarned}`,
        [{ text: 'Volver', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Error', 'No se pudo guardar el progreso.');
    } finally { setLoading(false); }
  };

  if (!user) return null;

  // textos resumen (árbol estable: sólo se ocultan/ muestran)
  const summary = useMemo(() => {
    if (correct === TOTAL_ROUNDS)
      return { emoji: '🏆', title: '¡Perfecto!', message: '¡Increíble! Respondiste todo perfecto 🎉' };
    if (correct >= Math.ceil(TOTAL_ROUNDS / 2))
      return { emoji: '🥇', title: '¡Buen trabajo!', message: '¡Muy bien! Sigue así 💪' };
    return { emoji: '💡', title: '¡Sigue intentando!', message: 'Puedes mejorar, ¡tú puedes! 🧠' };
  }, [correct]);

  const roundNumber = Math.min(currentIndex + 1, TOTAL_ROUNDS);

  // cadena de monedas en un solo <Text>
  const coinsLine = (n: number) => Array(n).fill('🪙').join(' ');

  return (
    <View style={styles.container}>
      {!started && (
        <>
          <Text style={styles.bigEmoji}>🧮</Text>
          <Text style={styles.title}>Contar Dinero</Text>
          <Text style={styles.subtitle}>¡Practica sumando monedas!</Text>

          <View style={styles.exampleBox}>
            <Text style={styles.exampleTitle}>Ejemplo:</Text>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCoin}>🪙 2</Text>
              <Text style={styles.examplePlus}> + </Text>
              <Text style={styles.exampleCoin}>🪙 3</Text>
              <Text style={styles.exampleEquals}> = </Text>
              <Text style={styles.exampleAnswer}>5</Text>
            </View>
          </View>

          <Button title="¡Comenzar!" onPress={startGame} size="large" />
        </>
      )}

      {/* Vista de juego (siempre montada) */}
      {started && (
        <>
          <View style={[isSummary && styles.hidden]}>
            <Text style={styles.roundText}>Pregunta {roundNumber} de {TOTAL_ROUNDS}</Text>

            <View style={styles.questionBox}>
              <View style={styles.coinsRow}>
                <Text style={styles.coinsText}>{coinsLine(round.coin1)}</Text>
              </View>

              <Text style={styles.plus}>+</Text>

              <View style={styles.coinsRow}>
                <Text style={styles.coinsText}>{coinsLine(round.coin2)}</Text>
              </View>

              <Text style={styles.equals}>=</Text>
              <Text style={styles.questionMark}>?</Text>
            </View>

            <Text style={styles.instruction}>¿Cuántas monedas hay en total?</Text>

            <View style={styles.optionsRow}>
              {round.options.map((opt) => {
                const sel = selected === opt;
                const green = sel && isCorrect === true;
                const red = sel && isCorrect === false;
                return (
                  <TouchableOpacity
                    key={`opt-${currentIndex}-${opt}`}
                    style={[
                      styles.answerButton,
                      green && styles.answerButtonCorrect,
                      red && styles.answerButtonWrong,
                      (inputLocked && !sel) && styles.answerButtonDim,
                    ]}
                    onPress={() => handleAnswer(opt)}
                    activeOpacity={0.85}
                    disabled={inputLocked}
                  >
                    <Text style={styles.answerText}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Panel de resumen (mismo árbol, sólo se muestra al final) */}
          <View style={[!isSummary && styles.hidden, styles.summaryBox]}>
            <Text style={styles.bigEmoji}>{summary.emoji}</Text>
            <Text style={styles.title}>{summary.title}</Text>
            <Text style={styles.score}>Acertaste {correct} de {TOTAL_ROUNDS}</Text>
            <Text style={styles.subtitle}>{summary.message}</Text>

            <View style={styles.starRating}>
              {[0,1,2].map((i) => (
                <Text key={i} style={styles.star}>
                  {i < Math.floor((correct / TOTAL_ROUNDS) * 3) ? '⭐' : '☆'}
                </Text>
              ))}
            </View>

            <Button title="Completar" onPress={handleComplete} loading={loading} size="large" />
            <Button title="Volver" onPress={() => router.back()} variant="outline" />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { display: 'none' },

  container: {
    flex: 1, backgroundColor: Colors.background, padding: Spacing.xl,
    justifyContent: 'center', alignItems: 'center',
  },
  bigEmoji: { fontSize: 100, marginBottom: Spacing.lg },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm, textAlign: 'center' },
  subtitle: { fontSize: FontSize.lg, color: Colors.textLight, marginBottom: Spacing.xl, textAlign: 'center' },

  exampleBox: { backgroundColor: Colors.white, padding: Spacing.xl, borderRadius: BorderRadius.lg, marginBottom: Spacing.xl, width: '100%' },
  exampleTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md, textAlign: 'center' },
  exampleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  exampleCoin: { fontSize: FontSize.xl, color: Colors.text, marginHorizontal: 6 },
  examplePlus: { fontSize: FontSize.xl, color: Colors.textLight, marginHorizontal: 6 },
  exampleEquals: { fontSize: FontSize.xl, color: Colors.textLight, marginHorizontal: 6 },
  exampleAnswer: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.primary, marginHorizontal: 6 },

  roundText: { fontSize: FontSize.md, color: Colors.textLight, marginBottom: Spacing.xl },

  questionBox: { backgroundColor: Colors.white, padding: Spacing.xl, borderRadius: BorderRadius.lg, marginBottom: Spacing.lg, width: '100%', alignItems: 'center' },
  coinsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: Spacing.sm },
  coinsText: { fontSize: 32, lineHeight: 38, letterSpacing: 2 },

  plus: { fontSize: 40, color: Colors.textLight, marginVertical: Spacing.sm },
  equals: { fontSize: 40, color: Colors.textLight, marginVertical: Spacing.sm },
  questionMark: { fontSize: 60, color: Colors.primary, fontWeight: '700' },

  instruction: { fontSize: FontSize.lg, color: Colors.text, marginBottom: Spacing.lg, textAlign: 'center' },

  optionsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 4, flexWrap: 'wrap' },
  answerButton: {
    width: 88, height: 88, backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center',
    marginHorizontal: 8, marginVertical: 8,
  },
  answerButtonCorrect: { backgroundColor: '#27AE60' },
  answerButtonWrong: { backgroundColor: '#E74C3C' },
  answerButtonDim: { opacity: 0.6 },

  answerText: { fontSize: 32, fontWeight: '700', color: Colors.white },

  score: { fontSize: FontSize.xl, color: Colors.primary, marginBottom: Spacing.md },
  starRating: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.md },
  star: { fontSize: 40, marginHorizontal: 6 },

  summaryBox: { alignItems: 'center' },
});
