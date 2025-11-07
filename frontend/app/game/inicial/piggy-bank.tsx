// app/game/inicial/piggy-bank.tsx
// Versión Final — Estable Web/Móvil + Sonidos + Conteo total + Feedback visual

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '../../../store/userStore';
import { addCoins, addXP, updateProgress, getProgress } from '../../../utils/api';
import Button from '../../../components/Button';
import { Colors, Spacing, FontSize } from '../../../constants/Colors';

const STORY_PAGES = [
  { text: '🏠 Había una vez un niño llamado Tomás que recibía $5 cada semana.', emoji: '👦' },
  { text: '🍬 Tomás siempre gastaba todo su dinero en dulces y juguetes.', emoji: '🍭' },
  { text: '😢 Un día, vio una bicicleta hermosa pero no tenía dinero para comprarla.', emoji: '🚲' },
  { text: '💡 Su abuela le regaló una alcancía y le enseñó a ahorrar.', emoji: '🐷' },
  { text: '💰 Cada semana, Tomás guardaba $3 en su alcancía.', emoji: '🪙' },
  { text: '⏰ Después de varias semanas, ¡su alcancía estaba llena!', emoji: '🎉' },
  { text: '🚲 Tomás pudo comprar la bicicleta que tanto quería.', emoji: '😊' },
  { text: '🌟 Aprendió que ahorrar te ayuda a conseguir lo que deseas.', emoji: '⭐' },
];

const QUESTIONS = [
  { question: '¿Qué le pasaba a Tomás al principio?', options: ['Ahorraba mucho', 'Gastaba todo', 'No tenía dinero'], correct: 1 },
  { question: '¿Quién le dio la alcancía a Tomás?', options: ['Su mamá', 'Su abuela', 'Su amigo'], correct: 1 },
  { question: '¿Qué compró Tomás al final?', options: ['Dulces', 'Una bicicleta', 'Juguetes'], correct: 1 },
];

const SOUND_PATHS = {
  inicio: require('../../../assets/sounds/espera.wav'),
  acierto: require('../../../assets/sounds/acierto.wav'),
  error: require('../../../assets/sounds/error.wav'),
  completado: require('../../../assets/sounds/fin_retro.wav'),
};

export default function PiggyBank() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const updateCoins = useUserStore((s) => s.updateCoins);
  const updateXP = useUserStore((s) => s.updateXP);

  const [phase, setPhase] = useState<'story' | 'quiz' | 'summary'>('story');
  const [page, setPage] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [finalStats, setFinalStats] = useState<{ correct: number; total: number } | null>(null);
  const [inputLocked, setInputLocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const soundRefs = useRef<any>({});
  const mounted = useRef(true);
  const correctRef = useRef(0);

  // 🎧 Inicializa audio
  useEffect(() => {
    mounted.current = true;
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
    return () => {
      mounted.current = false;
      Object.values(soundRefs.current).forEach((s: any) => { try { s?.unloadAsync(); } catch {} });
    };
  }, []);

  const loadSound = async (key: keyof typeof SOUND_PATHS) => {
    try {
      if (soundRefs.current[key]) return soundRefs.current[key];
      const { sound } = await Audio.Sound.createAsync(SOUND_PATHS[key]);
      soundRefs.current[key] = sound;
      return sound;
    } catch {
      return null;
    }
  };

  const playSound = async (key: keyof typeof SOUND_PATHS) => {
    if (muted) return;
    try { const s = await loadSound(key); await s?.replayAsync(); } catch {}
  };

  // 📖 Avanza en la historia
  const handleNextPage = async () => {
    if (page < STORY_PAGES.length - 1) {
      setPage(page + 1);
    } else {
      await playSound('inicio');
      setPhase('quiz');
    }
  };

  // 🧠 Maneja respuesta
  const handleAnswer = async (index: number) => {
    if (inputLocked) return;
    setInputLocked(true);
    setSelected(index);
    setAnsweredCount((prev) => prev + 1);

    const currentQ = QUESTIONS[questionIndex];
    const isCorrect = index === currentQ.correct;

    if (isCorrect) {
      correctRef.current += 1;
      setCorrectCount(correctRef.current);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await playSound('acierto');
    } else {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      await playSound('error');
    }

    setTimeout(() => {
      if (!mounted.current) return;
      setSelected(null);
      setInputLocked(false);
      if (questionIndex < QUESTIONS.length - 1) {
        setQuestionIndex(questionIndex + 1);
      } else {
        setFinalStats({ correct: correctRef.current, total: answeredCount + 1 });
        setPhase('summary');
      }
    }, 600);
  };

  // 💾 Guarda progreso
  const handleComplete = async () => {
    if (!user || loading) return;
    setLoading(true);
    try {
      const coins = 20;
      const xp = 55;
      const correct = finalStats?.correct ?? correctRef.current;
      const total = QUESTIONS.length;
      const score = Math.round((correct / total) * 100);

      await addCoins(user.id, coins).then(() => updateCoins(user.coins + coins));
      await addXP(user.id, xp).then((r) => updateXP(r.new_xp, r.new_level));

      const progress = await getProgress(user.id).catch(() => ({
        completed_modules: [], module_scores: {}, total_score: 0,
      }));

      const completed = (progress.completed_modules || []) as string[];
      if (!completed.includes('piggy_bank')) completed.push('piggy_bank');

      await updateProgress({
        user_id: user.id,
        completed_modules: completed,
        module_scores: { ...progress.module_scores, piggy_bank: score },
        total_score: (progress.total_score || 0) + score,
      });

      await playSound('completado');
      setDone(true);
      setTimeout(() => router.back(), 1000);
    } catch {
      setDone(true);
      setTimeout(() => router.back(), 1000);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const total = QUESTIONS.length;
  const story = STORY_PAGES[page];
  const question = QUESTIONS[questionIndex];

  return (
    <View style={styles.screen}>
      <View style={styles.topRow}>
        <Button title={muted ? 'Quitar silencio 🔊' : 'Silenciar 🔇'} onPress={() => setMuted(!muted)} variant="outline" size="small" />
      </View>

      {/* HISTORIA */}
      {phase === 'story' && (
        <View style={styles.container}>
          <Text style={styles.pageNumber}>Página {page + 1} de {STORY_PAGES.length}</Text>
          <Text style={styles.storyEmoji}>{story.emoji}</Text>
          <View style={styles.storyBox}><Text style={styles.storyText}>{story.text}</Text></View>
          <Button title={page === STORY_PAGES.length - 1 ? 'Continuar al Quiz' : 'Siguiente'} onPress={handleNextPage} size="large" />
        </View>
      )}

      {/* QUIZ */}
      {phase === 'quiz' && (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.quizTitle}>
            Pregunta {questionIndex + 1} de {total} • ✅ {correctCount}
          </Text>
          <Text style={styles.question}>{question.question}</Text>
          <View style={styles.optionsWrap}>
            {question.options.map((opt, i) => {
              const selectedStyle =
                selected === i ? (i === question.correct ? styles.optionCorrect : styles.optionWrong) : null;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.optionBtn, selectedStyle]}
                  onPress={() => handleAnswer(i)}
                  disabled={inputLocked}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* RESUMEN */}
      {phase === 'summary' && (
        <View style={styles.container}>
          <Text style={styles.bigEmoji}>🥇</Text>
          <Text style={styles.title}>¡Buen trabajo!</Text>
          <Text style={styles.score}>
            Respondiste {finalStats?.total ?? 0} preguntas ({finalStats?.correct ?? 0} correctas)
          </Text>
          <Text style={styles.subtitle}>¡Sigue ahorrando y aprendiendo! 💪</Text>

          <View style={styles.lessonBox}>
            <Text style={styles.lessonTitle}>💡 Lo que aprendiste:</Text>
            <Text style={styles.lessonText}>• Ahorrar te ayuda a comprar cosas grandes</Text>
            <Text style={styles.lessonText}>• Es importante no gastar todo tu dinero</Text>
            <Text style={styles.lessonText}>• Una alcancía es tu amiga</Text>
          </View>

          <Button title="Completar" onPress={handleComplete} loading={loading} size="large" />
          <Button title="Volver" onPress={() => router.back()} variant="outline" />
          {done && <Text style={styles.doneMsg}>✅ Progreso guardado...</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: Spacing.xl, justifyContent: 'center', alignItems: 'center' },
  topRow: { width: '100%', alignItems: 'flex-end', padding: Spacing.md },
  pageNumber: { fontSize: FontSize.sm, color: Colors.textLight, marginBottom: 10 },
  storyEmoji: { fontSize: 100, marginBottom: 15 },
  storyBox: { backgroundColor: Colors.white, padding: 20, borderRadius: 15, marginBottom: 20 },
  storyText: { fontSize: FontSize.lg, color: Colors.text, textAlign: 'center' },
  quizTitle: { fontSize: FontSize.lg, color: Colors.textLight, marginBottom: 20 },
  question: { fontSize: FontSize.xl, color: Colors.text, textAlign: 'center', marginBottom: 25 },
  optionsWrap: { width: '100%' },
  optionBtn: {
    backgroundColor: Colors.white,
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  optionText: { fontSize: FontSize.lg, color: Colors.text },
  optionCorrect: { backgroundColor: '#27AE6044', borderColor: '#27AE60' },
  optionWrong: { backgroundColor: '#E74C3C33', borderColor: '#E74C3C' },
  bigEmoji: { fontSize: 100, marginBottom: 15 },
  title: { fontSize: FontSize.xxl, color: Colors.text, fontWeight: '700', marginBottom: 5 },
  subtitle: { fontSize: FontSize.lg, color: Colors.textLight, marginBottom: 15 },
  score: { fontSize: FontSize.lg, color: Colors.primary, marginBottom: 15 },
  lessonBox: { backgroundColor: Colors.white, padding: 20, borderRadius: 12, width: '100%', marginBottom: 20 },
  lessonTitle: { fontWeight: '700', marginBottom: 10, fontSize: FontSize.lg },
  lessonText: { fontSize: FontSize.md, color: Colors.text },
  doneMsg: { color: Colors.primary, marginTop: 10 },
});
