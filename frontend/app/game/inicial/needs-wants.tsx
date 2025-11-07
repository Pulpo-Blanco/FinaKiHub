// app/game/inicial/needs_wants.tsx
// Versión v2.2 — TS sin circular/readonly + Feedback final adaptativo + Aleatorio + Sonidos + Animaciones

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { useUserStore } from '../../../store/userStore';
import { addCoins, addXP, updateProgress, getProgress } from '../../../utils/api';
import Button from '../../../components/Button';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../constants/Colors';

// ----------------- Tipos -----------------
type Kind = 'need' | 'want';
type Phase = 'intro' | 'playing' | 'summary';

interface Item {
  id: number;
  name: string;
  emoji: string;
  type: Kind;
}

const NBSP = '\u00A0';
const TOTAL_ROUNDS = 8; // preguntas por partida

// ----------------- Banco de ítems -----------------
const BASE_ITEMS: Item[] = [
  { id: 1,  name: 'Comida',         emoji: '🍎', type: 'need' },
  { id: 2,  name: 'Juguete',        emoji: '🧸', type: 'want' },
  { id: 3,  name: 'Agua',           emoji: '💧', type: 'need' },
  { id: 4,  name: 'Dulces',         emoji: '🍭', type: 'want' },
  { id: 5,  name: 'Ropa',           emoji: '👕', type: 'need' },
  { id: 6,  name: 'Videojuego',     emoji: '🎮', type: 'want' },
  { id: 7,  name: 'Medicina',       emoji: '💊', type: 'need' },
  { id: 8,  name: 'Helado',         emoji: '🍦', type: 'want' },
  { id: 9,  name: 'Alquiler',       emoji: '🏠', type: 'need' },
  { id: 10, name: 'Chocolate',      emoji: '🍫', type: 'want' },
  { id: 11, name: 'Abrigo',         emoji: '🧥', type: 'need' },
  { id: 12, name: 'Teléfono nuevo', emoji: '📱', type: 'want' },
];

// ----------------- Utilidades -----------------
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default function NeedsWants() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const updateCoins = useUserStore((s) => s.updateCoins);
  const updateXP = useUserStore((s) => s.updateXP);

  const [phase, setPhase] = useState<Phase>('intro');
  const [items, setItems] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [loading, setLoading] = useState(false);
  const [inputLocked, setInputLocked] = useState(false);

  // métricas de error para feedback final específico
  const [mistakesNeed, setMistakesNeed] = useState(0); // marcó "deseo" cuando era "necesidad"
  const [mistakesWant, setMistakesWant] = useState(0); // marcó "necesidad" cuando era "deseo"

  const currentItem = items[index];
  const total = items.length || TOTAL_ROUNDS;

  // ----------------- Sonidos -----------------
  const soundAcierto = useRef<Audio.Sound | null>(null);
  const soundError = useRef<Audio.Sound | null>(null);
  const soundFinal = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const [ok, err, fin] = await Promise.all([
          Audio.Sound.createAsync(require('../../../assets/sounds/acierto.wav')),
          Audio.Sound.createAsync(require('../../../assets/sounds/error.wav')),
          Audio.Sound.createAsync(require('../../../assets/sounds/fin_retro.wav')),
        ]);
        if (!mounted) return;
        soundAcierto.current = ok.sound;
        soundError.current = err.sound;
        soundFinal.current = fin.sound;
      } catch (e) {
        console.warn('No se pudieron cargar sonidos:', e);
      }
    })();
    return () => {
      mounted = false;
      soundAcierto.current?.unloadAsync();
      soundError.current?.unloadAsync();
      soundFinal.current?.unloadAsync();
    };
  }, []);

  const playAcierto = async () => { try { await soundAcierto.current?.replayAsync(); } catch {} };
  const playError   = async () => { try { await soundError.current?.replayAsync(); } catch {} };
  const playFinal   = async () => { try { await soundFinal.current?.replayAsync(); } catch {} };

  // ----------------- Feedback animado (siempre montado) -----------------
  const [feedbackText, setFeedbackText] = useState(NBSP);
  const [feedbackColor, setFeedbackColor] = useState<string>(Colors.textLight);
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const feedbackScale = useRef(new Animated.Value(0.98)).current;

  const showFeedback = (isCorrect: boolean, custom?: string) => {
    setFeedbackText(custom ?? (isCorrect ? '✅ ¡Correcto!' : '❌ Incorrecto'));
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
    Animated.timing(feedbackOpacity, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setFeedbackText(NBSP);
    });
  };

  useEffect(() => {
    if (phase !== 'playing') hideFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ----------------- Timers portables + cleanup -----------------
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleNext = (fn: () => void, ms: number) => {
    if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    nextTimerRef.current = setTimeout(() => {
      nextTimerRef.current = null;
      fn();
    }, ms);
  };
  useEffect(() => {
    return () => {
      if (nextTimerRef.current) {
        clearTimeout(nextTimerRef.current);
        nextTimerRef.current = null;
      }
      feedbackOpacity.stopAnimation();
      feedbackScale.stopAnimation();
    };
  }, [feedbackOpacity, feedbackScale]);

  // ----------------- Juego -----------------
  const startGame = () => {
    const selected: Item[] = shuffle([...BASE_ITEMS]).slice(0, TOTAL_ROUNDS); // 8 aleatorios
    setItems(selected);
    setIndex(0);
    setCorrect(0);
    setMistakesNeed(0);
    setMistakesWant(0);
    setPhase('playing');
    setInputLocked(false);
    setFeedbackText(NBSP);
    setFeedbackColor(Colors.textLight);
    hideFeedback();
  };

  const handleAnswer = (answer: Kind) => {
    if (!currentItem || inputLocked) return;
    setInputLocked(true);

    const isCorrect = answer === currentItem.type;
    if (isCorrect) {
      setCorrect((c) => c + 1);
      playAcierto();
      showFeedback(true, '✅ ¡Correcto!');
    } else {
      if (currentItem.type === 'need') setMistakesNeed((m) => m + 1);
      else setMistakesWant((m) => m + 1);

      playError();
      showFeedback(false, currentItem.type === 'need' ? 'ℹ️ Es una necesidad' : 'ℹ️ Es un deseo');
    }

    scheduleNext(() => {
      hideFeedback();
      if (index + 1 < total) {
        setIndex((i) => i + 1);
        setInputLocked(false);
      } else {
        playFinal();
        setPhase('summary');
        setInputLocked(false);
      }
    }, 700);
  };

  const scorePercent = useMemo(
    () => Math.round((correct / (total || 1)) * 100),
    [correct, total]
  );

  // ----------------- Feedback final adaptativo -----------------
  const finalFeedback = useMemo(() => {
    if (correct === total && total > 0) {
      return {
        emoji: '🌟',
        title: '¡Perfección total!',
        message: '¡Todas correctas! Tienes clarísima la diferencia entre necesidades y deseos. ¡Sigue así! 💯',
        tone: 'success' as const,
    };
    }
    if (scorePercent >= 80) {
      return {
        emoji: '🎉',
        title: '¡Muy bien!',
        message: `Solo ${total - correct} ${(total - correct) === 1 ? 'detalle' : 'detalles'} por afinar. ¡Ya casi llegas al 100%!`,
        tone: 'success' as const,
      };
    }
    if (scorePercent >= 60) {
      return {
        emoji: '👍',
        title: 'Buen avance',
        message: 'Vas por buen camino. Regla rápida: necesidades = vivir/estar bien (comida, agua, salud, abrigo). Deseos = extras para disfrutar.',
        tone: 'info' as const,
      };
    }
    if (correct === 0) {
      return {
        emoji: '💪',
        title: '¡Vamos paso a paso!',
        message: 'Lo importante es practicar. Regla rápida: necesidades = vivir/estar bien; deseos = extras. ¡En la próxima te saldrá mejor!',
        tone: 'warn' as const,
      };
    }
    if (correct < total / 2) {
      return {
        emoji: '🧭',
        title: 'Vas en camino',
        message: 'Tuviste más respuestas incorrectas que correctas. Usa la guía: necesidades = básicas para vivir; deseos = cosas que nos gustan pero no son esenciales.',
        tone: 'warn' as const,
      };
    }
    return {
      emoji: '✨',
      title: '¡Sigue practicando!',
      message: 'Cada intento suma. Repite la partida y pon atención a los ejemplos similares.',
      tone: 'info' as const,
    };
  }, [correct, total, scorePercent]);

  const specificTips = useMemo(() => {
    const tips: string[] = [];
    if (mistakesNeed > 0) tips.push('Confundiste necesidades con deseos: piensa en comer, beber agua, estar abrigado o cuidar la salud.');
    if (mistakesWant > 0) tips.push('Confundiste deseos con necesidades: juguetes, dulces o gadgets suelen ser extras para disfrutar.');
    return tips;
  }, [mistakesNeed, mistakesWant]);

  // ----------------- Guardar progreso -----------------
  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const coinsEarned = 25;
      await addCoins(user.id, coinsEarned);
      updateCoins(user.coins + coinsEarned);

      const xpEarned = 60;
      const xpResult = await addXP(user.id, xpEarned);
      updateXP(xpResult.new_xp, xpResult.new_level);

      const current = await getProgress(user.id);
      const completed = [...(current.completed_modules || [])];
      const moduleKey = 'needs_wants';

      const prev = Number(current.module_scores?.[moduleKey] || 0);
      const newScore = scorePercent;
      const newScores = { ...(current.module_scores || {}) };
      let newTotalScore = current.total_score || 0;

      if (!completed.includes(moduleKey)) {
        completed.push(moduleKey);
        newScores[moduleKey] = newScore;
        newTotalScore += newScore;
      } else if (newScore > prev) {
        newScores[moduleKey] = newScore;
        newTotalScore = newTotalScore - prev + newScore;
      }

      await updateProgress({
        user_id: user.id,
        completed_modules: completed,
        module_scores: newScores,
        total_score: newTotalScore,
      });

      if (Platform.OS === 'web') {
        window.alert(`¡Completaste el juego!\n\n✅ Aciertos: ${correct}/${total}\n💯 Puntaje: ${scorePercent}%\n💰 Monedas: ${coinsEarned}\n⭐ XP: ${xpEarned}`);
        router.back();
      } else {
        Alert.alert(
          '¡Felicidades! 🎉',
          `✅ Aciertos: ${correct}/${total}\n💯 Puntaje: ${scorePercent}%\n\n💰 Monedas: ${coinsEarned}\n⭐ XP: ${xpEarned}`,
          [{ text: 'Volver', onPress: () => router.back() }],
        );
      }
    } catch {
      Alert.alert('Error', 'No se pudo guardar.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  // ----------------- Render -----------------
  if (phase === 'intro') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.bigEmoji}>🎈</Text>
        <Text style={styles.title}>¿Necesito o Quiero?</Text>
        <Text style={styles.subtitle}>Aprende la diferencia con ejemplos cotidianos</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 Necesidad</Text>
          <Text style={styles.infoText}>Cosas que NECESITAS para vivir (comida, agua, abrigo, medicina).</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>✨ Deseo</Text>
          <Text style={styles.infoText}>Cosas que QUIERES pero no necesitas (juguetes, dulces, gadgets).</Text>
        </View>

        <Button title="¡Jugar!" onPress={startGame} size="large" />
      </ScrollView>
    );
  }

  if (phase === 'playing') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.progress}>Pregunta {index + 1} de {total}</Text>

        {currentItem && (
          <>
            <Text style={styles.itemEmoji}>{currentItem.emoji}</Text>
            <Text style={styles.itemName}>{currentItem.name}</Text>
            <Text style={styles.question}>¿Es una necesidad o un deseo?</Text>

            <Animated.View style={[styles.feedbackWrap, { opacity: feedbackOpacity, transform: [{ scale: feedbackScale }] }]}>
              <Text style={[styles.feedback, { color: feedbackColor }]}>{feedbackText}</Text>
            </Animated.View>

            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.answerButton, { backgroundColor: '#4CAF50', opacity: inputLocked ? 0.6 : 1 }]}
                onPress={() => handleAnswer('need')}
                activeOpacity={0.8}
                disabled={inputLocked}
              >
                <Text style={styles.answerEmoji}>💡</Text>
                <Text style={styles.answerText}>Necesidad</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.answerButton, { backgroundColor: '#FF9800', opacity: inputLocked ? 0.6 : 1 }]}
                onPress={() => handleAnswer('want')}
                activeOpacity={0.8}
                disabled={inputLocked}
              >
                <Text style={styles.answerEmoji}>✨</Text>
                <Text style={styles.answerText}>Deseo</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    );
  }

  // summary
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.bigEmoji}>🏆</Text>
      <Text style={styles.title}>¡Terminaste!</Text>
      <Text style={styles.score}>Acertaste {correct} de {total} — {scorePercent}%</Text>

      <View
        style={[
          styles.feedbackCard,
          finalFeedback.tone === 'success' && { borderColor: '#46C08A', backgroundColor: 'rgba(70,192,138,0.08)' },
          finalFeedback.tone === 'info' && { borderColor: '#2F86EB', backgroundColor: 'rgba(47,134,235,0.08)' },
          finalFeedback.tone === 'warn' && { borderColor: '#F0AD4E', backgroundColor: 'rgba(240,173,78,0.1)' },
        ]}
      >
        <Text style={styles.feedbackEmoji}>{finalFeedback.emoji}</Text>
        <Text style={styles.feedbackTitle}>{finalFeedback.title}</Text>
        <Text style={styles.feedbackMessage}>{finalFeedback.message}</Text>

        {!!specificTips.length && (
          <View style={styles.tipList}>
            {specificTips.map((t, i) => (
              <Text key={i} style={styles.tipItem}>• {t}</Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <View style={styles.actionBtn}>
          <Button title="Completar" onPress={handleComplete} loading={loading} size="large" />
        </View>
        <View style={styles.actionBtn}>
          <Button title="Reintentar" onPress={() => setPhase('intro')} variant="outline" size="large" />
        </View>
      </View>
    </ScrollView>
  );
}

// ----------------- Estilos -----------------
const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: Colors.background, padding: Spacing.xl, justifyContent: 'center', alignItems: 'center' },
  bigEmoji: { fontSize: 100, marginBottom: Spacing.lg },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm, textAlign: 'center' },
  subtitle: { fontSize: FontSize.lg, color: Colors.textLight, marginBottom: Spacing.xl, textAlign: 'center' },

  infoCard: { backgroundColor: Colors.white, padding: Spacing.lg, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, width: '100%', maxWidth: 500, borderWidth: 1, borderColor: Colors.border },
  infoTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  infoText: { fontSize: FontSize.md, color: Colors.textLight },

  progress: { fontSize: FontSize.md, color: Colors.textLight, marginBottom: Spacing.md, textAlign: 'center' },
  itemEmoji: { fontSize: 120, marginBottom: Spacing.md, textAlign: 'center' },
  itemName: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm, textAlign: 'center' },
  question: { fontSize: FontSize.lg, color: Colors.textLight, marginBottom: Spacing.md, textAlign: 'center' },

  feedbackWrap: { minHeight: 28, marginBottom: 14, alignItems: 'center', justifyContent: 'center' },
  feedback: { fontSize: FontSize.lg, fontWeight: '700', textAlign: 'center' },

  buttons: { flexDirection: 'row', gap: Spacing.md, width: '100%', maxWidth: 420 },
  answerButton: { flex: 1, padding: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center', minHeight: 120 },
  answerEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  answerText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },

  score: { fontSize: FontSize.xl, color: Colors.primary, marginBottom: Spacing.md, textAlign: 'center' },

  feedbackCard: { width: '100%', maxWidth: 520, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, marginBottom: Spacing.lg },
  feedbackEmoji: { fontSize: 36, textAlign: 'center', marginBottom: Spacing.xs },
  feedbackTitle: { fontSize: FontSize.xl, fontWeight: '800', textAlign: 'center', marginBottom: Spacing.xs, color: Colors.text },
  feedbackMessage: { fontSize: FontSize.md, textAlign: 'center', color: Colors.text },

  tipList: { marginTop: Spacing.sm, gap: 4 },
  tipItem: { fontSize: FontSize.md, color: Colors.textLight },

  actions: { width: '100%', maxWidth: 360, gap: 12, alignItems: 'center', marginTop: Spacing.md },
  actionBtn: { width: '100%', height: 48, justifyContent: 'center' },
});
